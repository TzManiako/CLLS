import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const PdfToWordConverter = () => {
  const [file, setFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
      setDownloadUrl(null);
    } else {
      setError('Por favor selecciona un archivo PDF válido');
      setFile(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
      setSuccess(false);
      setDownloadUrl(null);
    } else {
      setError('Por favor arrastra un archivo PDF válido');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
    return interval;
  };

  const convertPdfToWord = async () => {
    if (!file) return;

    setIsConverting(true);
    setError(null);
    setSuccess(false);
    setDownloadUrl(null);

    const progressInterval = simulateProgress();

    try {
      const formData = new FormData();
      formData.append('file', file);

      const API_URL = 'https://back-production-4f26.up.railway.app';
      const response = await fetch(`${API_URL}/convert`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error en la conversión');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      setSuccess(true);
      
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message || 'Error al convertir el archivo');
      setProgress(0);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadFile = () => {
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = file.name.replace('.pdf', '.docx');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const resetApp = () => {
    setFile(null);
    setIsConverting(false);
    setProgress(0);
    setDownloadUrl(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
          <FileText className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          Convertidor PDF a Word
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto px-4">
          Convierte tus archivos PDF a formato Word manteniendo el formato original, 
          imágenes y estructura de manera rápida y sencilla.
        </p>
      </div>

      {/* Main Converter */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <div className="bg-white rounded-xl shadow-lg p-8">
          
          {/* Upload Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              file 
                ? 'border-green-300 bg-green-50' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!file ? (
              <div>
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg text-gray-600 mb-2">
                  Arrastra tu archivo PDF aquí o haz click para seleccionar
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Seleccionar archivo
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  Tamaño máximo: 50MB
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-3">
                <FileText className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-lg font-medium text-gray-800">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error Messages */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Progress Bar */}
          {isConverting && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Convirtiendo archivo...</span>
                <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-center mt-4">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin mr-2" />
                <span className="text-gray-600">Procesando documento...</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-green-700">¡Conversión completada exitosamente!</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            {file && !isConverting && !success && (
              <button
                onClick={convertPdfToWord}
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <FileText className="h-5 w-5" />
                <span>Convertir a Word</span>
              </button>
            )}

            {downloadUrl && (
              <button
                onClick={downloadFile}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="h-5 w-5" />
                <span>Descargar Word</span>
              </button>
            )}

            {(file || success) && (
              <button
                onClick={resetApp}
                className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Convertir otro archivo
              </button>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Formato Preservado</h3>
            <p className="text-gray-600 text-sm">
              Mantiene la estructura original del PDF incluyendo imágenes, tablas y estilos.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Alta Calidad</h3>
            <p className="text-gray-600 text-sm">
              Conversión precisa que preserva la calidad y legibilidad del documento original.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Upload className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Fácil de Usar</h3>
            <p className="text-gray-600 text-sm">
              Interfaz simple e intuitiva. Solo arrastra, convierte y descarga tu archivo.
            </p>
          </div>
        </div>
      </div>

      {/* Footer simplificado con marca de agua César Loreth */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center space-y-3">
            {/* Marca de agua principal */}
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-lg font-semibold text-gray-800">
                Desarrollado por César Loreth
              </span>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
            
            {/* Copyright */}
            <p className="text-sm text-gray-600">
              © 2024 César Loreth. Todos los derechos reservados.
            </p>
            
            {/* Línea adicional de marca */}
            <p className="text-xs text-gray-500">
              César Loreth™ - Soluciones innovadoras en conversión de documentos
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PdfToWordConverter