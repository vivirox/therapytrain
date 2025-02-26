// Export types
export {
  MPCConfig,
  MPCParty,
  MPCShare,
  MPCResult,
  MPCMessage,
  MPCMessageType,
  MPCError,
  MPCErrorCode,
  MPCProtocolHandler,
  PreprocessingManager
} from './types';

// Export protocol implementations
export { BaseProtocolHandler } from './base-protocol';
export { MascotProtocolHandler } from './mascot-protocol';

// Export version
export const VERSION = '1.0.0'; 