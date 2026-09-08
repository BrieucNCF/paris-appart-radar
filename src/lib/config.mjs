// Chargement de la config (env + critères). Pas de dépendance externe.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..', '..');

// --- .env minimal (pour le run local ; en CI les vars viennent des secrets) ---
export function loadDotEnv() {
  try {
    const txt = readFileSync(join(root, '.env'), 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  } catch { /* pas de .env en CI, normal */ }
}

export const criteria = JSON.parse(
  readFileSync(join(root, 'config', 'criteria.json'), 'utf8')
);

export const env = {
  SUPABASE_URL: () => must('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: () => must('SUPABASE_SERVICE_ROLE_KEY'),
  TELEGRAM_BOT_TOKEN: () => must('TELEGRAM_BOT_TOKEN'),
  TELEGRAM_CHAT_ID: () => must('TELEGRAM_CHAT_ID'),
  MAP_URL: () => process.env.MAP_URL || '',
};

function must(k) {
  const v = process.env[k];
  if (!v) throw new Error(`Variable d'environnement manquante : ${k}`);
  return v;
}
