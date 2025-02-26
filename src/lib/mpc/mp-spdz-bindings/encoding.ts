import { MPCShare, MPCResult, MPCProtocol, MPCError, MPCErrorType } from './types';

/**
 * Encodes numeric values for MP-SPDZ protocol
 * Supports both number[] and bigint[] inputs
 */
export function encodeValue(value: number[] | bigint[], fieldSize?: bigint): Uint8Array {
  // Convert numbers to BigInt if needed
  const bigInts = value.map(v => typeof v === 'number' ? BigInt(v) : v);
  
  // Calculate required bytes per value
  const bytesPerValue = fieldSize 
    ? Math.ceil(fieldSize.toString(2).length / 8)
    : Math.max(...bigInts.map(v => (v.toString(16).length + 1) / 2));

  // Allocate buffer
  const buffer = new Uint8Array(4 + bigInts.length * bytesPerValue);
  
  // Write length
  new DataView(buffer.buffer).setUint32(0, bigInts.length, true);
  
  // Write values
  bigInts.forEach((value, i) => {
    const bytes = valueToBytes(value, bytesPerValue);
    buffer.set(bytes, 4 + i * bytesPerValue);
  });

  return buffer;
}

/**
 * Decodes MP-SPDZ share data
 */
export function decodeShare(data: any): MPCShare {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid share data');
  }

  const { value, holders, threshold, fieldSize } = data;
  
  if (!Array.isArray(holders) || !Array.isArray(value)) {
    throw new Error('Invalid share format');
  }

  return {
    value: value.map(v => BigInt(v)),
    holders: holders.map(Number),
    threshold: Number(threshold),
    fieldSize: fieldSize ? BigInt(fieldSize) : undefined
  };
}

/**
 * Decodes MP-SPDZ computation results
 */
export function decodeResult<T>(data: any): MPCResult<T> {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid result data');
  }

  const { value, proof, metadata } = data;

  return {
    value: Array.isArray(value) 
      ? value.map(v => BigInt(v))
      : value,
    proof: proof ? {
      type: String(proof.type),
      data: new Uint8Array(Object.values(proof.data))
    } : undefined,
    metadata: metadata || {}
  } as MPCResult<T>;
}

/**
 * Converts a BigInt value to a fixed-length byte array
 */
function valueToBytes(value: bigint, byteLength: number): Uint8Array {
  const hex = value.toString(16).padStart(byteLength * 2, '0');
  const bytes = new Uint8Array(byteLength);
  
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, (i + 1) * 2), 16);
  }
  
  return bytes;
}

/**
 * Converts a byte array to a BigInt value
 */
function bytesToValue(bytes: Uint8Array): bigint {
  let hex = '0x';
  bytes.forEach(b => {
    hex += b.toString(16).padStart(2, '0');
  });
  return BigInt(hex);
}

/**
 * Protocol-specific encoding configuration
 */
interface EncodingConfig {
  protocol: MPCProtocol;
  prime?: bigint;
  bitLength?: number;
}

/**
 * Handles protocol-specific value encoding and decoding
 */
export class ValueEncoder {
  constructor(private readonly config: EncodingConfig) {}

  /**
   * Encode a value for the specific protocol
   */
  public encode(value: number[] | bigint[]): Uint8Array {
    switch (this.config.protocol) {
      case MPCProtocol.MASCOT:
        return this.encodeMascot(value);
      case MPCProtocol.SPDZ2K:
        return this.encodeSpdz2k(value);
      case MPCProtocol.SEMI2K:
        return this.encodeSemi2k(value);
      default:
        throw new MPCError(
          MPCErrorType.PROTOCOL_ERROR,
          `Unsupported protocol: ${this.config.protocol}`
        );
    }
  }

  /**
   * Decode a value from the specific protocol format
   */
  public decode<T>(data: Uint8Array): T {
    switch (this.config.protocol) {
      case MPCProtocol.MASCOT:
        return this.decodeMascot<T>(data);
      case MPCProtocol.SPDZ2K:
        return this.decodeSpdz2k<T>(data);
      case MPCProtocol.SEMI2K:
        return this.decodeSemi2k<T>(data);
      default:
        throw new MPCError(
          MPCErrorType.PROTOCOL_ERROR,
          `Unsupported protocol: ${this.config.protocol}`
        );
    }
  }

  /**
   * MASCOT protocol uses arithmetic sharing in a prime field
   */
  private encodeMascot(value: number[] | bigint[]): Uint8Array {
    if (!this.config.prime) {
      throw new MPCError(
        MPCErrorType.PROTOCOL_ERROR,
        'Prime field size required for MASCOT protocol'
      );
    }

    // Convert values to field elements
    const fieldElements = value.map(v => {
      const bigV = typeof v === 'number' ? BigInt(v) : v;
      return bigV % this.config.prime!;
    });

    // Encode as bytes
    const buffer = new ArrayBuffer(fieldElements.length * 8);
    const view = new DataView(buffer);
    fieldElements.forEach((v, i) => {
      const bytes = this.bigintToBytes(v);
      bytes.forEach((byte, j) => view.setUint8(i * 8 + j, byte));
    });

    return new Uint8Array(buffer);
  }

  /**
   * SPDZ2k protocol uses arithmetic sharing in Z_{2^k}
   */
  private encodeSpdz2k(value: number[] | bigint[]): Uint8Array {
    if (!this.config.bitLength) {
      throw new MPCError(
        MPCErrorType.PROTOCOL_ERROR,
        'Bit length required for SPDZ2k protocol'
      );
    }

    const mask = (1n << BigInt(this.config.bitLength)) - 1n;
    const elements = value.map(v => {
      const bigV = typeof v === 'number' ? BigInt(v) : v;
      return bigV & mask;
    });

    const buffer = new ArrayBuffer(elements.length * ((this.config.bitLength + 7) >> 3));
    const view = new DataView(buffer);
    elements.forEach((v, i) => {
      const bytes = this.bigintToBytes(v);
      bytes.forEach((byte, j) => view.setUint8(i * ((this.config.bitLength + 7) >> 3) + j, byte));
    });

    return new Uint8Array(buffer);
  }

  /**
   * Semi2k protocol uses arithmetic sharing in Z_{2^k} with semi-honest security
   */
  private encodeSemi2k(value: number[] | bigint[]): Uint8Array {
    // Semi2k uses the same encoding as SPDZ2k
    return this.encodeSpdz2k(value);
  }

  private decodeMascot<T>(data: Uint8Array): T {
    if (!this.config.prime) {
      throw new MPCError(
        MPCErrorType.PROTOCOL_ERROR,
        'Prime field size required for MASCOT protocol'
      );
    }

    const elements: bigint[] = [];
    const view = new DataView(data.buffer);
    for (let i = 0; i < data.length; i += 8) {
      const bytes = new Uint8Array(8);
      for (let j = 0; j < 8; j++) {
        bytes[j] = view.getUint8(i + j);
      }
      elements.push(this.bytesToBigint(bytes) % this.config.prime);
    }

    return elements as unknown as T;
  }

  private decodeSpdz2k<T>(data: Uint8Array): T {
    if (!this.config.bitLength) {
      throw new MPCError(
        MPCErrorType.PROTOCOL_ERROR,
        'Bit length required for SPDZ2k protocol'
      );
    }

    const mask = (1n << BigInt(this.config.bitLength)) - 1n;
    const bytesPerElement = (this.config.bitLength + 7) >> 3;
    const elements: bigint[] = [];
    const view = new DataView(data.buffer);

    for (let i = 0; i < data.length; i += bytesPerElement) {
      const bytes = new Uint8Array(bytesPerElement);
      for (let j = 0; j < bytesPerElement; j++) {
        bytes[j] = view.getUint8(i + j);
      }
      elements.push(this.bytesToBigint(bytes) & mask);
    }

    return elements as unknown as T;
  }

  private decodeSemi2k<T>(data: Uint8Array): T {
    // Semi2k uses the same decoding as SPDZ2k
    return this.decodeSpdz2k<T>(data);
  }

  private bigintToBytes(value: bigint): Uint8Array {
    const bytes: number[] = [];
    let remaining = value;
    while (remaining > 0n) {
      bytes.unshift(Number(remaining & 0xFFn));
      remaining >>= 8n;
    }
    // Pad to 8 bytes for consistency
    while (bytes.length < 8) {
      bytes.unshift(0);
    }
    return new Uint8Array(bytes);
  }

  private bytesToBigint(bytes: Uint8Array): bigint {
    let value = 0n;
    for (const byte of bytes) {
      value = (value << 8n) | BigInt(byte);
    }
    return value;
  }
}

export const encoding = {
  encodeValue,
  decodeShare,
  decodeResult,
  valueToBytes,
  bytesToValue
}; 