@echo off
cd /d "%~dp0"
chcp 65001 >nul
cd /d "%~dp0"
title Big Doner
where node >nul 2>nul || (echo Node.js ornatylmagan. https://nodejs.org saitynan LTS nusqasyn ornatynyz & pause & exit /b)
set /p ADMIN_PASSWORD=Admin qupiyasozin zhazynyz (mysaly 12345abc): 
if "%ADMIN_PASSWORD%"=="" set ADMIN_PASSWORD=admin123
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000/admin & start http://localhost:3000"
node server.js
pause
