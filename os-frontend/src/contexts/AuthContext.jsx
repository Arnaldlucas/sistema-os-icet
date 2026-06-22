import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AuthContext = createContext({});

/**
 * Hook customizado para consumo simplificado do contexto de autenticação.
 * @returns {Object} Contrato de estados e funções globais de sessão.
 */
export const useAuth = () => useContext(AuthContext);

/**
 * Provedor de Contexto de Autenticação e Estado Global da UI.
 * Centraliza o gerenciamento de tokens JWT e intercepta falhas físicas de rede (RNF02).
 *
 * @component
 * @param {Object} props Propriedades do componente.
 * @param {React.ReactNode} props.children Nós filhos que herdarão o contexto de dados.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('os_token'));
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);

    const [usuariosPendentes, setUsuariosPendentes] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [statsPainel, setStatsPainel] = useState({ total: 0, abertos: 0, atendimento: 0, resolvidos: 0 });

    const API_URL = import.meta.env?.VITE_API_URL || "http://127.0.0.1:8000";

    const logout = useCallback(() => {
        localStorage.removeItem('os_token');
        setToken(null);
        setUser(null);
        setPermissions({});
        setUsuariosPendentes([]);
        setUsersList([]);
    }, []);

    /**
     * Interceptador Centralizado de Requisições HTTP (RNF02 - CA 2.1).
     * Aplica injeção automática de cabeçalhos Bearer e tratamento universal de falhas de rede.
     *
     * @async
     * @param {string} endpoint Caminho relativo da rota (Ex: '/api/requests').
     * @param {Object} [options={}] Configurações nativas do Fetch API.
     * @returns {Promise<Object>} Resposta normalizada contendo a flag de sucesso e os dados/detalhes.
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

            if (response.status === 204) {
                return { success: true, data: null };
            }

            const contentType = response.headers.get("content-type");
            let data = {};
            if (contentType && contentType.includes("application/json")) {
                data = await response.json().catch(() => ({}));
            }

            if (!response.ok) {
            
                if (response.status === 401 && endpoint !== '/api/auth/login') {
                    logout();
                    return { success: false, message: "Sessão expirada. Por favor, realize um novo acesso." };
                }
                
                const errorMessage = data.detail || data.message || `Erro operacional no servidor (Código: ${response.status}).`;
                return { success: false, message: errorMessage };
            }

            return { success: true, ...data };
        } catch (error) {
            return { 
                success: false, 
                message: "Não foi possível conectar ao servidor da UFAM. O serviço está temporariamente indisponível ou fora do ar." 
            };
        }
    }, [token, logout, API_URL]);

    useEffect(() => {
        let isMounted = true;

        async function validateSession() {
            if (token) {
                try {
                    // Decodificação local manual do JWT via manipulação de Buffer Base64
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const payloadToken = JSON.parse(window.atob(base64));
                    
                    const rawSub = payloadToken?.sub || "";
                    const normalizedUsername = rawSub.includes("@") ? rawSub.split("@")[0] : rawSub;

                    const temAcessoAdmin = payloadToken?.role === 'admin' || normalizedUsername === 'admin' || normalizedUsername === 'gerente.gti';

                    if (temAcessoAdmin) {
                        const result = await request('/api/admin/bootstrap');
                        
                        if (isMounted && result && result.success && result.user) {
                            const userData = {
                                id: result.user.id,
                                nome_completo: result.user.nome_completo || result.user.nome || "Administrador Geral",
                                username: result.user.username,
                                email: result.user.email,
                                siape: result.user.siape || payloadToken?.siape || "99999",
                                cargo: result.user.cargo || "Técnico da GTI",
                                role: result.user.role || "admin"
                            };
                            
                            setUser(userData);
                            setPermissions(result.permissions || {});
                            setUsuariosPendentes(result.usuarios_pendentes || []);
                            setUsersList(result.users || []);
                            
                            if (result.estatisticas) {
                                setStatsPainel({
                                    total: (result.estatisticas.cadastros_pendentes || 0) + 
                                           (result.estatisticas.chamados_abertos || 0) + 
                                           (result.estatisticas.chamados_atendimento || 0) + 
                                           (result.estatisticas.chamados_resolvidos || 0),
                                    abertos: result.estatisticas.chamados_abertos || 0,
                                    atendimento: result.estatisticas.chamados_atendimento || 0,
                                    resolvidos: result.estatisticas.chamados_resolvidos || 0
                                });
                            }
                        } else if (isMounted) {
                            logout();
                        }
                    } else {
                        const userEmail = payloadToken?.sub?.includes("@") ? payloadToken.sub : `${normalizedUsername}@ufam.edu.br`;
                        
                        const userData = {
                            id: payloadToken?.id || 2,
                            nome_completo: payloadToken?.nome_completo || "Servidor do Instituto",
                            username: normalizedUsername,
                            email: userEmail,
                            siape: payloadToken?.siape || "N/I",
                            cargo: payloadToken?.cargo || "Servidor",
                            role: payloadToken?.role || "tecnico"
                        };
                        
                        setUser(userData);
                        setPermissions({ "os:criar": true, "os:ver_proprias": true });
                    }
                } catch (err) {
                    if (isMounted) logout();
                }
            }
            if (isMounted) setLoading(false);
        }

        validateSession();

        return () => {
            isMounted = false;
        };
    }, [token, request, logout]);

    const login = async (credentials) => {
        try {
            const result = await request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            if (result && result.success && result.access_token) {
                localStorage.setItem('os_token', result.access_token);
                setToken(result.access_token);
                
                const rawUserSub = result.user?.username || credentials.username;
                const normalizedUsername = rawUserSub.includes("@") ? rawUserSub.split("@")[0] : rawUserSub;
                const userEmail = result.user?.email || (credentials.username.includes("@") ? credentials.username : `${credentials.username}@ufam.edu.br`);

                const base64Url = result.access_token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const decodedToken = JSON.parse(window.atob(base64));

                const sessionUser = {
                    id: result.user?.id,
                    nome_completo: result.user?.nome_completo || result.user?.nome || "Servidor",
                    username: normalizedUsername,
                    email: userEmail,
                    siape: result.user?.siape || decodedToken?.siape || "N/I",
                    cargo: result.user?.cargo || "Servidor",
                    role: result.user?.role || "tecnico"
                };

                setUser(sessionUser);
                setPermissions(result.permissions || {});
                return { success: true, role: result.user?.role };
            }
            
            return { 
                success: false, 
                message: result?.message || "Resposta de autenticação corrompida pelo servidor." 
            };
        } catch (error) {
            return { 
                success: false, 
                message: "Falha inesperada no processamento do login." 
            };
        }
    };

    const registerUser = async (payload) => {
        try {
            const result = await request('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
                
            if (result && result.success) {
                const temporaryId = Date.now();
                setUsuariosPendentes(prev => [...prev, { ...payload, id: temporaryId, is_active: false }]);
                return { success: true };
            }
            
            return { success: false, message: result?.message || "Inconsistência ao processar o cadastro." };
        } catch (error) {
            return { success: false, message: "Falha inesperada no processamento do cadastro." };
        }
    };

    const recoverPassword = async (email) => {
        try {
            const result = await request('/api/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            if (result && result.success) {
                return { success: true };
            }
            return { success: false, message: result?.message || "Erro ao solicitar código de recuperação." };
        } catch (error) {
            return { success: false, message: "Falha inesperada ao processar o token OTP." };
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
        registerUser,
        recoverPassword,
        request,
        usuarios_pendentes: usuariosPendentes,
        users: usersList,
        statsPainel,
        isAdmin: user?.role === 'admin' || user?.username === 'gerente.gti'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};