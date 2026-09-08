// Adaptateur ParuVendu (particuliers + agences). Structure DOM validée :
//   .blocAnnonce[data-id]  (id unique)
//   a[href*="/immobilier/location/appartement/..."]  (lien détail, type dans l'URL)
//   texte de carte : "<prix> € CC* Appartement <surf> m2 Paris <arr> <n> pièces <n> chambres DPE : X ..."
// Pièges gérés : nombre de photos collé au prix, surface parfois "1 m²" (aberrante),
// annonces mal typées (local commercial) -> filtrées ensuite par les critères.

export const name = 'paruvendu';
export const label = 'ParuVendu';
export const readySelector = '.blocAnnonce';

export function buildUrls(_criteria) {
  // Page de résultats "location Paris" (tous types) ; on filtre appartement +
  // prix + arrondissement + pièces côté code (matchesCriteria + type dans l'URL).
  return ['https://www.paruvendu.fr/immobilier/location/paris-75/'];
}

export function extractInPage() {
  return [...document.querySelectorAll('.blocAnnonce[data-id]')].map((el) => {
    const a = el.querySelector('a[href*="/immobilier/location/"]');
    const href = a ? a.getAttribute('href') : null;
    if (!href || !/\/location\/appartement\//.test(href)) return null; // appartement uniquement

    const id = el.getAttribute('data-id');
    const c = el.cloneNode(true);
    c.querySelectorAll('script,style').forEach((n) => n.remove());
    const txt = c.textContent.replace(/\s+/g, ' ').trim();

    const priceM = txt.match(/(\d{1,3}(?: \d{3})*)\s*€/);            // format FR strict
    const arrM = txt.match(/750(\d{2})/) || txt.match(/Paris\s+(\d{1,2})/i);
    const roomsM = txt.match(/(\d+)\s*pièce/);
    const bedM = txt.match(/(\d+)\s*chambre/);
    const surfM = txt.match(/(\d+)\s*m[²2]/);
    const dpeM = txt.match(/DPE\s*:?\s*([A-G])\b/i);

    let surface = surfM ? +surfM[1] : null;
    if (surface != null && surface < 9) surface = null;            // "1 m²" = donnée bidon

    const img = el.querySelector('img#firstImg, img');
    let photo = img ? img.getAttribute('src') : null;
    if (photo && /novisu|no-visu|placeholder/i.test(photo)) photo = null;

    return {
      sourceId: id,
      url: 'https://www.paruvendu.fr' + href,
      price: priceM ? +priceM[1].replace(/ /g, '') : null,
      arrondissement: arrM ? 75000 + +arrM[1] : null,
      rooms: roomsM ? +roomsM[1] : null,
      bedrooms: bedM ? +bedM[1] : null,
      surface,
      furnished: /meublé/i.test(txt) ? (/non\s+meublé/i.test(txt) ? false : true) : null,
      dpe: dpeM ? dpeM[1].toUpperCase() : null,
      photo,
      desc: txt.slice(0, 200),
    };
  }).filter(Boolean);
}
