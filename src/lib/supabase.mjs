// Couche Supabase (REST). Insert avec dédup sur `url` :
// grâce à `resolution=ignore-duplicates` + `return=representation`,
// l'API ne renvoie QUE les lignes réellement insérées => les nouvelles annonces.
import { env } from './config.mjs';
import { fingerprint } from './filter.mjs';

function headers() {
  const key = env.SUPABASE_SERVICE_ROLE_KEY();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Empreintes des annonces déjà en base (pour dédup INTER-sites).
 * @returns {Promise<Set<string>>}
 */
export async function fetchFingerprints() {
  const url = `${env.SUPABASE_URL()}/rest/v1/listings?select=arrondissement,price,surface,rooms&limit=5000`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return new Set(); // en cas d'erreur, on ne bloque pas l'insertion
  const rows = await res.json();
  const set = new Set();
  for (const r of rows) { const fp = fingerprint(r); if (fp) set.add(fp); }
  return set;
}

/**
 * Insère un lot d'annonces, ignore les doublons (url existante).
 * @returns {Promise<Array>} les annonces NOUVELLEMENT insérées (avec leur id uuid)
 */
export async function insertNew(listings) {
  if (!listings.length) return [];
  const url = `${env.SUPABASE_URL()}/rest/v1/listings?on_conflict=url`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(listings),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Supabase insert ${res.status}: ${t.slice(0, 500)}`);
  }
  return res.json();
}
