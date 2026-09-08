# Template message Telegram (figé)

Envoyé via `sendPhoto` (photo = `photo_url`), `parse_mode=HTML`.
Les champs `null` sont **omis** proprement (pas de « null » affiché).

## Caption

```
🆕 Nouveau — {rooms} pièces, {surface} m²
📍 Paris {arrondissement}e ({quartier si dispo})
💶 {price} €/mois · 🚪 {rooms} pièces · 🛏 {bedrooms} ch. · 📐 {surface} m² · 🔑 {Meublé|Non meublé} · DPE {dpe}
🕒 Détecté le {JJ/MM/AAAA à HHhMM}  (fuseau Europe/Paris)
```

Règles d'omission :
- pas de `bedrooms` → on retire le segment « 🛏 X ch. »
- pas de `dpe` → on retire « · DPE X »
- `furnished` null → on retire le segment 🔑
- pas de quartier → on garde juste « Paris {arr}e »

## Boutons (inline_keyboard, une rangée)

- `🔗 Voir l’annonce ({source})` → `url` de l'annonce (site d'origine)
- `🗺 Voir sur la carte` → `{MAP_URL}?id={listing.id}`  (MAP_URL rempli en Phase 6)

## Champs source
Tirés de la table `listings` : `rooms, bedrooms, surface, price, arrondissement,
furnished, dpe, photo_url, url, source, id, created_at`.
