@echo off
cd /d "%~dp0"
echo Instalando dependencias si hacen falta...
npm install
echo.
echo Iniciando LexiUPVM v3...
npm start
pause
