@echo off
REM ============================================================
REM HLMS - Stop All Services
REM ============================================================
REM This script stops both server and client processes
REM ============================================================

echo.
echo ============================================================
echo  STOPPING HLMS SERVICES
echo ============================================================
echo.

echo [1/2] Stopping backend server...
taskkill /FI "WINDOWTITLE eq HLMS-Server*" /F >nul 2>&1
if errorlevel 1 (
    echo [WARN] Server process not found or already stopped
) else (
    echo [OK] Server stopped
)
echo.

echo [2/2] Stopping frontend client...
taskkill /FI "WINDOWTITLE eq HLMS-Client*" /F >nul 2>&1
if errorlevel 1 (
    echo [WARN] Client process not found or already stopped
) else (
    echo [OK] Client stopped
)
echo.

REM Also kill any node processes running on our ports
echo Cleaning up any remaining processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3002"') do taskkill /F /PID %%a >nul 2>&1

echo.
echo ============================================================
echo  ALL SERVICES STOPPED
echo ============================================================
echo.
pause
