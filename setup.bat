@echo off
echo ===============================================
echo     PDF to Word Converter - Setup Script
echo ===============================================
echo.

echo Creando estructura de directorios...
if not exist "backend\temp_files" mkdir backend\temp_files

echo.
echo Verificando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python no está instalado
    pause
    exit /b 1
)

echo.
echo Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no está instalado
    pause
    exit /b 1
)

echo.
echo Instalando dependencias del backend...
cd backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Falló instalación Python
    pause
    exit /b 1
)

echo.
echo Instalando dependencias del frontend...
cd ..\frontend
npm install
if %errorlevel% neq 0 (
    echo ERROR: Falló instalación Node.js
    pause
    exit /b 1
)

cd ..
echo.
echo ===============================================
echo           Setup completado exitosamente!
echo ===============================================
echo.
echo Para iniciar:
echo 1. Ejecuta start-backend.bat
echo 2. Ejecuta start-frontend.bat
echo 3. Abre http://localhost:3000
echo.
pause