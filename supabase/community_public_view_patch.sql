-- Keimwerk Community: gehärtete öffentliche Antworten-Ansicht
-- Führt nur die View-Definition erneut aus, ändert keine vorhandenen Beiträge.
-- Antworten werden nicht gezeigt, wenn die zugrunde liegende Frage vom
-- Statusfilter ausgeschlossen ist oder der Fragen-Autor dauerhaft gesperrt wurde.

create or replace view public.community_answers_public
with (security_barrier = true)
as
select
  a.id,
  a.question_id,
  coalesce(ap.username, 'Gelöschter Nutzer') as username,
  a.body,
  a.created_at,
  a.updated_at
from public.community_answers a
join public.community_questions q on q.id = a.question_id
left join public.community_profiles ap on ap.id = a.user_id
left join public.community_profiles qp on qp.id = q.user_id
where a.status = 'published'
  and q.status = 'published'
  and (ap.id is null or ap.status <> 'banned')
  and (qp.id is null or qp.status <> 'banned');

revoke all on table public.community_answers_public from public, anon, authenticated;
grant select on table public.community_answers_public to anon, authenticated;
