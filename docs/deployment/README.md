# MP-SPDZ TypeScript Bindings Deployment Guide

This guide provides detailed instructions for deploying MP-SPDZ TypeScript bindings in production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Production Deployment](#production-deployment)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- Node.js 22+
- TypeScript 5.0+
- C++17 compatible compiler
- Python 3.8+
- 4GB RAM minimum (8GB recommended)
- 2 CPU cores minimum (4 cores recommended)

### System Dependencies

```bash
# Ubuntu/Debian
sudo apt-get install automake build-essential clang cmake git \
  libboost-dev libgmp-dev libntl-dev libsodium-dev libssl-dev \
  libtool python3 libstdc++-12-dev

# macOS
brew install automake boost cmake gmp libsodium libtool ntl python3

# CentOS/RHEL
sudo yum install automake gcc-c++ clang cmake git boost-devel \
  gmp-devel ntl-devel libsodium-devel openssl-devel libtool python3
```

## Installation

1. **Install Package**

```bash
# Using npm
npm install @gradiant/mp-spdz-bindings

# Using yarn
yarn add @gradiant/mp-spdz-bindings

# Using pnpm
pnpm add @gradiant/mp-spdz-bindings
```

2. **Build MP-SPDZ Binaries**

```bash
# Clone MP-SPDZ repository
git clone https://github.com/data61/MP-SPDZ.git
cd MP-SPDZ

# Configure build
cp CONFIG.mine.example CONFIG.mine
echo "MY_CFLAGS = -O3 -march=native" >> CONFIG.mine
echo "USE_NTL = 1" >> CONFIG.mine
echo "MOD = -DMAX_MOD_SZ=8" >> CONFIG.mine

# Build
make mascot-party.x
make spdz2k-party.x
make semi2k-party.x
```

3. **Set Environment Variables**

```bash
# Add to your .bashrc or .zshrc
export MP_SPDZ_BINARY_DIR=/path/to/MP-SPDZ
export MP_SPDZ_PREPROCESSING_DIR=/path/to/preprocessing/data
```

## Configuration

### Basic Configuration

```typescript
import { JIFFAdapter, JIFFAdapterConfig, MPCProtocol } from '@gradiant/mp-spdz-bindings';

const config: JIFFAdapterConfig = {
  partyId: 0,
  numParties: 3,
  threshold: 1,
  protocol: MPCProtocol.SEMI2K
};

const adapter = new JIFFAdapter(config);
```

### Protocol Selection

Choose the appropriate protocol based on your security requirements:

1. **MASCOT** (Maximum Security)
   ```typescript
   const config: JIFFAdapterConfig = {
     // ... other config ...
     protocol: MPCProtocol.MASCOT
   };
   ```

2. **SPDZ2k** (Integer Arithmetic)
   ```typescript
   const config: JIFFAdapterConfig = {
     // ... other config ...
     protocol: MPCProtocol.SPDZ2K
   };
   ```

3. **Semi2k** (Best Performance)
   ```typescript
   const config: JIFFAdapterConfig = {
     // ... other config ...
     protocol: MPCProtocol.SEMI2K
   };
   ```

### Network Configuration

1. **Port Configuration**
   ```typescript
   const testConfig: TestConfig = {
     protocol: MPCProtocol.SEMI2K,
     numParties: 3,
     basePort: 14000, // Each party will use basePort + partyId
     preprocessingDir: '/path/to/preprocessing',
     binaryDir: process.env.MP_SPDZ_BINARY_DIR
   };
   ```

2. **Firewall Rules**
   - Open ports for each party (basePort to basePort + numParties - 1)
   - Allow TCP traffic between all parties
   - Configure TLS if needed

## Production Deployment

### Docker Deployment

1. **Dockerfile**

```dockerfile
FROM node:22-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
  automake \
  build-essential \
  clang \
  cmake \
  git \
  libboost-dev \
  libgmp-dev \
  libntl-dev \
  libsodium-dev \
  libssl-dev \
  libtool \
  python3 \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Set environment variables
ENV MP_SPDZ_BINARY_DIR=/usr/local/bin
ENV MP_SPDZ_PREPROCESSING_DIR=/app/preprocessing

# Expose ports
EXPOSE 14000-14010

# Start the application
CMD ["npm", "start"]
```

2. **Docker Compose**

```yaml
version: '3.8'

services:
  party0:
    build: .
    environment:
      - PARTY_ID=0
      - NUM_PARTIES=3
      - BASE_PORT=14000
    ports:
      - "14000:14000"
    volumes:
      - preprocessing:/app/preprocessing

  party1:
    build: .
    environment:
      - PARTY_ID=1
      - NUM_PARTIES=3
      - BASE_PORT=14000
    ports:
      - "14001:14001"
    volumes:
      - preprocessing:/app/preprocessing

  party2:
    build: .
    environment:
      - PARTY_ID=2
      - NUM_PARTIES=3
      - BASE_PORT=14000
    ports:
      - "14002:14002"
    volumes:
      - preprocessing:/app/preprocessing

volumes:
  preprocessing:
```

### Kubernetes Deployment

1. **Deployment YAML**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mpc-party
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mpc-party
  template:
    metadata:
      labels:
        app: mpc-party
    spec:
      containers:
      - name: mpc-party
        image: mpc-party:latest
        env:
        - name: NUM_PARTIES
          value: "3"
        - name: BASE_PORT
          value: "14000"
        - name: PARTY_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        ports:
        - containerPort: 14000
          name: mpc-port
        volumeMounts:
        - name: preprocessing
          mountPath: /app/preprocessing
      volumes:
      - name: preprocessing
        persistentVolumeClaim:
          claimName: preprocessing-pvc
```

2. **Service YAML**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mpc-party
spec:
  selector:
    app: mpc-party
  ports:
  - name: mpc-port
    port: 14000
    targetPort: mpc-port
  type: ClusterIP
```

## Monitoring

### Metrics to Monitor

1. **Operation Latency**
   - Share creation time
   - Multiplication time
   - Comparison time
   - Network round-trip time

2. **Resource Usage**
   - CPU utilization
   - Memory usage
   - Network bandwidth
   - Disk I/O (for preprocessing data)

3. **Error Rates**
   - Protocol errors
   - Network errors
   - Security violations

### Prometheus Integration

1. **Install Dependencies**

```bash
npm install prom-client
```

2. **Add Metrics**

```typescript
import { Registry, Counter, Histogram } from 'prom-client';

const registry = new Registry();

const operationLatency = new Histogram({
  name: 'mpc_operation_latency',
  help: 'Latency of MPC operations',
  labelNames: ['operation', 'protocol'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const errorCounter = new Counter({
  name: 'mpc_errors_total',
  help: 'Total number of MPC errors',
  labelNames: ['type', 'protocol']
});

registry.registerMetric(operationLatency);
registry.registerMetric(errorCounter);
```

### Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

## Troubleshooting

### Common Issues

1. **Binary Not Found**
   ```
   Error: Required binary mascot-party.x not found
   ```
   Solution: Check MP_SPDZ_BINARY_DIR environment variable and binary compilation

2. **Network Connection Failed**
   ```
   Error: Failed to connect to party 1
   ```
   Solution: Check firewall rules and port configurations

3. **Memory Issues**
   ```
   Error: JavaScript heap out of memory
   ```
   Solution: Increase Node.js memory limit with --max-old-space-size

### Debug Mode

Enable debug logging:

```typescript
const config: JIFFAdapterConfig = {
  // ... other config ...
  debug: true,
  logLevel: 'debug'
};
```

### Performance Issues

1. **Slow Operations**
   - Use batch processing
   - Check network latency
   - Monitor preprocessing data usage

2. **High Memory Usage**
   - Clean up shares after use
   - Monitor memory leaks
   - Use appropriate protocol for workload

### Security Issues

1. **Protocol Errors**
   - Verify party configurations match
   - Check MAC verification settings
   - Monitor for active attacks

2. **Network Issues**
   - Verify TLS configuration
   - Check firewall rules
   - Monitor for unauthorized connections

## Further Resources

- [Protocol Documentation](../protocols/README.md)
- [API Reference](../api/README.md)
- [Security Guidelines](../security/README.md)
- [Performance Tuning](../performance/README.md) 