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
      <div className="text-center d-flex flex-column align-items-center justify-content-center py-4 text-muted font-monospace bg-white border rounded-3" style={{ fontSize: '12px', borderStyle: 'dashed', minHeight: '120px' }}>
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
            <th className="py-2.5" style={{ width: '20%' }}>Cargo Operacional</th>
            <th className="py-2.5" style={{ width: '15%' }}>Estado</th>
            <th className="py-2.5 text-end pe-3" style={{ width: '20%' }}>Ações de Controle</th>
          </tr>
        </thead>
        <tbody className="text-dark">
          {items.map((item, index) => {
            const isItemProcessing = processingId === item.id;
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
                  <span className="badge bg-light text-secondary border font-monospace text-uppercase" style={{ fontSize: '9px', padding: '3px 6px' }}>
                    {item.cargo || 'Servidor'}
                  </span>
                </td>
                <td className="py-2">
                  <span className={`badge font-monospace border-0 px-2 py-1 ${isPendingList ? 'bg-warning bg-opacity-10 text-warning' : 'bg-success bg-opacity-10 text-success'}`} style={{ fontSize: '9px', fontWeight: '700' }}>
                    {isPendingList ? "AGUARDANDO" : "ATIVO"}
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
                      className={`btn btn-sm ${isPendingList ? 'btn-success text-white' : 'btn-outline-danger'} p-0 d-flex align-items-center justify-content-center shadow-none`}
                      type="button"
                      title={actionTitle}
                      disabled={processingId !== null}
                      onClick={() => onAction(item)}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: isPendingList ? '#10b981' : '', borderColor: isPendingList ? '#10b981' : '' }}
                    >
                      {isItemProcessing ? (
                        <span className="spinner-border spinner-border-sm" style={{ width: '10px', height: '10px' }}></span>
                      ) : (
                        <i className={`fa-solid ${actionIcon} style-table-icon`}></i>
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
 * @description Painel Gerencial Unificado de Governança Técnica (GTI - ICET).
 */
export function Dashboard({ requests = [], onNavigate }) {
  const { user, request, usuarios_pendentes, users } = useAuth();
  const [feedback, setFeedback] = useState({ message: '', type: '' }); 
  
  const [localPendentes, setLocalPendentes] = useState([]);
  const [localAtivos, setLocalAtivos] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    setLocalPendentes(Array.isArray(usuarios_pendentes) ? usuarios_pendentes : []);
  }, [usuarios_pendentes]);

  useEffect(() => {
    setLocalAtivos(Array.isArray(users) ? users : []);
  }, [users]);

  const userCargo = user?.cargo?.toLowerCase() || "";
  const isAdmin = user?.role === "admin" || userCargo === "administrador" || userCargo.includes("subgerente") || userCargo.includes("cpd") || userCargo.includes("gti");

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
        setLocalPendentes(prev => prev.filter(u => u.id !== servidor.id));
        setLocalAtivos(prev => [...prev, { ...servidor, is_active: true }]);
        setFeedback({ message: `Servidor ${servidor.nome_completo} homologado com sucesso!`, type: 'success' });
      }
    } catch (err) {
      setFeedback({ message: "Erro ao processar a aprovação cadastral.", type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejeitarServidor = async (servidor) => {
    const confirmar = window.confirm(`Atenção: Você tem certeza de que deseja recusar e apagar permanentemente o cadastro de ${servidor.nome_completo}?`);
    if (!confirmar) return;

    setFeedback({ message: '', type: '' });
    setProcessingId(servidor.id);
    try {
      const res = await request(`/api/admin/users/${servidor.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ is_approve: false })
      });
      if (res && res.success) {
        setLocalPendentes(prev => prev.filter(u => u.id !== servidor.id));
        setFeedback({ message: "Cadastro inválido removido e expurgado com sucesso.", type: 'success' });
      }
    } catch (err) {
      setFeedback({ message: "Falha ao expurgar cadastro do banco.", type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeletarServidor = async (servidor) => {
    const confirmar = window.confirm(`Atenção: Você tem certeza de que deseja remover permanentemente a conta de ${servidor.nome_completo} da base do ICET?`);
    if (!confirmar) return;

    setFeedback({ message: '', type: '' });
    setProcessingId(servidor.id);
    try {
      const res = await request(`/api/admin/users/${servidor.id}`, {
        method: "DELETE"
      });
      if (res && res.success) {
        setLocalAtivos(prev => prev.filter(u => u.id !== servidor.id));
        setFeedback({ message: `A conta do servidor foi permanentemente removida do sistema.`, type: 'success' });
      }
    } catch (err) {
      setFeedback({ message: "Erro ao processar o expurgo relacional da conta.", type: 'error' });
    } finally {
      setProcessingId(null);
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

      {/* 📊 IDENTIFICADOR SÂNRE DO OPERADOR */}
      <div className="d-flex justify-content-between align-items-center border-bottom mb-4 pb-3 flex-wrap gap-2">
        <h4 className="h5 fw-extrabold m-0 text-dark" style={{ fontWeight: '800', letterSpacing: '-0.3px' }}>
          <i className="fa-solid fa-chart-pie text-success me-2"></i>Painel Geral de Governança
        </h4>
        <div className="small font-monospace text-secondary bg-white border border-light-subtle px-3 py-1.5 rounded-3 shadow-sm">
          Operador: <strong className="text-dark">{user?.nome_completo || "Gerente"}</strong>
          {user?.role && (
            <span className="badge bg-light text-secondary border font-monospace ms-2" style={{ fontSize: '10px' }}>
              {userCargo.includes("subgerente") ? "SUBGERENTE" : user.role.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* 📈 INDICADORES NUMÉRICOS COMPACTOS (MÓDULOS GERAIS) */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard label="Total de Chamados" value={stats.total} color="#64748b" icon="fa-solid fa-folder-open" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="Abertos (Triagem)" value={stats.abertos} color="#ef4444" icon="fa-solid fa-circle-exclamation" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="Em Atendimento" value={stats.atendimento} color="#3b82f6" icon="fa-solid fa-clock-rotate-left" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="OS Resolvidas" value={stats.resolvidos} color="#10b981" icon="fa-solid fa-circle-check" />
        </div>
      </div>

      {/* 🗃️ SEÇÕES DE TABELAS COMPACTAS (MIOLO DA TELA) */}
      {isAdmin && (
        <div className="d-flex flex-column gap-4">
          
          <div>
            <div className="d-flex align-items-center gap-2 mb-2.5">
              <h4 className="h6 fw-bold text-uppercase font-monospace m-0 text-secondary" style={{ letterSpacing: '0.5px', fontSize: '11px' }}>Fila de Homologação Cadastral</h4>
              <span className="badge bg-warning text-dark font-monospace fw-bold rounded-2 px-2 py-0.5" style={{ fontSize: '10px' }}>{stats.solicitacoesPendentes.length}</span>
            </div>
            <UserTable 
              items={stats.solicitacoesPendentes}
              onAction={handleAprovarServidor}
              onReject={handleRejeitarServidor}
              showReject={true}
              actionIcon="fa-user-check"
              actionTitle="Aprovar e Ativar Servidor"
              actionClass="btn-success"
              emptyMessage="Nenhum auto-cadastro aguardando validação na base da UFAM."
              isPendingList={true}
              processingId={processingId}
            />
          </div>

          <div className="border-top pt-4">
            <div className="d-flex align-items-center gap-2 mb-2.5">
              <h4 className="h6 fw-bold text-uppercase font-monospace m-0 text-secondary" style={{ letterSpacing: '0.5px', fontSize: '11px' }}>Operadores Homologados Ativos</h4>
              <span className="badge bg-success text-white font-monospace fw-bold rounded-2 px-2 py-0.5" style={{ fontSize: '10px', backgroundColor: '#10b981' }}>{stats.usuariosAtivos.length}</span>
            </div>
            <UserTable 
              items={stats.usuariosAtivos}
              onAction={handleDeletarServidor}
              actionIcon="fa-trash-can"
              actionTitle="Excluir Conta Definitivamente"
              actionClass="btn-outline-danger"
              emptyMessage="Nenhum usuário ativo registrado no barramento do ICET."
              isPendingList={false}
              processingId={processingId}
            />
          </div>

        </div>
      )}
    </div>
  );
}