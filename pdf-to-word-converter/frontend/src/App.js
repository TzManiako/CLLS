import React, { useState, useRef } from 'react';
import { 
  Upload, Download, FileText, AlertCircle, CheckCircle, Loader2, 
  Shield, Zap, Star, Split, Scissors, Link, Info, 
  ChevronDown, ChevronUp, X, Plus, Trash2, ArrowRight
} from 'lucide-react';

const PdfToolsSuite = () => {
  // Estados principales
  const [selectedTool, setSelectedTool] = useState('convert');
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]); // Para unir múltiples PDFs
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [pdfInfo, setPdfInfo] = useState(null);
  
  // Estados específicos para herramientas
  const [splitRanges, setSplitRanges] = useState([[1, 1]]);
  const [extractPages, setExtractPages] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const fileInputRef = useRef(null);
  const multiFileInputRef = useRef(null);

  // Funciones auxiliares para iconos
  const getToolIcon = (toolKey, size = 'small') => {
    const className = size === 'small' ? 'h-4 w-4 mr-2' : 'h-5 w-5 mr-2';
    switch (toolKey) {
      case 'convert': return <FileText className={className} />;
      case 'split_pages': return <Split className={className} />;
      case 'split_ranges': return <Scissors className={className} />;
      case 'extract': return <Scissors className={className} />;
      case 'merge': return <Link className={className} />;
      default: return <FileText className={className} />;
    }
  };

  const getToolIconSelector = (toolKey) => {
    switch (toolKey) {
      case 'convert': return FileText;
      case 'split_pages': return Split;
      case 'split_ranges': return Scissors;
      case 'extract': return Scissors;
      case 'merge': return Link;
      default: return FileText;
    }
  };

  const getToolColors = (toolKey) => {
    const colors = {
      convert: {
        primary: 'bg-blue-600',
        primaryHover: 'hover:bg-blue-700',
        secondary: 'bg-blue-100',
        secondaryHover: 'hover:bg-blue-50',
        text: 'text-blue-600',
        textDark: 'text-blue-800',
        border: 'border-blue-500',
        borderSecondary: 'border-blue-200',
        ring: 'focus:ring-blue-500'
      },
      split_pages: {
        primary: 'bg-green-600',
        primaryHover: 'hover:bg-green-700',
        secondary: 'bg-green-100',
        secondaryHover: 'hover:bg-green-50',
        text: 'text-green-600',
        textDark: 'text-green-800',
        border: 'border-green-500',
        borderSecondary: 'border-green-200',
        ring: 'focus:ring-green-500'
      },
      split_ranges: {
        primary: 'bg-purple-600',
        primaryHover: 'hover:bg-purple-700',
        secondary: 'bg-purple-100',
        secondaryHover: 'hover:bg-purple-50',
        text: 'text-purple-600',
        textDark: 'text-purple-800',
        border: 'border-purple-500',
        borderSecondary: 'border-purple-200',
        ring: 'focus:ring-purple-500'
      },
      extract: {
        primary: 'bg-orange-600',
        primaryHover: 'hover:bg-orange-700',
        secondary: 'bg-orange-100',
        secondaryHover: 'hover:bg-orange-50',
        text: 'text-orange-600',
        textDark: 'text-orange-800',
        border: 'border-orange-500',
        borderSecondary: 'border-orange-200',
        ring: 'focus:ring-orange-500'
      },
      merge: {
        primary: 'bg-red-600',
        primaryHover: 'hover:bg-red-700',
        secondary: 'bg-red-100',
        secondaryHover: 'hover:bg-red-50',
        text: 'text-red-600',
        textDark: 'text-red-800',
        border: 'border-red-500',
        borderSecondary: 'border-red-200',
        ring: 'focus:ring-red-500'
      }
    };
    return colors[toolKey] || colors.convert;
  };

  // Configuración de herramientas
  const tools = {
    convert: {
      title: 'PDF a Word',
      description: 'Convierte PDF a formato Word editable'
    },
    split_pages: {
      title: 'Dividir por Páginas',
      description: 'Divide PDF en archivos separados por página'
    },
    split_ranges: {
      title: 'Dividir por Rangos',
      description: 'Divide PDF en rangos específicos de páginas'
    },
    extract: {
      title: 'Extraer Páginas',
      description: 'Extrae páginas específicas en un solo PDF'
    },
    merge: {
      title: 'Unir PDFs',
      description: 'Une múltiples archivos PDF en uno solo'
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
      setDownloadUrl(null);
      setPdfInfo(null);
      
      // Obtener información del PDF automáticamente
      if (selectedTool !== 'merge') {
        getPdfInfo(selectedFile);
      }
    } else {
      setError('Por favor selecciona un archivo PDF válido');
      setFile(null);
    }
  };

  const handleMultiFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    
    if (validFiles.length !== selectedFiles.length) {
      setError('Todos los archivos deben ser PDFs válidos');
      return;
    }
    
    if (validFiles.length < 2) {
      setError('Selecciona al menos 2 archivos PDF para unir');
      return;
    }
    
    if (validFiles.length > 10) {
      setError('Máximo 10 archivos PDF permitidos');
      return;
    }
    
    setFiles(validFiles);
    setError(null);
    setSuccess(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (selectedTool === 'merge') {
      const validFiles = droppedFiles.filter(file => file.type === 'application/pdf');
      if (validFiles.length >= 2 && validFiles.length <= 10) {
        setFiles(validFiles);
        setError(null);
      } else {
        setError('Arrastra entre 2 y 10 archivos PDF válidos');
      }
    } else {
      const droppedFile = droppedFiles[0];
      if (droppedFile && droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError(null);
        setSuccess(false);
        setDownloadUrl(null);
        setPdfInfo(null);
        getPdfInfo(droppedFile);
      } else {
        setError('Por favor arrastra un archivo PDF válido');
      }
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

  const getPdfInfo = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/pdf/info`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setPdfInfo(data.info);
      }
    } catch (error) {
      console.error('Error obteniendo info PDF:', error);
    }
  };

  const processFile = async () => {
    if (selectedTool === 'merge') {
      if (files.length < 2) {
        setError('Selecciona al menos 2 archivos PDF para unir');
        return;
      }
    } else {
      if (!file) {
        setError('Selecciona un archivo PDF');
        return;
      }
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(false);
    setDownloadUrl(null);

    const progressInterval = simulateProgress();

    try {
      const formData = new FormData();
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      let endpoint = '';
      
      switch (selectedTool) {
        case 'convert':
          formData.append('file', file);
          endpoint = '/convert';
          break;
          
        case 'split_pages':
          formData.append('file', file);
          endpoint = '/pdf/split/pages';
          break;
          
        case 'split_ranges':
          formData.append('file', file);
          formData.append('ranges', JSON.stringify(splitRanges));
          endpoint = '/pdf/split/ranges';
          break;
          
        case 'extract':
          if (!extractPages.trim()) {
            throw new Error('Especifica las páginas a extraer');
          }
          const pages = extractPages.split(',').map(p => parseInt(p.trim())).filter(p => p > 0);
          if (pages.length === 0) {
            throw new Error('Formato de páginas inválido');
          }
          formData.append('file', file);
          formData.append('pages', JSON.stringify(pages));
          endpoint = '/pdf/extract/pages';
          break;
          
        case 'merge':
          files.forEach(file => {
            formData.append('files', file);
          });
          endpoint = '/pdf/merge';
          break;
          
        default:
          throw new Error('Herramienta no válida');
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error en el procesamiento');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      setSuccess(true);
      
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message || 'Error al procesar el archivo');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = () => {
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      let filename = 'processed_file';
      if (selectedTool === 'convert' && file) {
        filename = file.name.replace('.pdf', '.docx');
      } else if (selectedTool.startsWith('split') && file) {
        filename = `split_${file.name.replace('.pdf', '')}.zip`;
      } else if (selectedTool === 'extract' && file) {
        filename = `extracted_${file.name}`;
      } else if (selectedTool === 'merge') {
        filename = 'merged_document.pdf';
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const resetApp = () => {
    setFile(null);
    setFiles([]);
    setIsProcessing(false);
    setProgress(0);
    setDownloadUrl(null);
    setError(null);
    setSuccess(false);
    setPdfInfo(null);
    setSplitRanges([[1, 1]]);
    setExtractPages('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (multiFileInputRef.current) {
      multiFileInputRef.current.value = '';
    }
  };

  const addRange = () => {
    const lastRange = splitRanges[splitRanges.length - 1];
    const newStart = lastRange[1] + 1;
    setSplitRanges([...splitRanges, [newStart, newStart]]);
  };

  const removeRange = (index) => {
    if (splitRanges.length > 1) {
      setSplitRanges(splitRanges.filter((_, i) => i !== index));
    }
  };

  const updateRange = (index, type, value) => {
    const newRanges = [...splitRanges];
    newRanges[index][type === 'start' ? 0 : 1] = parseInt(value) || 1;
    setSplitRanges(newRanges);
  };

  const renderToolSelector = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Selecciona una herramienta:</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(tools).map(([key, tool]) => {
          const IconComponent = getToolIconSelector(key);
          const isSelected = selectedTool === key;
          const colors = getToolColors(key);
          
          return (
            <button
              key={key}
              onClick={() => {
                setSelectedTool(key);
                resetApp();
              }}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                isSelected 
                  ? `${colors.border} ${colors.secondaryHover}` 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <IconComponent className={`h-8 w-8 mx-auto mb-2 ${
                isSelected ? colors.text : 'text-gray-600'
              }`} />
              <div className="text-sm font-medium text-gray-900">{tool.title}</div>
              <div className="text-xs text-gray-500 mt-1">{tool.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderUploadZone = () => {
    const colors = getToolColors(selectedTool);
    const isMultiFile = selectedTool === 'merge';
    const hasFiles = isMultiFile ? files.length > 0 : file !== null;
    
    return (
      <div
        className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
          hasFiles
            ? 'border-green-300 bg-green-50' 
            : `${colors.borderSecondary} hover:border-gray-400 ${colors.secondaryHover}`
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={isMultiFile ? multiFileInputRef : fileInputRef}
          type="file"
          accept=".pdf"
          onChange={isMultiFile ? handleMultiFileSelect : handleFileSelect}
          multiple={isMultiFile}
          className="hidden"
        />
        
        {!hasFiles ? (
          <div>
            <div className={`w-20 h-20 ${colors.secondary} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <Upload className={`h-10 w-10 ${colors.text}`} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isMultiFile ? 'Sube tus archivos PDF' : 'Sube tu archivo PDF'}
            </h3>
            <p className="text-gray-600 mb-6">
              {isMultiFile 
                ? 'Arrastra y suelta múltiples PDFs aquí o haz click para seleccionar'
                : 'Arrastra y suelta tu archivo aquí o haz click para seleccionar'
              }
            </p>
            <button
              onClick={() => (isMultiFile ? multiFileInputRef : fileInputRef).current?.click()}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white ${colors.primary} ${colors.primaryHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.ring} transition-colors`}
            >
              <Upload className="h-5 w-5 mr-2" />
              {isMultiFile ? 'Seleccionar archivos' : 'Seleccionar archivo'}
            </button>
            <p className="text-sm text-gray-500 mt-4">
              {isMultiFile 
                ? 'Entre 2 y 10 archivos PDF • Máximo 50MB cada uno'
                : 'Tamaño máximo: 50MB • Solo archivos PDF'
              }
            </p>
          </div>
        ) : (
          <div>
            {isMultiFile ? (
              <div className="space-y-2">
                <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-4">
                  <Link className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {files.length} archivos seleccionados
                </h3>
                <div className="max-h-32 overflow-y-auto">
                  {files.map((file, index) => (
                    <div key={index} className="text-sm text-gray-600 p-1">
                      {index + 1}. {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <div className="bg-green-100 rounded-full p-3 mr-4">
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="text-lg font-semibold text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • Listo para procesar
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPdfInfo = () => {
    if (!pdfInfo || selectedTool === 'merge') return null;

    return (
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Info className="h-5 w-5 text-blue-600 mr-2" />
            <h4 className="text-sm font-medium text-blue-900">Información del PDF</h4>
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-blue-600 hover:text-blue-800"
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-600 font-medium">Páginas:</span>
            <span className="ml-1 text-blue-800">{pdfInfo.total_pages}</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Tamaño:</span>
            <span className="ml-1 text-blue-800">{pdfInfo.file_size_mb} MB</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Título:</span>
            <span className="ml-1 text-blue-800">{pdfInfo.title || 'Sin título'}</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Autor:</span>
            <span className="ml-1 text-blue-800">{pdfInfo.author || 'Sin autor'}</span>
          </div>
        </div>

        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">Creador:</span>
                <span className="ml-1 text-blue-800">{pdfInfo.creator || 'N/A'}</span>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Productor:</span>
                <span className="ml-1 text-blue-800">{pdfInfo.producer || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderToolOptions = () => {
    if (selectedTool === 'split_ranges') {
      return (
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-purple-900 mb-3">Configurar rangos de páginas:</h4>
          
          <div className="space-y-3">
            {splitRanges.map((range, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-sm text-purple-700">Rango {index + 1}:</span>
                <input
                  type="number"
                  min="1"
                  max={pdfInfo?.total_pages || 999}
                  value={range[0]}
                  onChange={(e) => updateRange(index, 'start', e.target.value)}
                  className="w-20 px-2 py-1 border border-purple-300 rounded text-sm"
                  placeholder="Desde"
                />
                <span className="text-purple-600">a</span>
                <input
                  type="number"
                  min={range[0]}
                  max={pdfInfo?.total_pages || 999}
                  value={range[1]}
                  onChange={(e) => updateRange(index, 'end', e.target.value)}
                  className="w-20 px-2 py-1 border border-purple-300 rounded text-sm"
                  placeholder="Hasta"
                />
                {splitRanges.length > 1 && (
                  <button
                    onClick={() => removeRange(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <button
            onClick={addRange}
            className="mt-3 inline-flex items-center px-3 py-1 border border-purple-300 text-sm font-medium rounded text-purple-700 bg-white hover:bg-purple-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar rango
          </button>
          
          {pdfInfo && (
            <p className="text-xs text-purple-600 mt-2">
              PDF tiene {pdfInfo.total_pages} páginas (1-{pdfInfo.total_pages})
            </p>
          )}
        </div>
      );
    }

    if (selectedTool === 'extract') {
      return (
        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-orange-900 mb-3">Páginas a extraer:</h4>
          
          <div className="space-y-3">
            <input
              type="text"
              value={extractPages}
              onChange={(e) => setExtractPages(e.target.value)}
              placeholder="Ej: 1, 3, 5-7, 10"
              className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm"
            />
            
            <div className="text-xs text-orange-600">
              <p>• Páginas individuales: 1, 3, 5</p>
              <p>• Rangos: 5-7 (páginas 5, 6 y 7)</p>
              <p>• Combinado: 1, 3, 5-7, 10</p>
              {pdfInfo && <p>• Este PDF tiene {pdfInfo.total_pages} páginas</p>}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderProgress = () => {
    if (!isProcessing) return null;

    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">
            Procesando {tools[selectedTool].title.toLowerCase()}...
          </span>
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
          <span className="text-sm text-gray-600">
            {selectedTool === 'convert' && 'Convirtiendo PDF a Word...'}
            {selectedTool === 'split_pages' && 'Dividiendo PDF por páginas...'}
            {selectedTool === 'split_ranges' && 'Dividiendo PDF por rangos...'}
            {selectedTool === 'extract' && 'Extrayendo páginas...'}
            {selectedTool === 'merge' && 'Uniendo archivos PDF...'}
          </span>
        </div>
      </div>
    );
  };

  const renderMessages = () => (
    <>
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
            <p className="text-sm text-green-800">
              ¡{tools[selectedTool].title} completado exitosamente! Tu archivo está listo para descargar.
            </p>
          </div>
        </div>
      )}
    </>
  );

  const renderActionButtons = () => {
    const hasValidInput = selectedTool === 'merge' ? files.length >= 2 : file !== null;
    const colors = getToolColors(selectedTool);

    return (
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        {hasValidInput && !isProcessing && !success && (
          <button
            onClick={processFile}
            className={`inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white ${colors.primary} ${colors.primaryHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.ring} transition-colors`}
          >
            {getToolIcon(selectedTool, 'large')}
            {tools[selectedTool].title}
          </button>
        )}

        {downloadUrl && (
          <button
            onClick={downloadFile}
            className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            <Download className="h-5 w-5 mr-2" />
            Descargar Resultado
          </button>
        )}

        {(hasValidInput || success) && (
          <button
            onClick={resetApp}
            className="inline-flex items-center px-8 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <ArrowRight className="h-5 w-5 mr-2" />
            Procesar otro archivo
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              PDF Tools Suite
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Suite completa de herramientas PDF: convierte, divide, extrae y une documentos con calidad profesional
            </p>
            <div className="flex items-center justify-center mt-4 space-x-6">
              <div className="flex items-center text-sm text-gray-500">
                <Shield className="h-4 w-4 mr-1" />
                Seguro y privado
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Zap className="h-4 w-4 mr-1" />
                Procesamiento rápido
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Star className="h-4 w-4 mr-1" />
                Calidad profesional
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Tool Selector */}
        {renderToolSelector()}

        {/* Upload Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8">
            
            {/* Current Tool Header */}
            <div className="text-center mb-6">
              <div className={`inline-flex items-center px-4 py-2 rounded-full ${getToolColors(selectedTool).secondary} ${getToolColors(selectedTool).textDark} text-sm font-medium`}>
                {getToolIcon(selectedTool, 'small')}
                {tools[selectedTool].title}
              </div>
              <p className="text-gray-600 mt-2">{tools[selectedTool].description}</p>
            </div>
            
            {/* Upload Zone */}
            {renderUploadZone()}
            
            {/* PDF Info */}
            {renderPdfInfo()}
            
            {/* Tool-specific Options */}
            {renderToolOptions()}
            
            {/* Progress Bar */}
            {renderProgress()}
            
            {/* Messages */}
            {renderMessages()}
            
            {/* Action Buttons */}
            {renderActionButtons()}

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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Procesamiento Rápido</h3>
            <p className="text-gray-600 text-sm">
              Tecnología optimizada que procesa tus documentos en segundos con alta precisión.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Suite Completa</h3>
            <p className="text-gray-600 text-sm">
              Todas las herramientas PDF que necesitas en una sola aplicación profesional.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">5</div>
              <div className="text-sm text-gray-600">Herramientas</div>
            </div>
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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
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
              César Loreth™ - PDF Tools Suite v2.0 - Tecnología innovadora para documentos
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PdfToolsSuite;