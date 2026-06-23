import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { RequestForm } from './pages/RequestForm';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ConsultRequests } from './pages/ConsultRequests';
import { Profile } from './pages/Profile';

/**
 * @component NavigationOrchestrator
 * @description Orquestrador de visualização e estado global de chamados.
 * Enclausura as subpáginas de forma semântica sob o modelo estrutural App Shell corporativo.
 */
function NavigationOrchestrator() {
  const [page, setPage] = useState("inicio");
  const { isAuthenticated, user, loading, request, logout } = useAuth();
  const [requests, setRequests] = useState([]);

  // Estado adicional para o filtro dinâmico de cards na Home técnica
  const [homeStatusFilter, setHomeStatusFilter] = useState('TODOS');

  const [toast, setToast] = useState({ isOpen: false, message: "", type: "success" });
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  const userCargo = user?.cargo?.toLowerCase() || "";
  const userEmail = user?.email?.toLowerCase() || "";
  
  const isAdmin = user?.role === "admin" || userCargo === "administrador" || userEmail === "gerente@ufam.edu.br";
  const isTecnico = (user?.role === "tecnico" || userCargo.includes("gti") || userCargo.includes("cpd") || userCargo.includes("subgerente")) || isAdmin;

  // Métricas Globais do Campus (Equipe Técnica)
  const totalGeralCampus = requests.length;
  const emAtendimentoCampus = requests.filter(r => ['EM_ATENDIMENTO', 'ATENDIMENTO'].includes(String(r.status).toUpperCase())).length;
  const resolvidasCampus = requests.filter(r => String(r.status).toUpperCase() === 'RESOLVIDO').length;
  const pendentesCampus = requests.filter(r => ['PENDENTE', 'ABERTO'].includes(String(r.status).toUpperCase())).length;

  // Métricas Individuais Baseadas no Dono do Chamado (Servidor Comum)
  const userUsername = user?.username?.toLowerCase() || "";
  const chamadosProprios = requests.filter(r => String(r.criador_username || r.username || '').toLowerCase() === userUsername || String(r.nome || '').toLowerCase() === String(user?.nome_completo || '').toLowerCase());
  const totalProprias = chamadosProprios.length;
  const emAtendimentoProprias = chamadosProprios.filter(r => ['EM_ATENDIMENTO', 'ATENDIMENTO'].includes(String(r.status).toUpperCase())).length;
  const resolvidasProprias = chamadosProprios.filter(r => String(r.status).toUpperCase() === 'RESOLVIDO').length;
  const pendentesProprias = chamadosProprios.filter(r => ['PENDENTE', 'ABERTO'].includes(String(r.status).toUpperCase())).length;

  const triggerToast = (message, type = "success") => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, isOpen: false }));
    }, 4000);
  };

  const triggerModalConfirm = (title, message, onConfirm) => {
    setModalConfig({ isOpen: true, title, message, onConfirm });
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const fetchRequests = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await request('/api/requests');
      if (!res) {
        setRequests([]);
        return;
      }

      if (Array.isArray(res)) {
        setRequests(res);
      } else if (res.requests && Array.isArray(res.requests)) {
        setRequests(res.requests);
      } else {
        const dadosBrutos = Object.keys(res)
          .filter(key => key !== 'success' && !isNaN(key))
          .map(key => res[key]);
        setRequests(dadosBrutos);
      }
    } catch (err) {
      console.error("[NavigationOrchestrator] Falha ao sincronizar Ordens de Serviço:", err.message);
      setRequests([]);
    }
  }, [isAuthenticated, request]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRequests();
    } else {
      setRequests([]);
    }
  }, [isAuthenticated, page, fetchRequests]);

  const handleUpdateStatus = async (id, newStatus, parecerTecnico = null) => {
    try {
      const response = await request(`/api/requests/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ 
          status: newStatus,
          parecer_tecnico: parecerTecnico
        })
      });
      
      if (response && response.success === false) {
        throw new Error(response.message || "Ação negada pelo barramento de segurança.");
      }

      triggerToast("A Ordem de Serviço foi atualizada no sistema com sucesso.", "success");
      await fetchRequests(); 
      return true;
    } catch (err) {
      triggerToast(err.message || "Falha de comunicação: Não foi possível alterar o status.", "danger");
      return false;
    }
  };

  const handleLogoutRequest = () => {
    triggerModalConfirm(
      "Encerrar Sessão",
      "Deseja realmente interromper suas atividades e desconectar do sistema?",
      () => { logout(); setPage("inicio"); }
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 flex-column gap-2" style={{ backgroundColor: '#f8fafc' }}>
        <div className="spinner-border text-success" role="status"></div>
        <span className="text-muted small font-monospace">Validando credenciais de acesso...</span>
      </div>
    );
  }

  const anoCorrente = new Date().getFullYear();

  if (!isAuthenticated && page === "inicio") {
    return (
      <div className="container-fluid p-0 m-0 w-100 min-vh-100 d-flex flex-column bg-white overflow-x-hidden">
        <div className="row g-0 flex-grow-1 min-vh-100 w-100 m-0 p-0">
          
          <div className="col-lg-5 d-none d-lg-flex flex-column justify-content-between p-5 text-white position-relative" 
               style={{ 
                 background: 'linear-gradient(180deg, #064e3b 0%, #0f172a 100%)',
                 boxShadow: 'inset -10px 0 20px -10px rgba(0,0,0,0.3)'
               }}>
            <div>
              <span className="badge px-3 py-2 text-uppercase font-monospace fw-bold" style={{ letterSpacing: '1px', fontSize: '11px', color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <i className="fa-solid fa-graduation-cap me-2"></i>Universidade Federal do Amazonas
              </span>
            </div>

            <div className="my-auto py-5 animate__animated animate__fadeInLeft">
              <h1 className="display-5 fw-extrabold text-white mb-4 lh-sm" style={{ fontWeight: '800', letterSpacing: '-1.5px' }}>
                Infraestrutura & <br/><span style={{ color: '#34d399' }}>Suporte Tecnológico</span>
              </h1>
              <p className="fs-6 fw-normal mb-0" style={{ color: '#cbd5e1', lineHeight: '1.8', maxWidth: '90%' }}>
                Central corporativa unificada triada pela Gerência de Tecnologia da Informação do campus ICET. Solicite reparos preventivos, maintenance avançada de laboratórios e governança de rede em uma esteira ágil de atendimento.
              </p>
            </div>

            <div className="border-top border-white border-opacity-10 pt-4">
              <small className="font-monospace text-uppercase d-block mb-3" style={{ fontSize: '10px', letterSpacing: '1px', color: '#34d399', fontWeight: '700' }}>Governança Ativa de TI</small>
              <div className="d-flex gap-4 font-monospace" style={{ fontSize: '12px', color: '#94a3b8' }}>
                <span><i className="fa-solid fa-circle-check text-success me-2"></i>Triagem Síncrona</span>
                <span><i className="fa-solid fa-bolt text-warning me-2"></i>Suporte Presencial</span>
              </div>
            </div>
          </div>

          <div className="col-lg-7 d-flex flex-column justify-content-center align-items-center p-4 p-md-5 bg-white">
            <div className="w-100 d-flex flex-column gap-4 animate__animated animate__fadeIn" style={{ maxWidth: '420px' }}>
              <div className="text-center text-lg-start">
                <h2 className="h3 fw-extrabold text-dark m-0" style={{ letterSpacing: '-1px', fontWeight: '800' }}>Ordens de Serviços — GTI</h2>
                <p className="text-muted small m-0 mt-1">Portal institutional homologado para abertura e gerenciamento de chamados.</p>
              </div>

              <div className="card border-0 shadow-sm p-4 bg-white rounded-4" style={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9' }}>
                <p className="text-secondary small text-center text-lg-start mb-4" style={{ lineHeight: '1.7', color: '#475569' }}>
                  Para registrar novas ocorrências em salas de aula, incidentes de hardware em computadores ou instabilidades na rede Wi-Fi corporativa, autentique-se utilizando suas credenciais institucionais.
                </p>
                <button className="btn btn-success w-100 py-3 shadow-sm fw-bold d-flex justify-content-center align-items-center border-0 text-white rounded-3" style={{ backgroundColor: '#10b981', transition: 'all 0.2s', fontSize: '14px' }} onClick={() => setPage("login")}>
                  <i className="fa-solid fa-right-to-bracket me-2"></i>Acesso do Servidor (Login)
                </button>
              </div>

              <div className="mt-2">
                <h3 className="h6 fw-bold text-uppercase text-muted font-monospace mb-3" style={{ fontSize: '10px', letterSpacing: '0.5px', color: '#64748b' }}>Catálogo Informativo de Cobertura</h3>
                <div className="d-flex flex-column gap-2">
                  <div className="p-3 bg-light border border-light-subtle rounded-3 d-flex align-items-center gap-3">
                    <div className="p-2 bg-success bg-opacity-10 text-success rounded-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}><i className="fa-solid fa-wifi"></i></div>
                    <div>
                      <strong className="d-block text-dark small" style={{ fontSize: '13px', fontWeight: '600' }}>Rede & Comunicação</strong>
                      <span className="text-muted d-block font-monospace" style={{ fontSize: '10px' }}>Wi-Fi corporativo, conectividade lógica e links dedicados.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (!isAuthenticated && page === "login") {
    return (
      <div className="w-100 min-vh-100 p-0 m-0 overflow-hidden">
        <Login onLoginSuccess={() => isTecnico ? setPage("consultas") : setPage("solicitacao")} />
      </div>
    );
  }

  // Filtragem dinâmica reativa baseada no card ativo da Home
  const obterFilaFiltradaHome = () => {
    const base = isTecnico ? requests : chamadosProprios;
    if (homeStatusFilter === 'TODOS') return base;
    if (homeStatusFilter === 'PENDENTE') return base.filter(r => ['PENDENTE', 'ABERTO'].includes(String(r.status).toUpperCase()));
    if (homeStatusFilter === 'EM_ATENDIMENTO') return base.filter(r => ['EM_ATENDIMENTO', 'ATENDIMENTO'].includes(String(r.status).toUpperCase()));
    if (homeStatusFilter === 'RESOLVIDO') return base.filter(r => String(r.status).toUpperCase() === 'RESOLVIDO');
    return base;
  };

  const filaExibicaoHome = obterFilaFiltradaHome();

  return (
    <div className="app-shell d-flex flex-column min-vh-100 bg-light">
      <style>{`
        .footer-pulse-green { animation: footerPulse 2s infinite ease-in-out; }
        @keyframes footerPulse {
          0% { opacity: 0.6; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50% { opacity: 1; box-shadow: 0 0 8px 2px rgba(16, 185, 129, 0.2); }
          100% { opacity: 0.6; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
        }
        .footer-link-subtle { color: #475569; text-decoration: none; font-weight: 500; transition: all 0.15s ease-in-out; }
        .footer-link-subtle:hover { color: #10b981; transform: translateY(-0.5px); }

        /* Estilização interativa premium para os cartões de métrica */
        .home-interactive-kpi { cursor: pointer; transition: all 0.2s ease-in-out; border: 1px solid #f1f5f9 !important; }
        .home-interactive-kpi:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.04) !important; }
        
        /* Modificadores de Estado Ativo baseados na regra de ouro de UX */
        .home-kpi-active-TODOS { border-color: #64748b !important; background-color: #f8fafc !important; }
        .home-kpi-active-PENDENTE { border-color: #ef4444 !important; background-color: rgba(239, 68, 68, 0.02) !important; }
        .home-kpi-active-EM_ATENDIMENTO { border-color: #f59e0b !important; background-color: rgba(245, 158, 11, 0.02) !important; }
        .home-kpi-active-RESOLVIDO { border-color: #10b981 !important; background-color: rgba(16, 185, 129, 0.02) !important; }
      `}</style>
      
      <header className="w-100 sticky-top" style={{ zIndex: 1030 }}>
        <Navbar currentPage={page} onNavigate={setPage} onLogoutRequested={handleLogoutRequest} />
      </header>

      <div className="d-flex flex-grow-1 position-relative w-100">
        
        {isAuthenticated && (
          <aside className="navigation-aside h-100 sticky-top" style={{ top: '60px', zIndex: 1020 }}>
            <Sidebar currentPage={page} onNavigate={setPage} isAdmin={isAdmin} isTecnico={isTecnico} />
          </aside>
        )}

        <main className="flex-grow-1 animate__animated animate__fadeIn" style={{ minWidth: 0, padding: '2.5rem' }}>
          
          {page === "inicio" && isAuthenticated && (
            <div className="container-fluid p-0 d-flex flex-column gap-4">
              
              {/* Seção de Títulos */}
              <div className="text-start mb-1">
                <h2 className="h4 fw-extrabold text-dark m-0" style={{ fontWeight: '800', letterSpacing: '-0.5px' }}>
                  Olá, {user?.nome_completo?.split(' ')[0] || "Servidor"}!
                </h2>
                <p className="text-muted small m-0 mt-0.5">
                  {isTecnico 
                    ? "Clique nos cards abaixo para filtrar reativamente a fila de atendimento atual." 
                    : "Acompanhe o andamento das suas ordens de serviço de infraestrutura tecnológica."}
                </p>
              </div>
              
              {/* 📈 GRID DE MÉTRICAS SUPERIORES COM CONTEÚDO ALINHADO (Agrupado à Esquerda, Ícone à Direita) */}
              <div className="row g-3">
                <div className="col-6 col-lg-3">
                  <div className={`card bg-white shadow-sm p-3.5 rounded-3 d-flex flex-row align-items-center justify-content-between home-interactive-kpi ${homeStatusFilter === 'TODOS' ? 'home-kpi-active-TODOS' : ''}`}
                       onClick={() => setHomeStatusFilter('TODOS')}>
                    <div className="text-start">
                      <span className="text-uppercase text-muted font-monospace fw-bold d-block mb-1" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>
                        {isTecnico ? "Geral do Campus" : "Meus Chamados"}
                      </span>
                      <h3 className="m-0 font-monospace fw-extrabold text-dark lh-1" style={{ fontSize: '24px' }}>{isTecnico ? totalGeralCampus : totalProprias}</h3>
                    </div>
                    <div className="p-2.5 rounded-3 bg-secondary bg-opacity-10 text-secondary"><i className="fa-solid fa-folder-open fs-5"></i></div>
                  </div>
                </div>
                
                <div className="col-6 col-lg-3">
                  <div className={`card bg-white shadow-sm p-3.5 rounded-3 d-flex flex-row align-items-center justify-content-between home-interactive-kpi ${homeStatusFilter === 'PENDENTE' ? 'home-kpi-active-PENDENTE' : ''}`}
                       onClick={() => setHomeStatusFilter('PENDENTE')}>
                    <div className="text-start">
                      <span className="text-uppercase text-muted font-monospace fw-bold d-block mb-1" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>Na Triagem</span>
                      <h3 className="m-0 font-monospace fw-extrabold text-danger lh-1" style={{ fontSize: '24px' }}>{isTecnico ? pendentesCampus : pendentesProprias}</h3>
                    </div>
                    <div className="p-2.5 rounded-3 bg-danger bg-opacity-10 text-danger"><i className="fa-solid fa-circle-exclamation fs-5"></i></div>
                  </div>
                </div>

                <div className="col-6 col-lg-3">
                  <div className={`card bg-white shadow-sm p-3.5 rounded-3 d-flex flex-row align-items-center justify-content-between home-interactive-kpi ${homeStatusFilter === 'EM_ATENDIMENTO' ? 'home-kpi-active-EM_ATENDIMENTO' : ''}`}
                       onClick={() => setHomeStatusFilter('EM_ATENDIMENTO')}>
                    <div className="text-start">
                      <span className="text-uppercase text-muted font-monospace fw-bold d-block mb-1" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>Em Curso</span>
                      <h3 className="m-0 font-monospace fw-extrabold text-warning lh-1" style={{ fontSize: '24px' }}>{isTecnico ? emAtendimentoCampus : emAtendimentoProprias}</h3>
                    </div>
                    <div className="p-2.5 rounded-3 bg-warning bg-opacity-10 text-warning"><i className="fa-solid fa-clock-rotate-left fs-5"></i></div>
                  </div>
                </div>

                <div className="col-6 col-lg-3">
                  <div className={`card bg-white shadow-sm p-3.5 rounded-3 d-flex flex-row align-items-center justify-content-between home-interactive-kpi ${homeStatusFilter === 'RESOLVIDO' ? 'home-kpi-active-RESOLVIDO' : ''}`}
                       onClick={() => setHomeStatusFilter('RESOLVIDO')}>
                    <div className="text-start">
                      <span className="text-uppercase text-muted font-monospace fw-bold d-block mb-1" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>Resolvidos</span>
                      <h3 className="m-0 font-monospace fw-extrabold text-success lh-1" style={{ fontSize: '24px' }}>{isTecnico ? resolvidasCampus : resolvidasProprias}</h3>
                    </div>
                    <div className="p-2.5 rounded-3 bg-success bg-opacity-10 text-success"><i className="fa-solid fa-circle-check fs-5"></i></div>
                  </div>
                </div>
              </div>

              {/* 🛠️ GRID ASSIMÉTRICO REAL DESKTOP (8x4) */}
              <div className="row g-4 m-0 w-100">
                
                {/* Lado Esquerdo (col-lg-8): Listagem Operacional Limpa */}
                <div className="col-lg-8 p-0 pe-lg-3">
                  <div className="bg-white border border-light-subtle rounded-3 shadow-sm p-4 h-100">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h3 className="h6 fw-bold text-dark font-monospace m-0 text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                        {homeStatusFilter !== 'TODOS' ? `Fila Ativa: ${homeStatusFilter} (${filaExibicaoHome.length})` : isTecnico ? "Últimas Ocorrências Registradas" : "Minhas Solicitações Recentes"}
                      </h3>
                      <button className="btn btn-link btn-sm text-success p-0 text-decoration-none font-monospace fw-bold" style={{ fontSize: '11px' }} onClick={() => setPage("consultas")}>
                        Ver Fila Completa &rarr;
                      </button>
                    </div>
                    
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0 text-start">
                        <tbody className="border-0">
                          {filaExibicaoHome.slice(0, 6).length === 0 ? (
                            <tr>
                              <td className="text-center py-5 text-muted font-monospace small">Nenhuma ordem de serviço localizada neste filtro.</td>
                            </tr>
                          ) : (
                            filaExibicaoHome.slice(0, 6).map(req => (
                              <tr key={req.id} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => setPage("consultas")}>
                                <td className="py-3 font-monospace fw-bold text-secondary" style={{ width: '70px', fontSize: '12px' }}>#{req.id}</td>
                                <td className="py-3 fw-bold text-dark text-truncate" style={{ maxWidth: '240px', fontSize: '13px' }}>
                                  {req.titulo?.replace(/\[.*?\]/, '') || "Chamado Técnico"}
                                </td>
                                <td className="py-3 text-secondary font-monospace" style={{ fontSize: '11px' }}>
                                  Bloco {req.bloco} &bull; Sala {req.sala}
                                </td>
                                <td className="py-3 text-end font-monospace">
                                  {String(req.status).toUpperCase() === 'RESOLVIDO' ? (
                                    <span className="badge font-monospace px-2.5 py-1 rounded border-0" style={{ fontSize: '9px', backgroundColor: '#e6f4ea', color: '#137333' }}>Resolvido</span>
                                  ) : ['EM_ATENDIMENTO', 'ATENDIMENTO'].includes(String(req.status).toUpperCase()) ? (
                                    <span className="badge font-monospace px-2.5 py-1 rounded border-0" style={{ fontSize: '9px', backgroundColor: '#fef3c7', color: '#d97706' }}>Em Curso</span>
                                  ) : (
                                    <span className="badge font-monospace px-2.5 py-1 rounded border-0" style={{ fontSize: '9px', backgroundColor: '#fee2e2', color: '#dc2626' }}>Pendente</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Lado Direito (col-lg-4): Feed de Atividades Recentes ou Atalhos Práticos */}
                <div className="col-lg-4 p-0 ps-lg-1">
                  {isTecnico ? (
                    /* CONTEXTO TÉCNICO: LOG DE ATIVIDADES OPERACIONAIS COMPACTO */
                    <div className="bg-white border border-light-subtle rounded-3 shadow-sm p-4 h-100 font-monospace text-start">
                      <h3 className="h6 fw-bold text-dark mb-3.5 text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>Logs Recentes do Sistema</h3>
                      <div className="d-flex flex-column gap-3" style={{ fontSize: '11px', color: '#475569' }}>
                        <div className="p-2.5 rounded bg-light border-start border-2 border-slate-400" style={{ backgroundColor: '#f8fafc' }}>
                          <span className="text-muted d-block small mb-0.5">Agora mesmo &bull; Fluxo</span>
                          <span className="text-dark">Sincronização automática de chamados realizada. Fila operando normalmente.</span>
                        </div>
                        <div className="p-2.5 rounded bg-light border-start border-2 border-success" style={{ backgroundColor: '#f8fafc' }}>
                          <span className="text-muted d-block small mb-0.5">Últimos minutos &bull; SLA</span>
                          <span className="text-dark">Acordo regulamentar de atendimento ativo para o campus ICET (24h).</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* CONTEXTO SERVIDOR COMUM: CENTRAL DE ATALHOS E UTILIDADES */
                    <div className="bg-white border border-light-subtle rounded-3 shadow-sm p-4 h-100 text-start">
                      <h3 className="h6 fw-bold text-dark font-monospace mb-3.5 text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>Ações de Autoatendimento</h3>
                      <div className="d-flex flex-column gap-3">
                        <button type="button" className="btn btn-dark w-100 font-monospace py-2.5 fw-bold text-uppercase" style={{ fontSize: '11px', borderRadius: '6px', backgroundColor: '#0f172a', border: '0' }} onClick={() => setPage("solicitacao")}>
                          <i className="fa-solid fa-paper-plane text-success me-2"></i> Abrir Nova OS
                        </button>
                        <div className="p-2.5 rounded bg-light font-monospace text-secondary" style={{ fontSize: '11px', backgroundColor: '#f8fafc', lineHeight: '1.6' }}>
                          <i className="fa-solid fa-circle-info text-success me-1"></i> O plantão presencial do GTI em laboratórios e salas funciona das 08:00 às 22:00.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
              </div>

            </div>
          )}
          
          {page === "solicitacao" && (
            <div className="p-0">{isAuthenticated ? <RequestForm onRefreshRequests={fetchRequests} onNavigate={setPage} /> : <Login onLoginSuccess={() => setPage("solicitacao")} />}</div>
          )}
          
          {page === "painel" && (
            <div className="p-0">{isAuthenticated ? <Dashboard requests={requests} onNavigate={setPage} /> : <Login onLoginSuccess={() => setPage("painel")} />}</div>
          )}
          
          {page === "consultas" && (
            <div className="p-0">{isAuthenticated ? <ConsultRequests requests={requests} onUpdateStatus={handleUpdateStatus} triggerModalConfirm={triggerModalConfirm} /> : <Login onLoginSuccess={() => setPage("consultas")} />}</div>
          )}

          {page === "perfil" && (
            <div className="p-0">{isAuthenticated ? <Profile user={user} triggerToast={triggerToast} /> : <Login onLoginSuccess={() => setPage("perfil")} />}</div>
          )}
        </main>
      </div>

      <footer className="py-3.5 flex-shrink-0 mt-auto" style={{ zIndex: 1010, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.015)' }}>
        <div className="container-fluid px-4">
          <div className="row align-items-center g-3">
            
            <div className="col-12 col-md-4 text-center text-md-start">
              <div className="d-flex align-items-center justify-content-center justify-content-md-start gap-1.5 mb-0.5">
                <strong style={{ fontWeight: '900', letterSpacing: '-0.3px', color: '#0f172a', fontSize: '12px' }}>OS</strong>
                <span className="text-muted opacity-30">&middot;</span>
                <span className="font-monospace" style={{ fontWeight: '400', color: '#64748b', fontSize: '11px', letterSpacing: '0.5px' }}>ICET</span>
              </div>
              <p className="m-0 text-secondary font-monospace" style={{ fontSize: '10.5px', opacity: 0.85 }}>
                &copy; {anoCorrente} Instituto de Ciências Exatas e Tecnologia &mdash; UFAM
              </p>
            </div>
            
            <div className="col-12 col-md-4 text-center">
              <div className="d-flex justify-content-center gap-4 font-monospace" style={{ fontSize: '11px' }}>
                <a href="#manuais" className="footer-link-subtle">
                  <i className="fa-solid fa-book-open me-1.5 opacity-60"></i>Manuais GTI
                </a>
                <span className="text-muted opacity-20">|</span>
                <a href="#conformidade" className="footer-link-subtle">
                  <i className="fa-solid fa-shield-halved me-1.5 opacity-60"></i>Termos e LGPD
                </a>
                <span className="text-muted opacity-20">|</span>
                <a href="#suporte" className="footer-link-subtle">
                  <i className="fa-solid fa-headset me-1.5 opacity-60"></i>Suporte Remoto
                </a>
              </div>
            </div>

            <div className="col-12 col-md-4 text-center text-md-end">
              <div className="d-inline-flex align-items-center gap-2 px-2.5 py-1.5 rounded-3 border" 
                   style={{ 
                     fontSize: '10px', 
                     backgroundColor: '#ffffff', 
                     borderColor: '#e2e8f0'
                   }}>
                <span className="footer-pulse-green d-inline-block rounded-circle bg-success" style={{ width: '6px', height: '6px', boxShadow: '0 0 6px #10b981' }} />
                <span className="text-secondary fw-semibold font-monospace" style={{ letterSpacing: '0.2px' }}>Sistemas Operacionais</span>
                <span className="text-muted opacity-40">&bull;</span>
                <span className="text-success fw-bold font-monospace" style={{ letterSpacing: '0.5px' }}>100% OPERANTE</span>
              </div>
            </div>

          </div>
        </div>
      </footer>

      {toast && toast.isOpen && (
        <div className="position-fixed top-0 end-0 p-4 mt-5" style={{ zIndex: 10500 }}>
          <div className={`toast show align-items-center text-bg-${toast.type === 'danger' ? 'danger' : 'success'} border-0 shadow-lg`} role="alert">
            <div className="d-flex">
              <div className="toast-body fw-bold font-monospace small d-flex align-items-center">
                {toast.type === 'danger' ? <i className="fa-solid fa-triangle-exclamation fa-lg me-2"></i> : <i className="fa-solid fa-circle-check fa-lg me-2"></i>}
                {toast.message}
              </div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto shadow-none" onClick={() => setToast(prev => ({ ...prev, isOpen: false }))}></button>
            </div>
          </div>
        </div>
      )}

      {modalConfig.isOpen && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 9999, backdropFilter: 'blur(3px)' }}>
          <div className="bg-white p-4 mx-3 animate__animated animate__zoomIn rounded-3 border shadow-lg" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="text-center mb-3">
              <h3 className="h5 fw-bold text-dark m-0">{modalConfig.title}</h3>
            </div>
            <p className="text-muted text-center small mb-4">{modalConfig.message}</p>
            <div className="d-flex justify-content-center gap-2">
              <button className="btn btn-sm btn-light border px-3 fw-bold" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-sm btn-danger px-3 fw-bold" onClick={() => { modalConfig.onConfirm(); closeModal(); }}>Confirmar Saída</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationOrchestrator />
    </AuthProvider>
  );
}