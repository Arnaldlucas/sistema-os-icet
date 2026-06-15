import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Componente Atômico Interno: StatCard
 * Responsável por exibir métricas individuais com estilo premium.
 */
function StatCard({ label, value, color = "var(--icet-primary)", icon }) {
  return (
    <div className="surface h-100 d-flex flex-column justify-content-between border-0 shadow-sm">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <span className="text-muted small fw-bold text-uppercase tracking-wider">{label}</span>
        <i className={`${icon} opacity-25`} style={{ color, fontSize: '1.5rem' }}></i>
      </div>
      <div>
        <h3 className="display-6 fw-bold m-0" style={{ color }}>{value}</h3>
      </div>
    </div>
  );
}

/**
 * Componente Atômico Interno: ShortcutCard
 * Facilita a navegação rápida para módulos administrativos.
 */
function ShortcutCard({ title, description, icon, onClick, badge }) {
  return (
    <button 
      onClick={onClick}
      className="surface text-start w-100 border-0 shadow-sm h-100 position-relative overflow-hidden group"
      style={{ transition: 'var(--transition-smooth)' }}
    >
      <div className="position-relative z-index-1">
        <div className="mb-3 d-flex align-items-center gap-2">
          <div className="p-2 rounded-3" style={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', color: 'var(--icet-primary)' }}>
            <i className={`${icon} fa-lg`}></i>
          </div>
          {badge && <span className="badge-status badge-resolvido small" style={{ fontSize: '10px' }}>{badge}</span>}
        </div>
        <h4 className="h5 fw-bold mb-2" style={{ color: 'var(--icet-dark)' }}>{title}</h4>
        <p className="text-muted small mb-0">{description}</p>
      </div>
      {/* Detalhe estético: Círculo decorativo no hover */}
      <div className="position-absolute" style={{ 
        right: '-20px', 
        bottom: '-20px', 
        width: '100px', 
        height: '100px', 
        borderRadius: '50%', 
        backgroundColor: 'rgba(5, 150, 105, 0.03)',
        transition: 'var(--transition-smooth)'
      }}></div>
    </button>
  );
}

export function Dashboard({ requests, users, groups, onNavigate }) {
  const { permissions, user } = useAuth();

  // Heurística 7 (Eficiência): Processamento de estatísticas memorizado para evitar re-renderizações inúteis
  const stats = useMemo(() => {
    return {
      total: requests.length,
      abertos: requests.filter(r => r.status === "Aberto").length,
      atendimento: requests.filter(r => r.status === "Em Atendimento").length,
      resolvidos: requests.filter(r => r.status === "Resolvido").length,
      usuarios: permissions.admin ? users.length : 1,
      setores: permissions.admin ? groups.length : 1
    };
  }, [requests, users, groups, permissions.admin]);

  return (
    <div className="animate__animated animate__fadeIn">
      {/* Cabeçalho de Boas-Vindas Dinâmico */}
      <div className="mb-5">
        <h2 className="h3 fw-bold m-0" style={{ color: 'var(--icet-dark)' }}>
          Olá, {user?.nome?.split(' ')[0]}!
        </h2>
        <p className="text-muted">Bem-vindo ao painel de controle operacional da TI ICET.</p>
      </div>

      {/* Grade de Estatísticas - Heurística 1 */}
      <div className="row g-4 mb-5">
        <div className="col-6 col-md-4 col-xl-2">
          <StatCard label="Total OS" value={stats.total} icon="fa-solid fa-layer-group" />
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <StatCard label="Abertas" value={stats.abertos} color="var(--status-aberto)" icon="fa-solid fa-circle-exclamation" />
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <StatCard label="Em Curso" value={stats.atendimento} color="var(--status-progresso)" icon="fa-solid fa-clock-rotate-left" />
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <StatCard label="Concluídas" value={stats.resolvidos} color="var(--status-resolvido)" icon="fa-solid fa-check-double" />
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <StatCard label="Operadores" value={stats.usuarios} icon="fa-solid fa-users-gear" />
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <StatCard label="Setores" value={stats.setores} icon="fa-solid fa-sitemap" />
        </div>
      </div>

      {/* Seção de Ações Rápidas */}
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="surface h-100 border-0 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="h5 fw-bold m-0">Atalhos Administrativos</h4>
              <span className="text-muted small">Módulos de gestão rápida</span>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <ShortcutCard 
                  title="Fila de Chamados" 
                  description="Filtre, despache mensagens e atualize o status dos atendimentos técnicos."
                  icon="fa-solid fa-list-check"
                  onClick={() => onNavigate("consultas")}
                  badge={stats.abertos > 0 ? `${stats.abertos} Pendentes` : null}
                />
              </div>
              {permissions.can_manage && (
                <div className="col-md-6">
                  <ShortcutCard 
                    title="Configurações de Acesso" 
                    description="Gerencie grupos de usuários, permissões e catálogo de demandas."
                    icon="fa-solid fa-gears"
                    onClick={() => onNavigate("gerenciamento")}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Informativo de Plantão / Status */}
        <div className="col-lg-4">
          <div className="surface h-100 border-0 shadow-sm bg-dark text-white position-relative overflow-hidden">
            <h4 className="h5 fw-bold mb-3 position-relative z-index-1">Status da Infraestrutura</h4>
            <div className="d-flex align-items-center gap-2 mb-3 position-relative z-index-1">
              <span className="p-1 bg-success rounded-circle animate__animated animate__pulse animate__infinite" style={{ width: '10px', height: '10px' }}></span>
              <small className="fw-bold text-success">Sistemas UFAM Online</small>
            </div>
            <p className="small text-light opacity-75 position-relative z-index-1">
              Todos os serviços de rede e autenticação centralizada estão operando dentro da normalidade no campus Itacoatiara.
            </p>
            {/* Elemento Visual Sênior: Logo ICET em marca d'água */}
            <img 
              src="assets/logo_icet.png" 
              alt="" 
              className="position-absolute" 
              style={{ right: '-20px', bottom: '-20px', width: '150px', opacity: '0.05', filter: 'grayscale(1) brightness(2)' }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}