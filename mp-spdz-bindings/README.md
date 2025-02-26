# MP-SPDZ TypeScript Bindings

TypeScript bindings for the MP-SPDZ secure multi-party computation framework.

## Features

- Secure multi-party computation (MPC) protocols
- MASCOT protocol implementation for maliciously secure computation
- Support for basic arithmetic operations (addition, multiplication)
- Secure comparison operations
- Message Authentication Codes (MACs) for security
- Preprocessing phase management
- WebSocket-based party communication
- TypeScript type definitions for all components

## Prerequisites

- Node.js 22+
- MP-SPDZ installation (see [MP-SPDZ repository](https://github.com/data61/MP-SPDZ))
- TypeScript 5.0+
- WebSocket support

## Installation

- Install dependencies:

```bash
pnpm install
```

- Build the TypeScript code:

```bash
pnpm build
```

## Usage

### Basic Example

```typescript
import { MascotProtocolHandler } from 'mp-spdz-bindings';
import { MPCConfig } from 'mp-spdz-bindings/types';

// Configure the MPC protocol
const config: MPCConfig = {
  numParties: 3,
  threshold: 2,
  fieldSize: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'),
  preprocessingBatchSize: 1000,
  messageTimeout: 5000,
  protocolType: 'MASCOT'
};

// Create protocol handler
const handler = new MascotProtocolHandler(config);

// Share a value
const value = 'secret';
const shares = await handler.share(value);

// Perform computation on shares
const a = shares[0];
const b = shares[1];
const product = await handler.multiply(a, b);

// Reconstruct the result
const result = await handler.reconstruct([product]);
console.log('Result:', result.value);
```

### Advanced Usage

#### Secure Comparison

```typescript
// Compare two shared values
const comparison = await handler.compare(shareA, shareB);
const result = await handler.reconstruct([comparison]);

// result.value will be:
// 1 if shareA > shareB
// 0 if shareA = shareB
// -1 if shareA < shareB
```

#### Custom Preprocessing

```typescript
// Generate multiplication triples
await handler.preprocessingManager.generateTriples(1000);

// Generate random bits
await handler.preprocessingManager.generateBits(1000);
```

## Security Considerations

- The MASCOT protocol provides security against malicious adversaries
- All operations use Message Authentication Codes (MACs)
- Secure channels are established using TLS
- Proper error handling for security violations
- Zero-knowledge proofs for result verification

## Testing

Run the test suite:

```bash
pnpm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [MP-SPDZ](https://github.com/data61/MP-SPDZ) - The underlying MPC framework
- [WebSocket](https://github.com/websockets/ws) - WebSocket client and server implementation
- [node-forge](https://github.com/digitalbazaar/forge) - Native implementation of TLS
