// Couche Supabase (REST). Insert avec dédup sur `url` :
// grâce à `resolution=ignore-duplicates` + `return=representation`,
// l'API ne renvoie QUE les lignes réellement insérées => les nouvelles annonces.
import { env } from './config.mjs';

function headers() {
  const key = env.SUPABASE_SERVICE_ROLE_KEY();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
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
