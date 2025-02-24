import { SecureMultiPartyComputation, MPCConfig } from '../secure-computation';

// Mock JIFF library
jest.mock('jiff-mpc', () => {
  return {
    JIFFClient: jest.fn().mockImplementation((serverUrl, computationId, options) => {
      return {
        id: 1,
        share: jest.fn().mockImplementation((value) => value),
        open: jest.fn().mockImplementation((share) => share),
        add: jest.fn().mockImplementation((a, b) => a.map((v: number, i: number) => v + b[i])),
        multiply: jest.fn().mockImplementation((a, b) => a.map((v: number, i: number) => v * b[i])),
        lt: jest.fn().mockImplementation((a, b) => a.map((v: number, i: number) => v < b[i] ? 1 : 0)),
        wait_for_all_connections: jest.fn().mockImplementation((callback) => callback()),
        on: jest.fn(),
        disconnect: jest.fn()
      };
    })
  };
});

describe('SecureMultiPartyComputation', () => {
  let mpc: SecureMultiPartyComputation;
  
  beforeEach(async () => {
    const config: MPCConfig = {
      computationId: 'test-computation',
      partyCount: 3,
      threshold: 2,
      zp: 16777729
    };
    mpc = SecureMultiPartyComputation.getInstance(config);
    await mpc.initialize('ws://localhost:8080');
  });

  afterEach(() => {
    mpc.destroy();
  });

  describe('Initialization', () => {
    it('should initialize MPC instance', async () => {
      expect(mpc['ready']).toBe(true);
      expect(mpc['jiffInstance']).toBeDefined();
      expect(mpc.getConnectedParties()).toHaveLength(1);
    });

    it('should handle initialization errors', async () => {
      const errorMpc = SecureMultiPartyComputation.getInstance({
        computationId: 'error-test',
        partyCount: 3
      });

      // Mock error event
      const mockJIFFClient = require('jiff-mpc').JIFFClient;
      mockJIFFClient.mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      await expect(errorMpc.initialize('ws://invalid')).rejects.toThrow();
    });
  });

  describe('Secret Sharing', () => {
    it('should share secret values', async () => {
      const value = [1, 2, 3];
      const receivers = [1, 2];
      
      const share = await mpc.share(value, receivers);
      
      expect(share.value).toEqual(value);
      expect(share.holders).toEqual(receivers);
      expect(share.threshold).toBe(2);
      expect(share.Zp).toBe(16777729);
    });

    it('should handle sharing errors when not initialized', async () => {
      const uninitializedMpc = SecureMultiPartyComputation.getInstance({
        computationId: 'uninitialized',
        partyCount: 3
      });

      await expect(uninitializedMpc.share([1, 2, 3]))
        .rejects
        .toThrow('MPC instance not initialized');
    });
  });

  describe('Secure Operations', () => {
    it('should perform secure addition', async () => {
      const share1 = await mpc.share([1, 2, 3]);
      const share2 = await mpc.share([4, 5, 6]);
      
      const result = await mpc.add(share1, share2);
      const opened = await mpc.open(result);
      
      expect(opened.value).toEqual([5, 7, 9]);
    });

    it('should perform secure multiplication', async () => {
      const share1 = await mpc.share([2, 3, 4]);
      const share2 = await mpc.share([3, 4, 5]);
      
      const result = await mpc.multiply(share1, share2);
      const opened = await mpc.open(result);
      
      expect(opened.value).toEqual([6, 12, 20]);
    });

    it('should perform secure comparison', async () => {
      const share1 = await mpc.share([1, 4, 3]);
      const share2 = await mpc.share([2, 3, 3]);
      
      const result = await mpc.lessThan(share1, share2);
      const opened = await mpc.open(result);
      
      expect(opened.value).toEqual([1, 0, 0]); // 1 < 2, 4 !< 3, 3 !< 3
    });
  });

  describe('Result Opening', () => {
    it('should open shared values with proof', async () => {
      const share = await mpc.share([1, 2, 3]);
      const result = await mpc.open(share);
      
      expect(result.value).toEqual([1, 2, 3]);
      expect(result.proof).toBeDefined();
      expect(result.proof.type).toBe('zk_proof');
      expect(result.metadata.computation).toBe('test-computation');
    });

    it('should include all participating parties in metadata', async () => {
      const share = await mpc.share([1, 2, 3], [1, 2, 3]);
      const result = await mpc.open(share);
      
      expect(result.metadata.parties).toBeDefined();
      expect(result.metadata.timestamp).toBeDefined();
    });
  });

  describe('Party Management', () => {
    it('should track connected parties', () => {
      const parties = mpc.getConnectedParties();
      expect(parties).toHaveLength(1);
      expect(parties[0].connected).toBe(true);
      expect(parties[0].ready).toBe(true);
    });

    it('should check quorum readiness', () => {
      expect(mpc.isQuorumReady()).toBe(false); // Only 1 party connected, need 2
      
      // Simulate another party connecting
      mpc['updatePartyStatus'](2, true);
      expect(mpc.isQuorumReady()).toBe(true);
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources on destroy', () => {
      mpc.destroy();
      expect(mpc['ready']).toBe(false);
      expect(mpc['parties'].size).toBe(0);
      expect(mpc['jiffInstance'].disconnect).toHaveBeenCalled();
    });

    it('should handle multiple destroy calls', () => {
      mpc.destroy();
      mpc.destroy(); // Should not throw
      expect(mpc['ready']).toBe(false);
    });
  });
}); 