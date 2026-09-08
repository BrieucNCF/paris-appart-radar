// Adaptateur PAP (particuliers). Structure DOM validée sur pap.fr :
//   .item-body > a.item-title[href=/annonces/...-r{id}]
//   .item-price · span.h1 (localisation) · ul.item-tags li (pièces/chambres/m²)
//   .item-description · img (dans le conteneur .item parent)

export const name = 'pap';
export const label = 'PAP';

// URL de recherche large (prix + surface dans l'URL) ; l'arrondissement et le
// filtre pièces/chambres sont appliqués côté code (matchesCriteria).
export function buildUrls(criteria) {
  const price = criteria.priceMax;
  const surf = criteria.surfaceMin;
  const base = `https://www.pap.fr/annonce/locations-appartement-paris-75-g439-jusqu-a-${price}-euros-a-partir-de-${surf}-m2`;
  const PAGES = 3; // page 1 + pagination ...-2, ...-3
  const urls = [base];
  for (let p = 2; p <= PAGES; p++) urls.push(`${base}-${p}`);
  return urls;
}

// S'exécute dans le contexte de la page (Playwright page.evaluate).
export function extractInPage() {
  const parseTags = (tags) => {
    let rooms = null, bedrooms = null, surface = null;
    for (const t of tags) {
      const s = t.replace(/ /g, ' ');
      let m;
      if ((m = s.match(/(\d+)\s*pièce/))) rooms = +m[1];
      if ((m = s.match(/(\d+)\s*chambre/))) bedrooms = +m[1];
      if ((m = s.match(/(\d+)\s*m²/))) surface = +m[1];
    }
    return { rooms, bedrooms, surface };
  };

  return [...document.querySelectorAll('.item-body')].map((el) => {
    const a = el.querySelector('a.item-title');
    const href = a ? a.getAttribute('href') : null;
    const idm = (href || '').match(/r(\d{6,})/);
    if (!idm) return null;

    const priceTxt = (el.querySelector('.item-price')?.textContent || '').replace(/[^\d]/g, '');
    const loc = (el.querySelector('span.h1')?.textContent || '').trim().replace(/\s+/g, ' ');
    const arrm = loc.match(/Paris\s+(\d{1,2})/i);
    const tags = [...el.querySelectorAll('ul.item-tags li')].map((li) => li.textContent.trim());
    const { rooms, bedrooms, surface } = parseTags(tags);
    const desc = (el.querySelector('.item-description')?.textContent || '').trim().replace(/\s+/g, ' ');

    const container = el.closest('.item') || el.parentElement;
    const img = container ? container.querySelector('img') : null;
    let photo = img ? (img.getAttribute('data-src') || img.getAttribute('src') || img.getAttribute('data-original')) : null;
    if (photo && photo.startsWith('/')) photo = 'https://www.pap.fr' + photo;

    const furnished = /meublé/i.test(desc) ? (/non\s+meublé/i.test(desc) ? false : true) : null;

    return {
      sourceId: idm[1],
      url: 'https://www.pap.fr' + href,
      price: priceTxt ? +priceTxt : null,
      arrondissement: arrm ? 75000 + +arrm[1] : null,
      rooms, bedrooms, surface, furnished,
      photo,
      title: loc,
      desc,
    };
  }).filter(Boolean);
}

// Attend que la liste soit chargée.
export const readySelector = '.item-body';
