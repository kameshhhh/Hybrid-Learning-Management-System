@echo off
echo.
echo ========================================
echo  HLMS - Starting Development Servers
echo ========================================
echo.

echo [1/3] Starting PostgreSQL...
echo Please ensure PostgreSQL is running on port 5432
timeout /t 2 >nul

echo.
echo [2/3] Starting Backend Server (Port 5000)...
start "HLMS Backend" cmd /k "cd server && npm run dev"
timeout /t 5 >nul

echo.
echo [3/3] Starting Frontend Server (Port 3000)...
start "HLMS Frontend" cmd /k "cd client && npm run dev"
timeout /t 3 >nul

echo.
echo ========================================
echo  Servers Starting...
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Opening browser in 5 seconds...
timeout /t 5 >nul

start http://localhost:3000

echo.
echo ========================================
echo  HLMS is now running!
echo ========================================
echo.
echo Press any key to exit (servers will continue running)
pause >nul
