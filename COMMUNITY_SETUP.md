# Keimwerk Community – Setup

Diese Ergänzung legt eine separate Community-Seite unter `/community.html` an. Bestehende Bereiche der Keimwerk-Website bleiben weiterhin ohne Registrierung nutzbar. Die Änderungen liegen im Branch `feature/keimwerk-community`; sie werden erst nach Prüfung und Merge auf `main` veröffentlicht.

## Dateien

- `community.html`: Benutzeroberfläche für Registrierung, Anmeldung, Fragen, Antworten, Meldungen und Admin-Moderation.
- `community.css`: Gestaltung im vorhandenen Keimwerk-Farbschema.
- `community.js`: Supabase Auth und Community-Funktionen.
- `community-config.js`: öffentliche Supabase-URL und Publishable Key.
- `supabase/community_public_view_patch.sql`: Sicherheits-Patch für die öffentliche Antworten-Ansicht.
- `supabase/community_username_reservations.sql`: reserviert Benutzernamen auch nach Kontolöschung dauerhaft.
- `supabase/community_my_username.sql`: sicherer Abruf des eigenen festen Benutzernamens für die Kontoanzeige.

## Lokale Testversion starten

Die Community kann vor dem Merge lokal geprüft werden, ohne die veröffentlichte Keimwerk-Website zu ändern.

1. Lade den ZIP-Stand dieses Branches herunter: https://github.com/keimwerk/keimwerk.github.io/archive/refs/heads/feature/keimwerk-community.zip
2. Entpacke die ZIP-Datei auf deinem PC.
3. Supabase → Authentication → URL Configuration: Lass die **Site URL** auf `https://keimwerk.github.io`. Ergänze bei **Redirect URLs** zusätzlich `http://localhost:8000/**`.
4. Öffne den entpackten Projektordner in Windows PowerShell/Terminal. Starte dort `py -m http.server 8000`.
5. Öffne im Browser `http://localhost:8000/community.html`. Das Terminalfenster muss während des Tests offen bleiben.

Die E-Mail-Bestätigung und der Passwort-Reset leiten zurück auf die URL, unter der die Community gerade läuft. Auf GitHub Pages bleibt es `https://keimwerk.github.io/community.html`; lokal wird `http://localhost:8000/community.html` verwendet.

**Wichtig:** Diese lokale Vorschau verwendet aktuell dasselbe Supabase-Projekt wie die geplante Community, nicht eine isolierte Testdatenbank. Benutze daher einen eigens für den Test gewählten Namen (z. B. `kw_test_2026`); reservierte Testnamen bleiben dauerhaft gesperrt, auch nach einer späteren Kontolöschung. Das Supabase-Publishable-Key im öffentlichen Repository ist kein Geheimnis; die Sicherheit muss über RLS und die Datenbankfunktionen gewährleistet sein. Vor dem Test sollten wir die Registrierung nur dann aktivieren, wenn du direkt testest, und sie danach wieder deaktivieren, bis du die Community bewusst freigibst.

## 1. Supabase-Konfiguration

In `community-config.js` ist bereits die Projekt-URL eingetragen. Prüfe diese im Dashboard. Trage anschließend den **Publishable Key** des richtigen Supabase-Projekts ein (normalerweise Präfix `sb_publishable_`; alternativ den Legacy-`anon`-Key). Diese Schlüssel sind für Browsernutzung bestimmt, wenn die RLS-Regeln richtig gesetzt sind.

**Niemals** einen `service_role`-Key oder Secret Key in die Website oder in das öffentliche GitHub-Repository schreiben.

## 2. Benutzernamen dauerhaft reservieren

Im Supabase SQL Editor den Inhalt von `supabase/community_username_reservations.sql` ausführen, bevor die Community öffentlich geöffnet wird. Die Migration reserviert vorhandene Namen und ergänzt den Registrierungs-Trigger. Danach bleibt ein Name auch dann reserviert, wenn das Auth-Konto später gelöscht wird.

Das ist eine bewusste Datenschutzentscheidung: In der Reservierungstabelle bleibt der normalisierte Benutzername ohne Kontoverknüpfung bestehen. Vor dem öffentlichen Start muss dies in den Datenschutzhinweisen erklärt werden.

## 3. Eigenen Benutzernamen im Konto anzeigen

Im Supabase SQL Editor den Inhalt von `supabase/community_my_username.sql` ausführen. Diese RPC-Funktion gibt ausschließlich den festen Benutzernamen des aktuell angemeldeten Kontos zurück. Dadurch zeigt die Kontoübersicht auch bei älteren Konten den Profilnamen an, ohne Zugriff auf fremde Profile oder E-Mail-Adressen zu geben.

## 3. Öffentliche Antworten-Ansicht härten

Da `community_answers_public` eine View mit Eigentümerrechten ist, wird empfohlen, im Supabase SQL Editor den Inhalt von `supabase/community_public_view_patch.sql` auszuführen. Die Abfrage ändert die View-Definition, keine bestehenden Beiträge. Sie stellt sicher, dass Antworten von Nutzern mit Status `banned` auch dann nicht angezeigt werden, wenn ihre Frage selbst noch den Status `published` hat.

## 5. E-Mail-Versand

Supabase Authentication → Sign In / Providers: E-Mail-Anmeldung und Confirm email eingeschaltet lassen. Authentication → URL Configuration:
- Site URL: `https://keimwerk.github.io`
- Redirect URL: `https://keimwerk.github.io/**`

Für eine öffentliche Registrierung sollte ein eigener SMTP-Anbieter eingerichtet und getestet werden. Der Standardversand ist sehr eingeschränkt und für öffentliche Registrierung nicht zuverlässig genug.

## 6. Ersten Admin freischalten

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

## 7. Funktionsprüfung vor dem öffentlichen Start

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
