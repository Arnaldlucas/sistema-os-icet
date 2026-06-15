import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('os_token'));
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);

    const API_URL = "http://127.0.0.1:8000";

    // Função de logout isolada para referências seguras
    const logout = useCallback(() => {
        localStorage.removeItem('os_token');
        setToken(null);
        setUser(null);
        setPermissions({});
    }, []);

    /**
     * Função de requisição centralizada com tratamento granular de erros.
     * Aplica a Heurística 9: Diagnóstico preciso de falhas da API FastAPI.
     */
    const request = useCallback(async (endpoint, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers: { ...headers, ...options.headers }
            });

            // Interceptação de falhas de autenticação (401)
            if (response.status === 401) {
                if (endpoint !== '/api/auth/login') {
                    logout();
                    throw new Error("Sessão expirada. Por favor, faça login novamente.");
                }
                
                // 🛡️ SE FOR NA ROTA DE LOGIN: Captura o JSON do FastAPI para extrair a mensagem "detail" real
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Usuário ou senha inválidos. Verifique suas credenciais.");
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Erro na comunicação com o servidor.");
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }, [token, logout]);

    /**
     * Sincronização Inicial (Bootstrap) - Mantida intacta
     */
    useEffect(() => {
        async function validateSession() {
            if (token) {
                try {
                    const data = await request('/api/admin/bootstrap');
                    setUser(data.user);
                    setPermissions(data.permissions);
                } catch (err) {
                    console.error("Falha ao validar sessão inicial", err);
                    logout();
                }
            }
            setLoading(false);
        }
        validateSession();
    }, [token, request, logout]);

    /**
     * Fluxo de Login Assíncrono Isolado
     */
    const login = async (credentials) => {
        setLoading(true);
        try {
            const data = await request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            if (data && data.access_token) {
                localStorage.setItem('os_token', data.access_token);
                setToken(data.access_token);
                setUser(data.user);
                return { success: true };
            }
            throw new Error("Resposta inválida do servidor de autenticação.");
        } catch (error) {
            // Repassa de forma limpa a mensagem capturada no request para o componente Login.jsx
            return { success: false, message: error.message };
        } finally {
            setLoading(false);
        }
    };

    const value = {
        user,
        token,
        permissions,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
        request,
        isAdmin: user?.role === 'admin' || user?.grupo_nome === 'Administradores'
    };

    return (
        <AuthContext.Provider value={value}>
            {/* 🚀 CORREÇÃO CRUCIAL SÊN_IOR: Nunca desmonte o children com base no loading do login! */}
            {children}
        </AuthContext.Provider>
    );
};