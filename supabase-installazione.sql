-- =====================================================================
--  PRINT3DLAB · installazione di Supabase (da fare UNA volta sola)
--  Supabase > SQL Editor > New query > incolla tutto questo > Run
--  Questo file NON va pubblicato su Netlify (non e' nella cartella da pubblicare).
-- =====================================================================

-- ---------- 1. VISITE: una riga per ogni pagina aperta (niente nomi, niente IP) ----------
create table if not exists public.visite (
  id          uuid primary key default gen_random_uuid(),
  creata      timestamptz not null default now(),
  pagina      text not null check (char_length(pagina) <= 60),
  provenienza text not null default '' check (char_length(provenienza) <= 120),
  schermo     text not null default '' check (schermo in ('', 'telefono', 'tablet', 'computer')),
  lingua      text not null default '' check (char_length(lingua) <= 5),
  nuova       boolean not null default false   -- true = prima pagina della visita
);

-- chiunque puo' AGGIUNGERE una visita, ma nessuno puo' LEGGERLE dal sito (solo voi dal pannello)
alter table public.visite enable row level security;
drop policy if exists "il sito aggiunge visite" on public.visite;
create policy "il sito aggiunge visite" on public.visite
  for insert to anon with check (true);
grant insert on public.visite to anon;
revoke select, update, delete on public.visite from anon;


-- ---------- 2. FILE 3D: cartella privata "file-clienti", file fino a 50 MB ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('file-clienti', 'file-clienti', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- chiunque puo' CARICARE un file 3D (solo questi tipi), ma nessuno puo' vederli o scaricarli dal sito
drop policy if exists "il sito carica i file 3D" on storage.objects;
create policy "il sito carica i file 3D" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'file-clienti'
    and lower(storage.extension(name)) in ('stl', '3mf', 'obj', 'step', 'stp')
  );


-- =====================================================================
--  COME VEDERE LE VISITE (SQL Editor > New query > incolla una di queste > Run)
--  Consiglio: salvale con "Save" cosi' le riapri con un clic.
-- =====================================================================

-- Visite degli ultimi 30 giorni, giorno per giorno
-- select date(creata at time zone 'Europe/Zurich') as giorno,
--        count(*) filter (where nuova) as visite,
--        count(*) as pagine_viste
-- from public.visite
-- where creata > now() - interval '30 days'
-- group by 1 order by 1 desc;

-- Le pagine piu' viste (anche le sezioni del negozio)
-- select pagina, count(*) as volte
-- from public.visite
-- where creata > now() - interval '30 days'
-- group by 1 order by 2 desc;

-- Da dove arrivano (Google, Instagram, WhatsApp...)
-- select coalesce(nullif(provenienza, ''), 'scritto a mano / link diretto') as da_dove, count(*) as visite
-- from public.visite
-- where nuova and creata > now() - interval '30 days'
-- group by 1 order by 2 desc;

-- Telefono, tablet o computer
-- select schermo, count(*) as visite from public.visite where nuova group by 1 order by 2 desc;
