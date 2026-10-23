// Fast vanity-salt finder for Flap tokens launched through AgentLaunchpad.
//   npx tsx cli/salt.ts --type tax|standard [--engine auto|cast|js] [--threads N] [--json]
// engine=cast uses Foundry's multi-threaded Rust `cast create2` (~ms); engine=js uses worker_threads.
import { isMainThread } from 'worker_threads';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { findSaltFast } from '../lib/saltFast';

const arg = (k: string, d?: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };

if (isMainThread) {
  const type = arg('type', 'tax') as 'tax' | 'standard';
  const engine = arg('engine', 'auto') as 'auto' | 'cast' | 'js';
  const threads = Number(arg('threads', String(Math.max(1, Math.min(8, os.cpus().length)))));
  const self = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
  findSaltFast({ type, engine, threads, suffix: arg('suffix'), libDir: path.join(path.dirname(self), '../lib') }).then((out) => {
    console.log(process.argv.includes('--json') ? JSON.stringify(out) : JSON.stringify(out, null, 2));
    process.exit(0);
  }).catch((e) => { console.error(e.message); process.exit(1); });
}
