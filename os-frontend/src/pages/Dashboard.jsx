import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * @component StatCard
 * @description Exibe métricas consolidadas com layout horizontal compacto, otimizando o espaço útil (anti-dead space).
 */
function StatCard({ label, value, color = "#10b981", icon }) {
  return (
    <div className="card border-0 shadow-sm px-3 py-2.5 bg-white rounded-3 h-100 d-flex flex-row align-items-center justify-content-between" style={{ minHeight: '75px' }}>
      <div className="text-truncate">
        <span className="text-uppercase text-muted font-monospace fw-bold d-block mb-1" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>{label}</span>
        <h3 className="h4 fw-extrabold m-0 font-monospace text-dark" style={{ fontWeight: '800', letterSpacing: '-0.5px' }}>{value}</h3>
      </div>
      <div className="p-2 rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 ms-2" style={{ backgroundColor: `${color}12`, color: color, width: '38px', height: '34px' }}>
        <i className={`${icon} fs-6`}></i>
      </div>
    </div>
  );
}

/**
 * @component UserTable
 * @description Tabela corporativa compacta de alta densidade de dados para homologação e auditoria (Data Table).
 */
function UserTable({ 
  items, 
  onAction, 
  actionIcon, 
  actionTitle, 
  actionClass, 
  emptyMessage, 
  onReject, 
  showReject = false,
  isPendingList = false,
  processingId = null
}) {
  const abrirVisualizadorDocumento = (item) => {
    const documentoRaw = item.comprovante_base64;
    if (!documentoRaw) {
      alert("Aviso de Auditoria: Este servidor não anexou nenhum comprovante funcional no cadastro.");
      return;
    }
    try {
      const novaAba = window.open();
      if (novaAba) {
        novaAba.document.write(
          `<iframe src="${documentoRaw}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
        novaAba.document.title = `Auditoria de Credencial — SIAPE ${item.siape || 'N/I'}`;
      } else {
        alert("Bloqueador de Pop-ups ativo! Permita aberturas de novas abas para analisar o documento.");
      }
    } catch (err) {
      alert("Falha ao renderizar buffer do documento de comprovação.");
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="text-center d-flex flex-column align-items-center justify-content-center py-4 text-muted font-monospace bg-white border rounded-3 shadow-sm" style={{ fontSize: '12px', borderStyle: 'dashed', minHeight: '120px' }}>
        <i className="fa-solid fa-user-shield mb-2 opacity-40 fa-lg text-secondary"></i>
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="table-responsive bg-white border rounded-3 shadow-sm">
      <table className="table table-hover align-middle mb-0 text-start" style={{ fontSize: '12px' }}>
        <thead className="table-light text-secondary text-uppercase font-monospace" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
          <tr>
            <th className="py-2.5 ps-3" style={{ width: '30%' }}>Nome Completo / E-mail</th>
            <th className="py-2.5" style={{ width: '15%' }}>Identificador</th>
            <th className="py-2.5" style={{ width: '20%' }}>Nível de Acesso</th>
            <th className="py-2.5" style={{ width: '15%' }}>Estado</th>
            <th className="py-2.5 text-end pe-3" style={{ width: '20%' }}>Controles</th>
          </tr>
        </thead>
        <tbody className="text-dark">
          {items.map((item, index) => {
            const isItemProcessing = processingId === item.id;
            // Adaptação RBAC: Exibe 'Administrador' ou 'Servidor' com base na role real.
            const renderRoleBadge = (role) => {
              if (role === 'admin') return <span className="badge bg-dark border font-monospace text-uppercase" style={{ fontSize: '9px', padding: '3px 6px' }}>Administrador</span>;
              return <span className="badge bg-light text-secondary border font-monospace text-uppercase" style={{ fontSize: '9px', padding: '3px 6px' }}>Servidor</span>;
            };

            return (
              <tr key={item.id ? `u-row-${item.id}` : `idx-row-${index}`}>
                <td className="py-2 ps-3 text-truncate" style={{ maxWidth: '220px' }}>
                  <span className="fw-semibold d-block text-dark">{item.nome_completo}</span>
                  <span className="text-muted font-monospace" style={{ fontSize: '10px' }}>{item.email}</span>
                </td>
                <td className="py-2 font-monospace">
                  <span className="text-secondary">SIAPE:</span> <strong className="text-dark">{item.siape || 'N/I'}</strong>
                </td>
                <td className="py-2">
                  {renderRoleBadge(item.role)}
                </td>
                <td className="py-2">
                  <span className={`badge font-monospace border-0 px-2 py-1 ${isPendingList ? 'bg-warning bg-opacity-10 text-warning' : (item.is_active ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger')}`} style={{ fontSize: '9px', fontWeight: '700' }}>
                    {isPendingList ? "AGUARDANDO" : (item.is_active ? "ATIVO" : "BLOQUEADO")}
                  </span>
                </td>
                <td className="py-2 text-end pe-3">
                  <div className="d-flex gap-1 justify-content-end align-items-center">
                    {isPendingList && (
                      <button
                        className="btn btn-sm btn-light border p-0 d-flex align-items-center justify-content-center text-secondary shadow-none"
                        type="button"
                        title="Analisar Anexo Funcional"
                        onClick={() => abrirVisualizadorDocumento(item)}
                        style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                      >
                        <i className="fa-solid fa-paperclip style-table-icon"></i>
                      </button>
                    )}

                    {showReject && onReject && (
                      <button 
                        className="btn btn-sm btn-outline-danger p-0 d-flex align-items-center justify-content-center shadow-none"
                        type="button"
                        title="Recusar Solicitação"
                        disabled={processingId !== null}
                        onClick={() => onReject(item)}
                        style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                      >
                        <i className="fa-solid fa-user-xmark style-table-icon"></i>
                      </button>
                    )}
                    
                    <button 
                      className={`btn btn-sm ${isPendingList ? 'btn-success text-white' : (item.is_active ? 'btn-outline-danger' : 'btn-success text-white')} p-0 d-flex align-items-center justify-content-center shadow-none`}
                      type="button"
                      title={actionTitle}
                      disabled={processingId !== null}
                      onClick={() => onAction(item)}
                      style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                    >
                      {isItemProcessing ? (
                        <span className="spinner-border spinner-border-sm" style={{ width: '10px', height: '10px' }}></span>
                      ) : (
                        <i className={`fa-solid ${isPendingList ? actionIcon : (item.is_active ? 'fa-user-lock' : 'fa-user-check')} style-table-icon`}></i>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * @component Dashboard
 * @description Painel Gerencial Unificado de Governança Técnica (GTI - ICET) com Abas de Controle de Infraestrutura Dinâmica.
 */
export function Dashboard({ requests = [], onNavigate }) {
  const { user, request } = useAuth();
  const [feedback, setFeedback] = useState({ message: '', type: '' }); 
  
  // Controle de Abas Administrativas (Adicionado: 'logs')
  const [activeTab, setActiveTab] = useState('membros'); 

  const [localPendentes, setLocalPendentes] = useState([]);
  const [localAtivos, setLocalAtivos] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  // Estados locais para governança dinâmica de infraestrutura predial e catálogo
  const [listaBlocos, setListaBlocos] = useState([]);
  const [listaCategorias, setListaCategorias] = useState([]);
  const [listaLogs, setListaLogs] = useState([]); // Array simulado para captar a trilha futura
  
  // States para os formulários de inserção rápida (RBAC simplificado para Admin/Servidor)
  const [novoBloco, setNovoBloco] = useState({ campus: 'CAMPUS_1', nome: '' });
  const [novaCategoria, setNovaCategoria] = useState({ nome: '', sla_horas_estimadas: 48 });
  const [diretoUser, setDiretoUser] = useState({ nome_completo: '', email: '', siape: '', cargo: 'Servidor Standard', password: '', role: 'servidor' });

  // 🚀 ESTADOS DE CONTROLE DE EDIÇÃO INLINE
  const [blocoEditando, setBlocoEditando] = useState({ id: null, campus: '', nome: '' });
  const [categoriaEditando, setCategoriaEditando] = useState({ id: null, nome: '', sla_horas_estimadas: 48 });

  const carregarDadosPainel = async () => {
    try {
      const res = await request('/api/admin/bootstrap');
      if (res) {
        setLocalPendentes(res.usuarios_pendentes || []);
        setLocalAtivos(res.users || []);
        setListaBlocos(res.blocos_infraestrutura || []);
        setListaCategorias(res.categorias_catalogo || []);
        setListaLogs(res.logs_auditoria || []); // Será popularizado pelo backend futuramente
      }
    } catch (err) {
      console.error("Falha ao sincronizar barramento administrativo:", err);
    }
  };

  useEffect(() => {
    carregarDadosPainel();
  }, [activeTab]);

  const isAdmin = user?.role === "admin";

  const stats = useMemo(() => {
    const pendentes = Array.isArray(localPendentes) ? localPendentes : [];
    const ativos = Array.isArray(localAtivos) ? localAtivos : [];
    const listaRequests = Array.isArray(requests) ? requests : [];

    return {
      total: listaRequests.length,
      abertos: listaRequests.filter(r => {
        const st = String(r.status || '').toUpperCase();
        return st === "PENDENTE" || st === "ABERTO" || st === "ABERTA";
      }).length,
      atendimento: listaRequests.filter(r => {
        const st = String(r.status || '').toUpperCase();
        return st === "EM_ATENDIMENTO" || st === "EM CURSO" || st === "ATENDIMENTO";
      }).length,
      resolvidos: listaRequests.filter(r => String(r.status || '').toUpperCase() === "RESOLVIDO").length,
      solicitacoesPendentes: pendentes,
      usuariosAtivos: ativos
    };
  }, [requests, localAtivos, localPendentes]);

  // ==========================================================================
  // CONTROLE OPERACIONAL DE MEMBROS E SERVIDORES
  // ==========================================================================

  const handleAprovarServidor = async (servidor) => {
    const confirmar = window.confirm(`Deseja realmente homologar e ativar o cadastro do servidor ${servidor.nome_completo}?`);
    if (!confirmar) return;

    setFeedback({ message: '', type: '' });
    setProcessingId(servidor.id);
    try {
      const res = await request(`/api/admin/users/${servidor.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ is_approve: true })
      });
      if (res && res.success) {
        setFeedback({ message: `Servidor ${servidor.nome_completo} homologado com sucesso!`, type: 'success' });
        carregarDadosPainel();
      }
    } catch (err) {
      setFeedback({ message: "Erro ao processar a aprovação cadastral.", type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejeitarServidor = async (servidor) => {
    const justificativa = window.prompt(`Atenção: Insira o motivo institucional para a recusa do crachá de ${servidor.nome_completo}:`);
    if (justificativa === null) return;
    if (justificativa.trim().length < 10) {
      alert("A justificativa de recusa deve conter no mínimo 10 caracteres.");
      return;
    }

    setFeedback({ message: '', type: '' });
    setProcessingId(servidor.id);
    try {
      const res = await request(`/api/admin/users/${servidor.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ is_approve: false, justificativa: justificativa.trim() })
      });
      if (res && res.success) {
        setFeedback({ message: "Solicitação de crachá indeferida com sucesso.", type: 'success' });
        carregarDadosPainel();
      }
    } catch (err) {
      setFeedback({ message: "Falha ao rejeitar cadastro.", type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleBloqueioServidor = async (servidor) => {
    const endpoint = servidor.is_active ? 'block' : 'unblock';
    const msgConfirmacao = servidor.is_active 
      ? `Deseja BLOQUEAR temporariamente o acesso do servidor ${servidor.nome_completo}?`
      : `Deseja REATIVAR o acesso do servidor ${servidor.nome_completo}?`;

    if (!window.confirm(msgConfirmacao)) return;

    setFeedback({ message: '', type: '' });
    setProcessingId(servidor.id);
    try {
      const res = await request(`/api/admin/users/${servidor.id}/${endpoint}`, { method: "POST" });
      if (res && res.success) {
        setFeedback({ message: `Estado de acesso de ${servidor.nome_completo} modificado com sucesso.`, type: 'success' });
        carregarDadosPainel();
      }
    } catch (err) {
      setFeedback({ message: "Falha transacional ao alterar estado da conta.", type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  // ==========================================================================
  // CONTROLE OPERACIONAL DE INFRAESTRUTURA DINÂMICA
  // ==========================================================================

  const handleAdicionarBloco = async (e) => {
    e.preventDefault();
    if (!novoBloco.nome.trim()) return;
    try {
      const res = await request('/api/requests/blocos', {
        method: 'POST',
        body: JSON.stringify({ campus: novoBloco.campus, nome: novoBloco.nome.trim() })
      });
      if (res && res.id) {
        setNovoBloco({ campus: 'CAMPUS_1', nome: '' });
        setFeedback({ message: `Bloco "${res.nome}" instanciado com sucesso!`, type: 'success' });
        carregarDadosPainel(); // Forced Fetch
      }
    } catch {
      setFeedback({ message: "Erro de persistência ao cadastrar pavilhão.", type: 'error' });
    }
  };

  const handleSalvarEdicaoBloco = async (id) => {
    if (!blocoEditando.nome.trim()) return;
    try {
      const res = await request(`/api/requests/blocos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ campus: blocoEditando.campus, nome: blocoEditando.nome.trim() })
      });
      if (res) {
        setBlocoEditando({ id: null, campus: '', nome: '' });
        setFeedback({ message: "Nome do pavilhão alterado com sucesso no Postgres!", type: 'success' });
        carregarDadosPainel(); // Forced Fetch
      }
    } catch {
      setFeedback({ message: "Erro de barramento ao atualizar dados do bloco.", type: 'error' });
    }
  };

  const handleDeletarBloco = async (id, nome) => {
    if (!window.confirm(`Deseja remover o ${nome} do mapeamento físico da UFAM?`)) return;
    try {
      const res = await request(`/api/requests/blocos/${id}`, { method: 'DELETE' });
      if (res) {
        setFeedback({ message: "Bloco removido com sucesso de todas as malhas.", type: 'success' });
        carregarDadosPainel(); // Forced Fetch
      }
    } catch {
      setFeedback({ message: "Erro ao excluir pavilhão da malha ativa.", type: 'error' });
    }
  };

  const handleAdicionarCategoria = async (e) => {
    e.preventDefault();
    if (!novaCategoria.nome.trim()) return;
    try {
      const res = await request('/api/requests/categorias', {
        method: 'POST',
        body: JSON.stringify({ nome: novaCategoria.nome.trim().toUpperCase(), sla_horas_estimadas: Number(novaCategoria.sla_horas_estimadas) })
      });
      if (res && res.id) {
        setNovaCategoria({ nome: '', sla_horas_estimadas: 48 });
        setFeedback({ message: `Macro-categoria "${res.nome}" injetada com sucesso!`, type: 'success' });
        carregarDadosPainel(); // Forced Fetch
      }
    } catch {
      setFeedback({ message: "Erro contratual ao salvar categoria de TI.", type: 'error' });
    }
  };

  const handleSalvarEdicaoCategoria = async (id) => {
    if (!categoriaEditando.nome.trim()) return;
    try {
      const res = await request(`/api/requests/categorias/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: categoriaEditando.nome.trim().toUpperCase(), sla_horas_estimadas: Number(categoriaEditando.sla_horas_estimadas) })
      });
      if (res) {
        setCategoriaEditando({ id: null, nome: '', sla_horas_estimadas: 48 });
        setFeedback({ message: "Macro-categoria atualizada com sucesso no catálogo!", type: 'success' });
        carregarDadosPainel(); // Forced Fetch
      }
    } catch {
      setFeedback({ message: "Erro ao atualizar dados da categoria técnica.", type: 'error' });
    }
  };

  const handleDeletarCategoria = async (id, nome) => {
    if (!window.confirm(`Deseja remover a categoria "${nome}" do catálogo de serviços técnicos?`)) return;
    try {
      const res = await request(`/api/requests/categorias/${id}`, { method: 'DELETE' });
      if (res) {
        setFeedback({ message: "Macro-categoria excluída com sucesso.", type: 'success' });
        carregarDadosPainel(); // Forced Fetch
      }
    } catch {
      setFeedback({ message: "Erro ao excluir especificação técnica do catálogo.", type: 'error' });
    }
  };

  const handleInjecaoDiretaUsuario = async (e) => {
    e.preventDefault();
    if (!/^\d{5,12}$/.test(diretoUser.siape.trim())) {
      alert("Erro de Validação: O SIAPE deve conter de 5 a 12 dígitos estritamente numéricos.");
      return;
    }
    try {
      const res = await request('/api/admin/users/create-direct', {
        method: 'POST',
        body: JSON.stringify(diretoUser)
      });
      if (res && res.success) {
        setFeedback({ message: res.detail, type: 'success' });
        setDiretoUser({ nome_completo: '', email: '', siape: '', cargo: 'Servidor Standard', password: '', role: 'servidor' });
        carregarDadosPainel();
      }
    } catch (err) {
      setFeedback({ message: "Falha na injeção direta de conta.", type: 'error' });
    }
  };

  return (
    <div className="w-100 p-0 container-fluid animate__animated animate__fadeIn">
      
      {feedback.message && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'} py-2 px-3 small border-0 d-flex align-items-center gap-2 mb-4 shadow-sm animate__animated animate__fadeIn`}>
          <i className={`fa-solid ${feedback.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'} fa-lg`}></i>
          <span className="fw-bold" style={{ fontSize: '12px' }}>{feedback.message}</span>
        </div>
      )}

      {/* 📊 CAPA DE AUDITORIA E IDENTIFICADOR DO OPERADOR */}
      <div className="d-flex justify-content-between align-items-center border-bottom mb-4 pb-3 flex-wrap gap-2">
        <h4 className="h5 fw-extrabold m-0 text-dark" style={{ fontWeight: '800', letterSpacing: '-0.3px' }}>
          <i className="fa-solid fa-shield-halved text-success me-2"></i>Central de Governança Institucional
        </h4>
        <div className="small font-monospace text-secondary bg-white border border-light-subtle px-3 py-1.5 rounded-3 shadow-sm d-flex align-items-center gap-2">
          <span>Operador:</span>
          <strong className="text-dark">{user?.nome_completo || "Super User"}</strong>
          {user?.role && (
            <span className={`badge ${isAdmin ? 'bg-dark' : 'bg-secondary'} font-monospace text-uppercase`} style={{ fontSize: '10px' }}>
              {isAdmin ? "Administrador" : "Servidor"}
            </span>
          )}
        </div>
      </div>

      {/* 📈 COMPONENTES DE METRICAS CONSOLIDADAS */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard label="Total Volumétrico" value={stats.total} color="#64748b" icon="fa-solid fa-folder-open" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="Chamados em Triagem" value={stats.abertos} color="#ef4444" icon="fa-solid fa-circle-exclamation" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="Atendimentos Ativos" value={stats.atendimento} color="#3b82f6" icon="fa-solid fa-clock-rotate-left" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="Demandas Repactuadas" value={stats.resolvidos} color="#10b981" icon="fa-solid fa-circle-check" />
        </div>
      </div>

      {/* 🚀 BARRA DE NAVEGAÇÃO DE ABAS GERENCIAIS */}
      {isAdmin && (
        <div className="mb-4">
          <ul className="nav nav-tabs border-bottom-2 border-light-subtle font-monospace flex-nowrap overflow-x-auto" style={{ fontSize: '12px' }}>
            <li className="nav-item">
              <button className={`nav-link text-nowrap border-0 py-2.5 px-4 fw-bold ${activeTab === 'membros' ? 'active border-bottom border-success border-3 text-success' : 'text-muted bg-transparent'}`} onClick={() => setActiveTab('membros')}>
                <i className="fa-solid fa-users-gear me-1.5"></i> Gestão de Servidores
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link text-nowrap border-0 py-2.5 px-4 fw-bold ${activeTab === 'blocos' ? 'active border-bottom border-success border-3 text-success' : 'text-muted bg-transparent'}`} onClick={() => setActiveTab('blocos')}>
                <i className="fa-solid fa-building-shield me-1.5"></i> Infraestrutura
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link text-nowrap border-0 py-2.5 px-4 fw-bold ${activeTab === 'categorias' ? 'active border-bottom border-success border-3 text-success' : 'text-muted bg-transparent'}`} onClick={() => setActiveTab('categorias')}>
                <i className="fa-solid fa-rectangle-list me-1.5"></i> Catálogo SLA
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link text-nowrap border-0 py-2.5 px-4 fw-bold ${activeTab === 'direto' ? 'active border-bottom border-success border-3 text-success' : 'text-muted bg-transparent'}`} onClick={() => setActiveTab('direto')}>
                <i className="fa-solid fa-user-plus me-1.5"></i> Injeção Direta
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link text-nowrap border-0 py-2.5 px-4 fw-bold ${activeTab === 'logs' ? 'active border-bottom border-dark border-3 text-dark' : 'text-muted bg-transparent'}`} onClick={() => setActiveTab('logs')}>
                <i className="fa-solid fa-shoe-prints me-1.5"></i> Logs do Sistema
              </button>
            </li>
          </ul>
        </div>
      )}

      {/* 🗃️ PROVEDOR DINÂMICO DE CONTEÚDO DAS ABAS */}
      {isAdmin && (
        <div className="tab-content">
          
          {/* ABA 1: HOMOLOGAÇÃO E CONTROLE DE MEMBROS */}
          {activeTab === 'membros' && (
            <div className="d-flex flex-column gap-4 animate__animated animate__fadeIn">
              <div>
                <div className="d-flex align-items-center gap-2 mb-2.5">
                  <h4 className="h6 fw-bold text-uppercase font-monospace m-0 text-secondary" style={{ letterSpacing: '0.5px', fontSize: '11px' }}>Fila de Homologação Cadastral</h4>
                  <span className="badge bg-warning text-dark font-monospace fw-bold rounded-2 px-2 py-0.5" style={{ fontSize: '10px' }}>{stats.solicitacoesPendentes.length}</span>
                </div>
                <UserTable 
                  items={stats.solicitacoesPendentes} onAction={handleAprovarServidor} onReject={handleRejeitarServidor} showReject={true}
                  actionIcon="fa-user-check" actionTitle="Aprovar e Ativar Servidor" actionClass="btn-success"
                  emptyMessage="Nenhum cadastro aguardando validação de crachá na base da UFAM." isPendingList={true} processingId={processingId}
                />
              </div>

              <div className="border-top pt-4">
                <div className="d-flex align-items-center gap-2 mb-2.5">
                  <h4 className="h6 fw-bold text-uppercase font-monospace m-0 text-secondary" style={{ letterSpacing: '0.5px', fontSize: '11px' }}>Operadores Registrados na Base</h4>
                  <span className="badge bg-success text-white font-monospace fw-bold rounded-2 px-2 py-0.5" style={{ fontSize: '10px', backgroundColor: '#10b981' }}>{stats.usuariosAtivos.length}</span>
                </div>
                <UserTable 
                  items={stats.usuariosAtivos} onAction={handleToggleBloqueioServidor} actionIcon="fa-user-lock" actionTitle="Inverter Estado (Bloquear/Desbloquear)" actionClass="btn-outline-danger"
                  emptyMessage="Nenhum usuário ativo registrado no barramento do ICET." isPendingList={false} processingId={processingId}
                />
              </div>
            </div>
          )}

          {/* ABA 2: GERENCIAMENTO DE BLOCOS PREDIAIS */}
          {activeTab === 'blocos' && (
            <div className="row g-4 animate__animated animate__fadeIn">
              <div className="col-md-4">
                <div className="p-4 bg-white border rounded-3 shadow-sm">
                  <h5 className="h6 fw-bold text-uppercase font-monospace text-secondary mb-3" style={{ fontSize: '11px' }}>Injetar Novo Bloco Físico</h5>
                  <form onSubmit={handleAdicionarBloco} className="d-flex flex-column gap-3">
                    <div>
                      <label className="form-label font-monospace text-muted mb-1" style={{ fontSize: '11px' }}>Unidade/Campus</label>
                      <select className="form-select text-dark" style={{ fontSize: '13px' }} value={novoBloco.campus} onChange={e => setNovoBloco(p => ({ ...p, campus: e.target.value }))}>
                        <option value="CAMPUS_1">Campus 1 (Prédios Antigos)</option>
                        <option value="CAMPUS_2">Campus 2 (Prédio Novo)</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label font-monospace text-muted mb-1" style={{ fontSize: '11px' }}>Identificador do Bloco</label>
                      <input type="text" className="form-control" style={{ fontSize: '13px' }} placeholder="Ex: Bloco A, Prédio Administrativo" value={novoBloco.nome} onChange={e => setNovoBloco(p => ({ ...p, nome: e.target.value }))} required />
                    </div>
                    <button type="submit" className="btn btn-success fw-bold font-monospace text-uppercase py-2 mt-2" style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontSize: '11px' }}>
                      <i className="fa-solid fa-plus me-1"></i> Cadastrar Bloco
                    </button>
                  </form>
                </div>
              </div>
              
              <div className="col-md-8">
                <div className="table-responsive bg-white border rounded-3 shadow-sm">
                  <table className="table table-hover align-middle mb-0 text-start" style={{ fontSize: '12px' }}>
                    <thead className="table-light text-secondary font-monospace" style={{ fontSize: '10px' }}>
                      <tr>
                        <th className="py-2.5 ps-3" style={{ width: '10%' }}>ID</th>
                        <th style={{ width: '25%' }}>Campus Vinculado</th>
                        <th style={{ width: '45%' }}>Nome / Pavilhão</th>
                        <th className="text-end pe-4" style={{ width: '20%' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaBlocos.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-4 text-muted font-monospace small">Nenhum pavilhão físico customizado carregado do banco.</td></tr>
                      ) : (
                        listaBlocos.map(b => (
                          <tr key={`b-row-${b.id}`}>
                            <td className="ps-3 font-monospace text-muted">#{b.id}</td>
                            <td>
                              {blocoEditando.id === b.id ? (
                                <select className="form-select form-select-sm" value={blocoEditando.campus} onChange={e => setBlocoEditando({...blocoEditando, campus: e.target.value})}>
                                  <option value="CAMPUS_1">Campus 1</option>
                                  <option value="CAMPUS_2">Campus 2</option>
                                </select>
                              ) : (
                                <span className="fw-semibold text-dark">{b.campus === 'CAMPUS_1' ? 'Campus 1' : 'Campus 2'}</span>
                              )}
                            </td>
                            <td>
                              {blocoEditando.id === b.id ? (
                                <input type="text" className="form-control form-control-sm font-monospace" value={blocoEditando.nome} onChange={e => setBlocoEditando({...blocoEditando, nome: e.target.value})} required />
                              ) : (
                                <span className="fw-bold text-dark">{b.nome}</span>
                              )}
                            </td>
                            <td className="text-end pe-4">
                              {blocoEditando.id === b.id ? (
                                <div className="d-flex justify-content-end gap-1">
                                  <button className="btn btn-sm btn-success text-white py-0 px-2" title="Salvar Alteração" onClick={() => handleSalvarEdicaoBloco(b.id)}><i className="fa-solid fa-floppy-disk"></i></button>
                                  <button className="btn btn-sm btn-light border py-0 px-2" title="Cancelar" onClick={() => setBlocoEditando({ id: null, campus: '', nome: '' })}><i className="fa-solid fa-xmark"></i></button>
                                </div>
                              ) : (
                                <div className="d-flex justify-content-end gap-1">
                                  <button className="btn btn-sm btn-link text-primary border p-1" title="Editar Nome" onClick={() => setBlocoEditando({ id: b.id, campus: b.campus, nome: b.nome })}><i className="fa-solid fa-pen-to-square"></i></button>
                                  <button className="btn btn-sm btn-link text-danger border p-1" title="Excluir Bloco" onClick={() => handleDeletarBloco(b.id, b.nome)}><i className="fa-solid fa-trash-can"></i></button>
                                </div>
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
          )}

          {/* ABA 3: CATALOGO DE CATEGORIAS TÉCNICAS */}
          {activeTab === 'categorias' && (
            <div className="row g-4 animate__animated animate__fadeIn">
              <div className="col-md-4">
                <div className="p-4 bg-white border rounded-3 shadow-sm">
                  <h5 className="h6 fw-bold text-uppercase font-monospace text-secondary mb-3" style={{ fontSize: '11px' }}>Injetar Nova Categoria de TI</h5>
                  <form onSubmit={handleAdicionarCategoria} className="d-flex flex-column gap-3">
                    <div>
                      <label className="form-label font-monospace text-muted mb-1" style={{ fontSize: '11px' }}>Nome da Macro-Categoria</label>
                      <input type="text" className="form-control" style={{ fontSize: '13px' }} placeholder="Ex: MANUTENÇÃO DE AR-CONDICIONADO" value={novaCategoria.nome} onChange={e => setNovaCategoria(p => ({ ...p, nome: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="form-label font-monospace text-muted mb-1" style={{ fontSize: '11px' }}>Acordo de SLA (Horas úteis estimadas)</label>
                      <input type="number" className="form-control" style={{ fontSize: '13px' }} value={novaCategoria.sla_horas_estimadas} onChange={e => setNovaCategoria(p => ({ ...p, sla_horas_estimadas: e.target.value }))} required min={1} />
                    </div>
                    <button type="submit" className="btn btn-success fw-bold font-monospace text-uppercase py-2 mt-2" style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontSize: '11px' }}>
                      <i className="fa-solid fa-plus me-1"></i> Injetar no Catálogo
                    </button>
                  </form>
                </div>
              </div>

              <div className="col-md-8">
                <div className="table-responsive bg-white border rounded-3 shadow-sm">
                  <table className="table table-hover align-middle mb-0 text-start" style={{ fontSize: '12px' }}>
                    <thead className="table-light text-secondary font-monospace" style={{ fontSize: '10px' }}>
                      <tr>
                        <th className="py-2.5 ps-3" style={{ width: '10%' }}>ID</th>
                        <th style={{ width: '50%' }}>Especificação de Serviço</th>
                        <th style={{ width: '20%' }}>Acordo de SLA</th>
                        <th className="text-end pe-4" style={{ width: '20%' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaCategorias.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-4 text-muted font-monospace small">Nenhuma especificação customizada carregada do banco.</td></tr>
                      ) : (
                        listaCategorias.map(c => (
                          <tr key={`c-row-${c.id}`}>
                            <td className="ps-3 font-monospace text-muted">#{c.id}</td>
                            <td>
                              {categoriaEditando.id === c.id ? (
                                <input type="text" className="form-control form-control-sm font-monospace text-uppercase" value={categoriaEditando.nome} onChange={e => setCategoriaEditando({...categoriaEditando, nome: e.target.value})} required />
                              ) : (
                                <span className="fw-bold text-dark text-uppercase">{c.nome}</span>
                              )}
                            </td>
                            <td>
                              {categoriaEditando.id === c.id ? (
                                <input type="number" className="form-control form-control-sm font-monospace" value={categoriaEditando.sla_horas_estimadas} onChange={e => setCategoriaEditando({...categoriaEditando, sla_horas_estimadas: e.target.value})} required min={1} />
                              ) : (
                                <span className="font-monospace text-secondary fw-semibold">{c.sla_horas_estimadas} horas</span>
                              )}
                            </td>
                            <td className="text-end pe-4">
                              {categoriaEditando.id === c.id ? (
                                <div className="d-flex justify-content-end gap-1">
                                  <button className="btn btn-sm btn-success text-white py-0 px-2" title="Salvar Alteração" onClick={() => handleSalvarEdicaoCategoria(c.id)}><i className="fa-solid fa-floppy-disk"></i></button>
                                  <button className="btn btn-sm btn-light border py-0 px-2" title="Cancelar" onClick={() => setCategoriaEditando({ id: null, nome: '', sla_horas_estimadas: 48 })}><i className="fa-solid fa-xmark"></i></button>
                                </div>
                              ) : (
                                <div className="d-flex justify-content-end gap-1">
                                  <button className="btn btn-sm btn-link text-primary border p-1" title="Editar Macro-Serviço" onClick={() => setCategoriaEditando({ id: c.id, nome: c.nome, sla_horas_estimadas: c.sla_horas_estimadas })}><i className="fa-solid fa-pen-to-square"></i></button>
                                  <button className="btn btn-sm btn-link text-danger border p-1" title="Excluir Categoria" onClick={() => handleDeletarCategoria(c.id, c.nome)}><i className="fa-solid fa-trash-can"></i></button>
                                </div>
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
          )}

          {/* ABA 4: INJEÇÃO DIRETA DE USUÁRIOS ATIVOS (SEM HOMOLOGAÇÃO) */}
          {activeTab === 'direto' && (
            <div className="d-flex justify-content-center animate__animated animate__fadeIn">
              <form onSubmit={handleInjecaoDiretaUsuario} className="p-4 bg-white border rounded-3 shadow-sm text-start small w-100" style={{ maxWidth: '550px' }}>
                <h5 className="h6 fw-bold font-monospace text-uppercase text-success mb-3"><i className="fa-solid fa-user-plus me-2"></i>Injetar Servidor Direto (Conta Ativa)</h5>
                <div className="mb-2">
                  <label className="form-label text-muted mb-0.5">Nome Completo</label>
                  <input type="text" className="form-control form-control-sm" value={diretoUser.nome_completo} onChange={e => setDiretoUser({...diretoUser, nome_completo: e.target.value})} required />
                </div>
                <div className="mb-2">
                  <label className="form-label text-muted mb-0.5">E-mail Institucional (@ufam.edu.br)</label>
                  <input type="email" className="form-control form-control-sm" value={diretoUser.email} onChange={e => setDiretoUser({...diretoUser, email: e.target.value})} required />
                </div>
                <div className="mb-2">
                  <label className="form-label text-muted mb-0.5">Identificador SIAPE (5 a 12 dígitos)</label>
                  <input type="text" className="form-control form-control-sm" value={diretoUser.siape} onChange={e => setDiretoUser({...diretoUser, siape: e.target.value.replace(/\D/g, '')})} required />
                </div>
                <div className="mb-2">
                  <label className="form-label text-muted mb-0.5">Cargo/Função Ocupada</label>
                  <input type="text" className="form-control form-control-sm" value={diretoUser.cargo} onChange={e => setDiretoUser({...diretoUser, cargo: e.target.value})} required />
                </div>
                <div className="mb-2">
                  {/* Simplificação do RBAC: Apenas Servidor ou Admin */}
                  <label className="form-label text-muted mb-0.5">Nível de Acesso no Sistema (RBAC)</label>
                  <select className="form-select form-select-sm fw-bold text-dark" value={diretoUser.role} onChange={e => setDiretoUser({...diretoUser, role: e.target.value})}>
                    <option value="servidor">Nível 1: Servidor Padrão (Sem privilégios)</option>
                    <option value="admin">Nível 2: Administrador (Controle Total)</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted mb-0.5">Senha de Acesso Provisória</label>
                  <input type="password" className="form-control form-control-sm" value={diretoUser.password} onChange={e => setDiretoUser({...diretoUser, password: e.target.value})} required />
                </div>
                <button type="submit" className="btn btn-dark btn-sm w-100 font-monospace text-uppercase fw-bold py-2">Criar Conta Homologada</button>
              </form>
            </div>
          )}

          {/* ABA 5: TRILHA DE AUDITORIA (LOGS DO SISTEMA) */}
          {activeTab === 'logs' && (
             <div className="bg-white border rounded-3 shadow-sm p-4 animate__animated animate__fadeIn" style={{ minHeight: '400px' }}>
                <h5 className="h6 fw-bold text-uppercase font-monospace text-dark mb-4 border-bottom pb-2">
                  <i className="fa-solid fa-list-check me-2 text-secondary"></i>Trilha de Auditoria (Logs Recentes)
                </h5>
                
                {listaLogs.length === 0 ? (
                  <div className="text-center text-muted font-monospace py-5">
                     <i className="fa-solid fa-shoe-prints fa-2x mb-3 opacity-25"></i>
                     <p className="mb-0">Nenhum evento registrado no barramento de auditoria até o momento.</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {listaLogs.map((log, index) => {
                      // Estilização condicional baseada na "acao"
                      const isDanger = log.acao.includes('EXCLUSAO') || log.acao.includes('BLOQUEIO');
                      const isSuccess = log.acao.includes('CRIACAO') || log.acao.includes('ATIVACAO');
                      
                      return (
                        <div key={index} className="d-flex align-items-start gap-3 p-3 bg-light rounded-3 border border-light-subtle">
                          <div className={`p-2 rounded-circle text-white d-flex align-items-center justify-content-center flex-shrink-0 ${isDanger ? 'bg-danger' : (isSuccess ? 'bg-success' : 'bg-primary')}`} style={{ width: '32px', height: '32px' }}>
                            <i className={`fa-solid ${isDanger ? 'fa-trash' : (isSuccess ? 'fa-plus' : 'fa-pen')} small`}></i>
                          </div>
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <strong className="text-dark font-monospace small">{log.autor_nome}</strong>
                              <span className="text-muted" style={{ fontSize: '10px' }}>({log.data_hora})</span>
                            </div>
                            <span className="d-block text-secondary small lh-sm">{log.detalhes}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
             </div>
          )}

        </div>
      )}
    </div>
  );
}