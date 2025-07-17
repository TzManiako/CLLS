import os
import json
from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Query, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.background import BackgroundTasks
import tempfile
import subprocess
import shutil
from pathlib import Path
import logging
import uuid
from pdf2docx import Converter
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional
import jwt
import requests
from datetime import datetime, timedelta

# Importar nuestro motor PDF
from pdf_tools import PDFToolsManager

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PDF Tools Suite - César Loreth", version="2.0.0")

# CORS actualizado
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción usar dominios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directorio temporal para archivos
TEMP_DIR = Path("temp_files")
TEMP_DIR.mkdir(exist_ok=True)

# Executor para operaciones pesadas
executor = ThreadPoolExecutor(max_workers=2)

# Inicializar PDF Tools Manager
pdf_tools = PDFToolsManager(TEMP_DIR)

# Almacenamiento temporal de archivos convertidos (para Azure)
converted_files = {}

def cleanup_file(file_path: str):
    """Limpia archivos temporales de forma segura"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Archivo temporal eliminado: {file_path}")
    except Exception as e:
        logger.warning(f"No se pudo eliminar el archivo {file_path}: {e}")

def cleanup_multiple_files(file_paths: List[str]):
    """Limpia múltiples archivos temporales"""
    for file_path in file_paths:
        cleanup_file(file_path)

def convert_pdf_with_pdf2docx(pdf_path: str, docx_path: str) -> bool:
    """Convierte PDF a DOCX usando pdf2docx"""
    try:
        cv = Converter(pdf_path)
        cv.convert(docx_path, start=0, end=None)
        cv.close()
        return os.path.exists(docx_path) and os.path.getsize(docx_path) > 0
    except Exception as e:
        logger.error(f"Error con pdf2docx: {e}")
        return False

def convert_pdf_to_docx(pdf_path: str, output_dir: str) -> str:
    """Convierte PDF a DOCX usando pdf2docx"""
    unique_id = str(uuid.uuid4())
    docx_filename = f"converted_{unique_id}.docx"
    docx_path = os.path.join(output_dir, docx_filename)
    
    logger.info("Iniciando conversión con pdf2docx...")
    if convert_pdf_with_pdf2docx(pdf_path, docx_path):
        logger.info("Conversión exitosa con pdf2docx")
        return docx_path
    
    raise Exception("No se pudo convertir el archivo")

# Funciones auxiliares para Azure (mantener las existentes)
async def validate_azure_user(email: str) -> bool:
    """Valida usuario en Azure AD"""
    try:
        import msal
        
        app_msal = msal.ConfidentialClientApplication(
            client_id=os.getenv('AZURE_CLIENT_ID'),
            client_credential=os.getenv('AZURE_CLIENT_SECRET'),
            authority=f"https://login.microsoftonline.com/{os.getenv('AZURE_TENANT_ID')}"
        )
        
        token_response = app_msal.acquire_token_for_client(
            scopes=["https://graph.microsoft.com/.default"]
        )
        
        if "access_token" not in token_response:
            print("No se pudo obtener token de Azure")
            return False
        
        headers = {
            'Authorization': f'Bearer {token_response["access_token"]}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(
            f"https://graph.microsoft.com/v1.0/users/{email}",
            headers=headers,
            timeout=10
        )
        
        print(f"Azure validation para {email}: {response.status_code}")
        return response.status_code == 200
        
    except Exception as e:
        print(f"Error validando Azure user: {e}")
        return False

def generate_download_token(email: str, file_id: str) -> str:
    """Genera token JWT para descarga"""
    payload = {
        'email': email,
        'file_id': file_id,
        'purpose': 'download',
        'exp': datetime.utcnow() + timedelta(hours=2),
        'iat': datetime.utcnow()
    }
    
    secret = os.getenv('JWT_SECRET', 'mi-secreto-fallback-2024')
    return jwt.encode(payload, secret, algorithm='HS256')

def validate_download_token(token: str) -> dict:
    """Valida token de descarga"""
    try:
        secret = os.getenv('JWT_SECRET', 'mi-secreto-fallback-2024')
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        
        if payload.get('purpose') != 'download':
            return None
        return payload
    except jwt.ExpiredSignatureError:
        print("Token expirado")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Token inválido: {e}")
        return None

async def send_download_email(email: str, token: str, filename: str):
    """Simula envío de correo"""
    download_url = f"http://localhost:3000/download?token={token}"
    
    print("="*50)
    print("📧 CORREO SIMULADO")
    print(f"Para: {email}")
    print(f"Asunto: Documento convertido: {filename}")
    print(f"Link de descarga: {download_url}")
    print("⏰ Expira en 2 horas")
    print("="*50)
    
    return True

# ============================================
# ENDPOINTS PRINCIPALES
# ============================================

@app.get("/")
async def root():
    return {
        "message": "PDF Tools Suite - César Loreth", 
        "status": "running",
        "version": "2.0.0",
        "tools": ["convert", "split", "extract", "merge"]
    }

@app.get("/health")
async def health_check():
    """Endpoint para verificar el estado del servicio"""
    return {
        "status": "healthy", 
        "version": "2.0.0",
        "tools_available": 4,
        "temp_dir": str(TEMP_DIR)
    }

# ============================================
# 🔄 PDF TO WORD (ENDPOINTS EXISTENTES)
# ============================================

@app.post("/convert")
async def convert_pdf(file: UploadFile = File(...)):
    """🔄 Convierte un archivo PDF a formato DOCX - Endpoint original"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF")
    
    if file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail="Tipo de contenido inválido")
    
    unique_id = str(uuid.uuid4())
    pdf_filename = f"input_{unique_id}.pdf"
    pdf_path = TEMP_DIR / pdf_filename
    
    try:
        logger.info(f"🔄 Guardando archivo PDF: {pdf_path}")
        with open(pdf_path, "wb") as buffer:
            content = await file.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="El archivo está vacío")
            buffer.write(content)
        
        if not pdf_path.exists() or pdf_path.stat().st_size == 0:
            raise HTTPException(status_code=500, detail="Error al guardar el archivo PDF")
        
        logger.info("🔄 Iniciando conversión PDF a DOCX...")
        loop = asyncio.get_event_loop()
        docx_path = await loop.run_in_executor(
            executor, 
            convert_pdf_to_docx, 
            str(pdf_path), 
            str(TEMP_DIR)
        )
        
        if not os.path.exists(docx_path) or os.path.getsize(docx_path) == 0:
            raise HTTPException(status_code=500, detail="La conversión falló")
        
        logger.info(f"✅ Conversión exitosa. Archivo DOCX: {docx_path}")
        
        headers = {
            "Content-Disposition": f"attachment; filename={file.filename.replace('.pdf', '.docx')}",
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        }
        
        return FileResponse(
            path=docx_path,
            headers=headers,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            background=BackgroundTasks([lambda: cleanup_file(str(pdf_path))])
        )
        
    except HTTPException:
        cleanup_file(str(pdf_path))
        raise
    except Exception as e:
        cleanup_file(str(pdf_path))
        logger.error(f"❌ Error durante la conversión: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@app.post("/convert-with-azure")
async def convert_pdf_with_azure(
    file: UploadFile = File(...),
    user_email: str = Query(..., description="Correo institucional del usuario")
):
    """🔄 Endpoint con autenticación Azure AD y token por correo"""
    
    print(f"🔵 Intentando conversión con Azure para: {user_email}")
    
    # 1. Validar usuario en Azure AD
    is_valid_user = await validate_azure_user(user_email)
    if not is_valid_user:
        raise HTTPException(
            status_code=401, 
            detail="Usuario no encontrado en Azure AD de la empresa"
        )
    
    print(f"✅ Usuario {user_email} validado en Azure AD")
    
    # 2. Validar archivo PDF
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo archivos PDF permitidos")
    
    unique_id = str(uuid.uuid4())
    pdf_filename = f"azure_input_{unique_id}.pdf"
    pdf_path = TEMP_DIR / pdf_filename
    
    try:
        print(f"💾 Guardando archivo: {file.filename}")
        with open(pdf_path, "wb") as buffer:
            content = await file.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="Archivo vacío")
            buffer.write(content)
        
        print("🔄 Iniciando conversión PDF a Word...")
        loop = asyncio.get_event_loop()
        docx_path = await loop.run_in_executor(
            executor, 
            convert_pdf_to_docx, 
            str(pdf_path), 
            str(TEMP_DIR)
        )
        
        file_id = str(uuid.uuid4())
        converted_files[file_id] = {
            'path': docx_path,
            'filename': file.filename.replace('.pdf', '.docx'),
            'user_email': user_email,
            'created_at': datetime.utcnow()
        }
        
        print(f"💾 Archivo convertido guardado con ID: {file_id}")
        
        token = generate_download_token(user_email, file_id)
        print(f"🔑 Token generado para descarga")
        
        await send_download_email(user_email, token, file.filename)
        
        cleanup_file(str(pdf_path))
        print("🗑️ Archivo PDF original eliminado")
        
        return {
            "message": f"Conversión exitosa. Token enviado a {user_email}",
            "user_email": user_email,
            "expires_in": "2 horas",
            "file_id": file_id
        }
        
    except Exception as e:
        cleanup_file(str(pdf_path))
        print(f"❌ Error en conversión: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando archivo: {str(e)}")

@app.get("/download")
async def download_with_token(token: str = Query(...)):
    """📥 Descarga archivo usando token del correo"""
    
    print(f"🔑 Intentando descarga con token...")
    
    token_data = validate_download_token(token)
    if not token_data:
        print("❌ Token inválido o expirado")
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    
    print(f"✅ Token válido para: {token_data.get('email')}")
    
    file_id = token_data['file_id']
    if file_id not in converted_files:
        print(f"❌ Archivo {file_id} no encontrado")
        raise HTTPException(status_code=404, detail="Archivo no encontrado o expirado")
    
    file_info = converted_files[file_id]
    
    if file_info['user_email'] != token_data['email']:
        print(f"❌ Usuario no autorizado: {token_data['email']}")
        raise HTTPException(status_code=403, detail="No autorizado para este archivo")
    
    if not os.path.exists(file_info['path']):
        print(f"❌ Archivo físico no encontrado: {file_info['path']}")
        del converted_files[file_id]
        raise HTTPException(status_code=404, detail="Archivo no disponible")
    
    print(f"📥 Enviando archivo: {file_info['filename']}")
    
    try:
        return FileResponse(
            path=file_info['path'],
            filename=file_info['filename'],
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    except Exception as e:
        print(f"❌ Error enviando archivo: {e}")
        raise HTTPException(status_code=500, detail="Error descargando archivo")

# ============================================
# 📊 PDF INFO - Obtener información del PDF
# ============================================

@app.post("/pdf/info")
async def get_pdf_info(file: UploadFile = File(...)):
    """📊 Obtiene información completa del PDF"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Debe ser un archivo PDF")
    
    unique_id = str(uuid.uuid4())
    pdf_path = TEMP_DIR / f"info_{unique_id}.pdf"
    
    try:
        logger.info(f"📊 Analizando PDF: {file.filename}")
        
        # Guardar archivo temporal
        with open(pdf_path, "wb") as buffer:
            content = await file.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="El archivo está vacío")
            buffer.write(content)
        
        # Validar que sea un PDF válido
        if not pdf_tools.validate_pdf_file(str(pdf_path)):
            raise HTTPException(status_code=400, detail="Archivo PDF corrupto o inválido")
        
        # Obtener información
        info = pdf_tools.get_pdf_info(str(pdf_path))
        
        return {
            "filename": file.filename,
            "info": info,
            "message": "Información obtenida exitosamente",
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo info PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando PDF: {str(e)}")
    finally:
        cleanup_file(str(pdf_path))

# ============================================
# 📄 DIVIDIR PDF - Split PDF por páginas
# ============================================

@app.post("/pdf/split/pages")
async def split_pdf_by_pages(file: UploadFile = File(...)):
    """📄 Divide PDF en archivos separados por página"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Debe ser un archivo PDF")
    
    unique_id = str(uuid.uuid4())
    pdf_path = TEMP_DIR / f"split_{unique_id}.pdf"
    
    try:
        logger.info(f"📄 Dividiendo PDF por páginas: {file.filename}")
        
        # Guardar archivo temporal
        with open(pdf_path, "wb") as buffer:
            content = await file.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="El archivo está vacío")
            buffer.write(content)
        
        # Validar PDF
        if not pdf_tools.validate_pdf_file(str(pdf_path)):
            raise HTTPException(status_code=400, detail="Archivo PDF corrupto o inválido")
        
        # Dividir PDF
        filename_prefix = file.filename.replace('.pdf', '').replace(' ', '_')
        output_files = pdf_tools.split_pdf_by_pages(str(pdf_path), filename_prefix)
        
        if not output_files:
            raise HTTPException(status_code=500, detail="No se pudieron generar archivos")
        
        # Crear ZIP con todos los archivos
        zip_name = f"split_pages_{filename_prefix}_{unique_id[:8]}.zip"
        zip_path = pdf_tools.create_zip_from_files(output_files, zip_name)
        
        logger.info(f"✅ PDF dividido en {len(output_files)} páginas")
        
        return FileResponse(
            path=zip_path,
            filename=zip_name,
            media_type="application/zip",
            background=BackgroundTasks([lambda: cleanup_multiple_files(output_files + [str(pdf_path), zip_path])])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error dividiendo PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error dividiendo PDF: {str(e)}")
    finally:
        if os.path.exists(pdf_path):
            cleanup_file(str(pdf_path))

@app.post("/pdf/split/ranges")
async def split_pdf_by_ranges(file: UploadFile = File(...), ranges: str = Form(...)):
    """📊 Divide PDF por rangos especificados"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Debe ser un archivo PDF")
    
    # Parsear rangos desde string JSON
    try:
        ranges_list = json.loads(ranges)
        if not isinstance(ranges_list, list):
            raise ValueError("Debe ser una lista")
        
        # Validar formato de rangos
        ranges_tuples = []
        for r in ranges_list:
            if not isinstance(r, list) or len(r) != 2:
                raise ValueError("Cada rango debe tener exactamente 2 números")
            start, end = int(r[0]), int(r[1])
            if start <= 0 or end <= 0 or start > end:
                raise ValueError(f"Rango inválido: {start}-{end}")
            ranges_tuples.append((start, end))
            
    except (json.JSONDecodeError, ValueError, TypeError) as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Formato de rangos inválido: {str(e)}. Usar: [[1,5], [6,10]]"
        )
    
    unique_id = str(uuid.uuid4())
    pdf_path = TEMP_DIR / f"split_ranges_{unique_id}.pdf"
    
    try:
        logger.info(f"📊 Dividiendo PDF por {len(ranges_tuples)} rangos: {file.filename}")
        
        # Guardar archivo temporal
        with open(pdf_path, "wb") as buffer:
            content = await file.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="El archivo está vacío")
            buffer.write(content)
        
        # Validar PDF
        if not pdf_tools.validate_pdf_file(str(pdf_path)):
            raise HTTPException(status_code=400, detail="Archivo PDF corrupto o inválido")
        
        # Dividir por rangos
        filename_prefix = file.filename.replace('.pdf', '').replace(' ', '_')
        output_files = pdf_tools.split_pdf_by_ranges(str(pdf_path), ranges_tuples, filename_prefix)
        
        if not output_files:
            raise HTTPException(status_code=500, detail="No se pudieron generar archivos")
        
        # Crear ZIP
        zip_name = f"split_ranges_{filename_prefix}_{unique_id[:8]}.zip"
        zip_path = pdf_tools.create_zip_from_files(output_files, zip_name)
        
        logger.info(f"✅ PDF dividido en {len(output_files)} rangos")
        
        return FileResponse(
            path=zip_path,
            filename=zip_name,
            media_type="application/zip",
            background=BackgroundTasks([lambda: cleanup_multiple_files(output_files + [str(pdf_path), zip_path])])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error dividiendo PDF por rangos: {e}")
        raise HTTPException(status_code=500, detail=f"Error dividiendo PDF: {str(e)}")
    finally:
        if os.path.exists(pdf_path):
            cleanup_file(str(pdf_path))

# ============================================
# ✂️ EXTRAER PÁGINAS - Extract specific pages
# ============================================

@app.post("/pdf/extract/pages")
async def extract_specific_pages(file: UploadFile = File(...), pages: str = Form(...)):
    """✂️ Extrae páginas específicas en un solo PDF"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Debe ser un archivo PDF")
    
    # Parsear páginas desde string JSON
    try:
        pages_list = json.loads(pages)
        if not isinstance(pages_list, list):
            raise ValueError("Debe ser una lista")
        
        # Validar y convertir páginas
        pages_int = []
        for p in pages_list:
            page_num = int(p)
            if page_num <= 0:
                raise ValueError(f"Número de página inválido: {page_num}")
            pages_int.append(page_num)
        
        if not pages_int:
            raise ValueError("Lista de páginas vacía")
            
    except (json.JSONDecodeError, ValueError, TypeError) as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Formato de páginas inválido: {str(e)}. Usar: [1, 3, 5, 7]"
        )
    
    unique_id = str(uuid.uuid4())
    pdf_path = TEMP_DIR / f"extract_{unique_id}.pdf"
    
    try:
        logger.info(f"✂️ Extrayendo {len(pages_int)} páginas de: {file.filename}")
        
        # Guardar archivo temporal
        with open(pdf_path, "wb") as buffer:
            content = await file.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="El archivo está vacío")
            buffer.write(content)
        
        # Validar PDF
        if not pdf_tools.validate_pdf_file(str(pdf_path)):
            raise HTTPException(status_code=400, detail="Archivo PDF corrupto o inválido")
        
        # Extraer páginas
        filename_base = file.filename.replace('.pdf', '').replace(' ', '_')
        output_filename = f"extracted_{filename_base}_{unique_id[:8]}.pdf"
        output_path = pdf_tools.extract_specific_pages(str(pdf_path), pages_int, output_filename)
        
        logger.info(f"✅ {len(set(pages_int))} páginas extraídas exitosamente")
        
        return FileResponse(
            path=output_path,
            filename=f"extracted_pages_{file.filename}",
            media_type="application/pdf",
            background=BackgroundTasks([lambda: cleanup_multiple_files([str(pdf_path), output_path])])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error extrayendo páginas: {e}")
        raise HTTPException(status_code=500, detail=f"Error extrayendo páginas: {str(e)}")
    finally:
        if os.path.exists(pdf_path):
            cleanup_file(str(pdf_path))

# ============================================
# 🔗 UNIR PDFs - Merge multiple PDFs
# ============================================

@app.post("/pdf/merge")
async def merge_multiple_pdfs(files: List[UploadFile] = File(...)):
    """🔗 Une múltiples PDFs en uno solo"""
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="Se requieren al menos 2 archivos PDF")
    
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Máximo 10 archivos PDF permitidos")
    
    # Validar que todos sean PDFs
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400, 
                detail=f"Todos los archivos deben ser PDF. '{file.filename}' no es válido"
            )
    
    saved_files = []
    unique_id = str(uuid.uuid4())
    
    try:
        logger.info(f"🔗 Uniendo {len(files)} archivos PDF...")
        
        # Guardar todos los archivos temporalmente
        for i, file in enumerate(files):
            pdf_path = TEMP_DIR / f"merge_{unique_id}_{i:02d}.pdf"
            
            with open(pdf_path, "wb") as buffer:
                content = await file.read()
                if len(content) == 0:
                    raise HTTPException(status_code=400, detail=f"Archivo vacío: {file.filename}")
                buffer.write(content)
            
            # Validar cada PDF
            if not pdf_tools.validate_pdf_file(str(pdf_path)):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Archivo PDF corrupto o inválido: {file.filename}"
                )
            
            saved_files.append(str(pdf_path))
            logger.info(f"✅ Archivo {i+1}/{len(files)} guardado: {file.filename}")
        
        # Unir PDFs
        output_filename = f"merged_document_{len(files)}_files_{unique_id[:8]}.pdf"
        merged_path = pdf_tools.merge_pdfs(saved_files, output_filename)
        
        logger.info(f"🎉 {len(files)} PDFs unidos exitosamente")
        
        return FileResponse(
            path=merged_path,
            filename="merged_document.pdf",
            media_type="application/pdf",
            background=BackgroundTasks([lambda: cleanup_multiple_files(saved_files + [merged_path])])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error uniendo PDFs: {e}")
        raise HTTPException(status_code=500, detail=f"Error uniendo PDFs: {str(e)}")
    finally:
        # Limpiar archivos en caso de error
        cleanup_multiple_files(saved_files)

# ============================================
# 📈 ESTADÍSTICAS Y UTILIDADES
# ============================================

@app.get("/pdf/tools")
async def get_available_tools():
    """📈 Lista todas las herramientas disponibles"""
    return {
        "tools": [
            {
                "name": "convert",
                "title": "PDF a Word",
                "description": "Convierte archivos PDF a formato Word (DOCX)",
                "endpoint": "/convert",
                "method": "POST"
            },
            {
                "name": "split_pages",
                "title": "Dividir PDF por páginas",
                "description": "Divide un PDF en archivos separados por página",
                "endpoint": "/pdf/split/pages",
                "method": "POST"
            },
            {
                "name": "split_ranges",
                "title": "Dividir PDF por rangos",
                "description": "Divide un PDF en rangos específicos de páginas",
                "endpoint": "/pdf/split/ranges",
                "method": "POST"
            },
            {
                "name": "extract_pages",
                "title": "Extraer páginas específicas",
                "description": "Extrae páginas específicas en un solo PDF",
                "endpoint": "/pdf/extract/pages",
                "method": "POST"
            },
            {
                "name": "merge_pdfs",
                "title": "Unir PDFs",
                "description": "Une múltiples archivos PDF en uno solo",
                "endpoint": "/pdf/merge",
                "method": "POST"
            },
            {
                "name": "pdf_info",
                "title": "Información del PDF",
                "description": "Obtiene información detallada del PDF",
                "endpoint": "/pdf/info",
                "method": "POST"
            }
        ],
        "total_tools": 6,
        "version": "2.0.0",
        "developer": "César Loreth"
    }

# Railway usa la variable PORT
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)