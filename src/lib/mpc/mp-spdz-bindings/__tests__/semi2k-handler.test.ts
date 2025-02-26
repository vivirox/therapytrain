import { Semi2kHandler } from '../protocol-handlers';
import { MPCProtocol, MPCShare, NetworkMessage, MessageMetadata, MPCError, MPCErrorType, ProtocolMessageType } from '../types';

describe('Semi2k Protocol Handler', () => {
  let handler: Semi2kHandler;
  let mockMetadata: MessageMetadata;
  let mockShare: MPCShare;

  beforeEach(() => {
    handler = new Semi2kHandler();
    mockMetadata = {
      timestamp: Date.now(),
      sequence: 1,
      sessionId: 'test-session'
    };
    mockShare = {
      id: 'test-share',
      partyId: 0,
      value: new Uint8Array(8),
      metadata: {
        type: 'share',
        bitLength: 64,
        verified: false
      }
    };
  });

  describe('handleShare', () => {
    it('should store valid share messages', async () => {
      const message: NetworkMessage<MPCShare> = {
        type: ProtocolMessageType.SHARE,
        sender: 0,
        data: mockShare,
        metadata: mockMetadata
      };

      await expect(handler.handleShare(message)).resolves.not.toThrow();
    });

    it('should reject invalid share messages', async () => {
      const message: NetworkMessage<MPCShare> = {
        type: ProtocolMessageType.SHARE,
        sender: -1, // Invalid sender
        data: mockShare,
        metadata: mockMetadata
      };

      await expect(handler.handleShare(message)).rejects.toThrow(MPCError);
    });
  });

  describe('handleMultiplication', () => {
    it('should correctly multiply shares', async () => {
      // Create shares for 5 and 3
      const shareA = { ...mockShare, id: 'share-a' };
      const shareB = { ...mockShare, id: 'share-b' };
      
      // Set values using DataView
      new DataView(shareA.value.buffer).setBigUint64(0, 5n, true);
      new DataView(shareB.value.buffer).setBigUint64(0, 3n, true);

      const message: NetworkMessage<{a: MPCShare, b: MPCShare}> = {
        type: ProtocolMessageType.MULTIPLICATION,
        sender: 0,
        data: { a: shareA, b: shareB },
        metadata: mockMetadata
      };

      const result = await handler.handleMultiplication(message);
      
      // Check result (should be 15)
      const resultValue = new DataView(result.value.buffer).getBigUint64(0, true);
      expect(resultValue).toBe(15n);
      expect(result.metadata?.type).toBe('multiplication');
      expect(result.metadata?.bitLength).toBe(64);
    });

    it('should handle large numbers correctly', async () => {
      const shareA = { ...mockShare, id: 'share-a' };
      const shareB = { ...mockShare, id: 'share-b' };
      
      // Set large values
      new DataView(shareA.value.buffer).setBigUint64(0, 0xFFFFFFFFn, true);
      new DataView(shareB.value.buffer).setBigUint64(0, 2n, true);

      const message: NetworkMessage<{a: MPCShare, b: MPCShare}> = {
        type: ProtocolMessageType.MULTIPLICATION,
        sender: 0,
        data: { a: shareA, b: shareB },
        metadata: mockMetadata
      };

      const result = await handler.handleMultiplication(message);
      const resultValue = new DataView(result.value.buffer).getBigUint64(0, true);
      expect(resultValue).toBe(0xFFFFFFFFn * 2n);
    });
  });

  describe('handleComparison', () => {
    it('should correctly compare shares', async () => {
      const shareA = { ...mockShare, id: 'share-a' };
      const shareB = { ...mockShare, id: 'share-b' };
      
      // Set values: 5 > 3
      new DataView(shareA.value.buffer).setBigUint64(0, 5n, true);
      new DataView(shareB.value.buffer).setBigUint64(0, 3n, true);

      const message: NetworkMessage<{a: MPCShare, b: MPCShare}> = {
        type: ProtocolMessageType.COMPARISON,
        sender: 0,
        data: { a: shareA, b: shareB },
        metadata: mockMetadata
      };

      const result = await handler.handleComparison(message);
      const resultValue = new DataView(result.value.buffer).getBigUint64(0, true);
      expect(resultValue).toBe(1n); // 5 > 3 should return 1
      expect(result.metadata?.type).toBe('comparison');
      expect(result.metadata?.bitLength).toBe(1);
    });

    it('should handle equal values correctly', async () => {
      const shareA = { ...mockShare, id: 'share-a' };
      const shareB = { ...mockShare, id: 'share-b' };
      
      // Set equal values
      new DataView(shareA.value.buffer).setBigUint64(0, 5n, true);
      new DataView(shareB.value.buffer).setBigUint64(0, 5n, true);

      const message: NetworkMessage<{a: MPCShare, b: MPCShare}> = {
        type: ProtocolMessageType.COMPARISON,
        sender: 0,
        data: { a: shareA, b: shareB },
        metadata: mockMetadata
      };

      const result = await handler.handleComparison(message);
      const resultValue = new DataView(result.value.buffer).getBigUint64(0, true);
      expect(resultValue).toBe(0n); // Equal values should return 0
    });
  });

  describe('handlePreprocessing', () => {
    it('should store preprocessing data', async () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      const message: NetworkMessage<{type: string, data: Uint8Array}> = {
        type: ProtocolMessageType.PREPROCESSING,
        sender: 0,
        data: { type: 'random', data },
        metadata: mockMetadata
      };

      await expect(handler.handlePreprocessing(message)).resolves.not.toThrow();
    });
  });

  describe('handleSync', () => {
    it('should handle sync messages', async () => {
      const message: NetworkMessage = {
        type: ProtocolMessageType.SYNC,
        sender: 0,
        data: null,
        metadata: mockMetadata
      };

      await expect(handler.handleSync(message)).resolves.not.toThrow();
    });
  });

  describe('handleProof', () => {
    it('should always return true for proofs in semi-honest setting', async () => {
      const message: NetworkMessage<{type: string, data: Uint8Array}> = {
        type: ProtocolMessageType.PROOF,
        sender: 0,
        data: { type: 'test', data: new Uint8Array([1, 2, 3]) },
        metadata: mockMetadata
      };

      const result = await handler.handleProof(message);
      expect(result).toBe(true);
    });
  });

  describe('validateMessage', () => {
    it('should validate correct messages', () => {
      const message: NetworkMessage = {
        type: ProtocolMessageType.SHARE,
        sender: 0,
        data: mockShare,
        metadata: mockMetadata
      };

      expect(handler.validateMessage(message)).toBe(true);
    });

    it('should reject messages with invalid sender', () => {
      const message: NetworkMessage = {
        type: ProtocolMessageType.SHARE,
        sender: -1,
        data: mockShare,
        metadata: mockMetadata
      };

      expect(handler.validateMessage(message)).toBe(false);
    });

    it('should reject messages with missing metadata', () => {
      const message: NetworkMessage = {
        type: ProtocolMessageType.SHARE,
        sender: 0,
        data: mockShare,
        metadata: {} as MessageMetadata
      };

      expect(handler.validateMessage(message)).toBe(false);
    });
  });
}); 