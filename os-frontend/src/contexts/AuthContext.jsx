import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('os_token'));
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);

    const [usuariosPendentes, setUsuariosPendentes] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [statsPainel, setStatsPainel] = useState({ total: 0, abertos: 0, atendimento: 0, resolvidos: 0 });
    
    // Estados dinâmicos de Governança alimentados pelo Banco de Dados
    const [blocosInstanciados, setBlocosInstanciados] = useState([]);
    const [categoriasInstanciadas, setCategoriasInstanciadas] = useState([]);

    const API_URL = import.meta.env?.VITE_API_URL || "http://127.0.0.1:8000";

    const logout = useCallback(() => {
        localStorage.removeItem('os_token');
        setToken(null);
        setUser(null);
        setPermissions({});
        setUsuariosPendentes([]);
        setUsersList([]);
        setBlocosInstanciados([]);
        setCategoriasInstanciadas([]);
    }, []);

    const request = useCallback(async (endpoint, options = {}) => {
        const headers = {
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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
                const errorMessage = data.detail || data.message || `Erro operacional (Código: ${response.status}).`;
                return { success: false, message: errorMessage };
            }

            // Normaliza as respostas brutas de listas que não contêm o wrapper {success: true}
            if (Array.isArray(data)) {
                return data;
            }

            return { success: true, ...data };
        } catch (error) {
            return { 
                success: false, 
                message: "Não foi possível conectar ao servidor da UFAM. O serviço está temporariamente indisponível." 
            };
        }
    }, [token, logout, API_URL]);

    // 🚀 ETAPA 1 DO CADASTRO: Solicita o Token OTP travando o domínio no backend
    const requestRegisterToken = async (emailPrefix) => {
        const completoEmail = `${emailPrefix.trim().toLowerCase()}@ufam.edu.br`;
        return await request('/api/auth/register/request-token', {
            method: 'POST',
            body: JSON.stringify({ email: completoEmail })
        });
    };

    // 🚀 ETAPA 2 DO CADASTRO: Valida o Token inserido antes de abrir o formulário
    const verifyRegisterToken = async (emailPrefix, codigo) => {
        const completoEmail = `${emailPrefix.trim().toLowerCase()}@ufam.edu.br`;
        return await request('/api/auth/register/verify-token', {
            method: 'POST',
            body: JSON.stringify({ email: completoEmail, codigo: codigo.trim() })
        });
    };

    const registerUser = async (payload) => {
        try {
            const result = await request('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (result && result.success) {
                return { success: true };
            }
            return { success: false, message: result?.message || "Inconsistência ao processar o cadastro." };
        } catch (error) {
            return { success: false, message: "Falha inesperada no processamento." };
        }
    };

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
                    nome_completo: result.user?.nome_completo || "Servidor",
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
            return { success: false, message: result?.message || "Resposta de autenticação corrompida." };
        } catch (error) {
            return { success: false, message: "Falha no processamento do login." };
        }
    };

    useEffect(() => {
        let isMounted = true;
        async function validateSession() {
            if (token) {
                try {
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const payloadToken = JSON.parse(window.atob(base64));
                    const rawSub = payloadToken?.sub || "";
                    const normalizedUsername = rawSub.includes("@") ? rawSub.split("@")[0] : rawSub;

                    const temAcessoAdmin = payloadToken?.role === 'admin' || normalizedUsername === 'admin' || normalizedUsername === 'gerente.gti';

                    if (temAcessoAdmin) {
                        const result = await request('/api/admin/bootstrap');
                        if (isMounted && result && result.success && result.user) {
                            setUser({
                                id: result.user.id,
                                nome_completo: result.user.nome_completo || "Administrador Geral",
                                username: result.user.username,
                                email: result.user.email,
                                siape: result.user.siape || "99999",
                                cargo: result.user.cargo || "Técnico da GTI",
                                role: result.user.role || "admin"
                            });
                            setPermissions(result.permissions || {});
                            setUsuariosPendentes(result.usuarios_pendentes || []);
                            setUsersList(result.users || []);
                            
                            // 🚀 CORREÇÃO CRÍTICA DO SINAL: Sincroniza com as chaves reais devolvidas do barramento do Postgres
                            setBlocosInstanciados(result.blocos_infraestrutura || []);
                            setCategoriasInstanciadas(result.categorias_catalogo || []);

                            if (result.estatisticas) {
                                setStatsPainel({
                                    total: (result.estatisticas.chamados_abertos || 0) + (result.estatisticas.chamados_atendimento || 0) + (result.estatisticas.chamados_resolvidos || 0),
                                    abertos: result.estatisticas.chamados_abertos || 0,
                                    atendimento: result.estatisticas.chamados_atendimento || 0,
                                    resolvidos: result.estatisticas.chamados_resolvidos || 0
                                });
                            }
                        }
                    } else {
                        const userEmail = payloadToken?.sub?.includes("@") ? payloadToken.sub : `${normalizedUsername}@ufam.edu.br`;
                        setUser({
                            id: payloadToken?.id || 2,
                            nome_completo: payloadToken?.nome_completo || "Servidor do Instituto",
                            username: normalizedUsername,
                            email: userEmail,
                            siape: payloadToken?.siape || "N/I",
                            cargo: payloadToken?.cargo || "Servidor",
                            role: payloadToken?.role || "tecnico"
                        });
                        setPermissions({ "os:criar": true, "os:ver_proprias": true });
                    }
                } catch (err) {
                    if (isMounted) logout();
                }
            }
            if (isMounted) setLoading(false);
        }
        validateSession();
        return () => { isMounted = false; };
    }, [token, request, logout]);

    const value = {
        user, token, permissions, isAuthenticated: !!token, loading, login, logout, registerUser,
        requestRegisterToken, verifyRegisterToken, request,
        usuarios_pendentes: usuariosPendentes, users: usersList, statsPainel,
        blocos: blocosInstanciados, categorias: categoriasInstanciadas,
        isAdmin: user?.role === 'admin' || user?.username === 'gerente.gti'
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};