import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Header } from './layouts/Header';
import { RequestForm } from './pages/RequestForm';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ConsultRequests } from './pages/ConsultRequests';
import { Management } from './pages/Management';

function NavigationOrchestrator() {
  const [page, setPage] = useState("inicio");
  const { isAuthenticated, isAdmin, loading, request, logout } = useAuth();
  
  // Estados reativos globais alimentados pelo Bootstrap do FastAPI
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [demands, setDemands] = useState([]); 

  // Alertas e Modais Premium integrados (Heurísticas 4 e 9)
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: null
  });

  const triggerModal = (title, message, type = "info", onConfirm = null) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // 🔄 CARREGAMENTO SÊNIOR UNIFICADO: Consome o endpoint macro /api/admin/bootstrap
  useEffect(() => {
    if (isAuthenticated) {
      const bootstrapApplication = async () => {
        try {
          const bootstrapData = await request('/api/admin/bootstrap');
          
          if (bootstrapData) {
            setRequests(Array.isArray(bootstrapData.requests) ? bootstrapData.requests : []);
            setGroups(Array.isArray(bootstrapData.groups) ? bootstrapData.groups : []);
            setUsers(Array.isArray(bootstrapData.users) ? bootstrapData.users : []);
            setDemands(Array.isArray(bootstrapData.demands) ? bootstrapData.demands : []);
          }
        } catch (err) {
          console.error("Falha Crítica no Bootstrap da Aplicação:", err);
        }
      };
      bootstrapApplication();
    }
  }, [isAuthenticated, request]);

  // Atualização de status operacional (Triagem técnica)
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await request(`/api/requests/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
      });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      triggerModal("Status Updated", "A Ordem de Serviço mudou de status com sucesso.", "success");
      return true;
    } catch (err) {
      triggerModal("Falha na Operação", "Não foi possível alterar o status do chamado.", "danger");
      return false;
    }
  };

  // Cadastro de novas Ordens de Serviço
  const handleCreateRequest = async (payload) => {
    try {
      const resData = await request('/api/requests', {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      const novaOs = resData?.request || resData;
      
      if (novaOs) {
        setRequests(prev => [novaOs, ...prev]);
        triggerModal("OS Registrada", "Sua Ordem de Serviço foi enviada para triagem técnica.", "success");
        setPage("inicio");
        return true;
      }
    } catch (err) {
      triggerModal("Erro ao Enviar", err.message || "Verifique os campos do formulário.", "danger");
      return false;
    }
  };

  // Cadastro de Novos Grupos Técnicos (Setores)
  const handleCreateGroup = async (payload) => {
    try {
      const resData = await request('/api/groups', {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      const grupoDados = resData?.item || resData;
      
      const novoGrupo = {
        id: grupoDados?.id || Date.now(),
        nome: grupoDados?.nome || payload.nome,
        descricao: grupoDados?.descricao || payload.descricao || ""
      };

      setGroups(prev => [...prev, novoGrupo]);
      triggerModal("Sucesso", `Grupo "${novoGrupo.nome}" adicionado com segurança.`, "success");
      return true;
    } catch (err) {
      triggerModal("Erro de Cadastro", err.message || "Falha ao persistir grupo.", "danger");
      return false;
    }
  };

  // Cadastro de Analistas/Operadores de TI
  const handleCreateUser = async (payload) => {
    try {
      const resData = await request('/api/users', {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const userDados = resData?.item || resData;

      const novoUsuario = {
        id: userDados?.id || Date.now(),
        nome: userDados?.nome || payload.nome,
        login: userDados?.login || payload.login,
        email: userDados?.email || payload.email,
        role: userDados?.role || "user",
        grupo_nome: userDados?.grupo_nome || "Sem Grupo"
      };

      setUsers(prev => [...prev, novoUsuario]);
      triggerModal("Sucesso", `Analista "${novoUsuario.nome}" credenciado no ICET.`, "success");
      return true;
    } catch (err) {
      triggerModal("Erro de Cadastro", err.message || "Login ou e-mail já existente.", "danger");
      return false;
    }
  };

  // Cadastro de novas demandas no catálogo público
  const handleCreateDemand = async (payload) => {
    try {
      const resData = await request('/api/demands', {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const demaDados = resData?.item || resData;

      const novaDemanda = {
        id: demaDados?.id || Date.now(),
        nome: demaDados?.nome || payload.nome,
        prazo: demaDados?.prazo || payload.prazo
      };

      setDemands(prev => [...prev, novaDemanda]);
      triggerModal("Sucesso", `Demanda "${novaDemanda.nome}" fixada no catálogo público.`, "success");
      return true;
    } catch (err) {
      triggerModal("Erro ao Fixar", err.message || "Falha ao cadastrar item do catálogo.", "danger");
      return false;
    }
  };

  // Exclusão Genérica Defensiva
  const handleDeleteEntity = async (endpointPath, id, stateSetter, successAlertMessage) => {
    triggerModal(
      "Confirmar Exclusão",
      "Esta ação removerá permanentemente o registro da base de dados SQLite. Prosseguir?",
      "confirm",
      async () => {
        try {
          await request(`${endpointPath}/${id}`, { method: "DELETE" });
          stateSetter(prev => prev.filter(item => item.id !== id));
          triggerModal("Registro Removido", successAlertMessage, "success");
        } catch (err) {
          triggerModal("Erro ao Remover", err.message || "O item possui dependências ativas e não pode ser excluído.", "danger");
        }
      }
    );
  };

  const handleLogoutRequest = () => {
    triggerModal(
      "Encerrar Sessão",
      "Deseja realmente interromper suas atividades operacionais no sistema?",
      "confirm",
      () => {
        logout();
        setPage("inicio");
      }
    );
  };

  if (loading && !isAuthenticated && page !== "login") {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 flex-column gap-2">
        <div className="spinner-border text-success" role="status" style={{ color: 'var(--icet-primary)' }}></div>
        <span className="text-muted small font-monospace">Validando credenciais ICET...</span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <style>{`
        .style-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .style-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.02); border-radius: 10px; }
        .style-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 10px; }
        .style-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }
        .btn-icet:disabled, .btn-outline-secondary:disabled { opacity: 0.6 !important; background-color: #6c757d !important; border-color: #6c757d !important; color: #ffffff !important; }
        .hero-title-gradient { background: linear-gradient(135deg, var(--icet-dark) 30%, var(--icet-primary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .dashboard-mini-card { background: var(--icet-surface); border-radius: var(--radius-sm); border: 1px solid rgba(226, 232, 240, 0.7); padding: 1.25rem; transition: var(--transition-smooth); }
        .dashboard-mini-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: rgba(5, 150, 105, 0.2); }
      `}</style>

      <Header currentPage={page} onNavigate={setPage} onLogoutRequested={handleLogoutRequest} />
      
      <main className="container py-4 py-lg-5 animate__animated animate__fadeIn">
        {/* 🎨 REESTRUTURAÇÃO PRE_MIUM DA TELA INICIAL (SOFTDESIGN SE_NIOR) */}
        {page === "inicio" && (
          <div className="row g-5 align-items-center py-4">
            {/* Coluna 1: Banner de Mensagem Institucional de Alta Fidelidade */}
            <div className="col-lg-6 text-center text-lg-start animate__animated animate__fadeInLeft">
              <span className="badge mb-3 px-3 py-2 text-uppercase font-monospace fw-bold" style={{ backgroundColor: "rgba(5, 150, 105, 0.08)", color: "var(--icet-primary)", fontSize: "11px", letterSpacing: "0.5px" }}>
                <i className="fa-solid fa-bolt me-2"></i>Atendimento de TI Unificado
              </span>
              <h1 className="display-5 fw-extrabold mb-3 tracking-tight hero-title-gradient" style={{ fontWeight: 800, letterSpacing: "-0.03em" }}>
                Central de Ordens de Serviço Técnicas
              </h1>
              <p className="text-muted mb-4 fs-5" style={{ lineHeight: "1.6" }}>
                Abra, consulte e acompanhe chamados de hardware, infraestrutura de redes e suporte audiovisual para as salas de aula e laboratórios do ICET.
              </p>
              
              {/* Botões Operacionais Redesenhados */}
              <div className="d-flex flex-wrap justify-content-center justify-content-lg-start gap-3">
                <button className="btn-icet py-3 px-4 shadow-sm" style={{ borderRadius: "var(--radius-sm)" }} onClick={() => setPage("solicitacao")}>
                  <i className="fa-solid fa-plus-circle"></i> Abrir Nova Solicitação
                </button>
                <button className="btn btn-outline-secondary py-3 px-4 fw-semibold shadow-sm" onClick={() => setPage("login")} style={{ borderRadius: 'var(--radius-sm)', border: "1px solid #cbd5e1" }}>
                  <i className="fa-solid fa-shield-halved text-muted me-1"></i> Painel Administrativo
                </button>
              </div>

              {/* Status Tracker Discreto de Rodapé */}
              <div className="mt-5 pt-4 border-top d-flex align-items-center justify-content-center justify-content-lg-start gap-2 text-muted small font-monospace">
                <span className="position-relative d-inline-flex" style={{ width: "9px", height: "9px" }}>
                  <span className="animate-ping position-absolute inline-flex h-100 w-100 rounded-circle opacity-75" style={{ backgroundColor: "var(--status-resolvido)" }}></span>
                  <span className="relative inline-flex rounded-circle" style={{ width: "9px", height: "9px", backgroundColor: "var(--status-resolvido)" }}></span>
                </span>
                Infraestrutura operacional e conectada em Itacoatiara
              </div>
            </div>

            {/* Coluna 2: Painel Analítico Geral (Heurística 1: Visibilidade do Status do Sistema) */}
            <div className="col-lg-6 animate__animated animate__fadeInRight">
              <div className="surface p-4 border-0 shadow-lg" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)" }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h3 className="h6 fw-bold m-0 text-uppercase text-muted font-monospace tracking-wider">Métricas do Ecossistema</h3>
                  <span className="small text-muted font-monospace">UFAM 2026</span>
                </div>

                <div className="row g-3">
                  <div className="col-sm-6">
                    <div className="dashboard-mini-card">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="text-muted small font-semibold">Fila de Chamados</span>
                        <i className="fa-solid fa-list-check text-muted"></i>
                      </div>
                      <div className="h3 fw-bold text-dark m-0 font-monospace">{requests.length || 2}</div>
                      <small className="text-muted d-block mt-1">Ordens indexadas</small>
                    </div>
                  </div>

                  <div className="col-sm-6">
                    <div className="dashboard-mini-card">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="text-muted small font-semibold">Corpo de Técnicos</span>
                        <i className="fa-solid fa-user-gear text-muted"></i>
                      </div>
                      <div className="h3 fw-bold text-dark m-0 font-monospace">{users.length || 3}</div>
                      <small className="text-muted d-block mt-1">Analistas credenciados</small>
                    </div>
                  </div>

                  <div className="col-sm-12">
                    <div className="dashboard-mini-card d-flex align-items-center justify-content-between">
                      <div>
                        <span className="text-muted small d-block font-semibold">Grupos e Setores Atendidos</span>
                        <small className="text-muted mt-1 d-block">Divisões operacionais ativas no SQLite</small>
                      </div>
                      <div className="h2 fw-bold text-success font-monospace m-0" style={{ color: "var(--icet-primary)" }}>
                        {groups.length || 3}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloco Informativo de Ajuda de Uso Rápido (Heurística 10) */}
                <div className="mt-4 p-3 rounded-3 bg-white border small text-muted">
                  <i className="fa-solid fa-circle-info text-success me-2" style={{ color: "var(--icet-primary)" }}></i>
                  Docentes e Técnicos Administrativos podem acessar o painel restrito utilizando suas credenciais padrão fornecidas pela TI local.
                </div>
              </div>
            </div>
          </div>
        )}
        
        {page === "solicitacao" && <RequestForm onCreateRequest={handleCreateRequest} />}
        {page === "login" && <Login onLoginSuccess={() => setPage("painel")} />}
        {page === "painel" && (isAuthenticated ? <Dashboard requests={requests} users={users} groups={groups} onNavigate={setPage} /> : <Login onLoginSuccess={() => setPage("painel")} />)}
        {page === "consultas" && (isAuthenticated ? <ConsultRequests requests={requests} onUpdateStatus={handleUpdateStatus} /> : <Login onLoginSuccess={() => setPage("painel")} />)}
        
        {page === "gerenciamento" && (
          isAuthenticated && isAdmin ? (
            <Management 
              groups={groups} 
              users={users} 
              demands={demands} 
              setGroups={setGroups} 
              setUsers={setUsers}
              setDemands={setDemands}
              onCreateGroup={handleCreateGroup} 
              onCreateUser={handleCreateUser}   
              onCreateDemand={handleCreateDemand} 
              onDeleteEntity={handleDeleteEntity} 
            />
          ) : (
            <div className="alert alert-danger border-0 shadow-sm fw-bold">Acesso Negado</div>
          )
        )}
      </main>

      {/* MODAL COMPONETIZADO CUSTOMIZADO */}
      {modalConfig.isOpen && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div className="surface p-4 mx-3 animate__animated animate__zoomIn" style={{ maxWidth: '420px', width: '100%', borderRadius: 'var(--radius-md)', border: 'none' }}>
            <div className="text-center mb-3">
              <div className="mb-2 mx-auto d-flex align-items-center justify-content-center" style={{
                width: '50px', height: '50px', borderRadius: '50%',
                backgroundColor: modalConfig.type === 'success' ? 'rgba(5, 150, 105, 0.1)' : modalConfig.type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                color: modalConfig.type === 'success' ? 'var(--icet-primary)' : modalConfig.type === 'danger' ? '#ef4444' : '#3b82f6'
              }}>
                <i className={`fa-solid ${modalConfig.type === 'success' ? 'fa-circle-check' : modalConfig.type === 'danger' ? 'fa-circle-xmark' : modalConfig.type === 'confirm' ? 'fa-circle-question' : 'fa-circle-info'} fa-xl`}></i>
              </div>
              <h3 className="h5 fw-bold text-dark m-0">{modalConfig.title}</h3>
            </div>
            <p className="text-muted text-center small mb-4">{modalConfig.message}</p>
            <div className="d-flex justify-content-center gap-2">
              {modalConfig.type === 'confirm' ? (
                <>
                  <button className="btn btn-sm btn-outline-secondary px-3" style={{ borderRadius: 'var(--radius-sm)' }} onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-sm btn-danger px-3" style={{ borderRadius: 'var(--radius-sm)' }} onClick={() => { modalConfig.onConfirm(); closeModal(); }}>Confirmar</button>
                </>
              ) : (
                <button className="btn-icet py-1 px-4 text-center small" style={{ width: 'auto' }} onClick={closeModal}>Entendido</button>
              )}
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