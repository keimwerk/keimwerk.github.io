@echo off
setlocal
cd /d "%~dp0.."
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js ist nicht installiert. Die Website laeuft trotzdem ohne Node.js.
 echo Fuer die automatischen Tests Node.js installieren: https://nodejs.org/
 pause
 exit /b 1
)
node tests\rechner_tests.js
if errorlevel 1 (
 echo Rechentests fehlgeschlagen.
 pause
 exit /b 1
)
node tests\v24_integrity_tests.js
if errorlevel 1 (
 echo v2.4 Integritaetstests fehlgeschlagen.
 pause
 exit /b 1
)
node tests\v25_phase_tests.js
if errorlevel 1 (
 echo v2.5 Phasentests fehlgeschlagen.
 pause
 exit /b 1
)
echo.
echo Alle automatischen Tests erfolgreich.
pause
