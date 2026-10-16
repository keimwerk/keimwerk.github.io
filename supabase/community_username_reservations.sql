-- Keimwerk: Namen dauerhaft reservieren
-- Diese Migration verändert keine vorhandenen Beiträge oder Konten.
-- Sie reserviert aktuelle Benutzernamen vor und reserviert bei jeder neuen
-- Community-Registrierung den Namen unabhängig vom späteren Auth-Konto dauerhaft.
--
-- Hinweis für Datenschutz/Account-Löschung:
-- Eine Namensreservierung bleibt nach Löschung des Kontos erhalten. Informiere
-- Nutzer darüber in den Datenschutzhinweisen. Die Tabelle speichert absichtlich
-- nur den normalisierten Namen und keinen Verweis auf das gelöschte Konto.

begin;

create table if not exists public.community_username_reservations (
  username_normalized text primary key,
  reserved_at timestamptz not null default now(),
  constraint community_username_reservations_format_check
    check (username_normalized ~ '^[a-z0-9_]{3,24}$')
);

alter table public.community_username_reservations enable row level security;

revoke all on table public.community_username_reservations
  from public, anon, authenticated;

-- Backfill: reserviert alle derzeit bestehenden Community-Namen.
insert into public.community_username_reservations (username_normalized)
select lower(btrim(username))
from public.community_profiles
where username is not null
on conflict (username_normalized) do nothing;

-- Bei künftigen Registrierungen zuerst den Namen reservieren und dann das Profil
-- erstellen. Wenn der Name bereits verwendet wurde, rollt die Registrierung zurück.
create or replace function public.handle_new_community_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_username text;
begin
  v_username := btrim(coalesce(new.raw_user_meta_data ->> 'username', ''));

  -- Auth-Konten, die nicht für die Community registriert werden, überspringen.
  if v_username = '' then
    return new;
  end if;

  if v_username !~ '^[A-Za-z0-9_]{3,24}$' then
    raise exception
      'Benutzername muss 3–24 Zeichen lang sein und darf nur Buchstaben, Zahlen und Unterstriche enthalten.';
  end if;

  insert into public.community_username_reservations (username_normalized)
  values (lower(v_username));

  insert into public.community_profiles (id, username)
  values (new.id, v_username);

  return new;
exception
  when unique_violation then
    raise exception
      'Dieser Benutzername ist bereits vergeben und kann nicht erneut verwendet werden.'
      using errcode = '23505';
end;
$function$;

revoke all on function public.handle_new_community_user()
  from public, anon, authenticated;

commit;
