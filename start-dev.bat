@echo off
title T-Hexa Movies - Dev Server
cd /d "%~dp0"

echo.
echo ============================================================
echo    T-Hexa Movies - Dev Server
echo ============================================================
echo.
echo  Starting server at: http://localhost:3000
echo  Press Ctrl+C to stop
echo.
npm run dev
