import { promises as fs } from 'fs';
import { join } from 'path';
import { MPCProtocol, MPCError, MPCErrorType } from '../types';
import {
  createPreprocessingManager,
  PreprocessingDataType,
  PreprocessingData,
  PreprocessingMetadata
} from '../preprocessing';

describe('Preprocessing Data Management', () => {
  const testDir = join(__dirname, 'test-preprocessing');
  const prime = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  const bitLength = 64;

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('MASCOT Preprocessing Manager', () => {
    const manager = createPreprocessingManager(
      MPCProtocol.MASCOT,
      0,
      3,
      testDir,
      prime
    );

    it('should generate preprocessing data', async () => {
      const data = await manager.generateData(PreprocessingDataType.TRIPLES, 100);
      expect(data).toBeDefined();
      expect(data.metadata.type).toBe(PreprocessingDataType.TRIPLES);
      expect(data.metadata.protocol).toBe(MPCProtocol.MASCOT);
      expect(data.metadata.field).toBe(prime);
      expect(data.data).toBeInstanceOf(Uint8Array);
    });

    it('should store and load preprocessing data', async () => {
      const data = await manager.generateData(PreprocessingDataType.BITS, 100);
      await manager.storeData(data);

      const loadedData = await manager.loadData(PreprocessingDataType.BITS);
      expect(loadedData.metadata.type).toBe(data.metadata.type);
      expect(loadedData.metadata.protocol).toBe(data.metadata.protocol);
      expect(loadedData.metadata.hash).toBe(data.metadata.hash);
      expect(loadedData.data).toEqual(data.data);
    });

    it('should validate preprocessing data', async () => {
      const data = await manager.generateData(PreprocessingDataType.SQUARES, 100);
      expect(await manager.validateData(data)).toBe(true);

      // Test with invalid data
      const invalidData: PreprocessingData = {
        metadata: {
          type: PreprocessingDataType.SQUARES,
          protocol: MPCProtocol.SPDZ2K, // Wrong protocol
          timestamp: Date.now(),
          partyId: 0,
          numParties: 3,
          hash: 'invalid-hash'
        },
        data: new Uint8Array(32)
      };
      expect(await manager.validateData(invalidData)).toBe(false);
    });

    it('should cleanup old preprocessing data', async () => {
      const data = await manager.generateData(PreprocessingDataType.INPUTS, 100);
      await manager.storeData(data);

      // Create an old file
      const oldData = await manager.generateData(PreprocessingDataType.INPUTS, 100);
      const oldMetadata: PreprocessingMetadata = {
        ...oldData.metadata,
        timestamp: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      };
      const oldFilename = `${oldMetadata.protocol}_${oldMetadata.type}_${oldMetadata.partyId}_${oldMetadata.timestamp}.dat`;
      await fs.writeFile(join(testDir, oldFilename), Buffer.from(oldData.data));

      await manager.cleanupOldData();

      // Check that old file is removed
      await expect(fs.access(join(testDir, oldFilename))).rejects.toThrow();
    });
  });

  describe('SPDZ2k Preprocessing Manager', () => {
    const manager = createPreprocessingManager(
      MPCProtocol.SPDZ2K,
      0,
      3,
      testDir,
      undefined,
      bitLength
    );

    it('should generate preprocessing data', async () => {
      const data = await manager.generateData(PreprocessingDataType.TRIPLES, 100);
      expect(data).toBeDefined();
      expect(data.metadata.type).toBe(PreprocessingDataType.TRIPLES);
      expect(data.metadata.protocol).toBe(MPCProtocol.SPDZ2K);
      expect(data.metadata.bitLength).toBe(bitLength);
      expect(data.data).toBeInstanceOf(Uint8Array);
    });

    it('should store and load preprocessing data', async () => {
      const data = await manager.generateData(PreprocessingDataType.BITS, 100);
      await manager.storeData(data);

      const loadedData = await manager.loadData(PreprocessingDataType.BITS);
      expect(loadedData.metadata.type).toBe(data.metadata.type);
      expect(loadedData.metadata.protocol).toBe(data.metadata.protocol);
      expect(loadedData.metadata.hash).toBe(data.metadata.hash);
      expect(loadedData.data).toEqual(data.data);
    });
  });

  describe('Semi2k Preprocessing Manager', () => {
    const manager = createPreprocessingManager(
      MPCProtocol.SEMI2K,
      0,
      3,
      testDir
    );

    it('should generate preprocessing data', async () => {
      const data = await manager.generateData(PreprocessingDataType.TRIPLES, 100);
      expect(data).toBeDefined();
      expect(data.metadata.type).toBe(PreprocessingDataType.TRIPLES);
      expect(data.metadata.protocol).toBe(MPCProtocol.SEMI2K);
      expect(data.data).toBeInstanceOf(Uint8Array);
    });

    it('should store and load preprocessing data', async () => {
      const data = await manager.generateData(PreprocessingDataType.BITS, 100);
      await manager.storeData(data);

      const loadedData = await manager.loadData(PreprocessingDataType.BITS);
      expect(loadedData.metadata.type).toBe(data.metadata.type);
      expect(loadedData.metadata.protocol).toBe(data.metadata.protocol);
      expect(loadedData.metadata.hash).toBe(data.metadata.hash);
      expect(loadedData.data).toEqual(data.data);
    });
  });

  describe('Preprocessing Manager Factory', () => {
    it('should create appropriate manager for each protocol', () => {
      expect(createPreprocessingManager(MPCProtocol.MASCOT, 0, 3, testDir, prime)).toBeDefined();
      expect(createPreprocessingManager(MPCProtocol.SPDZ2K, 0, 3, testDir, undefined, bitLength)).toBeDefined();
      expect(createPreprocessingManager(MPCProtocol.SEMI2K, 0, 3, testDir)).toBeDefined();
    });

    it('should throw error for SPDZ2k without bit length', () => {
      expect(() => createPreprocessingManager(MPCProtocol.SPDZ2K, 0, 3, testDir))
        .toThrow(new MPCError(MPCErrorType.INITIALIZATION_ERROR, 'SPDZ2k requires bit length parameter'));
    });

    it('should throw error for unsupported protocol', () => {
      expect(() => createPreprocessingManager('unsupported' as MPCProtocol, 0, 3, testDir))
        .toThrow(new MPCError(MPCErrorType.INITIALIZATION_ERROR, 'Unsupported protocol: unsupported'));
    });
  });
}); 