// Adaptateur Foncia (agence). Pas d'anti-bot notable. Structure Angular :
//   .mosaic-list-card > a[href="/location/paris-750XX/appartement/{id}.htm"]
//   prix = élément-feuille dont le texte vaut "1 121 €" (évite le badge "Visite virtuelle x7")
//   pièces / surface / meublé dans le texte de la carte ; arrondissement dans l'URL.

export const name = 'foncia';
export const label = 'Foncia';
export const readySelector = '.mosaic-list-card';

export function buildUrls(_criteria) {
  // La pagination ?page=N n'est pas suivie par leur SPA -> une seule page.
  return ['https://fr.foncia.com/location/paris-75/appartement'];
}

export function extractInPage() {
  const out = [];
  document.querySelectorAll('.mosaic-list-card').forEach((el) => {
    const a = el.querySelector('a[href*="/location/"]');
    const href = a ? a.getAttribute('href') : null;
    if (!href || !/\.htm/.test(href)) return;
    const idm = href.match(/(\d{6,})\.htm/);
    if (!idm) return;
    const arrm = href.match(/paris-(750\d{2})/i);

    // prix : élément-feuille "1 121 €"
    let price = null;
    for (const n of el.querySelectorAll('*')) {
      if (n.children.length === 0 && /^\s*\d[\d  ]*\s*€/.test(n.textContent)) {
        const m = n.textContent.match(/(\d{1,3}(?:[  ]\d{3})*)/);
        if (m) { price = +m[1].replace(/[  ]/g, ''); break; }
      }
    }

    const c = el.cloneNode(true);
    c.querySelectorAll('script,style').forEach((n) => n.remove());
    const t = c.textContent.replace(/\s+/g, ' ').trim();
    const roomsM = t.match(/(\d+)\s*pièce/);
    const bedM = t.match(/(\d+)\s*chambre/);
    const surfM = t.match(/(\d+)(?:[.,]\d+)?\s*m²/);

    const img = el.querySelector('img');
    let photo = img ? (img.getAttribute('src') || img.getAttribute('data-src')) : null;
    if (photo && !/^https?:/.test(photo)) photo = null;

    out.push({
      sourceId: idm[1],
      url: 'https://fr.foncia.com' + href,
      price,
      arrondissement: arrm ? +arrm[1] : null,
      rooms: roomsM ? +roomsM[1] : null,
      bedrooms: bedM ? +bedM[1] : null,
      surface: surfM ? +surfM[1] : null,
      furnished: /non\s+meublé/i.test(t) ? false : (/meublé/i.test(t) ? true : null),
      photo,
      title: '',
      desc: t.slice(0, 200),
    });
  });
  // dédup intra-page par id
  const seen = new Set();
  return out.filter((x) => (seen.has(x.sourceId) ? false : (seen.add(x.sourceId), true)));
}
