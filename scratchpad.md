# Lessons

- For website image paths, always use the correct relative path (e.g., 'images/filename.png') and ensure the images directory exists
- For search results, ensure proper handling of different character encodings (UTF-8) for international queries
- Add debug information to stderr while keeping the main output clean in stdout for better pipeline integration
- When using seaborn styles in matplotlib, use 'seaborn-v0_8' instead of 'seaborn' as the style name due to recent seaborn version changes
- When using Jest, a test suite can fail even if all individual tests pass, typically due to issues in suite-level setup code or lifecycle hooks
- When using snarkjs.zKey.exportSolidityVerifier, it requires two arguments: the zkey file path and an options object with the template path. The template path should be specified in the format { groth16: 'path/to/template.sol' }
- When using circom circuits, array inputs must match the exact size specified in the circuit. For example, if a circuit expects a 256-bit public key as input signal therapistPubKey[256], you must provide an array of exactly 256 bits.
- When working with EdDSA signatures in circom, you need to provide the signature components (R8 point and S) as arrays of bits, not as private keys. For example, therapistSigR8[256] and therapistSigS[256] for a 256-bit EdDSA signature.
- When working with snarkjs verification, the verification key (vKey) needs to be loaded from the saved JSON file before verification, even if it was generated earlier in the same script. Variables defined in try-catch blocks have block scope, so they need to be reloaded when used in a different scope
- In SecurityAuditService, the method for recording alerts is called `recordAlert` (not `logAlert`) and takes three parameters: alertType, severity, and details
- When using circomlibjs in TypeScript projects, you need to install @types/circomlibjs for proper type support: `npm install --save-dev @types/circomlibjs --legacy-peer-deps`
- When using external JavaScript/TypeScript modules without type definitions, create a custom .d.ts file in src/types and add the directory to typeRoots in tsconfig.json
- When using external libraries in TypeScript that don't have type definitions, create a custom declaration file (.d.ts) in src/types and add the directory to typeRoots in tsconfig.json
- When using circomlib's EdDSA implementation with TypeScript, either create proper type definitions or use type assertions (as any) for methods like pubKey2Bits, r8Bits, and sBits
- When using Jest with TypeScript and NestJS, ensure all mocked services have their corresponding service files created, even if they're just mocked in tests. The TypeScript compiler needs the actual service files to exist for type checking
- When mocking services in TypeScript tests, ensure all methods being called in the test exist in the actual service class implementation. Added logAccessPattern method to SecurityAuditService to fix TypeScript error.
- When installing npm packages that don't include built-in TypeScript types, install their corresponding @types/* package (e.g., @types/mime for the mime package) using --legacy-peer-deps if there are dependency conflicts
- In RateLimiterService, the suspicious list functionality is implemented with three methods: addToSuspiciousList, isInSuspiciousList, and removeFromSuspiciousList. These methods work together to track and manage potentially malicious IPs or user IDs.
- When implementing test mocks, ensure that all mocked methods actually exist in the service being mocked. If a method is missing, either add it to the service or update the test to use existing methods.
- Added `decreaseLimit` method to RateLimiterService to handle rate limit reduction for suspicious IPs, with a default behavior of halving the current limit.
- Use Bun instead of npm for package management to avoid dependency conflicts and for better performance

# Scratchpad

# Current Task: Setting Up Zero-Knowledge System

## Progress
[X] Set up basic circuit compilation and key generation
[X] Fix ES module imports in setup script
[X] Implement proper promise handling
[X] Add EdDSA key generation and signing for testing
[ ] Test the complete setup process
[ ] Verify proof generation and verification
[ ] Document the setup process

## Notes
- Using snarkjs and circom for the zero-knowledge proof system
- Circuit expects EdDSA signature components (R8 point and S) as arrays of bits
- Need to properly handle async operations throughout the setup process

## Next Steps
1. Run the complete setup script
2. Debug any remaining issues
3. Document the process in README

## Current Status
We've created three key files:
1. `/src/circuits/session_integrity.circom`: Main circuit implementation
   - Implements session data verification
   - Includes metrics validation
   - Handles timestamp checks
   - Verifies therapist authorization

2. `/src/circuits/__tests__/session_integrity.test.ts`: Test suite
   - Tests valid session data
   - Tests invalid durations
   - Tests invalid metrics
   - Tests timestamp validation
   - Tests authorization checks

3. Updated `/scripts/setup_zk.ts`: Enhanced setup script
   - Added optimization flags
   - Improved key generation process
   - Added circuit statistics analysis
   - Implemented example proof generation

## Current Blocker
Need to resolve dependency installation issues. Previous attempts failed with:
- Peer dependency conflicts with vite versions
- Need to try alternative approaches:
  1. Install dependencies one by one
  2. Use bun instead of npm
  3. Check for compatible versions

## Next Steps
1. [ ] Resolve dependency installation:
   - Try installing dependencies individually
   - Verify version compatibility
   - Consider using bun

2. [ ] Once dependencies are installed:
   - Run circuit compilation
   - Execute test suite
   - Generate initial proving key
   - Verify example proof generation

3. [ ] Then proceed with:
   - Implementing remaining constraint systems
   - Setting up key management infrastructure
   - Adding performance optimizations

## Lessons
- Use --legacy-peer-deps or --force with npm when dealing with peer dependency conflicts
- Check version compatibility before bulk installing dependencies
- Consider using bun for better dependency resolution
- Keep track of failed installation attempts to avoid repeating them

# Task Analysis: Next Priority

## Current Completion Status
1. Core Platform Features: 95%
2. Educational & Support Systems: 85%
3. AI & Machine Learning: 85%
4. Security & Privacy: 80%

## Areas Needing Most Attention
1. Zero-Knowledge Implementation (65%)
   - Production ZK System (0%)
   - Additional Proof Types (0%)
   - Audit System (0%)
   - Security Monitoring (0%)

2. Peer Learning Features (60%)
   - Peer review process
   - Mentorship matching
   - Collaborative exercises

## Priority Analysis

### High Impact, Low Completion:
1. Zero-Knowledge Implementation
   - Critical for platform security
   - Many incomplete core components
   - Blocks other security features

2. Peer Learning Features
   - Important for user engagement
   - Enhances platform value
   - Relatively independent of other systems

### Dependencies:
1. ZK Implementation dependencies:
   - Affects overall security
   - Required for advanced privacy features
   - Impacts compliance and audit capabilities

2. Peer Learning dependencies:
   - More isolated feature set
   - Can be developed in parallel
   - Less critical for core functionality

## Recommendation
Focus on Zero-Knowledge Implementation next because:
1. Lowest completion percentage (65%)
2. Critical for platform security
3. Blocks other advanced features
4. Required for compliance and audit capabilities

### Suggested Next Steps:
1. Start with Production ZK System
   - Circuit compilation setup
   - Proving key generation
   - Verification key distribution
   - Performance optimization

This will provide the foundation needed for:
- Additional proof types
- Audit system implementation
- Security monitoring enhancements