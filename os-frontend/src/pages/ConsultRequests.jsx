import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * @component StatBadge
 * @description Exibe métricas em formato horizontal minimalista (anti-dead space), integrando o título e o valor em uma linha coesa.
 */
function StatBadge({ label, value, color = "#10b981", icon, onClick }) {
  return (
    <div 
      className="card border-0 shadow-sm px-3 py-2.5 bg-white rounded-3 h-100 d-flex flex-row align-items-center justify-content-between" 
      style={{ minHeight: '65px', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s' }}
      onClick={onClick}
    >
      <div className="text-truncate">
        <span className="text-uppercase text-muted font-monospace fw-bold d-block mb-0.5" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>{label}</span>
        <h3 className="h5 fw-extrabold m-0 font-monospace text-dark" style={{ fontWeight: '800' }}>{value}</h3>
      </div>
      <div className="p-2 rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 ms-2" style={{ backgroundColor: `${color}10`, color: color, width: '34px', height: '32px' }}>
        <i className={`${icon} small`}></i>
      </div>
    </div>
  );
}

/**
 * @component ConsultRequests
 * @description Componente de Consulta, Triagem e Emissão de Auditoria de Ordens de Serviço do ICET.
 */
export function ConsultRequests({ requests = [], onUpdateStatus, triggerModalConfirm }) {
  const { user } = useAuth();

  const userCargo = user?.cargo?.toLowerCase() || "";
  const userEmail = user?.email?.toLowerCase() || "";
  const userUsername = user?.username?.toLowerCase() || "";

  const isAdmin = user?.role === "admin" || userUsername === "admin.gti" || userEmail === "gerente@ufam.edu.br";
  const isTecnico = (user?.role === "tecnico" && (userCargo.includes("gti") || userCargo.includes("cpd") || userCargo.includes("subgerente"))) || isAdmin;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [dateFilter, setDateFilter] = useState('2026'); 
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [viewMode, setViewMode] = useState('tabela');
  const [textoParecer, setTextoParecer] = useState('');
  const [ticker, setTicker] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setTicker(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedRequest(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const uniqueCategories = useMemo(() => {
    return ['Todas', 'REDE E CONECTIVIDADE', 'HARDWARE E EQUIPAMENTOS', 'SISTEMAS E SOFTWARE', 'AUDIOVISUAL', 'SEGURANÇA DA INFORMAÇÃO / ACESSO', 'OUTROS / SOLICITAÇÃO GERAL'];
  }, []);

  const calcularSlaContexto = (criadoEm) => {
    if (!criadoEm) return { texto: "SLA Não Monitorado", critico: false, percentual: 100, corBarra: "#10b981" };
    try {
      const dataCriacao = new Date(criadoEm).getTime();
      const limiteSla = dataCriacao + (24 * 60 * 60 * 1000); 
      const totalSlaMs = 24 * 60 * 60 * 1000;
      const milissegundosRestantes = limiteSla - Date.now();
      const horasRestantes = Math.ceil(milissegundosRestantes / (1000 * 60 * 60));

      let percentual = Math.max(0, Math.min(100, (milissegundosRestantes / totalSlaMs) * 100));
      
      let corBarra = "#10b981"; 
      if (horasRestantes <= 4) corBarra = "#ef4444"; 
      else if (horasRestantes <= 12) corBarra = "#f59e0b"; 

      if (horasRestantes <= 0) {
        return { texto: "SLA ESTOURADO", critico: true, percentual: 100, corBarra: "#ef4444" };
      }
      if (horasRestantes <= 4) {
        return { texto: `URGENTE — ${horasRestantes}h restantes`, critico: true, percentual, corBarra };
      }
      return { texto: `${horasRestantes}h restantes`, critico: false, percentual, corBarra };
    } catch {
      return { texto: "24h estimadas", critico: false, percentual: 100, corBarra: "#10b981" };
    }
  };

  const higienizarAssuntoOS = (tituloRaw) => {
    if (!tituloRaw) return "Sem Assunto";
    return tituloRaw.replace(/\[.*?\]\s*.*?\s*-\s*Local:\s*.*?$/, '').trim() || tituloRaw;
  };

  const filteredRequests = useMemo(() => {
    const safeRequests = Array.isArray(requests) ? requests : [];
    
    const processados = safeRequests.map(req => ({
      ...req,
      _sla: calcularSlaContexto(req.criado_em)
    }));

    const filtrados = processados.filter(req => {
      const inputLimpo = searchTerm.trim();
      const isApenasNumero = /^\d+$/.test(inputLimpo);
      if (isApenasNumero) {
        return (req?.id || '').toString() === inputLimpo;
      }

      const term = inputLimpo.toLowerCase();
      const matchesSearch = term === '' || 
        (req?.titulo || '').toLowerCase().includes(term) ||
        (req?.descricao || '').toLowerCase().includes(term) ||
        (req?.nome || req?.criador_nome || '').toLowerCase().includes(term) ||
        (req?.bloco || '').toLowerCase().includes(term);

      const statusRemoto = String(req?.status || '').toUpperCase();
      const filtroStatusAtual = String(statusFilter || '').toUpperCase();
      
      let matchesStatus = true;
      if (filtroStatusAtual !== 'TODOS') {
        if (filtroStatusAtual === 'ABERTO') {
          matchesStatus = statusRemoto === 'ABERTO' || statusRemoto === 'PENDENTE';
        } else if (filtroStatusAtual === 'ATENDIMENTO') {
          matchesStatus = statusRemoto === 'EM_ATENDIMENTO' || statusRemoto === 'ATENDIMENTO';
        } else if (filtroStatusAtual === 'RESOLVIDO') {
          matchesStatus = statusRemoto === 'RESOLVIDO';
        } else {
          matchesStatus = statusRemoto === filtroStatusAtual;
        }
      }

      const matchesCategory = categoryFilter === 'Todas' || req?.categoria === categoryFilter;

      let matchesDate = true;
      if (dateFilter !== 'Todos' && req?.criado_em) {
        try {
          const anoCriacao = new Date(req.criado_em).getFullYear().toString();
          matchesDate = anoCriacao === dateFilter;
        } catch {
          matchesDate = true;
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    });

    return filtrados.sort((a, b) => {
      if (a._sla.critico && !b._sla.critico) return -1;
      if (!a._sla.critico && b._sla.critico) return 1;
      return new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime();
    });
  }, [requests, searchTerm, statusFilter, categoryFilter, dateFilter, ticker]);

  const analytics = useMemo(() => {
    const total = filteredRequests.length;
    const pendentes = filteredRequests.filter(r => ['ABERTO', 'PENDENTE', 'EM_ATENDIMENTO', 'ATENDIMENTO'].includes(String(r.status || '').toUpperCase())).length;
    const resolvidos = filteredRequests.filter(r => String(r.status || '').toUpperCase() === 'RESOLVIDO').length;
    const cancelados = filteredRequests.filter(r => String(r.status || '').toUpperCase() === 'CANCELADO').length;
    
    const taxaEficiencia = total > 0 ? Math.round((resolvidos / total) * 100) : 0;

    let cRede = 0, cHardware = 0, cSistemas = 0, cAudio = 0, cSeguranca = 0, cOutros = 0;

    filteredRequests.forEach(r => {
      const catNorm = String(r.categoria || '').toUpperCase();
      if (catNorm.includes('REDE') || catNorm.includes('CONECTIVIDADE')) cRede++;
      else if (catNorm.includes('HARDWARE') || catNorm.includes('EQUIPAMENTO')) cHardware++;
      else if (catNorm.includes('SISTEMA') || catNorm.includes('SOFTWARE')) cSistemas++;
      else if (catNorm.includes('AUDIO') || catNorm.includes('VISUAL')) cAudio++;
      else if (catNorm.includes('SEGURANÇA') || catNorm.includes('ACESSO')) cSeguranca++;
      else cOutros++;
    });

    return { 
      total, pendentes, resolvidos, cancelados, taxaEficiencia,
      cRede, cHardware, cSistemas, cAudio, cSeguranca, cOutros,
      pRede: total > 0 ? Math.round((cRede / total) * 100) : 0,
      pHardware: total > 0 ? Math.round((cHardware / total) * 100) : 0,
      pSistemas: total > 0 ? Math.round((cSistemas / total) * 100) : 0,
      pAudio: total > 0 ? Math.round((cAudio / total) * 100) : 0,
      pSeguranca: total > 0 ? Math.round((cSeguranca / total) * 100) : 0,
      pOutros: total > 0 ? (100 - (Math.round((cRede / total) * 100) + Math.round((cHardware / total) * 100) + Math.round((cSistemas / total) * 100) + Math.round((cAudio / total) * 100) + Math.round((cSeguranca / total) * 100))) : 0
    };
  }, [filteredRequests]);

  const handleSelectRequest = (req) => {
    setSelectedRequest(req);
    setTextoParecer('');
  };

  const executeStatusChange = async (safeId, statusPayload, newStatus, parecerTexto = null) => {
    setUpdatingId(safeId);
    const response = await onUpdateStatus(safeId, statusPayload, parecerTexto);
    if (response) {
      setSelectedRequest(prev => {
        if (!prev) return null;
        const listaTimeline = Array.isArray(prev.timeline) ? prev.timeline : [];
        const novaInteracao = {
          id: Date.now(),
          autor_nome: user?.nome_completo || "Sistema",
          status_novo: statusPayload,
          conteudo: parecerTexto ? `Parecer Técnico por ${user?.nome_completo}: ${parecerTexto}` : `Status modificado operacionalmente para ${newStatus}.`,
          criado_em: new Date().toISOString()
        };
        return { ...prev, status: statusPayload, timeline: [novaInteracao, ...listaTimeline] };
      });
      setTextoParecer('');
    }
    setUpdatingId(null);
  };

  const handleStatusChange = (requestId, newStatus) => {
    const safeId = requestId || selectedRequest?.id;
    if (!safeId) return;

    let statusPayload = 'EM_ATENDIMENTO';
    if (newStatus === 'Resolvido') statusPayload = 'RESOLVIDO';
    if (newStatus === 'Cancelado') statusPayload = 'CANCELADO';

    if ((statusPayload === 'RESOLVIDO' || statusPayload === 'CANCELADO') && !textoParecer.trim()) {
      alert("Erro de Auditoria: É obrigatório descrever o Parecer Técnico de encerramento antes de concluir a Ordem de Serviço.");
      return;
    }

    const textoEnvio = textoParecer.trim();

    if (typeof triggerModalConfirm === 'function') {
      triggerModalConfirm(
        "Alteração Operacional de Fila",
        `Deseja realmente transitar o status da Ordem de Serviço #${safeId} para "${newStatus}"?`,
        () => executeStatusChange(safeId, statusPayload, newStatus, textoEnvio)
      );
    } else {
      executeStatusChange(safeId, statusPayload, newStatus, textoEnvio);
    }
  };

  const formatarData = (isoString) => {
    try {
      if (!isoString) return 'Data indisponível';
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' — ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Data indisponível';
    }
  };

  const renderBadgeStatus = (statusBruto) => {
    const st = String(statusBruto || '').toUpperCase();
    if (st === 'RESOLVIDO') return <span className="badge bg-success bg-opacity-10 text-success font-monospace px-2 py-1" style={{ fontSize: '10px' }}>Resolvido</span>;
    if (st === 'EM_ATENDIMENTO' || st === 'ATENDIMENTO') return <span className="badge bg-warning bg-opacity-10 text-warning font-monospace px-2 py-1" style={{ fontSize: '10px' }}>Em Atendimento</span>;
    if (st === 'CANCELADO') return <span className="badge bg-secondary bg-opacity-10 text-secondary font-monospace px-2 py-1" style={{ fontSize: '10px' }}>Cancelado</span>;
    return <span className="badge bg-danger bg-opacity-10 text-danger font-monospace px-2 py-1" style={{ fontSize: '10px' }}>Pendente</span>;
  };

  const obterTextoBotaoCancelamento = () => {
    if (isAdmin) return "Recusar Chamado";
    if (user?.role === "tecnico" || userCargo.includes("subgerente")) return "Cancelar Atendimento";
    return "Cancelar Solicitação";
  };

  const encontrarParecerSalvo = (timeline) => {
    if (!Array.isArray(timeline)) return null;
    const item = [...timeline].reverse().find(t => String(t.conteudo).includes("Parecer Técnico"));
    if (item) return item.conteudo;
    return null;
  };

  const parecerJaGravado = selectedRequest ? encontrarParecerSalvo(selectedRequest.timeline) : null;

  const kanbanColumns = useMemo(() => {
    return {
      pendentes: filteredRequests.filter(r => ['PENDENTE', 'ABERTO'].includes(String(r.status).toUpperCase())),
      atendimento: filteredRequests.filter(r => ['EM_ATENDIMENTO', 'ATENDIMENTO'].includes(String(r.status).toUpperCase())),
      concluidos: filteredRequests.filter(r => ['RESOLVIDO', 'CANCELADO'].includes(String(r.status).toUpperCase()))
    };
  }, [filteredRequests]);

  return (
    <div className="row g-4 animate__animated animate__fadeIn">
      <style>{`
        .pulse-sla-critico { border: 2px solid #ef4444 !important; animation: pulseSla 2s infinite; }
        @keyframes pulseSla {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        
        /* 🎨 LINHA DO TEMPO REESTRUTURADA E FLUIDA */
        .custom-timeline-line { position: relative; padding-left: 20px; }
        .custom-timeline-line::before { content: ''; position: absolute; left: 4px; top: 8px; bottom: 8px; width: 2px; background-color: #e2e8f0; }
        .custom-timeline-node { position: relative; margin-bottom: 1.25rem; }
        .custom-timeline-node::before { content: ''; position: absolute; left: -20px; top: 5px; width: 10px; height: 10px; border-radius: 50%; background-color: #cbd5e1; border: 2px solid #fff; z-index: 2; }
        .custom-timeline-node.status-fechado::before { background-color: #10b981; }
        .custom-timeline-node.status-atendimento::before { background-color: #f59e0b; }
        
        @media print {
          body * { visibility: hidden; background: transparent !important; color: #000000 !important; box-shadow: none !important; }
          .secao-impressao-oficial, .secao-impressao-oficial * { visibility: visible; }
          .secao-impressao-oficial { position: fixed; left: 0; top: 0; width: 100%; height: 100%; padding: 40px; background: #ffffff !important; z-index: 99999; }
          .btn, .form-select, input, .btn-close, .d-print-none, nav, aside, header { display: none !important; }
          .table { width: 100% !important; border-collapse: collapse !important; margin-top: 20px; }
          .table th, .table td { border: 1px solid #94a3b8 !important; padding: 10px !important; font-size: 11px !important; font-family: monospace !important; }
        }
      `}</style>

      <div className={selectedRequest ? "col-lg-8 d-print-none" : "col-12 d-print-none"}>
        <div className="surface border-0 shadow-sm mb-3 py-3 px-4 bg-white rounded-3">
          <div className="row align-items-center text-center text-sm-start g-3">
            <div className="col-sm-3 p-2 rounded-3 text-center text-sm-start" style={{ cursor: 'pointer', borderRight: '1px solid #e2e8f0' }} onClick={() => setStatusFilter('TODOS')}>
              <span className="text-muted font-monospace d-block" style={{ fontSize: '10px' }}><i className="fa-solid fa-layer-group me-1"></i> PERÍODO: {dateFilter}</span>
              <strong className="h4 fw-bold text-dark font-monospace">{analytics.total}</strong>
            </div>
            <div className="col-sm-3 p-2 rounded-3 text-center text-sm-start" style={{ cursor: 'pointer', borderRight: '1px solid #e2e8f0' }} onClick={() => setStatusFilter('ATENDIMENTO')}>
              <span className="text-muted font-monospace d-block" style={{ fontSize: '10px' }}><i className="fa-solid fa-spinner text-warning me-1"></i> EM ATENDIMENTO</span>
              <strong className="h4 fw-bold text-warning font-monospace">{analytics.pendentes}</strong>
            </div>
            <div className="col-sm-3 p-2 rounded-3 text-center text-sm-start" style={{ cursor: 'pointer', borderRight: '1px solid #e2e8f0' }} onClick={() => setStatusFilter('RESOLVIDO')}>
              <span className="text-muted font-monospace d-block" style={{ fontSize: '10px' }}><i className="fa-solid fa-square-check text-success me-1"></i> RESOLVIDOS</span>
              <strong className="h4 fw-bold text-success font-monospace">{analytics.resolvidos}</strong>
            </div>
            
            {isTecnico && (
              <div className="col-sm-3 text-sm-end d-flex flex-column gap-2">
                <button className="btn btn-sm btn-outline-success font-monospace fw-bold px-3 w-100" style={{ borderRadius: '4px', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#059669' }} onClick={() => setShowReport(true)} type="button">
                  <i className="fa-solid fa-file-invoice me-1"></i> Balanço Fechamento
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="surface border-0 shadow-sm mb-4 bg-white p-3 rounded-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-4">
              <input type="text" className="form-control" placeholder="Buscar por ID, assunto, bloco..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="col-6 col-md-2">
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="TODOS">Todos Status</option>
                <option value="ABERTO">Pendente / Aberto</option>
                <option value="ATENDIMENTO">Em Atendimento</option>
                <option value="RESOLVIDO">Resolvidos</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat === 'Todas' ? 'Todas Categorias' : cat.substring(0,15) + '...'}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select className="form-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option value="Todos">Todos os Anos</option>
                <option value="2026">Exercício 2026</option>
                <option value="2025">Exercício 2025</option>
              </select>
            </div>
            
            <div className="col-6 col-md-2 text-end d-flex gap-2 justify-content-end">
              {isTecnico && (
                <div className="btn-group btn-group-sm" role="group">
                  <button type="button" className={`btn fw-bold ${viewMode === 'tabela' ? 'btn-success text-white' : 'btn-outline-secondary'}`} onClick={() => setViewMode('tabela')}><i className="fa-solid fa-table-list me-1"></i> Lista</button>
                  <button type="button" className={`btn fw-bold ${viewMode === 'kanban' ? 'btn-success text-white' : 'btn-outline-secondary'}`} onClick={() => setViewMode('kanban')}><i className="fa-solid fa-table-columns me-1"></i> Quadro</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {viewMode === 'tabela' ? (
          <div className="surface border border-light-subtle shadow-sm p-0 overflow-hidden bg-white rounded-3 animate__animated animate__fadeIn">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-muted small text-uppercase" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                  <tr>
                    <th className="ps-4" style={{ width: '80px' }}>OS</th>
                    <th>Servidor / Assunto</th>
                    <th>Categoria / Localização</th>
                    <th>Status de Triagem</th>
                    {isTecnico && <th>Cronômetro SLA</th>}
                    <th className="pe-4 text-end">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={isTecnico ? 6 : 5} className="text-center py-5 text-muted small font-monospace">Nenhuma ordem de serviço localizada para os critérios selecionados.</td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => (
                      <tr key={req.id} onClick={() => handleSelectRequest(req)} className={isTecnico && req._sla.critico && String(req.status).toUpperCase() !== 'RESOLVIDO' ? 'pulse-sla-critico' : ''} style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}>
                        <td className="ps-4 font-monospace fw-bold text-muted">#{req.id}</td>
                        <td>
                          <span className="d-block fw-bold text-dark small">{higienizarAssuntoOS(req?.titulo)}</span>
                          <small className="text-muted font-monospace" style={{ fontSize: '10px' }}>Por: {req?.nome || req?.criador_nome || "Servidor do Instituto"}</small>
                        </td>
                        <td>
                          <span className="d-block small fw-semibold text-dark">{req?.categoria}</span>
                          <small className="text-muted">{req?.bloco} &mdash; {req?.sala}</small>
                          {isTecnico && Math.sign(req.status) !== 1 && !['RESOLVIDO', 'CANCELADO'].includes(String(req.status).toUpperCase()) && (
                            <div className="progress mt-1" style={{ height: '3px', width: '120px' }}>
                              <div className="progress-bar" role="progressbar" style={{ width: `${req._sla.percentual}%`, backgroundColor: req._sla.corBarra }} />
                            </div>
                          )}
                        </td>
                        <td>{renderBadgeStatus(req?.status)}</td>
                        {isTecnico && (
                          <td>
                            <span className={`font-monospace small fw-bold ${req._sla.critico ? 'text-danger' : 'text-secondary'}`}>
                              <i className="fa-solid fa-clock-rotate-left me-1"></i>{String(req.status).toUpperCase() === 'RESOLVIDO' ? 'CONCLUÍDO' : req._sla.texto}
                            </span>
                          </td>
                        )}
                        <td className="pe-4 text-end" onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-sm btn-link text-success fw-bold p-0 text-decoration-none" onClick={() => handleSelectRequest(req)} type="button" style={{ color: '#10b981' }}>Analisar</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="row g-3 animate__animated animate__fadeIn">
            <div className="col-md-4">
              <div className="p-3 bg-light rounded-3 border-top border-danger border-3 shadow-sm" style={{ minHeight: '500px', backgroundColor: '#fff5f5' }}>
                <span className="fw-bold text-danger font-monospace small d-block mb-3 text-uppercase"><i className="fa-solid fa-circle-exclamation me-1"></i> Pendentes ({kanbanColumns.pendentes.length})</span>
                <div className="d-flex flex-column gap-2">
                  {kanbanColumns.pendentes.map(req => (
                    <div className="card border-0 shadow-sm p-3 bg-white rounded-3" key={req.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectRequest(req)}>
                      <div className="d-flex justify-content-between font-monospace text-muted mb-2" style={{ fontSize: '10px' }}>
                        <strong>#{req.id}</strong>
                        <span className={req._sla.critico ? "text-danger fw-bold" : "text-secondary"}>{req._sla.texto.split('—')[0]}</span>
                      </div>
                      <span className="d-block fw-bold text-dark small mb-1">{higienizarAssuntoOS(req?.titulo)}</span>
                      <small className="text-muted font-monospace d-block mb-2" style={{ fontSize: '10px' }}>{req.bloco} - {req.sala}</small>
                      <div className="progress" style={{ height: '3px' }}>
                        <div className="progress-bar" style={{ width: `${req._sla.percentual}%`, backgroundColor: req._sla.corBarra }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-3 bg-light rounded-3 border-top border-warning border-3 shadow-sm" style={{ minHeight: '500px', backgroundColor: '#fffdf5' }}>
                <span className="fw-bold text-warning font-monospace small d-block mb-3 text-uppercase"><i className="fa-solid fa-spinner me-1"></i> Em Curso ({kanbanColumns.atendimento.length})</span>
                <div className="d-flex flex-column gap-2">
                  {kanbanColumns.atendimento.map(req => (
                    <div className="card border-0 shadow-sm p-3 bg-white rounded-3" key={req.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectRequest(req)}>
                      <div className="d-flex justify-content-between font-monospace text-muted mb-2" style={{ fontSize: '10px' }}>
                        <strong>#{req.id}</strong>
                        <span className={req._sla.critico ? "text-danger fw-bold" : "text-secondary"}>{req._sla.texto.split('—')[0]}</span>
                      </div>
                      <span className="d-block fw-bold text-dark small mb-1">{higienizarAssunctionOS(req?.titulo)}</span>
                      <small className="text-muted font-monospace d-block mb-2" style={{ fontSize: '10px' }}>{req.bloco} - {req.sala}</small>
                      <div className="progress" style={{ height: '3px' }}>
                        <div className="progress-bar" style={{ width: `${req._sla.percentual}%`, backgroundColor: req._sla.corBarra }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-3 bg-light rounded-3 border-top border-success border-3 shadow-sm" style={{ minHeight: '500px', backgroundColor: '#f5fff8' }}>
                <span className="fw-bold text-success font-monospace small d-block mb-3 text-uppercase"><i className="fa-solid fa-circle-check me-1"></i> Concluídos ({kanbanColumns.concluidos.length})</span>
                <div className="d-flex flex-column gap-2">
                  {kanbanColumns.concluidos.map(req => (
                    <div className="card border-0 shadow-sm p-3 bg-white rounded-3 opacity-75" key={req.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectRequest(req)}>
                      <div className="d-flex justify-content-between font-monospace text-muted mb-1" style={{ fontSize: '10px' }}>
                        <strong>#{req.id}</strong>
                        <span className="text-success fw-bold">CONCLUÍDO</span>
                      </div>
                      <span className="d-block fw-normal text-secondary small text-decoration-line-through">{higienizarAssuntoOS(req?.titulo)}</span>
                      <small className="text-muted font-monospace d-block" style={{ fontSize: '10px' }}>{req.bloco} - {req.sala}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 📑 SEÇÃO LATERAL DE ANÁLISE — APENAS MELHORIAS VISUAIS DE ALTA FIDELIDADE */}
      {selectedRequest && (
        <div className="col-lg-4 animate__animated animate__fadeInRight d-print-none">
          <div className="card border border-light-subtle shadow-sm p-4 bg-white rounded-3 d-flex flex-column gap-4" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            
            <div className="d-flex justify-content-between align-items-center pb-2.5 border-bottom border-light-subtle">
              <div>
                <span className="small font-monospace fw-bold d-block mb-0.5" style={{ color: '#10b981', fontSize: '10px', letterSpacing: '0.5px' }}>TRIAGEM OPERACIONAL</span>
                <strong className="text-dark h5 fw-extrabold m-0 font-monospace">Ordem de Serviço #{selectedRequest.id}</strong>
              </div>
              <button className="btn-close shadow-none btn-sm" onClick={() => setSelectedRequest(null)}></button>
            </div>

            {/* Configuração de Pares Chave-Valor Limpos sem Caixas Falsas Pesadas */}
            <div className="p-3 bg-light bg-opacity-40 border border-light-subtle rounded-3 font-monospace" style={{ fontSize: '11.5px', color: '#475569' }}>
              <span className="text-uppercase text-muted fw-bold d-block mb-2" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>📋 Detalhes e Identificação</span>
              <div className="mb-1">Solicitante: <strong className="text-dark fw-semibold">{selectedRequest?.nome || selectedRequest?.criador_nome || "Servidor"}</strong></div>
              {selectedRequest?.email && <div className="mb-1 text-truncate">E-mail: <span className="text-dark">{selectedRequest.email}</span></div>}
              <div className="mb-1">Localização: <strong className="text-dark text-uppercase">{selectedRequest.bloco} &mdash; Sala {selectedRequest.sala}</strong></div>
              <div>Patrimônio: <span className="fw-bold text-dark">{selectedRequest.numero_patrimonio || "Uso Geral"}</span></div>
            </div>

            <div>
              <label className="text-muted font-monospace small d-block mb-1.5 fw-bold" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>DESCRIÇÃO DA OCORRÊNCIA</label>
              <div className="p-3 rounded-3 small text-secondary border border-light-subtle bg-white" style={{ whiteSpace: 'pre-line', lineHeight: '1.5', fontSize: '12px', color: '#334155' }}>
                "{selectedRequest.descricao}"
              </div>
            </div>

            {/* Linha do Tempo Reestruturada com Nós Estilizados */}
            <div>
              <label className="text-muted font-monospace small d-block mb-3 fw-bold" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>HISTÓRICO DE AUDITORIA</label>
              <div className="custom-timeline-line">
                {Array.isArray(selectedRequest.timeline) && selectedRequest.timeline.length > 0 ? (
                  selectedRequest.timeline.map((evt, idx) => {
                    let nodeColorClass = "";
                    if (evt.conteudo.includes("RESOLVIDO") || evt.conteudo.includes("Parecer Técnico")) nodeColorClass = "status-fechado";
                    if (evt.conteudo.includes("EM_ATENDIMENTO")) nodeColorClass = "status-atendimento";

                    return (
                      <div className={`custom-timeline-node ${nodeColorClass}`} key={evt.id || idx} style={{ fontSize: '11.5px' }}>
                        <div className="fw-bold text-dark">{evt.autor_nome || "GTI Sistema"}</div>
                        <small className="text-muted font-monospace d-block mb-1" style={{ fontSize: '9.5px' }}>{formatarData(evt.criado_em)}</small>
                        <span className="text-secondary d-block lh-sm" style={{ color: '#64748b' }}>{evt.conteudo}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="small text-muted font-monospace ps-1">Carregando logs da timeline...</div>
                )}
              </div>
            </div>

            {/* Feedback e Encerramento Operacional */}
            {parecerJaGravado ? (
              <div className="p-3 border border-success border-opacity-10 bg-success bg-opacity-10 rounded-3 animate__animated animate__fadeIn">
                <span className="text-success small font-monospace fw-bold d-block mb-1" style={{ fontSize: '10px' }}><i className="fa-solid fa-square-check me-1"></i> Parecer Técnico Homologado</span>
                <p className="small text-dark m-0 fst-italic lh-base" style={{ whiteSpace: 'pre-line', fontSize: '12px' }}>{parecerJaGravado}</p>
              </div>
            ) : (
              isTecnico && String(selectedRequest.status).toUpperCase() === 'EM_ATENDIMENTO' && (
                <div className="animate__animated animate__fadeIn">
                  <label className="text-muted font-monospace small d-block mb-1.5 fw-bold" style={{ fontSize: '10px', letterSpacing: '0.5px' }}><i className="fa-solid fa-pen-to-square me-1"></i> PARECER TÉCNICO CONCLUSIVO</label>
                  <textarea 
                    className="form-control font-monospace border border-light-subtle shadow-sm" 
                    placeholder="Descreva detalhadamente as tratativas técnicas..." 
                    rows={3} 
                    value={textoParecer} 
                    onChange={e => setTextoParecer(e.target.value)}
                    style={{ fontSize: '12px' }}
                    required
                  />
                  <small className="text-muted font-monospace d-block mt-1" style={{ fontSize: '9px' }}>* Obrigatório para o encerramento da Ordem de Serviço.</small>
                </div>
              )
            )}
            
            {isTecnico && String(selectedRequest.status).toUpperCase() !== 'RESOLVIDO' && String(selectedRequest.status).toUpperCase() !== 'CANCELADO' ? (
              <div className="pt-2 border-top border-light-subtle d-grid gap-2 animate__animated animate__fadeIn">
                {String(selectedRequest.status).toUpperCase() === 'PENDENTE' && (
                  <button className="btn btn-warning text-dark fw-bold btn-sm py-2.5 shadow-sm" onClick={() => handleStatusChange(selectedRequest.id, 'Em Atendimento')} style={{ fontSize: '12px' }}>
                    <i className="fa-solid fa-play me-1"></i> Iniciar Atendimento
                  </button>
                )}
                
                {String(selectedRequest.status).toUpperCase() === 'EM_ATENDIMENTO' && (
                  <button 
                    className="btn btn-success fw-bold btn-sm py-2.5 text-white shadow-sm border-0" 
                    style={{ backgroundColor: '#10b981', fontSize: '12px' }} 
                    onClick={() => handleStatusChange(selectedRequest.id, 'Resolvido')}
                    disabled={!textoParecer.trim()}
                  >
                    <i className="fa-solid fa-check-double me-1"></i> Concluir Ordem de Serviço
                  </button>
                )}
                
                <div className="col-12 mt-0.5">
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-danger w-100 font-monospace py-2 fw-bold shadow-none" 
                    style={{ fontSize: '11px' }} 
                    onClick={() => handleStatusChange(selectedRequest.id, 'Cancelado')}
                    disabled={String(selectedRequest.status).toUpperCase() === 'EM_ATENDIMENTO' && !textoParecer.trim()}
                  >
                    <i className="fa-solid fa-ban me-1"></i> {obterTextoBotaoCancelamento()}
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-top border-light-subtle text-center text-muted font-monospace small bg-light p-2.5 rounded border border-light-subtle" style={{ fontSize: '11px' }}>
                <i className="fa-solid fa-lock me-1 text-success"></i> Arquivado em Histórico de Auditoria Geral
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🧾 MODAL BALANÇO FECHAMENTO (OFICIAL DE IMPRESSÃO) */}
      {showReport && isTecnico && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div className="surface p-4 mx-3 bg-white rounded-3 secao-impressao-oficial shadow-lg border border-light-subtle" style={{ maxWidth: '840px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="text-center mb-4 pb-3 border-bottom">
              <h2 className="h5 fw-bold m-0 text-dark text-uppercase font-monospace">Universidade Federal do Amazonas</h2>
              <h3 className="h6 fw-semibold m-0 text-muted font-monospace mt-1">Instituto de Ciências Exatas e Tecnologia — ICET</h3>
              <small className="text-muted font-monospace d-block mt-3">Relatório Gerencial de Demandas Tecnológicas (Exercício {dateFilter})</small>
            </div>
            
            <div className="mb-4 p-3 bg-light bg-opacity-40 border rounded-3">
              <h4 className="h6 fw-bold text-uppercase text-muted font-monospace mb-3" style={{ fontSize: '11px' }}>Volumetria Categórica Relativa:</h4>
              <div className="row g-3 font-monospace" style={{ fontSize: '12px' }}>
                <div className="col-md-6">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '2px' }}></span>
                    <span>Infraestrutura de Redes / Internet: <strong>{analytics.cRede}</strong> ({analytics.pRede}%)</span>
                  </div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#0284c7', borderRadius: '2px' }}></span>
                    <span>Manutenção de Hardware / Equipamentos: <strong>{analytics.cHardware}</strong> ({analytics.pHardware}%)</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#f59e0b', borderRadius: '2px' }}></span>
                    <span>Sistemas / Engenharia de Softwares: <strong>{analytics.cSistemas}</strong> ({analytics.pSistemas}%)</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#6366f1', borderRadius: '2px' }}></span>
                    <span>Audiovisual: <strong>{analytics.cAudio}</strong> ({analytics.pAudio}%)</span>
                  </div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '2px' }}></span>
                    <span>Segurança da Informação / Acesso: <strong>{analytics.cSeguranca}</strong> ({analytics.pSeguranca}%)</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#64748b', borderRadius: '2px' }}></span>
                    <span>Outros / Solicitação Geral: <strong>{analytics.cOutros}</strong> ({analytics.pOutros}%)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-0 text-center mb-4 border rounded-3 overflow-hidden font-monospace small">
              <div className="col-3 p-2 bg-light border-end">
                <span className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '9px' }}>Total Emitido</span>
                <strong className="text-dark fs-5">{analytics.total}</strong>
              </div>
              <div className="col-3 p-2 bg-light border-end">
                <span className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '9px' }}>Concluídos</span>
                <strong className="text-success fs-5">{analytics.resolvidos}</strong>
              </div>
              <div className="col-3 p-2 bg-light border-end">
                <span className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '9px' }}>Cancelados</span>
                <strong className="text-secondary fs-5">{analytics.cancelados}</strong>
              </div>
              <div className="col-3 p-2 bg-light">
                <span className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '9px' }}>Desempenho</span>
                <strong className="text-dark fs-5">{analytics.taxaEficiencia}%</strong>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="h6 fw-bold text-uppercase text-muted font-monospace mb-2" style={{ fontSize: '11px' }}>Extrato de Ordens Auditadas</h4>
              <div className="table-responsive border rounded-3">
                <table className="table table-sm table-striped table-hover font-monospace align-middle mb-0" style={{ fontSize: '11px' }}>
                  <thead className="table-light text-uppercase">
                    <tr>
                      <th className="text-center" style={{ width: '60px' }}>OS</th>
                      <th>Abertura</th>
                      <th>Solicitante</th>
                      <th>Classificação / Assunto</th>
                      <th>Localização Física</th>
                      <th className="text-center" style={{ width: '100px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map(req => (
                      <tr key={req.id}>
                        <td className="text-center text-muted fw-bold">#{req.id}</td>
                        <td className="small text-secondary">{formatarData(req?.criado_em || req?.data_abertura)}</td>
                        <td className="fw-semibold text-dark">{req?.nome || req?.criador_nome || "Servidor"}</td>
                        <td className="text-truncate" style={{ maxWidth: '180px' }}>{higienizarAssuntoOS(req?.titulo)}</td>
                        <td>{req?.bloco || "N/A"} &mdash; {req?.sala || "N/A"}</td>
                        <td className="text-center fw-bold">
                          {String(req?.status || '').toUpperCase() === 'RESOLVIDO' ? '✅ OK' : String(req?.status || '').toUpperCase() === 'CANCELADO' ? '❌ CANC' : '⏳ FILA'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="d-flex gap-2 justify-content-end d-print-none mt-4 pt-3 border-top">
              <button className="btn btn-sm btn-light border fw-bold px-4" onClick={() => setShowReport(false)}>Fechar Relatório</button>
              <button className="btn btn-sm btn-success fw-bold px-4" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={() => window.print()}>
                <i className="fa-solid fa-print me-2"></i>Imprimir Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}