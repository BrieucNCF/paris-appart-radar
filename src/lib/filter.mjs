// Empreinte pour dédup INTER-sites : une même annonce publiée sur 2 sites
// (URLs différentes) partage arrondissement/prix/surface/pièces.
// Retourne null si l'info est trop incomplète pour comparer sans risque.
export function fingerprint(l) {
  if (l.price == null || l.surface == null || l.arrondissement == null) return null;
  return `${l.arrondissement}|${l.price}|${l.surface}|${l.rooms ?? 'x'}`;
}

// Applique les critères de recherche à une annonce brute extraite d'un site.
// Retourne { keep: bool, reason: string } pour pouvoir logguer les rejets.

export function matchesCriteria(listing, criteria) {
  const c = criteria;

  if (listing.arrondissement == null || !c.arrondissements.includes(listing.arrondissement % 1000)) {
    return { keep: false, reason: `arrondissement ${listing.arrondissement} hors zone` };
  }
  if (listing.price != null && listing.price > c.priceMax) {
    return { keep: false, reason: `prix ${listing.price} > ${c.priceMax}` };
  }
  if (listing.surface != null && listing.surface < c.surfaceMin) {
    return { keep: false, reason: `surface ${listing.surface} < ${c.surfaceMin}` };
  }

  // Pièces OU chambres
  const roomsOk = listing.rooms != null && listing.rooms >= c.roomsMin;
  const bedroomsOk = listing.bedrooms != null && listing.bedrooms >= c.bedroomsMin;
  if (c.roomsOrBedrooms) {
    // Si les deux infos sont absentes, on ne peut pas trancher -> on garde (mieux vaut un faux positif qu'un raté)
    if (listing.rooms == null && listing.bedrooms == null) {
      // on garde, à vérifier à la main
    } else if (!roomsOk && !bedroomsOk) {
      return { keep: false, reason: `ni ${c.roomsMin} pièces ni ${c.bedroomsMin} chambres` };
    }
  } else {
    if (!roomsOk) return { keep: false, reason: `moins de ${c.roomsMin} pièces` };
  }

  // Meublé
  if (c.furnished === 'furnished' && listing.furnished === false) {
    return { keep: false, reason: 'non meublé' };
  }
  if (c.furnished === 'unfurnished' && listing.furnished === true) {
    return { keep: false, reason: 'meublé' };
  }

  // Anti-colocation : le loyer affiché est souvent par personne/chambre -> trompeur.
  const d = (listing.desc || '').toLowerCase();
  const u = (listing.url || '').toLowerCase();
  const t = (listing.title || '').toLowerCase();
  if (/\/colocation-|coloc/.test(u) || /coloc/.test(t) ||
      (/coloc/.test(d) && /par personne|par chambre|par colocataire|\/\s*personne/.test(d))) {
    return { keep: false, reason: 'colocation' };
  }

  return { keep: true, reason: 'ok' };
}
