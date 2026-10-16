-- Keimwerk Community: eigenen Benutzernamen sicher abrufen
-- Gibt nur den Benutzernamen des aktuell angemeldeten Kontos zurück.
-- Keine E-Mail-Adresse und keine fremden Profile werden offengelegt.

create or replace function public.community_my_username()
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select p.username
  from public.community_profiles p
  where p.id = auth.uid()
  limit 1;
$function$;

revoke all on function public.community_my_username() from public, anon;
grant execute on function public.community_my_username() to authenticated;
