// frontend/src/components/AzureLogin.js
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

const AzureLogin = ({ onUserAuthenticated }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
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
                scopes: ['user.read']
            });
            setUser(response.account);
            onUserAuthenticated(response.account);
        } catch (error) {
            console.error('Error de login:', error);
        } finally {
            setLoading(false);
        }
    };

    if (user) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800">
                    Conectado como: <strong>{user.name}</strong> ({user.username})
                </p>
            </div>
        );
    }

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Autenticación Azure AD
            </h3>
            <p className="text-blue-700 mb-4">
                Inicia sesión con tu cuenta institucional para usar el convertidor
            </p>
            <button
                onClick={handleLogin}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
                {loading ? 'Conectando...' : 'Iniciar sesión'}
            </button>
        </div>
    );
};

export default AzureLogin;