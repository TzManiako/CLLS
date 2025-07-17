import os
import uuid
import zipfile
import logging
from pathlib import Path
from typing import List, Tuple, Dict, Any
from pypdf import PdfReader, PdfWriter
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class PDFToolsManager:
    """🎯 Manager completo para todas las operaciones PDF"""
    
    def __init__(self, temp_dir: Path):
        self.temp_dir = temp_dir
        self.temp_dir.mkdir(exist_ok=True)
        logger.info(f"PDF Tools Manager inicializado en: {temp_dir}")
    
    def get_pdf_info(self, pdf_path: str) -> Dict[str, Any]:
        """📊 Obtiene información completa del PDF"""
        try:
            reader = PdfReader(pdf_path)
            file_size = os.path.getsize(pdf_path)
            
            # Información básica
            info = {
                'total_pages': len(reader.pages),
                'file_size': file_size,
                'file_size_mb': round(file_size / 1024 / 1024, 2),
                'pages_info': []
            }
            
            # Metadata del PDF
            if reader.metadata:
                info.update({
                    'title': reader.metadata.get('/Title', 'Sin título'),
                    'author': reader.metadata.get('/Author', 'Sin autor'),
                    'subject': reader.metadata.get('/Subject', ''),
                    'creator': reader.metadata.get('/Creator', ''),
                    'producer': reader.metadata.get('/Producer', ''),
                    'creation_date': str(reader.metadata.get('/CreationDate', ''))
                })
            else:
                info.update({
                    'title': 'Sin título',
                    'author': 'Sin autor',
                    'subject': '',
                    'creator': '',
                    'producer': '',
                    'creation_date': ''
                })
            
            # Información de cada página
            for i, page in enumerate(reader.pages):
                try:
                    page_info = {
                        'page_number': i + 1,
                        'width': float(page.mediabox.width) if page.mediabox else 0,
                        'height': float(page.mediabox.height) if page.mediabox else 0,
                        'rotation': page.rotation if hasattr(page, 'rotation') else 0
                    }
                    info['pages_info'].append(page_info)
                except Exception as e:
                    logger.warning(f"Error obteniendo info de página {i+1}: {e}")
                    info['pages_info'].append({
                        'page_number': i + 1,
                        'width': 0,
                        'height': 0,
                        'rotation': 0
                    })
            
            logger.info(f"Información PDF obtenida: {info['total_pages']} páginas, {info['file_size_mb']} MB")
            return info
            
        except Exception as e:
            logger.error(f"Error obteniendo información del PDF: {e}")
            raise HTTPException(status_code=500, detail=f"Error leyendo PDF: {str(e)}")
    
    def split_pdf_by_pages(self, pdf_path: str, filename_prefix: str = "page") -> List[str]:
        """📄 Divide PDF en archivos individuales por página"""
        try:
            reader = PdfReader(pdf_path)
            output_files = []
            total_pages = len(reader.pages)
            
            logger.info(f"Dividiendo PDF en {total_pages} páginas individuales...")
            
            for page_num in range(total_pages):
                writer = PdfWriter()
                writer.add_page(reader.pages[page_num])
                
                # Nombre del archivo con número de página formateado
                page_str = str(page_num + 1).zfill(len(str(total_pages)))
                output_filename = f"{filename_prefix}_{page_str}_{uuid.uuid4().hex[:8]}.pdf"
                output_path = self.temp_dir / output_filename
                
                with open(output_path, 'wb') as output_file:
                    writer.write(output_file)
                
                output_files.append(str(output_path))
                logger.info(f"✅ Página {page_num + 1}/{total_pages} extraída: {output_filename}")
            
            logger.info(f"🎉 PDF dividido exitosamente en {len(output_files)} archivos")
            return output_files
            
        except Exception as e:
            logger.error(f"❌ Error dividiendo PDF: {e}")
            raise HTTPException(status_code=500, detail=f"Error dividiendo PDF: {str(e)}")
    
    def split_pdf_by_ranges(self, pdf_path: str, ranges: List[Tuple[int, int]], filename_prefix: str = "range") -> List[str]:
        """📊 Divide PDF por rangos especificados"""
        try:
            reader = PdfReader(pdf_path)
            output_files = []
            total_pages = len(reader.pages)
            
            logger.info(f"Dividiendo PDF por {len(ranges)} rangos...")
            
            for i, (start, end) in enumerate(ranges):
                # Validar rangos
                if start < 1 or end > total_pages or start > end:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Rango inválido: {start}-{end}. PDF tiene {total_pages} páginas (1-{total_pages})"
                    )
                
                writer = PdfWriter()
                
                # Agregar páginas al rango (convertir a índice 0-based)
                for page_num in range(start - 1, end):
                    writer.add_page(reader.pages[page_num])
                
                # Nombre del archivo
                output_filename = f"{filename_prefix}_{start}-{end}_{uuid.uuid4().hex[:8]}.pdf"
                output_path = self.temp_dir / output_filename
                
                with open(output_path, 'wb') as output_file:
                    writer.write(output_file)
                
                output_files.append(str(output_path))
                logger.info(f"✅ Rango {start}-{end} extraído: {output_filename}")
            
            logger.info(f"🎉 PDF dividido exitosamente en {len(output_files)} rangos")
            return output_files
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error dividiendo PDF por rangos: {e}")
            raise HTTPException(status_code=500, detail=f"Error procesando rangos: {str(e)}")
    
    def extract_specific_pages(self, pdf_path: str, pages: List[int], output_filename: str = None) -> str:
        """✂️ Extrae páginas específicas en un solo PDF"""
        try:
            reader = PdfReader(pdf_path)
            writer = PdfWriter()
            total_pages = len(reader.pages)
            
            # Validar páginas
            invalid_pages = [p for p in pages if p < 1 or p > total_pages]
            if invalid_pages:
                raise HTTPException(
                    status_code=400,
                    detail=f"Páginas inválidas: {invalid_pages}. PDF tiene {total_pages} páginas (1-{total_pages})"
                )
            
            logger.info(f"Extrayendo {len(pages)} páginas específicas: {sorted(pages)}")
            
            # Agregar páginas seleccionadas (eliminar duplicados y ordenar)
            unique_pages = sorted(set(pages))
            for page_num in unique_pages:
                writer.add_page(reader.pages[page_num - 1])  # Convertir a índice 0-based
                logger.info(f"✅ Página {page_num} agregada")
            
            # Crear archivo de salida
            if not output_filename:
                pages_str = "_".join(map(str, unique_pages[:5]))  # Primeras 5 páginas en el nombre
                if len(unique_pages) > 5:
                    pages_str += f"_and_{len(unique_pages)-5}_more"
                output_filename = f"extracted_pages_{pages_str}_{uuid.uuid4().hex[:8]}.pdf"
            
            output_path = self.temp_dir / output_filename
            
            with open(output_path, 'wb') as output_file:
                writer.write(output_file)
            
            logger.info(f"🎉 {len(unique_pages)} páginas extraídas exitosamente: {output_filename}")
            return str(output_path)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error extrayendo páginas: {e}")
            raise HTTPException(status_code=500, detail=f"Error extrayendo páginas: {str(e)}")
    
    def merge_pdfs(self, pdf_paths: List[str], output_filename: str = None) -> str:
        """🔗 Une múltiples PDFs en uno solo"""
        try:
            writer = PdfWriter()
            total_pages = 0
            
            logger.info(f"Uniendo {len(pdf_paths)} archivos PDF...")
            
            for i, pdf_path in enumerate(pdf_paths):
                if not os.path.exists(pdf_path):
                    raise HTTPException(status_code=404, detail=f"Archivo no encontrado: {os.path.basename(pdf_path)}")
                
                try:
                    reader = PdfReader(pdf_path)
                    pages_in_file = len(reader.pages)
                    
                    for page in reader.pages:
                        writer.add_page(page)
                    
                    total_pages += pages_in_file
                    logger.info(f"✅ PDF {i+1}/{len(pdf_paths)} agregado: {os.path.basename(pdf_path)} ({pages_in_file} páginas)")
                    
                except Exception as e:
                    logger.error(f"❌ Error procesando {os.path.basename(pdf_path)}: {e}")
                    raise HTTPException(status_code=400, detail=f"Error en archivo {os.path.basename(pdf_path)}: {str(e)}")
            
            # Crear archivo de salida
            if not output_filename:
                output_filename = f"merged_document_{len(pdf_paths)}_files_{uuid.uuid4().hex[:8]}.pdf"
            
            output_path = self.temp_dir / output_filename
            
            with open(output_path, 'wb') as output_file:
                writer.write(output_file)
            
            logger.info(f"🎉 {len(pdf_paths)} PDFs unidos exitosamente: {output_filename} ({total_pages} páginas totales)")
            return str(output_path)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error uniendo PDFs: {e}")
            raise HTTPException(status_code=500, detail=f"Error uniendo PDFs: {str(e)}")
    
    def create_zip_from_files(self, file_paths: List[str], zip_name: str = None) -> str:
        """📦 Crea un ZIP con múltiples archivos"""
        try:
            if not zip_name:
                zip_name = f"pdf_files_{uuid.uuid4().hex[:8]}.zip"
            
            zip_path = self.temp_dir / zip_name
            
            logger.info(f"Creando ZIP con {len(file_paths)} archivos...")
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for file_path in file_paths:
                    if os.path.exists(file_path):
                        filename = os.path.basename(file_path)
                        zip_file.write(file_path, filename)
                        logger.info(f"✅ Archivo agregado al ZIP: {filename}")
                    else:
                        logger.warning(f"⚠️ Archivo no encontrado: {file_path}")
            
            zip_size = os.path.getsize(zip_path)
            logger.info(f"🎉 ZIP creado exitosamente: {zip_name} ({zip_size / 1024 / 1024:.2f} MB)")
            return str(zip_path)
            
        except Exception as e:
            logger.error(f"❌ Error creando ZIP: {e}")
            raise HTTPException(status_code=500, detail=f"Error creando ZIP: {str(e)}")
    
    def validate_pdf_file(self, pdf_path: str) -> bool:
        """🔍 Valida que el archivo sea un PDF válido"""
        try:
            reader = PdfReader(pdf_path)
            # Intentar leer al menos la primera página
            if len(reader.pages) > 0:
                _ = reader.pages[0]
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Archivo PDF inválido: {e}")
            return False
    
    def cleanup_files(self, file_paths: List[str]) -> None:
        """🧹 Limpia archivos temporales"""
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"🗑️ Archivo temporal eliminado: {os.path.basename(file_path)}")
            except Exception as e:
                logger.warning(f"⚠️ No se pudo eliminar {file_path}: {e}")
    
    def get_operation_summary(self, operation: str, input_files: int, output_files: int, total_pages: int = None) -> Dict[str, Any]:
        """📈 Genera resumen de la operación realizada"""
        summary = {
            'operation': operation,
            'input_files': input_files,
            'output_files': output_files,
            'timestamp': str(uuid.uuid4()),
            'status': 'success'
        }
        
        if total_pages:
            summary['total_pages'] = total_pages
        
        return summary