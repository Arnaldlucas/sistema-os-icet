import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TextArea } from '../components/TextArea';

const CATEGORIAS_GTI = [
  "REDE E CONECTIVIDADE",
  "HARDWARE E EQUIPAMENTOS",
  "SISTEMAS E SOFTWARE",
  "AUDIOVISUAL",
  "SEGURANÇA DA INFORMAÇÃO / ACESSO",
  "OUTROS / SOLICITAÇÃO GERAL"
];

/**
 * @component RequestForm
 * @description Formulário wizard para abertura de ordens de serviço com interface de alta fidelidade.
 */
export function RequestForm({ onRefreshRequests, onNavigate }) {
  const { user, request } = useAuth();
  const [wizardStep, setWizardStep] = useState(1);

  const [setor, setSetor] = useState('');
  const [localExato, setLocalExato] = useState('');
  const [categoria, setCategoria] = useState('REDE E CONECTIVIDADE');
  const [descricao, setDescricao] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  const obtenerPrazoEstimado = (cat) => {
    if (cat.includes("REDE") || cat.includes("SEGURANÇA")) {
      return { prazo: "Até 24h úteis (SLA Crítico)", cor: "#10b981", bg: "bg-success-subtle" };
    }
    if (cat.includes("HARDWARE") || cat.includes("AUDIOVISUAL")) {
      return { prazo: "Até 48h úteis (Manutenção Física)", cor: "#0284c7", bg: "bg-primary-subtle" };
    }
    return { prazo: "Até 72h úteis (Análise de Escopo)", cor: "#f59e0b", bg: "bg-warning-subtle" };
  };

  const infoPrazo = obtenerPrazoEstimado(categoria);
  const isFormInvalid = !setor.trim() || !localExato.trim() || descricao.trim().length < 10 || submitting;

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setErrorBanner('');

    const payloadValido = {
      categoria: categoria,
      subcategoria: "Geral / Chamado Direto", 
      prioridade: "MEDIA", 
      tipo_ambiente: 'UNIVERSAL', 
      bloco: setor.trim(),
      sala_ou_espaco: localExato.trim(),
      numero_patrimonio: null, 
      descricao: descricao.trim(),
      titulo: `[${categoria}] ${setor.trim()} - ${localExato.trim()}`
    };

    try {
      const response = await request('/api/requests', {
        method: 'POST',
        body: JSON.stringify(payloadValido)
      });

      if (response && response.success === false) throw new Error(response.message);
      
      if (onRefreshRequests) await onRefreshRequests();
      if (onNavigate) onNavigate("consultas");
    } catch (err) {
      setErrorBanner(err.message || "Falha na comunicação com o servidor.");
      setWizardStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-100 container-fluid p-0 animate__animated animate__fadeIn">
      <style>{`
        .stepper-line { height: 2px; background: #e2e8f0; position: relative; top: 12px; z-index: 0; }
        .step-dot { width: 24px; height: 24px; border-radius: 50%; background: #fff; border: 2px solid #e2e8f0; z-index: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: #94a3b8; transition: all 0.3s; }
        .step-dot.active { border-color: #0284c7; color: #0284c7; box-shadow: 0 0 0 4px rgba(2, 132, 199, 0.1); }
        .step-dot.completed { background: #0284c7; border-color: #0284c7; color: #fff; }
        .section-title { color: #1F2937; font-weight: 600; font-size: 1.1rem; margin-bottom: 1.5rem; display: flex; align-items: center; }
        .form-helper-text { font-size: 11px; color: #64748b; margin-top: 4px; display: block; font-family: monospace; }
        .char-counter { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }
      `}</style>

      {/* 🧭 STEPPER VISUAL MODERNO */}
      <div className="mx-auto mb-5 d-flex justify-content-between position-relative" style={{ maxWidth: '400px' }}>
        <div className="position-absolute w-100 stepper-line"></div>
        <div className="d-flex flex-column align-items-center">
          <div className={`step-dot ${wizardStep >= 1 ? 'active' : ''} ${wizardStep > 1 ? 'completed' : ''}`}>
            {wizardStep > 1 ? <i className="fa-solid fa-check"></i> : '1'}
          </div>
          <span className="mt-2 small fw-semibold text-muted" style={{ fontSize: '10px' }}>Identificação</span>
        </div>
        <div className="d-flex flex-column align-items-center">
          <div className={`step-dot ${wizardStep === 2 ? 'active' : ''}`}>2</div>
          <span className="mt-2 small fw-semibold text-muted" style={{ fontSize: '10px' }}>Revisão e Envio</span>
        </div>
      </div>

      <div className="mx-auto" style={{ maxWidth: '800px' }}>
        {errorBanner && (
          <div className="alert alert-danger border-0 shadow-sm small py-2 mb-4 animate__animated animate__shakeX">
            <i className="fa-solid fa-triangle-exclamation me-2"></i>{errorBanner}
          </div>
        )}

        {wizardStep === 1 ? (
          <form onSubmit={(e) => { e.preventDefault(); setWizardStep(2); }} className="d-flex flex-column gap-5">
            
            {/* Seção 01: Localização */}
            <section>
              <h3 className="section-title">Onde está o problema?</h3>
              <div className="row g-4">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Bloco / Prédio</label>
                  <input 
                    type="text" 
                    className="form-control form-control-lg border-light-subtle shadow-none fs-6" 
                    placeholder="Ex: Bloco A" 
                    value={setor} 
                    onChange={(e) => setSetor(e.target.value)} 
                    required 
                  />
                  <span className="form-helper-text">Indique o pavilhão principal do campus.</span>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Sala ou Laboratório</label>
                  <input 
                    type="text" 
                    className="form-control form-control-lg border-light-subtle shadow-none fs-6" 
                    placeholder="Ex: Sala 102" 
                    value={localExato} 
                    onChange={(e) => setLocalExato(e.target.value)} 
                    required 
                  />
                  <span className="form-helper-text">Número da sala ou nome do laboratório.</span>
                </div>
              </div>
            </section>

            {/* Seção 02: Classificação */}
            <section>
              <h3 className="section-title">Classificação do chamado</h3>
              <div className="row g-4">
                <div className="col-12">
                  <label className="form-label small fw-semibold text-secondary">Categoria técnica</label>
                  <select 
                    className="form-select form-select-lg border-light-subtle shadow-none fs-6" 
                    value={categoria} 
                    onChange={e => setCategoria(e.target.value)}
                  >
                    {CATEGORIAS_GTI.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <TextArea 
                    label="O que está acontecendo?" 
                    value={descricao} 
                    onChange={setDescricao} 
                    placeholder="Descreva o defeito de forma breve e clara..." 
                    rows={4} 
                    className="form-control-lg border-light-subtle shadow-none fs-6" 
                  />
                  <div className="d-flex justify-content-between mt-2">
                    <span className="form-helper-text">Mínimo de 10 caracteres para validar o envio.</span>
                    <span className={`char-counter font-monospace ${descricao.length >= 10 ? 'text-success border-success-subtle' : ''}`}>
                      {descricao.length} carac.
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Rodapé de Ação */}
            <div className="pt-4 border-top d-flex align-items-center justify-content-between">
              <div className={`px-3 py-2 rounded-pill font-monospace fw-bold d-flex align-items-center gap-2 ${infoPrazo.bg}`} style={{ color: infoPrazo.cor, fontSize: '10px' }}>
                <i className="fa-solid fa-clock"></i> SLA: {infoPrazo.prazo}
              </div>
              <button 
                type="submit" 
                className="btn btn-primary px-5 py-2.5 fw-bold shadow-sm d-flex align-items-center gap-2 rounded-3 border-0"
                disabled={isFormInvalid}
                style={{ backgroundColor: isFormInvalid ? '#cbd5e1' : '#0284c7', transition: 'all 0.2s' }}
              >
                Avançar para Revisão <i className="fa-solid fa-arrow-right small"></i>
              </button>
            </div>
          </form>
        ) : (
          /* TELA DE REVISÃO (STEP 2) */
          <div className="animate__animated animate__fadeIn">
            <h3 className="section-title mb-4">Confirme os detalhes da solicitação</h3>
            <div className="bg-white border border-light-subtle rounded-4 p-4 shadow-sm mb-5">
              <div className="row g-4 font-monospace">
                <div className="col-md-6">
                  <span className="text-muted d-block small fw-bold mb-1">LOCALIZAÇÃO</span>
                  <span className="text-dark fs-6 text-uppercase fw-bold">{setor} — {localExato}</span>
                </div>
                <div className="col-md-6">
                  <span className="text-muted d-block small fw-bold mb-1">CATEGORIA</span>
                  <span className="text-primary fs-6 fw-bold">{categoria}</span>
                </div>
                <div className="col-12 border-top pt-3">
                  <span className="text-muted d-block small fw-bold mb-2">DESCRIÇÃO INFORMADA</span>
                  <div className="p-3 bg-light bg-opacity-50 rounded-3 text-secondary lh-base" style={{ fontSize: '13px' }}>
                    "{descricao}"
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center">
              <button 
                type="button" 
                className="btn btn-link text-secondary text-decoration-none fw-bold small" 
                onClick={() => setWizardStep(1)}
              >
                <i className="fa-solid fa-chevron-left me-2"></i>Voltar e editar
              </button>
              <button 
                type="button" 
                className="btn btn-success px-5 py-3 fw-bold shadow d-flex align-items-center gap-2 rounded-3 border-0 text-white" 
                onClick={handleFinalSubmit} 
                disabled={submitting}
                style={{ backgroundColor: '#059669', minWidth: '280px' }}
              >
                {submitting ? (
                  <><span className="spinner-border spinner-border-sm"></span> Registrando no Sistema...</>
                ) : (
                  <><i className="fa-solid fa-paper-plane"></i> Confirmar e Abrir Chamado</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}