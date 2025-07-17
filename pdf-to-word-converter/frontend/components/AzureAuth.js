import React, { useState, useEffect } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
    auth: {
        clientId: process.env.REACT_APP_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID}`,
        redirectUri: window.location.origin
    }
};

const msalInstance = new PublicClientApplication(msalConfig);

const AzureAuth = ({ onUserAuthenticated }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Verificar si usuario ya está autenticado
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            setUser(accounts[0]);
            onUserAuthenticated(accounts[0]);
        }
    }, []);

    const handleLogin = async () => {
        setLoading(true);
        try {
            const response = await msalInstance.loginPopup({
                scopes: ['user.read', 'mail.read']
            });
            
            setUser(response.account);
            onUserAuthenticated(response.account);
        } catch (error) {
            console.error('Error de autenticación:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        msalInstance.logoutPopup();
        setUser(null);
        onUserAuthenticated(null);
    };

    if (user) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-green-800 font-medium">
                            Conectado como: {user.name}
                        </p>
                        <p className="text-green-600 text-sm">{user.username}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-red-600 hover:text-red-800"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Autenticación requerida
            </h3>
            <p className="text-blue-700 mb-4">
                Inicia sesión con tu cuenta institucional para usar el convertidor
            </p>
            <button
                onClick={handleLogin}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
            >
                {loading ? 'Conectando...' : 'Iniciar sesión con Azure AD'}
            </button>
        </div>
    );
};

export default AzureAuth;