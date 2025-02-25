import { MPCShare, MPCResult } from './types';

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

export const encoding = {
  encodeValue,
  decodeShare,
  decodeResult,
  valueToBytes,
  bytesToValue
}; 