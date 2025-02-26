import { MPCProtocol, MPCShare, NetworkMessage, MessageMetadata, MPCError, MPCErrorType } from '../types';
import { createProtocolHandler, ProtocolMessageType } from '../protocol-handlers';

describe('Protocol Handlers', () => {
  const mockMetadata: MessageMetadata = {
    timestamp: Date.now(),
    sequence: 1,
    sessionId: 'test-session'
  };

  const mockShare: MPCShare = {
    id: 'test-share',
    partyId: 0,
    value: new Uint8Array([1, 2, 3, 4]),
    metadata: {
      type: 'arithmetic',
      field: BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
    }
  };

  describe('MASCOT Protocol Handler', () => {
    const handler = createProtocolHandler(MPCProtocol.MASCOT);

    it('should handle share messages', async () => {
      const message: NetworkMessage<MPCShare> = {
        type: ProtocolMessageType.SHARE,
        sender: 0,
        receiver: 1,
        data: mockShare,
        metadata: mockMetadata
      };

      await expect(handler.handleShare(message)).resolves.not.toThrow();
    });

    it('should handle multiplication messages', async () => {
      const message: NetworkMessage<{a: MPCShare, b: MPCShare}> = {
        type: ProtocolMessageType.MULTIPLICATION,
        sender: 0,
        data: { a: mockShare, b: mockShare },
        metadata: mockMetadata
      };

      const result = await handler.handleMultiplication(message);
      expect(result).toBeDefined();
      expect(result.partyId).toBe(0);
      expect(result.value).toBeInstanceOf(Uint8Array);
    });

    it('should handle comparison messages', async () => {
      const message: NetworkMessage<{a: MPCShare, b: MPCShare}> = {
        type: ProtocolMessageType.COMPARISON,
        sender: 0,
        data: { a: mockShare, b: mockShare },
        metadata: mockMetadata
      };

      const result = await handler.handleComparison(message);
      expect(result).toBeDefined();
      expect(result.partyId).toBe(0);
      expect(result.value).toBeInstanceOf(Uint8Array);
    });

    it('should validate messages', () => {
      const message: NetworkMessage = {
        type: ProtocolMessageType.SHARE,
        sender: 0,
        data: mockShare,
        metadata: mockMetadata
      };

      expect(handler.validateMessage(message)).toBe(true);
    });
  });

  describe('SPDZ2k Protocol Handler', () => {
    const handler = createProtocolHandler(MPCProtocol.SPDZ2K);

    it('should handle share messages', async () => {
      const message: NetworkMessage<MPCShare> = {
        type: ProtocolMessageType.SHARE,
        sender: 0,
        receiver: 1,
        data: mockShare,
        metadata: mockMetadata
      };

      await expect(handler.handleShare(message)).resolves.not.toThrow();
    });

    it('should handle multiplication messages', async () => {
      const message: NetworkMessage<{a: MPCShare, b: MPCShare}> = {
        type: ProtocolMessageType.MULTIPLICATION,
        sender: 0,
        data: { a: mockShare, b: mockShare },
        metadata: mockMetadata
      };

      const result = await handler.handleMultiplication(message);
      expect(result).toBeDefined();
      expect(result.partyId).toBe(0);
      expect(result.value).toBeInstanceOf(Uint8Array);
    });

    it('should validate messages', () => {
      const message: NetworkMessage = {
        type: ProtocolMessageType.SHARE,
        sender: 0,
        data: mockShare,
        metadata: mockMetadata
      };

      expect(handler.validateMessage(message)).toBe(true);
    });
  });

  describe('Semi2k Protocol Handler', () => {
    const handler = createProtocolHandler(MPCProtocol.SEMI2K);

    it('should handle share messages', async () => {
      const message: NetworkMessage<MPCShare> = {
        type: ProtocolMessageType.SHARE,
        sender: 0,
        receiver: 1,
        data: mockShare,
        metadata: mockMetadata
      };

      await expect(handler.handleShare(message)).resolves.not.toThrow();
    });

    it('should handle multiplication messages', async () => {
      const message: NetworkMessage<{a: MPCShare, b: MPCShare}> = {
        type: ProtocolMessageType.MULTIPLICATION,
        sender: 0,
        data: { a: mockShare, b: mockShare },
        metadata: mockMetadata
      };

      const result = await handler.handleMultiplication(message);
      expect(result).toBeDefined();
      expect(result.partyId).toBe(0);
      expect(result.value).toBeInstanceOf(Uint8Array);
    });

    it('should validate messages', () => {
      const message: NetworkMessage = {
        type: ProtocolMessageType.SHARE,
        sender: 0,
        data: mockShare,
        metadata: mockMetadata
      };

      expect(handler.validateMessage(message)).toBe(true);
    });
  });

  describe('Protocol Handler Factory', () => {
    it('should create appropriate handler for each protocol', () => {
      expect(createProtocolHandler(MPCProtocol.MASCOT)).toBeDefined();
      expect(createProtocolHandler(MPCProtocol.SPDZ2K)).toBeDefined();
      expect(createProtocolHandler(MPCProtocol.SEMI2K)).toBeDefined();
    });

    it('should throw error for unsupported protocol', () => {
      expect(() => createProtocolHandler('unsupported' as MPCProtocol))
        .toThrow(new MPCError(MPCErrorType.INITIALIZATION_ERROR, 'Unsupported protocol: unsupported'));
    });
  });
}); 