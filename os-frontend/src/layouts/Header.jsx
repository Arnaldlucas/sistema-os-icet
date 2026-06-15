import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const menuItems = [
  { id: "inicio", label: "Início", public: true },
  { id: "solicitacao", label: "Solicitação", public: true },
  { id: "login", label: "Login", public: true, hideAuthed: true },
  { id: "painel", label: "Painel TI", private: true },
  { id: "consultas", label: "Consultar", private: true },
  { id: "gerenciamento", label: "Gerenciamento", private: true, adminOnly: true }
];

export function Header({ currentPage, onNavigate, onLogoutRequested }) {
  const { isAuthenticated, isAdmin, user } = useAuth();

  // Filtra as abas visíveis com base nas permissões e estado de login
  const visibleItems = menuItems.filter(item => {
    if (item.hideAuthed && isAuthenticated) return false;
    if (item.public) return true;
    if (item.private && !isAuthenticated) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  // Função sênior para extrair as iniciais do operador para o Avatar
  const getIniciais = (nome) => {
    if (!nome) return "OP";
    const partes = nome.trim().split(" ");
    if (partes.length > 1) {
      return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }
    return partes[0].substring(0, 2).toUpperCase();
  };

  return (
    <nav className="navbar navbar-expand-lg sticky-top py-3" style={{
      background: "rgba(255, 255, 255, 0.8)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
      boxShadow: "rgba(15, 23, 42, 0.03) 0px 4px 12px"
    }}>
      <div className="container">
        {/* Logo e Branding Institucional Otimizado */}
        <button 
          className="btn p-0 d-flex align-items-center gap-3 text-start border-0 bg-transparent shadow-none" 
          onClick={() => onNavigate("inicio")}
          type="button"
          style={{ transition: "var(--transition-smooth)" }}
        >
          <div className="d-flex align-items-center justify-content-center" style={{
            width: "42px",
            height: "42px",
            background: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
            borderRadius: "10px",
            boxShadow: "var(--shadow-sm)",
            border: "1px solid rgba(226, 232, 240, 0.6)"
          }}>
            <img 
              className="brand-logo" 
              src="assets/logo_icet.png" 
              alt="Logo ICET" 
              style={{ width: "26px", height: "auto" }} 
            />
          </div>
          <div>
            <span className="d-block fw-bold m-0 lh-1" style={{ color: "var(--icet-dark)", fontSize: "15px", letterSpacing: "-0.02em" }}>
              Ordem de Serviço
            </span>
            <small className="text-muted font-monospace" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>TI / ICET UFAM</small>
          </div>
        </button>

        {/* Menu de Navegação Desktop Minimalista */}
        <div className="collapse navbar-collapse justify-content-center" id="navbarNav">
          <ul className="nav nav-pills gap-2">
            {visibleItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <li className="nav-item" key={item.id}>
                  <button 
                    className="nav-link fw-semibold px-3 py-2 border-0 position-relative style-nav-pill" 
                    style={{
                      backgroundColor: isActive ? 'var(--icet-primary)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--icet-muted)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '14px',
                      transition: 'var(--transition-smooth)'
                    }}
                    onClick={() => onNavigate(item.id)}
                    type="button"
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Painel de Sessão Ativa com Avatar Premium */}
        {isAuthenticated ? (
          <div className="d-flex align-items-center gap-3 animate__animated animate__fadeIn">
            <div className="text-end d-none d-sm-block">
              <span className="d-block fw-bold text-dark" style={{ fontSize: "13px", letterSpacing: "-0.01em" }}>
                {user?.nome || "Operador"}
              </span>
              <span className="badge mt-1" style={{ 
                fontSize: "9px", 
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                backgroundColor: user?.role === 'admin' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                color: user?.role === 'admin' ? 'var(--icet-primary)' : 'var(--icet-muted)',
                borderRadius: "6px"
              }}>
                {user?.grupo_nome || "Técnico"}
              </span>
            </div>

            {/* Avatar Circular com Iniciais */}
            <div className="d-flex align-items-center justify-content-center fw-bold font-monospace" style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              backgroundColor: "var(--icet-dark)",
              color: "#ffffff",
              fontSize: "13px",
              boxShadow: "var(--shadow-sm)",
              border: "2px solid #ffffff"
            }}>
              {getIniciais(user?.nome)}
            </div>

            {/* Divisor Fino */}
            <div style={{ width: "1px", height: "24px", backgroundColor: "#cbd5e1" }}></div>

            {/* Botão de Sair Polido */}
            <button 
              className="btn btn-link text-muted p-2 d-flex align-items-center justify-content-center shadow-none text-decoration-none style-btn-logout" 
              style={{ 
                borderRadius: "var(--radius-sm)", 
                transition: "var(--transition-smooth)",
                fontSize: "14px",
                fontWeight: "600"
              }}
              onClick={onLogoutRequested}
              type="button"
              title="Encerrar Sessão"
            >
              <i className="fa-solid fa-arrow-right-from-bracket me-1"></i>
              <span className="d-none d-md-inline">Sair</span>
            </button>
          </div>
        ) : (
          /* Elemento fantasma para balancear o layout flexbox caso deslogado */
          <div style={{ width: "42px" }} className="d-none d-lg-block"></div>
        )}
      </div>

      {/* Estilos locais de micro-interações para injetar no cabeçalho */}
      <style>{`
        .style-nav-pill:hover:not(.active) {
          color: var(--icet-dark) !important;
          background-color: rgba(15, 23, 42, 0.04) !important;
        }
        .style-btn-logout:hover {
          color: #ef4444 !important;
          background-color: rgba(239, 68, 68, 0.05) !important;
        }
      `}</style>
    </nav>
  );  
}