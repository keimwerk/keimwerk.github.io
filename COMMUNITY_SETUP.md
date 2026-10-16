# Keimwerk Community – Setup

Diese Ergänzung legt eine separate Community-Seite unter `/community.html` an. Bestehende Bereiche der Keimwerk-Website bleiben weiterhin ohne Registrierung nutzbar. Die Änderungen liegen im Branch `feature/keimwerk-community`; sie werden erst nach Prüfung und Merge auf `main` veröffentlicht.

## Dateien

- `community.html`: Benutzeroberfläche für Registrierung, Anmeldung, Fragen, Antworten, Meldungen und Admin-Moderation.
- `community.css`: Gestaltung im vorhandenen Keimwerk-Farbschema.
- `community.js`: Supabase Auth und Community-Funktionen.
- `community-config.js`: öffentliche Supabase-URL und Publishable Key.
- `supabase/community_public_view_patch.sql`: kleiner Sicherheits-Patch für die öffentliche Antworten-Ansicht.

## 1. Supabase-Konfiguration

In `community-config.js` ist bereits die Projekt-URL eingetragen. Prüfe diese im Dashboard. Trage anschließend den **Publishable Key** des richtigen Supabase-Projekts ein (normalerweise Präfix `sb_publishable_`; alternativ den Legacy-`anon`-Key). Diese Schlüssel sind für Browsernutzung bestimmt, wenn die RLS-Regeln richtig gesetzt sind.

**Niemals** einen `service_role`-Key oder Secret Key in die Website oder in das öffentliche GitHub-Repository schreiben.

## 2. Benutzernamen dauerhaft reservieren

Im Supabase SQL Editor den Inhalt von `supabase/community_username_reservations.sql` ausführen, bevor die Community öffentlich geöffnet wird. Die Migration reserviert vorhandene Namen und ergänzt den Registrierungs-Trigger. Danach bleibt ein Name auch dann reserviert, wenn das Auth-Konto später gelöscht wird.

Das ist eine bewusste Datenschutzentscheidung: In der Reservierungstabelle bleibt der normalisierte Benutzername ohne Kontoverknüpfung bestehen. Vor dem öffentlichen Start muss dies in den Datenschutzhinweisen erklärt werden.

## 3. Öffentliche Antworten-Ansicht härten

Da `community_answers_public` eine View mit Eigentümerrechten ist, wird empfohlen, im Supabase SQL Editor den Inhalt von `supabase/community_public_view_patch.sql` auszuführen. Die Abfrage ändert die View-Definition, keine bestehenden Beiträge. Sie stellt sicher, dass Antworten von Nutzern mit Status `banned` auch dann nicht angezeigt werden, wenn ihre Frage selbst noch den Status `published` hat.

## 4. E-Mail-Versand

Supabase Authentication → Sign In / Providers: E-Mail-Anmeldung und Confirm email eingeschaltet lassen. Authentication → URL Configuration:
- Site URL: `https://keimwerk.github.io`
- Redirect URL: `https://keimwerk.github.io/**`

Für eine öffentliche Registrierung sollte ein eigener SMTP-Anbieter eingerichtet und getestet werden. Der Standardversand ist sehr eingeschränkt und für öffentliche Registrierung nicht zuverlässig genug.

## 5. Ersten Admin freischalten

1. Erst nachdem die Konfiguration stimmt und SMTP funktioniert, auf der Community-Seite ein eigenes Konto mit der persönlichen E-Mail-Adresse, Passwort und einem festen Benutzernamen registrieren.
2. Die Bestätigungs-E-Mail über den Link bestätigen.
3. Im Supabase SQL Editor die folgende Abfrage nur mit der eigenen, kontrollierten E-Mail-Adresse ausführen:

```sql
insert into public.community_admins (user_id)
select id
from auth.users
where lower(email) = lower('DEINE-EMAIL-ADRESSE')
on conflict (user_id) do nothing;
```

Die Tabelle `community_admins` darf niemals für normale Besucher beschreibbar sein. Der Admin-Bereich wird durch `community_is_admin()` und serverseitige RPC-Prüfungen geschützt; das Verstecken der Oberfläche allein ist keine Sicherheitsmaßnahme.

## 6. Funktionsprüfung vor dem öffentlichen Start

- Registrierungsbestätigung und Passwort-Reset funktionieren wirklich per E-Mail.
- Ein bereits vergebener Benutzername kann nicht erneut registriert werden.
- Ein Benutzername ist nach Registrierung nicht änderbar (Frontend bietet keine Änderung an; die Datenbank hat keinen Schreibzugriff für Nutzer auf Profile).
- Nicht angemeldete Besucher lesen nur veröffentlichte Inhalte.
- Normale angemeldete Nutzer können Fragen/Antworten veröffentlichen und Inhalte melden, aber keine Admin-Daten sehen oder Moderations-RPCs erfolgreich ausführen.
- Gesperrte Konten können serverseitig keine neuen Inhalte veröffentlichen.
- Ausgeblendete/entfernte Inhalte erscheinen nicht in öffentlichen Views.
- Die übrigen Keimwerk-Funktionen sind weiterhin ohne Community-Login nutzbar.

## Datenschutz

Die Community ist pseudonym, nicht technisch vollständig anonym: Andere Besucher sehen den selbst gewählten Benutzernamen, nicht die E-Mail-Adresse. Vor dem öffentlichen Start Datenschutzhinweise, Community-Regeln, Melde-/Kontaktmöglichkeit, angemessene Aufbewahrungsfristen und Löschprozess für Moderationsdaten ergänzen.
