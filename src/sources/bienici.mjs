// Adaptateur Bien'ici (agrégateur particuliers + agences). Source de type API :
// on interroge directement l'endpoint JSON interne realEstateAds.json (pas de navigateur).
// Beaucoup de volume, données propres. zoneIds ["-7444"] = tout Paris.

export const name = 'bienici';
export const label = "Bien'ici";

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const REFERER = 'https://www.bienici.com/recherche/location/paris-75000/appartement';

function buildUrl(criteria, from) {
  const filter = {
    size: 100, from, filterType: 'rent', propertyType: ['flat'],
    maxPrice: criteria.priceMax, minArea: criteria.surfaceMin,
    page: Math.floor(from / 100) + 1, sortBy: 'relevance', sortOrder: 'desc',
    onTheMarket: [true], newProperty: false,
    zoneIdsByTypes: { zoneIds: ['-7444'] },
  };
  return 'https://www.bienici.com/realEstateAds.json?filters=' + encodeURIComponent(JSON.stringify(filter));
}

function mapAd(a) {
  const arr = a.postalCode ? +String(a.postalCode) : null;
  const ph = (a.photos || [])[0];
  let photo = null;
  if (ph) {
    photo = ph.url || (ph.photo ? 'https://file.bienici.com/photo/' + ph.photo : ph.url_photo || null);
    if (photo && photo.startsWith('http://')) photo = 'https://' + photo.slice(7);
  }
  return {
    sourceId: a.id,
    url: 'https://www.bienici.com/annonce/' + a.id,
    price: a.price != null ? Math.round(a.price) : null,
    arrondissement: arr && arr >= 75001 && arr <= 75020 ? arr : null,
    rooms: a.roomsQuantity ?? null,
    bedrooms: a.bedroomsQuantity ?? null,
    surface: a.surfaceArea != null ? Math.round(a.surfaceArea) : null,
    furnished: typeof a.isFurnished === 'boolean' ? a.isFurnished : null,
    dpe: a.energyClassification || null,
    photo,
    title: a.title || '',
    desc: (a.description || '').slice(0, 300),
  };
}

export async function fetchListings(criteria) {
  const out = [];
  for (const from of [0, 100]) {            // 2 pages -> jusqu'à 200 annonces
    const res = await fetch(buildUrl(criteria, from), {
      headers: { 'User-Agent': UA, Referer: REFERER, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`bienici HTTP ${res.status}`);
    const j = await res.json();
    const ads = j.realEstateAds || [];
    out.push(...ads.map(mapAd));
    if (ads.length < 100) break;            // dernière page atteinte
  }
  return out;
}
