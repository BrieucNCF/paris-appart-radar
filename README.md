# Paris Appart Radar

Radar personnel d'annonces de location à Paris : les nouvelles annonces qui matchent tes
critères arrivent sur **Telegram** (photo + infos + lien) et s'affichent sur une **carte**.

**Coût : 0 €.** Socle = alertes email natives des sites → Supabase → Telegram + carte.

---

## Pourquoi cette archi (le compromis honnête)

- Le scraping direct gratuit de Leboncoin/SeLoger est **bloqué** (DataDome) ; le contournement
  fiable est payant. Les **alertes email** des sites sont le seul combo gratuit **et** fiable.
- Conséquence : la « vitesse » dépend du délai d'envoi des alertes par chaque site
  (PAP / Leboncoin = quelques minutes ; SeLoger plus variable). On ne descend pas sous ça sans payer.
- On **ne contacte personne** à ta place : chaque annonce renvoie vers le site d'origine.

## Flux

```
Recherches sauvegardées (PAP, puis LBC…)  ← TES critères, posés sur chaque site
        │  alertes email
        ▼
Gmail dédié  ──poll pg_cron (2-5 min)──►  Edge Function (Deno)
                                              │ parse → enrichit → géocode → insert
                                              ▼
                                          Supabase (table `listings`, dédup sur URL)
                                              ├──► Bot Telegram (photo + infos + lien)
                                              └──► Carte Leaflet (marqueurs + filtres)
```

## Stack

| Brique       | Choix                          | Statut   |
|--------------|--------------------------------|----------|
| Base         | Supabase (Postgres)            | Phase 1  |
| Cron         | pg_cron (dans Supabase)        | Phase 3  |
| Traitement   | Supabase Edge Function (Deno)  | Phase 3  |
| Emails       | Gmail dédié + Gmail API        | Phase 3  |
| Géocodage    | api-adresse.data.gouv.fr       | Phase 4  |
| Notif        | Bot Telegram                   | Phase 2  |
| Carte        | Leaflet + tuiles OSM           | Phase 6  |

---

## Phases (on valide chacune avant la suivante)

1. **Fondations Supabase** — table `listings`, RLS, structure projet. ← *tu es ici*
2. **Bot Telegram** — création + test d'envoi.
3. **Ingestion email** — Gmail + OAuth + Edge Function qui parse les alertes **PAP**, dédup, insert.
4. **Enrichissement + géocodage** — photo/surface/pièces + lat/lng.
5. **Notif Telegram** — branchement dans la function.
6. **Carte** — Leaflet, popup preview, filtres, bouton « Voir l'annonce ».
7. **Extension** — Leboncoin, SeLoger, PAP… une fois le pipeline validé.

Premier site branché : **PAP** (le plus simple techniquement).

---

## Phase 1 — mise en place (à faire par toi, ~5 min)

1. Crée un compte / projet sur https://supabase.com (free tier).
2. Dans le projet : **SQL Editor** → colle le contenu de [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. **Project Settings → API** : copie `Project URL`, `anon` key et `service_role` key.
4. `cp .env.example .env` puis renseigne `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
5. (Vérif) Décommente le bloc de test en bas de `schema.sql`, relance-le : une annonce de test
   doit apparaître, puis supprime-la (`delete from public.listings;`).

Quand c'est fait → on passe à la **Phase 2 (Telegram)**.

## Structure

```
paris-appart-radar/
├── supabase/
│   ├── schema.sql          # Phase 1 : table + RLS
│   └── functions/          # Phase 3 : Edge Functions (poll + ingest)
├── web/                    # Phase 6 : carte Leaflet
├── docs/                   # notes de build / décisions
├── .env.example
└── README.md
```
