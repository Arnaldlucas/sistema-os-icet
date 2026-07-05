import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TextArea } from '../components/TextArea';

/**
 * @component RequestForm
 * @description Formulário wizard dinâmico e adaptativo para abertura de OS conectado ao banco de dados em tempo real.
 */
export function RequestForm({ onRefreshRequests, onNavigate }) {
  const { request } = useAuth();
  const [wizardStep, setWizardStep] = useState(1);

  // Estados dinâmicos vindos da API de Governança
  const [dbBlocos, setDbBlocos] = useState([]);
  const [dbCategorias, setDbCategorias] = useState([]);

  // Estados Gerenciais do Formulário Adaptativo
  const [campus, setCampus] = useState('CAMPUS_1');
  const [bloco, setBloco] = useState('');
  const [sala, setSala] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  
  // Estados de Upload de Arquivos
  const [imagemAnexa, setImagemAnexa] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  // 🚀 REQUISITO CRÍTICO: Carrega os blocos e as categorias dinâmicas do banco de dados ao iniciar
  useEffect(() => {
    const buscarMetadadosGovernança = async () => {
      try {
        const blocosRes = await request('/api/requests/blocos');
        if (blocosRes && Array.isArray(blocosRes)) {
          setDbBlocos(blocosRes);
        } else {
          setDbBlocos([]);
        }

        const catsRes = await request('/api/requests/categorias');
        if (catsRes && Array.isArray(catsRes)) {
          setDbCategorias(catsRes);
          if (catsRes.length > 0) setCategoria(catsRes[0].nome); // Inicializa com a primeira cadastrada
        } else {
          setDbCategorias([]);
        }
      } catch (err) {
        setErrorBanner("Aviso: Falha ao carregar catálogo de serviços ativo do banco de dados.");
        setDbBlocos([]);
        setDbCategorias([]);
      }
    };
    buscarMetadadosGovernança();
  }, []);

  // 🚀 FILTRO DINÂMICO: Filtra os blocos baseados no Campus selecionado na tela assegurando o tipo Array
  const blocosFiltrados = Array.isArray(dbBlocos) ? dbBlocos.filter(b => b.campus === campus) : [];

  // Garante que o seletor de blocos atualize a opção padrão ao mudar de campus
  useEffect(() => {
    if (Array.isArray(blocosFiltrados) && blocosFiltrados.length > 0) {
      setBloco(blocosFiltrados[0].nome);
    } else {
      setBloco('');
    }
  }, [campus, dbBlocos]);

  const handleCampusChange = (targetCampus) => {
    setCampus(targetCampus);
  };

  const handleSalaInput = (e) => {
    const apenasNumeros = e.target.value.replace(/\D/g, '');
    if (apenasNumeros.length <= 3) {
      setSala(apenasNumeros);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorBanner("Formato inválido: É permitido anexar apenas arquivos de imagem.");
        return;
      }
      setImagemAnexa(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const obtenerPrazoEstimado = (catNome) => {
    if (!Array.isArray(dbCategorias)) return { prazo: "24h estimadas (SLA Padrão)", cor: "#10b981", bg: "bg-success-subtle" };
    const categoriaAlvo = dbCategorias.find(c => c.nome === catNome);
    if (categoriaAlvo) {
      return { 
        prazo: `Até ${categoriaAlvo.sla_horas_estimadas}h úteis (SLA Corporativo)`, 
        cor: categoriaAlvo.sla_horas_estimadas <= 24 ? "#10b981" : "#0284c7", 
        bg: categoriaAlvo.sla_horas_estimadas <= 24 ? "bg-success-subtle" : "bg-primary-subtle" 
      };
    }
    return { prazo: "24h estimadas (SLA Padrão)", cor: "#10b981", bg: "bg-success-subtle" };
  };

  const infoPrazo = obtenerPrazoEstimado(categoria);
  const isFormInvalid = !bloco || !bloco.trim() || !sala.trim() || descricao.trim().length < 10 || submitting;

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setErrorBanner('');

    const formData = new FormData();
    formData.append('categoria', categoria);
    formData.append('campus', campus);
    formData.append('bloco', bloco);
    formData.append('sala', sala);
    formData.append('descricao', descricao.trim());
    formData.append('titulo', `[${categoria}] ${bloco} - Sala ${sala}`);

    if (imagemAnexa) {
      formData.append('arquivo', imagemAnexa);
    }

    try {
      const response = await request('/api/requests', {
        method: 'POST',
        body: formData,
        headers: {} // Deixe vazio para o navegador injetar o boundary de multipart de forma nativa
      });

      if (response && response.success === false) throw new Error(response.message);
      
      if (onRefreshRequests) await onRefreshRequests();
      if (onNavigate) onNavigate("consultas");
    } catch (err) {
      setErrorBanner(err.message || "Falha na comunicação e persistência do chamado.");
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
        .preview-img { max-height: 180px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; }
      `}</style>

      {/* 🧭 STEPPER VISUAL */}
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
            
            {/* Seção 01: Localização Unificada Dinâmica */}
            <section>
              <h3 className="section-title">Onde está localizado o incidente?</h3>
              <div className="row g-4">
                <div className="col-12">
                  <label className="form-label small fw-semibold text-secondary">Campus Unidade</label>
                  <div className="d-flex gap-3">
                    <button type="button" className={`btn w-50 py-2.5 fw-bold border ${campus === 'CAMPUS_1' ? 'btn-primary border-0' : 'btn-light text-secondary'}`} onClick={() => handleCampusChange('CAMPUS_1')}>Campus 1 (Sede)</button>
                    <button type="button" className={`btn w-50 py-2.5 fw-bold border ${campus === 'CAMPUS_2' ? 'btn-primary border-0' : 'btn-light text-secondary'}`} onClick={() => handleCampusChange('CAMPUS_2')}>Campus 2 (Setorial)</button>
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Bloco / Prédio</label>
                  <select 
                    className="form-select form-select-lg border-light-subtle shadow-none fs-6" 
                    value={bloco} 
                    onChange={(e) => setBloco(e.target.value)} 
                    required
                  >
                    {blocosFiltrados.length === 0 ? (
                      <option value="">Nenhum bloco cadastrado nesta unidade</option>
                    ) : (
                      blocosFiltrados.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)
                    )}
                  </select>
                  <span className="form-helper-text">Mapeamento dinâmico extraído em tempo real da Central de Governança.</span>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Sala (Apenas Números)</label>
                  <input 
                    type="text" 
                    className="form-control form-control-lg border-light-subtle shadow-none fs-6 font-monospace" 
                    placeholder="Ex: 102" 
                    value={sala} 
                    onChange={handleSalaInput} 
                    required 
                  />
                  <span className="form-helper-text">Restrito a no máximo 3 caracteres numéricos.</span>
                </div>
              </div>
            </section>

            {/* Seção 02: Classificação e Categoria Dinâmica */}
            <section>
              <h3 className="section-title">Classificação e Detalhes Técnicos</h3>
              <div className="row g-4">
                <div className="col-12">
                  <label className="form-label small fw-semibold text-secondary">Categoria técnica</label>
                  <select 
                    className="form-select form-select-lg border-light-subtle shadow-none fs-6" 
                    value={categoria} 
                    onChange={e => setCategoria(e.target.value)}
                    required
                  >
                    {Array.isArray(dbCategorias) && dbCategorias.length === 0 ? (
                      <option value="">Nenhuma categoria de serviço cadastrada</option>
                    ) : (
                      Array.isArray(dbCategorias) && dbCategorias.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)
                    )}
                  </select>
                </div>
                <div className="col-12">
                  <TextArea 
                    label="Descrição técnica do incidente" 
                    value={descricao} 
                    onChange={setDescricao} 
                    placeholder="Forneça detalhes observáveis do problema técnico..." 
                    rows={4} 
                    className="form-control-lg border-light-subtle shadow-none fs-6" 
                  />
                  <div className="d-flex justify-content-between mt-2">
                    <span className="form-helper-text">Mínimo de 10 caracteres estruturais para validação.</span>
                    <span className={`char-counter font-monospace ${descricao.length >= 10 ? 'text-success border-success-subtle' : ''}`}>
                      {descricao.length} carac.
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Seção 03: Evidência Visual */}
            <section>
              <h3 className="section-title">Anexar Evidência Visual (Opcional)</h3>
              <div className="p-4 rounded-4 border border-dashed text-center bg-light bg-opacity-25">
                <input 
                  type="file" 
                  id="file-upload" 
                  className="d-none" 
                  accept="image/*" 
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="btn btn-outline-secondary btn-sm px-4 py-2 fw-bold rounded-3 border-light-subtle shadow-none">
                  <i className="fa-solid fa-camera me-2"></i> Selecionar Imagem
                </label>
                {imagemAnexa ? (
                  <div className="mt-3 animate__animated animate__fadeIn">
                    <img src={imagePreviewUrl} alt="Preview" className="preview-img mb-1" />
                    <span className="d-block small text-success fw-semibold font-monospace">{imagemAnexa.name}</span>
                  </div>
                ) : (
                  <span className="form-helper-text d-block mt-2">Insira uma captura de tela ou foto do defeito físico.</span>
                )}
              </div>
            </section>

            {/* Rodapé */}
            <div className="pt-4 border-top d-flex align-items-center justify-content-between">
              <div className={`px-3 py-2 rounded-pill font-monospace fw-bold d-flex align-items-center gap-2 ${infoPrazo.bg}`} style={{ color: infoPrazo.cor, fontSize: '10px' }}>
                <i className="fa-solid fa-clock"></i> {infoPrazo.prazo}
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
            <h3 className="section-title mb-4">Confirme a integridade dos dados da Ordem de Serviço</h3>
            <div className="bg-white border border-light-subtle rounded-4 p-4 shadow-sm mb-5">
              <div className="row g-4 font-monospace">
                <div className="col-md-4">
                  <span className="text-muted d-block small fw-bold mb-1">LOCALIZAÇÃO</span>
                  <span className="text-dark fs-6 text-uppercase fw-bold">{campus.replace('_', ' ')}</span>
                </div>
                <div className="col-md-4">
                  <span className="text-muted d-block small fw-bold mb-1">PAVILHÃO / SALA</span>
                  <span className="text-dark fs-6 text-uppercase fw-bold">{bloco} — Sala {sala}</span>
                </div>
                <div className="col-md-4">
                  <span className="text-muted d-block small fw-bold mb-1">CATEGORIA TÉCNICA</span>
                  <span className="text-primary fs-6 fw-bold">{categoria}</span>
                </div>
                <div className="col-12 border-top pt-3">
                  <span className="text-muted d-block small fw-bold mb-2">RELATO DO INCIDENTE</span>
                  <div className="p-3 bg-light bg-opacity-50 rounded-3 text-secondary lh-base" style={{ fontSize: '13px' }}>
                    "{descricao}"
                  </div>
                </div>
                {imagePreviewUrl && (
                  <div className="col-12 border-top pt-3">
                    <span className="text-muted d-block small fw-bold mb-2">EVIDÊNCIA ANEXADA</span>
                    <div className="d-flex justify-content-start">
                      <img src={imagePreviewUrl} alt="Revisão Anexo" className="preview-img shadow-sm" />
                    </div>
                  </div>
                )}
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
                  <><span className="spinner-border spinner-border-sm"></span> Gravando no Banco...</>
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