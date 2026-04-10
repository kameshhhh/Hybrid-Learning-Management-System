@echo off
echo.
echo ========================================
echo  HLMS - Stopping All Servers
echo ========================================
echo.

echo Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo ========================================
echo  All servers stopped!
echo ========================================
echo.
pause
