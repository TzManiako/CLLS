import os
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import subprocess
import shutil
from pathlib import Path
import logging
import uuid
from pdf2docx import Converter
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PDF to Word Converter API", version="1.0.0")

# CORS actualizado para Railway
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.railway.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directorio temporal para archivos
TEMP_DIR = Path("temp_files")
TEMP_DIR.mkdir(exist_ok=True)

# Executor para operaciones pesadas
executor = ThreadPoolExecutor(max_workers=2)

def cleanup_file(file_path: str):
    """Limpia archivos temporales de forma segura"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Archivo temporal eliminado: {file_path}")
    except Exception as e:
        logger.warning(f"No se pudo eliminar el archivo {file_path}: {e}")

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

@app.get("/")
async def root():
    return {"message": "PDF to Word Converter API", "status": "running"}

@app.get("/health")
async def health_check():
    """Endpoint para verificar el estado del servicio"""
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/convert")
async def convert_pdf(file: UploadFile = File(...)):
    """Convierte un archivo PDF a formato DOCX"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF")
    
    if file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail="Tipo de contenido inválido")
    
    unique_id = str(uuid.uuid4())
    pdf_filename = f"input_{unique_id}.pdf"
    pdf_path = TEMP_DIR / pdf_filename
    
    try:
        logger.info(f"Guardando archivo PDF: {pdf_path}")
        with open(pdf_path, "wb") as buffer:
            content = await file.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="El archivo está vacío")
            buffer.write(content)
        
        if not pdf_path.exists() or pdf_path.stat().st_size == 0:
            raise HTTPException(status_code=500, detail="Error al guardar el archivo PDF")
        
        logger.info("Iniciando conversión PDF a DOCX...")
        loop = asyncio.get_event_loop()
        docx_path = await loop.run_in_executor(
            executor, 
            convert_pdf_to_docx, 
            str(pdf_path), 
            str(TEMP_DIR)
        )
        
        if not os.path.exists(docx_path) or os.path.getsize(docx_path) == 0:
            raise HTTPException(status_code=500, detail="La conversión falló")
        
        logger.info(f"Conversión exitosa. Archivo DOCX: {docx_path}")
        
        headers = {
            "Content-Disposition": f"attachment; filename={file.filename.replace('.pdf', '.docx')}",
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        }
        
        return FileResponse(
            path=docx_path,
            headers=headers,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            background=lambda: cleanup_file(str(pdf_path))
        )
        
    except HTTPException:
        cleanup_file(str(pdf_path))
        raise
    except Exception as e:
        cleanup_file(str(pdf_path))
        logger.error(f"Error durante la conversión: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

# Railway usa la variable PORT
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)