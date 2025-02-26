# MP-SPDZ TypeScript Bindings API Reference

This document provides detailed information about the public API of our MP-SPDZ TypeScript bindings.

## Table of Contents

1. [JIFF Adapter](#jiff-adapter)
2. [Protocol Handlers](#protocol-handlers)
3. [Types and Interfaces](#types-and-interfaces)
4. [Configuration](#configuration)
5. [Error Handling](#error-handling)

## JIFF Adapter

The JIFF adapter provides a JIFF-compatible interface for MP-SPDZ operations.

### JIFFAdapter

```typescript
class JIFFAdapter {
  constructor(config: JIFFAdapterConfig);
  
  // Share Operations
  async share(value: number | bigint): Promise<JIFFShare>;
  async open(share: JIFFShare): Promise<bigint>;
  
  // Arithmetic Operations
  async add(a: JIFFShare, b: JIFFShare): Promise<JIFFShare>;
  async subtract(a: JIFFShare, b: JIFFShare): Promise<JIFFShare>;
  async multiply(a: JIFFShare, b: JIFFShare): Promise<JIFFShare>;
  
  // Comparison Operations
  async lessThan(a: JIFFShare, b: JIFFShare): Promise<JIFFShare>;
  async greaterThan(a: JIFFShare, b: JIFFShare): Promise<JIFFShare>;
  async equals(a: JIFFShare, b: JIFFShare): Promise<JIFFShare>;
  
  // Bitwise Operations
  async xor(a: JIFFShare, b: JIFFShare): Promise<JIFFShare>;
  async and(a: JIFFShare, b: JIFFShare): Promise<JIFFShare>;
  async or(a: JIFFShare, b: JIFFShare): Promise<JIFFShare>;
}
```

### JIFFAdapterConfig

```typescript
interface JIFFAdapterConfig {
  partyId: number;
  numParties: number;
  threshold: number;
  protocol: MPCProtocol;
  prime?: bigint; // Optional, defaults to 2^64 - 1
}
```

### JIFFShare

```typescript
interface JIFFShare {
  value: number | bigint;
  sender: number;
  receivers: number[];
  threshold: number;
  Zp: bigint;
}
```

## Protocol Handlers

Protocol handlers implement the core MPC functionality for each supported protocol.

### ProtocolHandler

```typescript
interface ProtocolHandler {
  protocol: MPCProtocol;
  
  // Message Handlers
  handleShare(message: NetworkMessage<MPCShare>): Promise<void>;
  handleMultiplication(message: NetworkMessage<{a: MPCShare, b: MPCShare}>): Promise<MPCShare>;
  handleComparison(message: NetworkMessage<{a: MPCShare, b: MPCShare}>): Promise<MPCShare>;
  handlePreprocessing(message: NetworkMessage<{type: string, data: Uint8Array}>): Promise<void>;
  handleSync(message: NetworkMessage): Promise<void>;
  handleProof(message: NetworkMessage<ProofData>): Promise<boolean>;
  
  // Validation
  validateMessage(message: NetworkMessage): boolean;
}
```

### Protocol-Specific Handlers

#### MASCOTHandler

```typescript
class MASCOTHandler implements ProtocolHandler {
  // Implements ProtocolHandler interface with MASCOT-specific logic
  // Provides malicious security with MAC-based verification
}
```

#### SPDZ2kHandler

```typescript
class SPDZ2kHandler implements ProtocolHandler {
  // Implements ProtocolHandler interface with SPDZ2k-specific logic
  // Optimized for k-bit integer arithmetic
}
```

#### Semi2kHandler

```typescript
class Semi2kHandler implements ProtocolHandler {
  // Implements ProtocolHandler interface with Semi2k-specific logic
  // Provides semi-honest security without MACs
}
```

## Types and Interfaces

### MPCProtocol

```typescript
enum MPCProtocol {
  MASCOT = 'mascot',
  SPDZ2K = 'spdz2k',
  SEMI2K = 'semi2k'
}
```

### MPCShare

```typescript
interface MPCShare {
  id: string;
  partyId: number;
  value: Uint8Array;
  metadata: {
    type: string;
    bitLength: number;
    verified: boolean;
  };
}
```

### NetworkMessage

```typescript
interface NetworkMessage<T = any> {
  type: ProtocolMessageType;
  sender: number;
  receiver?: number;
  data: T;
  metadata: MessageMetadata;
}
```

### MessageMetadata

```typescript
interface MessageMetadata {
  timestamp: number;
  sequence: number;
  sessionId: string;
}
```

### ProofData

```typescript
interface ProofData {
  type: string;
  data: Uint8Array;
  challenge?: Uint8Array;
  response?: Uint8Array;
}
```

## Configuration

### TestConfig

```typescript
interface TestConfig {
  protocol: MPCProtocol;
  numParties: number;
  basePort: number;
  preprocessingDir: string;
  binaryDir: string;
}
```

## Error Handling

### MPCError

```typescript
class MPCError extends Error {
  constructor(type: MPCErrorType, message: string);
  readonly type: MPCErrorType;
}
```

### MPCErrorType

```typescript
enum MPCErrorType {
  PROTOCOL_ERROR = 'protocol_error',
  NETWORK_ERROR = 'network_error',
  SECURITY_ERROR = 'security_error',
  INITIALIZATION_ERROR = 'initialization_error'
}
```

## Usage Examples

### Basic Share Operations

```typescript
const adapter = new JIFFAdapter({
  partyId: 0,
  numParties: 3,
  threshold: 1,
  protocol: MPCProtocol.SEMI2K
});

// Share a value
const share = await adapter.share(42);

// Open a share
const value = await adapter.open(share);
```

### Arithmetic Operations

```typescript
// Multiplication
const a = await adapter.share(5);
const b = await adapter.share(3);
const product = await adapter.multiply(a, b);
const result = await adapter.open(product); // 15

// Addition
const sum = await adapter.add(a, b);
const sumResult = await adapter.open(sum); // 8
```

### Comparison Operations

```typescript
// Greater than
const isGreater = await adapter.greaterThan(a, b);
const result = await adapter.open(isGreater); // 1 (true)

// Equality
const areEqual = await adapter.equals(a, b);
const equalResult = await adapter.open(areEqual); // 0 (false)
```

## Error Handling2

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

## Performance Considerations

1. **Batch Processing**

   ```typescript
   // Process multiple values in parallel
   const shares = await Promise.all(
     values.map(value => adapter.share(value))
   );
   ```

2. **Protocol Selection**
   - Use SEMI2K for best performance in semi-honest settings
   - Use SPDZ2K for integer-heavy computations
   - Use MASCOT when malicious security is required

3. **Memory Management**
   - Clean up shares when no longer needed
   - Monitor memory usage during large computations
   - Use preprocessing data efficiently

## Security Guidelines

1. **Protocol Selection**
   - Choose protocols based on security requirements
   - Document security assumptions
   - Use MASCOT for maximum security

2. **Network Security**
   - Use TLS for all connections
   - Implement proper key management
   - Validate all messages

3. **Error Handling**
   - Never ignore security-related errors
   - Log security events appropriately
   - Handle timeouts and failures gracefully

## Further Resources

- [Protocol Documentation](../protocols/README.md)
- [JIFF Migration Guide](../migration/jiff-to-mpspdz.md)
- [Security Analysis](../protocols/security/)
- [Performance Benchmarks](../protocols/benchmarks/)
