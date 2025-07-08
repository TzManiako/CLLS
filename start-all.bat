@echo off
echo Iniciando PDF to Word Converter...
echo.
echo Iniciando backend...
start "Backend" cmd /c "cd backend && python main.py"

timeout /t 5 /nobreak > nul

echo Iniciando frontend...
start "Frontend" cmd /c "cd frontend && npm start"

echo.
echo Servidores iniciados:
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
pause