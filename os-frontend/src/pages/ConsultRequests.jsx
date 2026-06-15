import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function ConsultRequests({ requests = [], onUpdateStatus }) {
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [dateFilter, setDateFilter] = useState('Todos');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [showReport, setShowReport] = useState(false); // Controle do modal do relatório analítico

  // Extração única de categorias com fallback de segurança para evitar loops
  const uniqueCategories = useMemo(() => {
    const categories = (requests || []).map(r => r?.categoria || 'Geral');
    return ['Todas', ...new Set(categories)];
  }, [requests]);

  // Motor de Busca Multifiltro Avançado (Inclusão do Filtro de Data)
  const filteredRequests = useMemo(() => {
    const safeRequests = Array.isArray(requests) ? requests : [];
    const agora = new Date();
    
    return safeRequests.filter(req => {
      const term = (searchTerm || '').toLowerCase();
      const nome = (req?.nome || '').toLowerCase();
      const id = (req?.id || req?.id_solicitacao || req?.id_request || '').toString();
      const descricao = (req?.descricao || '').toLowerCase();
      const sala = (req?.sala || '').toLowerCase();

      const matchesSearch = 
        nome.includes(term) ||
        id.includes(term) ||
        descricao.includes(term) ||
        sala.includes(term);

      const matchesStatus = statusFilter === 'Todos' || req?.status === statusFilter;
      const matchesCategory = categoryFilter === 'Todas' || req?.categoria === categoryFilter;

      let matchesDate = true;
      if (req?.criado_em) {
        const dataCriacao = new Date(req.criado_em);
        const diferencaTempo = agora.getTime() - dataCriacao.getTime();
        const diferencaDias = diferencaTempo / (1000 * 60 * 60 * 24);

        if (dateFilter === '24h') matchesDate = diferencaDias <= 1;
        else if (dateFilter === '7d') matchesDate = diferencaDias <= 7;
        else if (dateFilter === '30d') matchesDate = diferencaDias <= 30;
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    });
  }, [requests, searchTerm, statusFilter, categoryFilter, dateFilter]);

  // 📈 INTELIGÊNCIA DE PRO_DUTO: Cálculo dinâmico das métricas com base na fila atual
  const analytics = useMemo(() => {
    const total = filteredRequests.length;
    const pendentes = filteredRequests.filter(r => r.status !== 'Resolvido').length;
    const resolvidos = filteredRequests.filter(r => r.status === 'Resolvido').length;
    const taxaEficiencia = total > 0 ? Math.round((resolvidos / total) * 100) : 0;

    return { total, pendentes, resolvidos, taxaEficiencia };
  }, [filteredRequests]);

  const handleStatusChange = async (requestId, newStatus) => {
    const safeId = requestId || selectedRequest?.id || selectedRequest?.id_solicitacao || selectedRequest?.id_request;
    
    if (!safeId || safeId === 'undefined') {
      console.error("Erro de Mapeamento: ID não localizado no escopo do objeto.", selectedRequest);
      return false;
    }

    setUpdatingId(safeId);
    const success = await onUpdateStatus(safeId, newStatus);
    if (success) {
      setSelectedRequest(prev => {
        if (!prev) return null;
        
        const interacoesAtuais = Array.isArray(prev.interactions) ? prev.interactions : [];
        const novaInteracao = {
          id: Date.now(),
          status_anterior: prev.status,
          status_novo: newStatus,
          detalhes: `Status alterado operacionalmente para ${newStatus}.`,
          criado_em: new Date().toISOString()
        };

        return {
          ...prev,
          status: newStatus,
          interactions: [novaInteracao, ...interacoesAtuais]
        };
      });
    }
    setUpdatingId(null);
  };

  const getRequestId = (req) => req?.id || req?.id_solicitacao || req?.id_request;

  const formatarData = (isoString) => {
    try {
      if (!isoString) return '';
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' - ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="row g-4 animate__animated animate__fadeIn">
      <style>{`
        .timeline-wrapper { position: relative; padding-left: 1.5rem; border-left: 2px solid #e2e8f0; }
        .timeline-item { position: relative; padding-bottom: 1.25rem; }
        .timeline-item:last-child { padding-bottom: 0; }
        .timeline-badge { position: absolute; left: calc(-1.5rem - 6px); top: 4px; width: 10px; height: 10px; border-radius: 50%; background: var(--icet-muted); border: 2px solid #ffffff; }
        .timeline-badge.success { background: var(--icet-primary); }
        .timeline-badge.warning { background: #f59e0b; }
        .metric-mini-box { border-right: 1px solid #e2e8f0; }
        .metric-mini-box:last-child { border-right: none; }
      `}</style>

      {/* Coluna Principal: Barra de Filtros, Métricas e Tabela */}
      <div className={selectedRequest ? "col-lg-8" : "col-12"}>
        
        {/* 📊 SEÇÃO DO RELATÓRIO: Widget de Indicadores Rápidos Incorporado */}
        <div className="surface border-0 shadow-sm mb-3 py-3 px-4">
          <div className="row align-items-center text-center text-sm-start">
            <div className="col-sm-3 metric-mini-box mb-3 mb-sm-0">
              <span className="text-muted font-monospace d-block" style={{ fontSize: '11px' }}>FILTRADOS</span>
              <span className="h4 fw-bold text-dark font-monospace">{analytics.total}</span>
            </div>
            <div className="col-sm-3 metric-mini-box mb-3 mb-sm-0">
              <span className="text-muted font-monospace d-block" style={{ fontSize: '11px' }}>EM ABERTO</span>
              <span className="h4 fw-bold text-warning font-monospace">{analytics.pendentes}</span>
            </div>
            <div className="col-sm-3 metric-mini-box mb-3 mb-sm-0">
              <span className="text-muted font-monospace d-block" style={{ fontSize: '11px' }}>RESOLVIDOS</span>
              <span className="h4 fw-bold text-success font-monospace">{analytics.resolvidos}</span>
            </div>
            <div className="col-sm-3 text-sm-end">
              <button 
                className="btn btn-sm btn-outline-success font-monospace fw-bold px-3 w-100 w-sm-auto"
                style={{ borderRadius: 'var(--radius-sm)', borderColor: 'rgba(16, 185, 129, 0.3)', color: 'var(--icet-primary)' }}
                onClick={() => setShowReport(true)}
                type="button"
              >
                <i className="fa-solid fa-chart-pie me-1"></i> Resumo Geral
              </button>
            </div>
          </div>
        </div>

        <div className="surface border-0 shadow-sm mb-4">
          <div className="row g-2">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0 text-muted">
                  <i className="fa-solid fa-magnifying-glass small"></i>
                </span>
                <input 
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Buscar ID, solicitante, sala..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-2">
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="Todos">Todos Status</option>
                <option value="Aberto">Abertos</option>
                <option value="Em Atendimento">Em Curso</option>
                <option value="Resolvido">Resolvidos</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat === 'Todas' ? 'Todas Categorias' : cat}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option value="Todos">Todo o histórico</option>
                <option value="24h">Últimas 24 horas</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela Customizada Tech UI */}
        <div className="surface border-0 shadow-sm p-0 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted small uppercase" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                <tr>
                  <th className="ps-4" style={{ width: '80px' }}>ID</th>
                  <th>Solicitante</th>
                  <th>Categoria / Local</th>
                  <th>Status</th>
                  <th className="pe-4 text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted small">
                      <i className="fa-solid fa-folder-open d-block mb-2 fa-2xl opacity-50"></i>
                      Nenhuma ordem de serviço localizada com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const currentId = getRequestId(req);
                    return (
                      <tr 
                        key={currentId || Math.random()} 
                        onClick={() => setSelectedRequest(req)}
                        className={getRequestId(selectedRequest) === currentId ? "table-active" : ""}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="ps-4 font-monospace fw-bold text-muted">#{currentId}</td>
                        <td>
                          <span className="d-block fw-bold text-dark small">{req?.nome || 'Não Informado'}</span>
                          <small className="text-muted font-monospace" style={{ fontSize: '10px' }}>SIAPE: {req?.siape || 'N/A'}</small>
                        </td>
                        <td>
                          <span className="d-block small fw-semibold text-dark">{req?.categoria || 'Geral'}</span>
                          <small className="text-muted">{req?.bloco || 'Bloco NI'} — {req?.sala || 'Sala NI'}</small>
                        </td>
                        <td>
                          <span className={`badge-status ${
                            req?.status === 'Aberto' ? 'badge-aberto' : 
                            req?.status === 'Em Atendimento' ? 'badge-atendimento' : 'badge-resolvido'
                          }`}>
                            {req?.status || 'Aberto'}
                          </span>
                        </td>
                        <td className="pe-4 text-end" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="btn btn-sm btn-link text-success fw-bold p-0 text-decoration-none"
                            onClick={() => setSelectedRequest(req)}
                            type="button"
                          >
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Gaveta Lateral Interativa de Detalhes Polida */}
      {selectedRequest && (
        <div className="col-lg-4 animate__animated animate__fadeInRight">
          <div className="surface border-0 shadow-lg position-sticky" style={{ top: '90px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-start mb-4 pb-3 border-bottom">
              <div>
                <span className="text-muted small font-monospace fw-bold">ORDEM DE SERVIÇO</span>
                <h4 className="fw-bold m-0" style={{ color: 'var(--icet-dark)' }}>#{getRequestId(selectedRequest)}</h4>
              </div>
              <button className="btn-close shadow-none" onClick={() => setSelectedRequest(null)} aria-label="Fechar detalhes"></button>
            </div>

            <div className="mb-4">
              <label className="text-muted small d-block mb-1 font-monospace">Descrição do Problema</label>
              <div className="p-3 bg-light rounded-3 small text-dark font-sans-serif" style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                {selectedRequest.descricao || "Nenhuma descrição detalhada informada."}
              </div>
            </div>

            <div className="row g-3 mb-4 small">
              <div className="col-6">
                <span className="text-muted d-block font-monospace">Contato</span>
                <span className="fw-semibold text-dark text-break">{selectedRequest.email || 'N/A'}</span>
              </div>
              <div className="col-6">
                <span className="text-muted d-block font-monospace">Vínculo</span>
                <span className="fw-semibold text-dark">{selectedRequest.perfil || 'Outro'}</span>
              </div>
            </div>

            <div className="mb-4 pt-3 border-top">
              <label className="text-uppercase font-monospace text-muted small fw-bold d-block mb-3">Histórico de Alterações</label>
              <div className="timeline-wrapper">
                {Array.isArray(selectedRequest.interactions) && selectedRequest.interactions.length > 0 ? (
                  selectedRequest.interactions.map((interaction, index) => (
                    <div className="timeline-item" key={interaction.id || index}>
                      <span className={`timeline-badge ${
                        interaction.status_novo === 'Resolvido' ? 'success' : 
                        interaction.status_novo === 'Em Atendimento' ? 'warning' : ''
                      }`}></span>
                      <small className="text-muted d-block font-monospace" style={{ fontSize: '10px' }}>
                        {formatarData(interaction.criado_em)}
                      </small>
                      <span className="d-block small text-dark fw-semibold mt-1">
                        {interaction.status_anterior ? `${interaction.status_anterior} ➔ ` : ''}{interaction.status_novo}
                      </span>
                      <p className="text-muted m-0 mt-1" style={{ fontSize: '11px', lineHeight: '1.3' }}>
                        {interaction.detalhes}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="timeline-item">
                    <span className="timeline-badge"></span>
                    <small className="text-muted d-block font-monospace" style={{ fontSize: '10px' }}>
                      {formatarData(selectedRequest.criado_em || new Date().toISOString())}
                    </small>
                    <span className="d-block small text-dark fw-semibold mt-1">Chamado Registrado</span>
                    <p className="text-muted m-0 mt-1" style={{ fontSize: '11px' }}>
                      Aguardando triagem técnica inicial.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="pt-3 border-top">
                <label className="form-label small fw-bold mb-2 text-uppercase font-monospace text-muted">Despachar Status</label>
                <div className="d-grid gap-2">
                  {selectedRequest.status === 'Aberto' && (
                    <button 
                      className="btn btn-warning text-dark fw-bold btn-sm py-2" 
                      style={{ borderRadius: 'var(--radius-sm)' }}
                      disabled={updatingId !== null}
                      onClick={() => handleStatusChange(getRequestId(selectedRequest), 'Em Atendimento')}
                    >
                      {updatingId ? "Processando..." : "Assumir e Iniciar Atendimento"}
                    </button>
                  )}
                  {selectedRequest.status !== 'Resolvido' && (
                    <button 
                      className="btn btn-success fw-bold btn-sm py-2" 
                      style={{ borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--icet-primary)' }}
                      disabled={updatingId !== null}
                      onClick={() => handleStatusChange(getRequestId(selectedRequest), 'Resolvido')}
                    >
                      {updatingId ? "Processando..." : "Marcar como Resolvido / Concluído"}
                    </button>
                  )}
                  {selectedRequest.status === 'Resolvido' && (
                    <div className="alert alert-success border-0 small text-center py-2 m-0">
                      <i className="fa-solid fa-circle-check me-2"></i> Chamado finalizado e arquivado.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🚀 MODAL DINÂMICO: Relatório de SLA e Eficiência Técnica */}
      {showReport && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div className="surface p-4 mx-3 animate__animated animate__zoomIn" style={{ maxWidth: '460px', width: '100%', borderRadius: 'var(--radius-md)', border: 'none' }}>
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <h3 className="h6 fw-bold m-0 font-monospace text-uppercase text-muted"><i className="fa-solid fa-chart-line text-success me-2"></i>Indicadores Técnicos</h3>
              <button className="btn-close shadow-none" onClick={() => setShowReport(false)}></button>
            </div>
            
            <div className="mb-4 text-center py-3 rounded-3" style={{ backgroundColor: 'rgba(5, 150, 105, 0.04)' }}>
              <span className="text-muted small d-block font-monospace">EFICIÊNCIA DE RESOLUÇÃO</span>
              <span className="display-6 fw-extrabold text-success font-monospace" style={{ fontWeight: '800' }}>{analytics.taxaEficiencia}%</span>
              <small className="text-muted d-block mt-1">Média ponderada do escopo atual</small>
            </div>

            <div className="row g-2 mb-4 text-center small font-monospace">
              <div className="col-6 p-2 border-end">
                <span className="text-muted d-block">CHAMADOS ATIVOS</span>
                <strong className="text-dark fs-5">{analytics.total}</strong>
              </div>
              <div className="col-6 p-2">
                <span className="text-muted d-block">CONCLUÍDOS</span>
                <strong className="text-success fs-5">{analytics.resolvidos}</strong>
              </div>
            </div>

            <div className="d-grid">
              <button className="btn-icet py-2" onClick={() => setShowReport(false)}>Fechar Relatório</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}