import { execFileSync } from 'child_process';
import { Worker } from 'worker_threads';
import os from 'os';
import path from 'path';
import { keccak256, type Hex } from 'viem';
import { FLAP, SUFFIX, implFor } from './config';
import { findSalt, predictTokenAddress } from './salt';

export type SaltResult = { type: 'tax' | 'standard'; engine: string; portal: string; impl: string; suffix: string; salt: Hex; predictedToken: string; ms: number };

function castBin(): string | null {
  for (const c of [process.env.CAST_BIN, path.join(os.homedir(), '.foundry/bin/cast'), 'cast'].filter(Boolean) as string[]) {
    try { execFileSync(c, ['--version'], { stdio: 'ignore' }); return c; } catch { /* next */ }
  }
  return null;
}

export async function findSaltFast(o: { type: 'tax' | 'standard'; engine?: 'auto' | 'cast' | 'js'; threads?: number; suffix?: string; libDir?: string }): Promise<SaltResult> {
  const type = o.type;
  if (type !== 'tax' && type !== 'standard') throw new Error('type must be tax|standard');
  const impl = implFor(type), suffix = (o.suffix || SUFFIX[type]).toLowerCase();
  const t0 = Date.now();
  const engine = o.engine || 'auto';
  const cast = engine !== 'js' ? castBin() : null;
  if (engine === 'cast' && !cast) throw new Error('cast not found (install Foundry) – use --engine js');
  const cloneHash = keccak256(('0x3d602d80600a3d3981f3363d3d373d3d3d363d73' + impl.slice(2).toLowerCase() + '5af43d82803e903d91602b57fd5bf3') as Hex);
  let salt: Hex;
  let used: string;
  if (cast) {
    const initHash = keccak256(('0x3d602d80600a3d3981f3363d3d373d3d3d363d73' + impl.slice(2).toLowerCase() + '5af43d82803e903d91602b57fd5bf3') as Hex);
    const out = execFileSync(cast, ['create2', '--ends-with', suffix, '--deployer', FLAP.portal, '--init-code-hash', initHash], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const m = out.match(/(0x[0-9a-fA-F]{64})/);
    if (!m) throw new Error('could not parse cast create2 output');
    salt = m[1] as Hex; used = 'cast create2 (rust, multi-thread)';
  } else if ((o.threads ?? 1) > 1) {
    const n = o.threads!;
    salt = await new Promise<Hex>((resolve, reject) => {
      const ws: Worker[] = [];
      for (let i = 0; i < n; i++) {
        const w = new Worker(path.join(o.libDir || __dirname, 'saltWorker.mjs'), { workerData: { deployer: FLAP.portal, initHash: cloneHash, suffix } });
        w.on('message', (r: { salt: Hex }) => { ws.forEach((x) => x.terminate()); resolve(r.salt); });
        w.on('error', reject);
        ws.push(w);
      }
    });
    used = `js worker_threads x${n}`;
  } else {
    salt = findSalt({ impl, suffix }).salt as Hex; used = 'js single-thread';
  }
  const predictedToken = predictTokenAddress(salt, impl);
  if (!predictedToken.toLowerCase().endsWith(suffix)) throw new Error('salt self-check failed');
  return { type, engine: used, portal: FLAP.portal, impl, suffix, salt, predictedToken, ms: Date.now() - t0 };
}
