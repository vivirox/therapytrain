import { MPCProtocol, MPCError, MPCErrorType } from './types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

/**
 * Preprocessing data types
 */
export enum PreprocessingDataType {
  TRIPLES = 'triples',      // Multiplication triples
  BITS = 'bits',           // Random bits
  SQUARES = 'squares',      // Square pairs
  INPUTS = 'inputs'        // Input masks
}

/**
 * Preprocessing data metadata
 */
export interface PreprocessingMetadata {
  type: PreprocessingDataType;
  protocol: MPCProtocol;
  timestamp: number;
  partyId: number;
  numParties: number;
  field?: bigint;
  bitLength?: number;
  hash: string;
}

/**
 * Preprocessing data entry
 */
export interface PreprocessingData {
  metadata: PreprocessingMetadata;
  data: Uint8Array;
}

/**
 * Preprocessing data manager interface
 */
export interface PreprocessingManager {
  generateData(type: PreprocessingDataType, numItems: number): Promise<PreprocessingData>;
  storeData(data: PreprocessingData): Promise<void>;
  loadData(type: PreprocessingDataType): Promise<PreprocessingData>;
  validateData(data: PreprocessingData): Promise<boolean>;
  cleanupOldData(): Promise<void>;
}

/**
 * Base preprocessing manager implementation
 */
export abstract class BasePreprocessingManager implements PreprocessingManager {
  protected constructor(
    protected readonly protocol: MPCProtocol,
    protected readonly partyId: number,
    protected readonly numParties: number,
    protected readonly preprocessingDir: string,
    protected readonly field?: bigint,
    protected readonly bitLength?: number
  ) {}

  abstract generateData(type: PreprocessingDataType, numItems: number): Promise<PreprocessingData>;

  async storeData(data: PreprocessingData): Promise<void> {
    const filename = this.getFilename(data.metadata);
    const filepath = join(this.preprocessingDir, filename);

    try {
      // Validate data before storing
      if (!await this.validateData(data)) {
        throw new MPCError(MPCErrorType.SECURITY_ERROR, 'Invalid preprocessing data');
      }

      // Create preprocessing directory if it doesn't exist
      await fs.mkdir(this.preprocessingDir, { recursive: true });

      // Store data with metadata
      await fs.writeFile(filepath, Buffer.concat([
        Buffer.from(JSON.stringify(data.metadata)),
        Buffer.from([0]), // Separator
        Buffer.from(data.data)
      ]));
    } catch (error) {
      throw new MPCError(MPCErrorType.PROTOCOL_ERROR, 'Failed to store preprocessing data', error);
    }
  }

  async loadData(type: PreprocessingDataType): Promise<PreprocessingData> {
    const pattern = `${this.protocol}_${type}_${this.partyId}_*.dat`;
    const files = await fs.readdir(this.preprocessingDir);
    const matchingFiles = files.filter(f => f.match(pattern));

    if (matchingFiles.length === 0) {
      throw new MPCError(MPCErrorType.PROTOCOL_ERROR, `No preprocessing data found for type ${type}`);
    }

    // Load the most recent file
    const latestFile = matchingFiles.sort().pop()!;
    const filepath = join(this.preprocessingDir, latestFile);

    try {
      const buffer = await fs.readFile(filepath);
      const separatorIndex = buffer.indexOf(0);
      const metadataStr = buffer.slice(0, separatorIndex).toString();
      const metadata = JSON.parse(metadataStr) as PreprocessingMetadata;
      const data = new Uint8Array(buffer.slice(separatorIndex + 1));

      const preprocessingData = { metadata, data };

      // Validate loaded data
      if (!await this.validateData(preprocessingData)) {
        throw new MPCError(MPCErrorType.SECURITY_ERROR, 'Invalid preprocessing data loaded');
      }

      return preprocessingData;
    } catch (error) {
      throw new MPCError(MPCErrorType.PROTOCOL_ERROR, 'Failed to load preprocessing data', error);
    }
  }

  async validateData(data: PreprocessingData): Promise<boolean> {
    // Validate metadata
    if (data.metadata.protocol !== this.protocol ||
        data.metadata.partyId !== this.partyId ||
        data.metadata.numParties !== this.numParties) {
      return false;
    }

    // Validate data hash
    const hash = createHash('sha256')
      .update(data.data)
      .digest('hex');

    if (hash !== data.metadata.hash) {
      return false;
    }

    return true;
  }

  async cleanupOldData(): Promise<void> {
    try {
      const files = await fs.readdir(this.preprocessingDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filepath = join(this.preprocessingDir, file);
        const stats = await fs.stat(filepath);

        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filepath);
        }
      }
    } catch (error) {
      throw new MPCError(MPCErrorType.PROTOCOL_ERROR, 'Failed to cleanup old preprocessing data', error);
    }
  }

  protected getFilename(metadata: PreprocessingMetadata): string {
    return `${metadata.protocol}_${metadata.type}_${metadata.partyId}_${metadata.timestamp}.dat`;
  }
}

/**
 * MASCOT protocol preprocessing manager
 */
export class MASCOTPreprocessingManager extends BasePreprocessingManager {
  constructor(
    partyId: number,
    numParties: number,
    preprocessingDir: string,
    field?: bigint
  ) {
    super(MPCProtocol.MASCOT, partyId, numParties, preprocessingDir, field);
  }

  async generateData(type: PreprocessingDataType, numItems: number): Promise<PreprocessingData> {
    // MASCOT-specific preprocessing data generation
    // This should be implemented according to the MASCOT protocol specifications
    const data = new Uint8Array(numItems * 32); // Placeholder
    const metadata: PreprocessingMetadata = {
      type,
      protocol: this.protocol,
      timestamp: Date.now(),
      partyId: this.partyId,
      numParties: this.numParties,
      field: this.field,
      hash: createHash('sha256').update(data).digest('hex')
    };

    return { metadata, data };
  }
}

/**
 * SPDZ2k protocol preprocessing manager
 */
export class SPDZ2kPreprocessingManager extends BasePreprocessingManager {
  constructor(
    partyId: number,
    numParties: number,
    preprocessingDir: string,
    bitLength: number
  ) {
    super(MPCProtocol.SPDZ2K, partyId, numParties, preprocessingDir, undefined, bitLength);
  }

  async generateData(type: PreprocessingDataType, numItems: number): Promise<PreprocessingData> {
    // SPDZ2k-specific preprocessing data generation
    // This should be implemented according to the SPDZ2k protocol specifications
    const data = new Uint8Array(numItems * 32); // Placeholder
    const metadata: PreprocessingMetadata = {
      type,
      protocol: this.protocol,
      timestamp: Date.now(),
      partyId: this.partyId,
      numParties: this.numParties,
      bitLength: this.bitLength,
      hash: createHash('sha256').update(data).digest('hex')
    };

    return { metadata, data };
  }
}

/**
 * Semi2k protocol preprocessing manager
 */
export class Semi2kPreprocessingManager extends BasePreprocessingManager {
  constructor(
    partyId: number,
    numParties: number,
    preprocessingDir: string
  ) {
    super(MPCProtocol.SEMI2K, partyId, numParties, preprocessingDir);
  }

  async generateData(type: PreprocessingDataType, numItems: number): Promise<PreprocessingData> {
    // Semi2k-specific preprocessing data generation
    // This should be implemented according to the Semi2k protocol specifications
    const data = new Uint8Array(numItems * 32); // Placeholder
    const metadata: PreprocessingMetadata = {
      type,
      protocol: this.protocol,
      timestamp: Date.now(),
      partyId: this.partyId,
      numParties: this.numParties,
      hash: createHash('sha256').update(data).digest('hex')
    };

    return { metadata, data };
  }
}

/**
 * Create preprocessing manager based on protocol
 */
export function createPreprocessingManager(
  protocol: MPCProtocol,
  partyId: number,
  numParties: number,
  preprocessingDir: string,
  field?: bigint,
  bitLength?: number
): PreprocessingManager {
  switch (protocol) {
    case MPCProtocol.MASCOT:
      return new MASCOTPreprocessingManager(partyId, numParties, preprocessingDir, field);
    case MPCProtocol.SPDZ2K:
      if (!bitLength) {
        throw new MPCError(MPCErrorType.INITIALIZATION_ERROR, 'SPDZ2k requires bit length parameter');
      }
      return new SPDZ2kPreprocessingManager(partyId, numParties, preprocessingDir, bitLength);
    case MPCProtocol.SEMI2K:
      return new Semi2kPreprocessingManager(partyId, numParties, preprocessingDir);
    default:
      throw new MPCError(MPCErrorType.INITIALIZATION_ERROR, `Unsupported protocol: ${protocol}`);
  }
} 