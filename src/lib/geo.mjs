// Géocodage léger : centroïde de chaque arrondissement de Paris.
// Suffisant pour la v1 (un marqueur par annonce, positionné dans son arrondissement).
// On ajoute un petit décalage déterministe (basé sur l'id) pour éviter que les
// marqueurs d'un même arrondissement se superposent exactement.

const CENTROIDS = {
  75001: [48.8626, 2.3363], 75002: [48.8670, 2.3410], 75003: [48.8630, 2.3626],
  75004: [48.8544, 2.3573], 75005: [48.8448, 2.3501], 75006: [48.8496, 2.3330],
  75007: [48.8560, 2.3120], 75008: [48.8726, 2.3120], 75009: [48.8768, 2.3390],
  75010: [48.8760, 2.3600], 75011: [48.8590, 2.3790], 75012: [48.8399, 2.3880],
  75013: [48.8322, 2.3555], 75014: [48.8331, 2.3264], 75015: [48.8417, 2.2995],
  75016: [48.8637, 2.2769], 75017: [48.8872, 2.3070], 75018: [48.8927, 2.3444],
  75019: [48.8870, 2.3826], 75020: [48.8641, 2.3984],
};

// hash déterministe simple -> [-0.004, 0.004] de décalage lat/lng
function jitter(seed) {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  const a = ((h & 0xffff) / 0xffff - 0.5) * 0.008;
  const b = (((h >> 16) & 0xffff) / 0xffff - 0.5) * 0.008;
  return [a, b];
}

export function geocodeArrondissement(arr, seed) {
  const c = CENTROIDS[arr];
  if (!c) return { lat: null, lng: null };
  const [da, db] = jitter(seed);
  return { lat: +(c[0] + da).toFixed(6), lng: +(c[1] + db).toFixed(6) };
}
