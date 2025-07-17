import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const Download = () => {
    const [searchParams] = useSearchParams();
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState(null);
    const token = searchParams.get('token');

    useEffect(() => {
        if (token) {
            downloadFile();
        }
    }, [token]);

    const downloadFile = async () => {
        if (!token) {
            setError('Token no válido');
            return;
        }

        setDownloading(true);
        try {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
            const response = await fetch(`${API_URL}/download?token=${token}`);

            if (!response.ok) {
                throw new Error('Token expirado o inválido');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'documento_convertido.docx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

        } catch (err) {
            setError(err.message);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                {downloading && (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p>Descargando archivo...</p>
                    </div>
                )}
                
                {error && (
                    <div className="text-center">
                        <div className="text-red-600 mb-4">
                            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error de descarga</h2>
                        <p className="text-gray-600">{error}</p>
                    </div>
                )}
                
                {!downloading && !error && (
                    <div className="text-center">
                        <div className="text-green-600 mb-4">
                            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Descarga completada</h2>
                        <p className="text-gray-600">Tu archivo ha sido descargado exitosamente.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Download;