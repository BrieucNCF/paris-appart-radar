# Décisions de build

## Contexte
Radar perso d'annonces de location Paris. Objectif : trouver un appart vite, budget 0 €.
Usage strictement personnel.

## Décisions actées
- **Source socle = alertes email natives des sites** (pas scraping direct). Raison : technique,
  pas juridique — le scraping gratuit de LBC/SeLoger est bloqué (DataDome) ; le contournement
  fiable est payant. Les alertes email sont gratuites ET fiables ET multi-sites.
- **Premier site branché : PAP** (le plus simple à parser) pour valider le pipeline.
- **Hébergement : tout Supabase** (Postgres + pg_cron + Edge Functions). Free tier. 0 €.
- **Notif : Telegram** (photo + infos + lien direct).
- **Carte : Leaflet + OSM** (page statique lisant Supabase via clé anon + RLS).
- **Géocodage : api-adresse.data.gouv.fr** (officiel, gratuit).
- **Filtres génériques** (budget, arrondissements, surface, pièces, meublé) réglables côté app.
- **On ne contacte personne à la place de l'utilisateur** : lien vers le site d'origine.

## Bascule méthode (acté)
- Abandon de l'email : scraping DIRECT via navigateur headless (Playwright).
  Le curl simple est bloqué (Cloudflare/DataDome) presque partout.
- Un adaptateur par site dans src/sources/ (buildUrls + extractInPage).

## Contrainte IP datacenter vs résidentielle (importante)
- Depuis GitHub Actions (IP datacenter), Cloudflare bloque **PAP** ; **ParuVendu** passe.
- Donc : cloud (GitHub Actions) = sources "cloud-friendly" (ENABLED_SOURCES=paruvendu).
  PAP tourne en LOCAL (`npm run poll`) depuis le Mac (IP résidentielle).
- À tester en ajoutant Logic-immo/Locservice/Bien'ici : lesquels passent depuis le cloud.

## Ressources live
- Repo : https://github.com/BrieucNCF/paris-appart-radar (public)
- Carte : https://brieucncf.github.io/paris-appart-radar/
- Bot Telegram : @paris_appart_radar_bot
- Cron : GitHub Actions .github/workflows/poll.yml, toutes les 15 min

## À sécuriser avant "prod"
- ROTATER la clé service_role Supabase + le token Telegram (exposés en clair dans le chat de build).
  Mettre à jour .env local + secrets GitHub après rotation.

## Compromis assumé
- Latence cloud = 15 min (cadence cron). Pas de vrai temps réel sous ce seuil gratuitement.

## Modèle de données
Table `listings`, dédup sur `url` normalisée (unique). Voir `supabase/schema.sql`.

## Avancement
- [x] Phase 1 — fondations Supabase (schéma text + RLS) — validé bout en bout
- [x] Phase 2 — bot Telegram (@paris_appart_radar_bot), template figé
- [x] Phase 3 — scraping direct Playwright : adaptateurs PAP + ParuVendu, filtre critères, dédup
- [x] Phase 4 — géocodage arrondissement (centroïde + jitter) intégré
- [x] Phase 5 — notif Telegram (photo + infos + boutons) branchée
- [x] Automatisation — repo public + cron GitHub Actions 15 min (ParuVendu) : run VERT
- [x] Phase 6 — carte Leaflet live sur GitHub Pages (lit Supabase, filtres, popups, ?id=)
- [x] Phase 7 (en cours) — Bien'ici ajouté (source API JSON realEstateAds.json, fetch pur,
      cloud-friendly ✅ ~157 candidats). Cloud = ENABLED_SOURCES=paruvendu,bienici.
      Reste possible : Logic-immo, Locservice (ROI incertain, Bien'ici agrège déjà beaucoup).
- [ ] Sécu — rotation clé service_role + token Telegram

## Note dédup inter-sites (futur)
La dédup est sur `url` -> une même annonce publiée sur 2 sites (ex. Bien'ici + ParuVendu)
apparaîtra 2 fois. À traiter si gênant (clé de similarité prix+surface+arrondissement).
