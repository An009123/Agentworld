// Plain-JS worker for the salt finder (no TS loader needed inside worker_threads).
import { parentPort, workerData } from 'worker_threads';
import { keccak_256 } from '@noble/hashes/sha3';
import { randomBytes } from 'crypto';
const { deployer, initHash, suffix } = workerData;
const hex = (s) => Uint8Array.from(Buffer.from(s.replace(/^0x/, ''), 'hex'));
const buf = new Uint8Array(85);
buf[0] = 0xff; buf.set(hex(deployer), 1); buf.set(randomBytes(24), 21); buf.set(hex(initHash), 53);
const dv = new DataView(buf.buffer);
const nib = suffix.length, last = parseInt(suffix, 16), mod = 16 ** nib;
for (let i = 0; ; i++) {
  dv.setUint32(45, Math.floor(i / 0x100000000)); dv.setUint32(49, i >>> 0);
  const h = keccak_256(buf);
  const tail = ((h[28] << 24) | (h[29] << 16) | (h[30] << 8) | h[31]) >>> 0;
  if ((nib === 8 ? tail : tail % mod) === last) { parentPort.postMessage({ salt: '0x' + Buffer.from(buf.slice(21, 53)).toString('hex'), iterations: i + 1 }); break; }
}
