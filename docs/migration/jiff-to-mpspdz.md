# Migrating from JIFF to MP-SPDZ

This guide helps you migrate your existing JIFF-based secure multi-party computation (MPC) applications to our MP-SPDZ TypeScript bindings.

## Overview

The migration process involves:

1. Replacing JIFF dependencies with MP-SPDZ bindings
2. Using the JIFF adapter for compatibility
3. Optimizing for MP-SPDZ protocols

## Step-by-Step Migration

### 1. Update Dependencies

Replace JIFF dependencies in your `package.json`:

```json
{
  "dependencies": {
    // Remove JIFF dependencies
    // "jiff": "x.x.x",
    // "jiff-mpc": "x.x.x",
    
    // Add MP-SPDZ dependencies
    "@gradiant/mp-spdz-bindings": "^1.0.0"
  }
}
```

### 2. Install System Dependencies

MP-SPDZ requires several system dependencies:

```bash
# Ubuntu/Debian
sudo apt-get install automake build-essential clang cmake git \
  libboost-dev libgmp-dev libntl-dev libsodium-dev libssl-dev \
  libtool python3 libstdc++-12-dev

# macOS
brew install automake boost cmake gmp libsodium libtool ntl python3
```

### 3. Replace JIFF Imports

Update your imports to use the JIFF adapter:

```typescript
// Old JIFF code
import * as jiff from 'jiff-mpc';

// New MP-SPDZ code
import { JIFFAdapter, JIFFAdapterConfig } from '@gradiant/mp-spdz-bindings';
```

### 4. Initialize the Adapter

Replace JIFF initialization with the adapter:

```typescript
// Old JIFF code
const jiffInstance = new jiff.JIFFClient('http://localhost:8080', 'computation-id', {
  party_id: 1,
  party_count: 3
});

// New MP-SPDZ code
const config: JIFFAdapterConfig = {
  partyId: 1,
  numParties: 3,
  threshold: 1,
  protocol: MPCProtocol.SEMI2K // Or MASCOT/SPDZ2K based on security needs
};
const adapter = new JIFFAdapter(config);
```

### 5. Update Share Operations

The adapter provides JIFF-compatible share operations:

```typescript
// Old JIFF code
const share = await jiffInstance.share(42);
const opened = await share.open();

// New MP-SPDZ code
const share = await adapter.share(42);
const opened = await adapter.open(share);
```

### 6. Update Arithmetic Operations

Arithmetic operations have similar interfaces:

```typescript
// Old JIFF code
const sum = share1.add(share2);
const product = share1.mult(share2);

// New MP-SPDZ code
const sum = await adapter.add(share1, share2);
const product = await adapter.multiply(share1, share2);
```

### 7. Update Comparison Operations

Comparison operations are also similar:

```typescript
// Old JIFF code
const lessThan = share1.lt(share2);
const greaterThan = share1.gt(share2);
const equals = share1.eq(share2);

// New MP-SPDZ code
const lessThan = await adapter.lessThan(share1, share2);
const greaterThan = await adapter.greaterThan(share1, share2);
const equals = await adapter.equals(share1, share2);
```

### 8. Update Bitwise Operations

Bitwise operations are supported:

```typescript
// Old JIFF code
const xorResult = share1.xor_bit(share2);
const orResult = share1.or_bit(share2);
const andResult = share1.and_bit(share2);

// New MP-SPDZ code
const xorResult = await adapter.xor(share1, share2);
const orResult = await adapter.or(share1, share2);
const andResult = await adapter.and(share1, share2);
```

## Protocol Selection

Choose the appropriate protocol based on your needs:

1. **MASCOT** (Maximum Security)
   - Use for applications requiring malicious security
   - Best when security is the top priority

   ```typescript
   const config: JIFFAdapterConfig = {
     // ... other config ...
     protocol: MPCProtocol.MASCOT
   };
   ```

2. **SPDZ2k** (Integer Arithmetic)
   - Use for applications with heavy integer computations
   - Good balance of security and performance

   ```typescript
   const config: JIFFAdapterConfig = {
     // ... other config ...
     protocol: MPCProtocol.SPDZ2K
   };
   ```

3. **Semi2k** (Best Performance)
   - Use when all parties are trusted
   - Fastest execution time

   ```typescript
   const config: JIFFAdapterConfig = {
     // ... other config ...
     protocol: MPCProtocol.SEMI2K
   };
   ```

## Performance Optimization

1. **Batch Operations**

   ```typescript
   // Process multiple shares in batches
   const shares = await Promise.all(
     values.map(value => adapter.share(value))
   );
   ```

2. **Preprocessing**

   ```typescript
   // Generate preprocessing data before computation
   await adapter.generatePreprocessing({
     numMultiplications: 1000,
     numComparisons: 500
   });
   ```

3. **Protocol-Specific Optimizations**
   - Use Semi2k for non-critical computations
   - Use SPDZ2k for integer-heavy operations
   - Use MASCOT only when malicious security is required

## Error Handling

The adapter provides comprehensive error handling:

```typescript
try {
  const share = await adapter.share(42);
  const result = await adapter.multiply(share, share);
} catch (error) {
  if (error instanceof MPCError) {
    switch (error.type) {
      case MPCErrorType.PROTOCOL_ERROR:
        // Handle protocol errors
        break;
      case MPCErrorType.NETWORK_ERROR:
        // Handle network errors
        break;
      case MPCErrorType.SECURITY_ERROR:
        // Handle security violations
        break;
    }
  }
}
```

## Testing

Update your tests to use the adapter:

```typescript
describe('MPC Operations', () => {
  let adapter: JIFFAdapter;

  beforeEach(() => {
    adapter = new JIFFAdapter({
      partyId: 0,
      numParties: 3,
      protocol: MPCProtocol.SEMI2K
    });
  });

  it('should perform secure multiplication', async () => {
    const a = await adapter.share(5);
    const b = await adapter.share(3);
    const result = await adapter.multiply(a, b);
    const opened = await adapter.open(result);
    expect(opened).toBe(15n);
  });
});
```

## Common Issues

1. **Share Format**
   - JIFF shares are not directly compatible with MP-SPDZ
   - Always use the adapter's share operations

2. **Asynchronous Operations**
   - MP-SPDZ operations are always asynchronous
   - Use async/await consistently

3. **Protocol Differences**
   - Some JIFF operations might work differently in MP-SPDZ
   - Test thoroughly after migration

## Security Considerations

1. **Protocol Selection**
   - Choose protocols based on security requirements
   - Document security assumptions

2. **Network Security**
   - Use TLS for all connections
   - Implement proper key management

3. **Error Handling**
   - Never ignore security-related errors
   - Log security events appropriately

## Further Resources

- [Protocol Documentation](../protocols/README.md)
- [Security Analysis](../protocols/security/)
- [Performance Benchmarks](../protocols/benchmarks/)
- [Example Applications](../examples/)
