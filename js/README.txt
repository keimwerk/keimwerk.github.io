KEIMWERK v2.5 – VOLLSTÄNDIGE WEBSITE MIT WINDOWS-STARTER
========================================================

START UNTER WINDOWS
1. ZIP vollständig entpacken.
2. Ordner Keimwerk_V2 öffnen.
3. start.bat doppelklicken.
4. Falls der Browser nicht automatisch startet: http://localhost:8000/
5. Zum Beenden das PowerShell-Fenster schließen oder Strg+C drücken.

NEU IN v2.5
- Vier Cannabis-Phasen: frühe/späte Vegetation, frühe/späte Blüte.
- Nährstoff-Zielbereiche nur für die Ampeln; keine Änderungen der mg/L-Berechnung.
- Dauerhafte Ca:Mg-Karte mit exaktem, phasenabhängigem Zielverhältnis
  3,5:1 / 2,9:1 / 3,1:1 / 1,4:1 (kein Toleranzbereich).
- Ca:Mg-Hinweise prüfen beide individuellen Zielbereiche und empfehlen
  keine blindlings auszuführende Ergänzung. Bei unvollständigen
  Nährstoffdeklarationen erfolgt keine verbindliche Empfehlung.
- Späte Blüte: Calcium 91-119 mg/L, Magnesium 65-85 mg/L,
  damit das Verhältnis 1,4:1 erreichbar ist.
- Bisherige gespeicherte Schemata werden weiterhin geladen; alte
  Phasen veg/gen werden auf späte Vegetation/frühe Blüte abgebildet.
- Die Zielbereiche sind BENUTZERDEFINIERTE Cannabis-Orientierungswerte,
  keine validierten, universell optimalen Düngeempfehlungen.

BEREITS ENTHALTEN AUS v2.4
- Zentrale Suche (Schaltfläche „Suche“ oder Tastenkürzel /) auf Startseite
  und Werkzeugseite: nach 227 Düngerprodukten, Lexikoneinträgen und
  Wissensnetz-Artikeln durchsuchen. Einzelartikel öffnen sich direkt.
- Direkte Querverweise zwischen Nährstofflexikon, Mängel-Finder,
  Schädlingen und passenden Nützlingen. Die Links sind Orientierung,
  keine Garantie einer Behandlung oder Wirkung.
- Zentrale lokale Gesamtsicherung: „Sicherung“ oben in der Navigation.
  Exportiert Grow-Tagebuch, Grow-Profile, Düngerfavoriten, eigenen Dünger,
  Rechnerzustand und persönliche Si-Ampel-Einstellungen in eine JSON-Datei.
  Wiederherstellung nur nach Dateiprüfung und ausdrücklicher Bestätigung.
  Vorhandene betroffene Speicherbereiche können überschrieben werden.
- Technische Optimierungen: vorbereiteter Suchindex statt Durchsuchen großer
  HTML-Dokumente zur Laufzeit, separate wartbare Such-/Sicherungs-Module,
  tastaturbedienbare Dialoge, mobile Darstellung und zusätzliche Integritätstests.

NICHT GEÄNDERT
- Alle 227 Düngerprodukte und ihre Referenzwerte.
- Sämtliche Düngerrechner-Formeln, Koeffizienten, Rundungsregeln,
  Wasserwertberechnungen und Si-/SiO2-Werte.
- Alle vorhandenen Werkzeuge, Grow-Projekte und bisherigen Browserdaten.

DATENSCHUTZ / DATENÜBERTRAGUNG
Die Gesamtsicherung läuft lokal auf deinem Gerät. Es werden weder Konten
angelegt noch persönliche Daten an einen Dienst übertragen. Die exportierte
JSON kann Bilder/Notizen enthalten: privat und sicher aufbewahren.
Daten auf localhost und GitHub Pages sind zwei getrennte Browser-Speicherorte.
Zum Umziehen erst auf der Quelle exportieren, dann am Ziel importieren.

TESTS
- tests\TESTS_STARTEN.bat unter Windows erfordert Node.js.
- Die Website und start.bat selbst benötigen kein Node.js.
- JavaScript-Syntax und Teile der neuen Oberfläche wurden in einem
  isolierten Browser-Test geprüft. Ein vollständiger Windows-Server-Praxistest
  konnte in der Entwicklungsumgebung nicht durchgeführt werden.

GITHUB PAGES
Auf GitHub Pages nur index.html, bereiche.html, app/, css/ und js/
veröffentlichen. Windows-Starter, tests/ und Textanleitungen gehören nicht
zur öffentlichen Website. Es wurde nichts auf GitHub verändert.

BILDQUELLEN: siehe BILDQUELLEN.txt.
