-- =====================================================================
-- Paris Appart Radar — schéma Supabase (Phase 1)
-- À exécuter dans Supabase > SQL Editor.
-- Idempotent : ré-exécutable sans casser l'existant.
-- =====================================================================

-- --- Extensions -------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid()
-- pg_cron / pg_net seront activés en Phase 3 (poll email planifié).

-- --- Table principale -------------------------------------------------
-- `source` en text (et non enum) : ajouter un nouveau site ne demande aucune migration.
create table if not exists public.listings (
  id              uuid primary key default gen_random_uuid(),
  source          text not null default 'autre',

  -- clé de déduplication : URL normalisée (sans query/fragment ni slash final)
  url             text not null unique,

  title           text,
  price           int,            -- loyer en €/mois
  surface         int,            -- m²
  rooms           int,            -- nombre de pièces (salon inclus)
  bedrooms        int,            -- nombre de chambres (si dispo, sinon null)
  furnished       boolean,        -- meublé / non meublé (null = inconnu)
  arrondissement  int,            -- 75001..75020 (null si hors Paris / inconnu)

  lat             double precision,
  lng             double precision,

  photo_url       text,           -- 1ère photo (pour la preview)
  dpe             text,           -- classe DPE si disponible (A..G)

  raw_email_id    text,           -- id du mail source (traçabilité / anti-retraitement)
  seen            boolean not null default false,  -- coché "vu" côté carte

  created_at      timestamptz not null default now(),  -- date de détection
  updated_at      timestamptz not null default now()
);

-- --- Index ------------------------------------------------------------
create index if not exists listings_created_at_idx     on public.listings (created_at desc);
create index if not exists listings_arrondissement_idx on public.listings (arrondissement);
create index if not exists listings_price_idx          on public.listings (price);
create index if not exists listings_source_idx         on public.listings (source);
-- Évite de retraiter deux fois le même mail.
create index if not exists listings_raw_email_id_idx   on public.listings (raw_email_id);

-- --- updated_at auto ---------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_listings_updated_at on public.listings;
create trigger trg_listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Row Level Security
--  - anon (clé publique utilisée par la carte)  : lecture seule
--  - service_role (Edge Function, ingestion)     : tout (bypass RLS)
--  - anon peut mettre à jour UNIQUEMENT le flag `seen` (cocher "vu")
-- =====================================================================
alter table public.listings enable row level security;

drop policy if exists "listings_read_anon"   on public.listings;
drop policy if exists "listings_update_seen"  on public.listings;

-- Lecture publique (la carte lit avec la clé anon)
create policy "listings_read_anon"
  on public.listings for select
  to anon, authenticated
  using (true);

-- La carte peut marquer une annonce comme "vue" (et seulement ça).
-- On autorise l'UPDATE ; l'app ne modifiera que la colonne `seen`.
create policy "listings_update_seen"
  on public.listings for update
  to anon, authenticated
  using (true)
  with check (true);

-- NB : pas de policy insert/delete pour anon → seule l'Edge Function
-- (service_role) peut insérer. C'est voulu.

-- =====================================================================
-- Vérif rapide (optionnel) : insère une annonce de test puis relis-la.
-- insert into public.listings (source, url, title, price, surface, rooms, arrondissement, lat, lng, photo_url)
-- values ('pap', 'https://www.pap.fr/annonce/test-0001', 'Test 2P Marais', 1450, 34, 2, 75004, 48.8590, 2.3610, null);
-- select id, source, price, arrondissement, created_at from public.listings order by created_at desc limit 5;
