@echo off
REM ============================================================
REM HLMS - Start Complete System
REM ============================================================
REM This script starts both server and client in development mode
REM ============================================================

echo.
echo ============================================================
echo  STARTING HLMS - Skill Learning Management System
echo ============================================================
echo.

REM Check if PostgreSQL is running
echo [1/5] Checking PostgreSQL service...
sc query postgresql-x64-18 | find "RUNNING" >nul
if errorlevel 1 (
    echo [ERROR] PostgreSQL is not running. Please start PostgreSQL service first.
    echo Run: net start postgresql-x64-18
    pause
    exit /b 1
)
echo [OK] PostgreSQL is running
echo.

REM Check if node modules exist
echo [2/5] Checking dependencies...
if not exist "server\node_modules" (
    echo [WARN] Server dependencies not found. Installing...
    cd server
    call npm install
    cd ..
)
if not exist "client\node_modules" (
    echo [WARN] Client dependencies not found. Installing...
    cd client
    call npm install
    cd ..
)
echo [OK] Dependencies ready
echo.

REM Build server if needed
echo [3/5] Building server...
cd server
if not exist "dist" (
    echo Building TypeScript...
    call npm run build
)
cd ..
echo [OK] Server ready
echo.

REM Start server in background
echo [4/5] Starting backend server...
cd server
start /B "HLMS-Server" cmd /c "npm run dev > server.log 2>&1"
cd ..

REM Wait for server to start
timeout /t 5 /nobreak >nul

REM Check if server is running
powershell -Command "Test-NetConnection -ComputerName localhost -Port 5000 -InformationLevel Quiet" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Server failed to start. Check server\server.log for errors.
    pause
    exit /b 1
)
echo [OK] Server started on http://localhost:5000
echo.

REM Start client
echo [5/5] Starting frontend client...
cd client
start /B "HLMS-Client" cmd /c "npm run dev > client.log 2>&1"
cd ..

REM Wait for client to start
timeout /t 5 /nobreak >nul

echo.
echo ============================================================
echo  HLMS SYSTEM STARTED SUCCESSFULLY!
echo ============================================================
echo.
echo  Backend Server:  http://localhost:5000
echo  Frontend Client: http://localhost:3002 (or next available port)
echo  API Health:      http://localhost:5000/health
echo.
echo  Default Login Credentials:
echo  ---------------------------
echo  Admin:
echo    Email:    admin@hlms.com
echo    Password: Admin@123
echo.
echo  Faculty:
echo    Email:    faculty1@hlms.com
echo    Password: Faculty@123
echo.
echo  Student:
echo    Email:    student1@hlms.com
echo    Password: Student@123
echo.
echo ============================================================
echo  Press any key to open browser...
echo  (Or manually visit http://localhost:3002)
echo ============================================================
pause

REM Open browser
start http://localhost:3002

echo.
echo System is running. Close this window to stop all services.
echo Or run STOP.bat to stop gracefully.
echo.
pause
