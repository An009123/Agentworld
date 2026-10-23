// Loads KEY=VALUE pairs from ./.env.local and (for Pinata only) /workspace/launchpad-mvp/.env.local
// into process.env WITHOUT overriding existing values and WITHOUT ever printing them.
import fs from 'fs';
import path from 'path';

function parse(file: string, filter?: (k: string) => boolean) {
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || (filter && !filter(m[1]))) continue;
      const v = m[2].replace(/^['"]|['"]$/g, '');
      if (!process.env[m[1]] && v) process.env[m[1]] = v;
    }
  } catch { /* file optional */ }
}
let loaded = false;
export function loadEnv() {
  if (loaded) return; loaded = true;
  parse(path.join(process.cwd(), '.env.local'));
  parse(process.env.PINATA_ENV_FILE || '/workspace/launchpad-mvp/.env.local', (k) => k.startsWith('PINATA_'));
}
/** Only reports presence, never values. */
export const secretStatus = () => Object.fromEntries(['PINATA_JWT', 'PINATA_API_KEY', 'PINATA_SECRET_API_KEY'].map((k) => [k, process.env[k] ? 'set' : 'unset']));
