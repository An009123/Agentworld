// Fast Flap vanity-salt finder. CREATE2 deployer is ALWAYS the Flap Portal (also when a wrapper or
// VaultPortal calls it); init code is the EIP-1167 clone of the token implementation.
import { keccak256, hexToBytes, bytesToHex, getAddress, type Hex } from 'viem';
import { randomBytes } from 'crypto';
import { keccak_256 } from '@noble/hashes/sha3';
import { FLAP } from './config';

export function cloneInitCodeHash(impl: string): Uint8Array {
  const code = '0x3d602d80600a3d3981f3363d3d373d3d3d363d73' + impl.slice(2).toLowerCase() + '5af43d82803e903d91602b57fd5bf3';
  return keccak256(code as Hex, 'bytes');
}

export function predictTokenAddress(salt: Hex, impl: string, deployer: string = FLAP.portal): `0x${string}` {
  const buf = new Uint8Array(85);
  buf[0] = 0xff;
  buf.set(hexToBytes(deployer as Hex), 1);
  buf.set(hexToBytes(salt), 21);
  buf.set(cloneInitCodeHash(impl), 53);
  return getAddress(bytesToHex(keccak256(buf, 'bytes').slice(12)));
}

/**
 * Pure-JS search (no native deps). Salt = 24 random bytes || 8-byte big-endian counter, so each
 * candidate costs ONE keccak. Any bytes32 salt is accepted by the Portal.
 */
export function findSalt(opts: { impl: string; suffix: string; deployer?: string; maxIters?: number }) {
  const suffix = opts.suffix.toLowerCase();
  if (!/^[0-9a-f]{1,8}$/.test(suffix)) throw new Error('suffix must be 1-8 hex chars');
  const nib = suffix.length, last = Number.parseInt(suffix, 16);
  const buf = new Uint8Array(85);
  buf[0] = 0xff;
  buf.set(hexToBytes((opts.deployer || FLAP.portal) as Hex), 1);
  buf.set(randomBytes(24), 21);
  buf.set(cloneInitCodeHash(opts.impl), 53);
  const dv = new DataView(buf.buffer);
  const max = opts.maxIters ?? 200_000_000;
  const t0 = Date.now();
  for (let i = 0; i < max; i++) {
    dv.setUint32(45, Math.floor(i / 0x100000000));
    dv.setUint32(49, i >>> 0);
    const h = keccak_256(buf);
    // compare the last `nib` nibbles
    const tail = ((h[28] << 24) | (h[29] << 16) | (h[30] << 8) | h[31]) >>> 0;
    if (nib === 8 ? tail === last : tail % 16 ** nib === last) {
      return { salt: bytesToHex(buf.slice(21, 53)), address: getAddress(bytesToHex(h.slice(12))), iterations: i + 1, ms: Date.now() - t0 };
    }
  }
  throw new Error('salt not found within maxIters');
}
