import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * @component Navbar
 * @description Componente Navbar Institucional Superior (Header Shell).
 * Oferece identidade visual moderna (OS · ICET) compatível com o layout de barra lateral ativa.
 */
export function Navbar({ currentPage, onNavigate, onLogoutRequested }) {
  const { user, isAuthenticated, request } = useAuth();
  const [isBackendOnline, setIsBackendOnline] = useState(true);

  /**
   * Executa pooling assíncrono leve em background para validação do status do sistema.
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const checarSaudeSistema = async () => {
      try {
        await request('/api/requests', { method: 'GET', timeout: 3000 });
        setIsBackendOnline(true);
      } catch (err) {
        setIsBackendOnline(false);
      }
    };

    const interval = setInterval(checarSaudeSistema, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, request]);

  if (!isAuthenticated) return null;

  return (
    <nav className="navbar navbar-expand-lg border-bottom py-2.5" 
         style={{ 
           background: 'linear-gradient(185deg, #0f172a 0%, #1e293b 100%)',
           borderColor: 'rgba(255, 255, 255, 0.05)',
           boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
         }}>
      <div className="container-fluid px-4">
        
        {/* 💻 BRANDING DO SISTEMA (OS · ICET MODERNO) */}
        <span 
          className="navbar-brand d-flex align-items-center text-white p-0 m-0" 
          style={{ cursor: 'pointer', transition: 'opacity 0.2s' }} 
          onClick={() => onNavigate("inicio")}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <strong style={{ fontWeight: '900', letterSpacing: '-0.5px', fontSize: '1.25rem' }}>OS</strong>
          <span className="mx-1.5 opacity-25" style={{ fontWeight: '300' }}>&bull;</span>
          <span className="font-monospace" style={{ fontWeight: '300', letterSpacing: '0.5px', color: '#cbd5e1', fontSize: '1.1rem' }}>ICET</span>
          
          {/* Status Pulse de Conexão Embutido Corretamente */}
          <span 
            className="ms-3 d-inline-flex align-items-center gap-2 px-2 py-1 rounded-2" 
            style={{ 
              fontSize: '10px', 
              fontWeight: '600', 
              backgroundColor: isBackendOnline ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: isBackendOnline ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)'
            }}
            title={isBackendOnline ? "PostgreSQL & FastAPI Online" : "Instabilidade Detectada no Servidor"}
          >
            <span 
              className={`d-inline-block rounded-circle ${isBackendOnline ? 'bg-success' : 'bg-danger'}`}
              style={{ 
                width: '6px', 
                height: '6px', 
                boxShadow: isBackendOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444'
              }}
            />
            <span style={{ color: isBackendOnline ? '#34d399' : '#f87171', letterSpacing: '0.5px' }}>
              {isBackendOnline ? "ONLINE" : "OFFLINE"}
            </span>
          </span>
        </span>
        
        {/* 🎛️ CONTROLES DE SESSÃO E PERFIL */}
        <div className="ms-auto d-flex align-items-center gap-3">
          
          <button 
            className="btn btn-sm border-0 font-monospace d-flex align-items-center gap-2 text-white shadow-none px-2.5 py-1.5"
            onClick={() => onNavigate("perfil")}
            style={{ 
              fontSize: '12px', 
              borderRadius: '6px',
              backgroundColor: currentPage === 'perfil' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              transition: 'background-color 0.2s',
              color: currentPage === 'perfil' ? '#34d399' : '#f8fafc'
            }}
            type="button"
          >
            <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: '22px', height: '22px', fontSize: '9px', backgroundColor: '#475569' }}>
              {(user?.nome_completo || "S").substring(0, 2).toUpperCase()}
            </div>
            <span style={{ fontWeight: '600', opacity: currentPage === 'perfil' ? 1 : 0.85 }}>
              {user?.nome_completo?.split(' ')[0] || "Servidor"}
            </span>
          </button>
          
          <span className="text-secondary opacity-25" style={{ fontSize: '12px' }}>|</span>
          
          <button 
            className="btn btn-sm font-monospace fw-bold d-flex align-items-center gap-1.5 border-0 text-white shadow-none px-3 py-1.5" 
            onClick={onLogoutRequested} 
            style={{ 
              fontSize: '11px', 
              borderRadius: '6px', 
              letterSpacing: '0.5px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#f87171';
            }}
          >
            <i className="fa-solid fa-power-off" style={{ fontSize: '10px' }}></i> SAIR
          </button>
        </div>

      </div>
    </nav>
  );
}