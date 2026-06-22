import React from 'react';

/**
 * Componente de Navegação Lateral Principal (Sidebar Shell).
 * Aplica travas visuais reativas de escopo baseadas no nível de privilégio logado.
 *
 * @param {Object} props Elementos estruturais e flags de controle de acesso.
 * @param {string} props.currentPage Identificador do estado de visualização ativo.
 * @param {Function} props.onNavigate Método disparador para alternar as abas no orchestrator.
 * @param {boolean} props.isAdmin Flag de escopo mestre (Gerente).
 * @param {boolean} props.isTecnico Flag de escopo operacional (Técnico / Subgerente).
 */
export function Sidebar({ currentPage, onNavigate, isAdmin, isTecnico }) {
  return (
    <aside className="bg-white border-end d-flex flex-column p-3 animate__animated animate__fadeInLeft shadow-sm" style={{ width: '240px', minHeight: 'calc(100vh - 65px)' }}>
      <style>{`
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0.75rem 1rem;
          color: var(--icet-muted);
          font-size: 13px;
          font-weight: 600;
          border-radius: 6px;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
          transition: all 0.2s ease;
        }
        .sidebar-link:hover {
          color: var(--icet-dark);
          background-color: #f1f5f9;
        }
        .sidebar-link.active {
          color: #ffffff;
          background-color: var(--icet-primary, #059669);
        }
        .sidebar-section-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 0.5px;
          padding: 1rem 1rem 0.5rem 1rem;
        }
      `}</style>

      <div className="d-flex flex-column gap-1 w-100">
        <span className="sidebar-section-title">Geral</span>
        <button className={`sidebar-link ${currentPage === 'inicio' ? 'active' : ''}`} onClick={() => onNavigate('inicio')}>
          <i className="fa-solid fa-house"></i> Início
        </button>
        <button className={`sidebar-link ${currentPage === 'solicitacao' ? 'active' : ''}`} onClick={() => onNavigate('solicitacao')}>
          <i className="fa-solid fa-plus-circle"></i> Abrir Chamado
        </button>
        

        <button className={`sidebar-link ${currentPage === 'consultas' ? 'active' : ''}`} onClick={() => onNavigate('consultas')}>
          {isTecnico ? (
            <><i className="fa-solid fa-list-check"></i> Fila de Atendimento</>
          ) : (
            <><i className="fa-solid fa-rectangle-list"></i> Meus Chamados</>
          )}
        </button>

        {isTecnico && (
          <>
            <span className="sidebar-section-title">Operação GTI</span>
       
            <button className={`sidebar-link ${currentPage === 'painel' ? 'active' : ''}`} onClick={() => onNavigate('painel')}>
              <i className="fa-solid fa-shield-halved"></i> Central de Governança
            </button>
          </>
        )}

        <span className="sidebar-section-title">Configurações</span>
        <button className={`sidebar-link ${currentPage === 'perfil' ? 'active' : ''}`} onClick={() => onNavigate('perfil')}>
          <i className="fa-solid fa-user-gear"></i> Meu Perfil
        </button>
      </div>
    </aside>
  );
}