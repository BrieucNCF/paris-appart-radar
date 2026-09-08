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

## Compromis assumé
- Latence = délai d'envoi des alertes par chaque site. Pas de « temps réel » sous ce seuil sans payer.

## Modèle de données
Table `listings`, dédup sur `url` normalisée (unique). Voir `supabase/schema.sql`.

## Avancement
- [x] Phase 1 — fondations Supabase (schéma + RLS + structure projet)
- [ ] Phase 2 — bot Telegram
- [ ] Phase 3 — ingestion email (PAP)
- [ ] Phase 4 — enrichissement + géocodage
- [ ] Phase 5 — notif Telegram
- [ ] Phase 6 — carte
- [ ] Phase 7 — extension autres sites
