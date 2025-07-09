import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Loader2, Shield, Zap, Star } from 'lucide-react';

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

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Convertidor PDF a Word
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Transforma tus archivos PDF a formato Word manteniendo la calidad original
            </p>
            <div className="flex items-center justify-center mt-4 space-x-4">
              <div className="flex items-center text-sm text-gray-500">
                <Shield className="h-4 w-4 mr-1" />
                Seguro y privado
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Zap className="h-4 w-4 mr-1" />
                Conversión rápida
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Star className="h-4 w-4 mr-1" />
                Alta calidad
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Upload Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8">
            
            {/* Upload Zone */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
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
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Sube tu archivo PDF
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Arrastra y suelta tu archivo aquí o haz click para seleccionar
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Seleccionar archivo
                  </button>
                  <p className="text-sm text-gray-500 mt-4">
                    Tamaño máximo: 50MB • Solo archivos PDF
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <div className="bg-green-100 rounded-full p-3 mr-4">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-semibold text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Listo para convertir
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Messages */}
            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {isConverting && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Procesando documento...</span>
                  <span className="text-sm font-medium text-blue-600">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-center mt-6">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Convirtiendo PDF a Word...</span>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
                  <p className="text-sm text-green-800">
                    ¡Conversión completada exitosamente! Tu archivo está listo para descargar.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              {file && !isConverting && !success && (
                <button
                  onClick={convertPdfToWord}
                  className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Convertir a Word
                </button>
              )}

              {downloadUrl && (
                <button
                  onClick={downloadFile}
                  className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Descargar Word
                </button>
              )}

              {(file || success) && (
                <button
                  onClick={resetApp}
                  className="inline-flex items-center px-8 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Convertir otro archivo
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Formato Preservado</h3>
            <p className="text-gray-600 text-sm">
              Mantiene la estructura original incluyendo imágenes, tablas y estilos del documento.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Conversión Rápida</h3>
            <p className="text-gray-600 text-sm">
              Procesamiento optimizado que convierte tus documentos en segundos con alta precisión.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Calidad Profesional</h3>
            <p className="text-gray-600 text-sm">
              Tecnología avanzada que garantiza resultados de calidad profesional en cada conversión.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">99.9%</div>
              <div className="text-sm text-gray-600">Precisión</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">&lt;30s</div>
              <div className="text-sm text-gray-600">Tiempo promedio</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">50MB</div>
              <div className="text-sm text-gray-600">Tamaño máximo</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">24/7</div>
              <div className="text-sm text-gray-600">Disponible</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer profesional simplificado */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span className="text-lg font-semibold text-gray-900">
                Desarrollado por César Loreth
              </span>
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              © 2025 César Loreth. Todos los derechos reservados.
            </p>
            <p className="text-xs text-gray-500">
              César Loreth™ - Tecnología innovadora INDRA COL
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PdfToWordConverter;