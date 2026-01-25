@echo off
echo Starting TeachGrid IDE...

:: Start Backend
echo Starting Backend Server...
start "TeachGrid Backend" cmd /k "cd backend && npm start"

:: Wait a moment for backend to initialize
timeout /t 5 /nobreak

:: Start Frontend
echo Starting Frontend Application...
start "TeachGrid Frontend" cmd /k "cd frontend && npm start"

echo.
echo Application started!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
echo.
echo Close the popup command windows to stop the servers.
pause
