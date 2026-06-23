import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * @component Register
 * @description Componente de formulário de auto-cadastro para novos servidores do ICET/UFAM.
 * Refatorado para o padrão Grid de Duas Colunas para Desktop com retenção estrita das regras de negócio.
 */
export function Register({ onNavigate }) {
  const { registerUser } = useAuth();
  
  const [formData, setPayload] = useState({
    nome_completo: '',
    username: '',
    email: '',
    siape: '',
    cargo: 'Servidor', 
    password: ''
  });

  const [comprovanteBase64, setComprovanteBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const calcularForcaSenha = (senha) => {
    if (!senha) return 0;
    let pontos = 0;
    if (senha.length >= 8) pontos += 20;
    if (/[A-Z]/.test(senha)) pontos += 20;
    if (/[a-z]/.test(senha)) pontos += 20;
    if (/[0-9]/.test(senha)) pontos += 20;
    if (/[^A-Za-z0-9]/.test(senha)) pontos += 20;
    return pontos;
  };

  const forcaSenha = calcularForcaSenha(formData.password);

  const obterEstiloBarra = (progresso) => {
    if (progresso <= 40) return { cor: '#ef4444', largura: '30%', txt: 'Senha Insegura' };
    if (progresso <= 60) return { cor: '#f59e0b', largura: '60%', txt: 'Senha Fraca' };
    if (progresso <= 80) return { cor: '#3b82f6', largura: '80%', txt: 'Senha Aceitável' };
    return { cor: '#10b981', largura: '100%', txt: 'Senha Forte e Segura' };
  };

  const barraConfig = obterEstiloBarra(forcaSenha);
  const isSiapeValid = /^\d{5,12}$/.test(formData.siape.trim());

  // Regras de validação do Checklist Vivo de Senha
  const senhaRegras = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    special: /[0-9]/.test(formData.password) && /[^A-Za-z0-9]/.test(formData.password)
  };

  const isFormInvalid = 
    !formData.nome_completo.trim() || 
    !formData.username.trim() || 
    !formData.email.includes('@ufam.edu.br') || 
    !isSiapeValid || 
    !comprovanteBase64 ||
    forcaSenha < 100 || 
    isSubmitting;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("Limite de segurança extrapolado: o documento deve possuir no máximo 4MB.");
      e.target.value = "";
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setComprovanteBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFormInvalid) return;

    setIsSubmitting(true);
    setErrorFeedback('');

    const payloadHigienizado = {
      nome_completo: formData.nome_completo.trim(),
      username: formData.username.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
      siape: formData.siape.trim(),
      cargo: formData.cargo, 
      password: formData.password,
      comprovante_base64: comprovanteBase64, 
      role: 'servidor'
    };

    try {
      const res = await registerUser(payloadHigienizado);
      if (res && res.success) {
        setShowSuccessModal(true);
      } else {
        const mensagemErro = res?.message && typeof res.message === 'object'
          ? (res.message.detail || JSON.stringify(res.message))
          : (res?.message || "Inconsistência nos metadados enviados.");
        setErrorFeedback(String(mensagemErro));
      }
    } catch (err) {
      setErrorFeedback("Falha de comunicação com o barramento institucional.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    if (onNavigate) onNavigate('login');
  };

  return (
    <div className="w-100 min-vh-100 position-fixed top-0 start-0 d-flex align-items-center justify-content-center p-3 overflow-y-auto"
         style={{
           background: 'linear-gradient(180deg, #064e3b 0%, #0f172a 100%)',
           zIndex: 1045
         }}>
      
      <style>{`
        .premium-floating-group { position: relative; margin-bottom: 1.25rem; width: 100%; }
        .premium-floating-group label { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 13px; transition: all 0.2s ease; pointer-events: none; background: transparent; padding: 0 4px; }
        .premium-floating-group input:focus ~ label,
        .premium-floating-group input:not(:placeholder-shown) ~ label { top: 0; transform: translateY(-50%); font-size: 10.5px; color: #10b981; font-weight: 700; background-color: #fff; }
        .premium-input-field { width: 100%; padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13.5px; transition: all 0.2s ease; color: #1f2937; background-color: #fff; }
        .premium-input-field:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.08); }
        
        .premium-dropzone-wrapper { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 1.25rem; text-align: center; background-color: rgba(248, 250, 252, 0.7); cursor: pointer; transition: all 0.2s ease; width: 100%; }
        .premium-dropzone-wrapper:hover { border-color: #10b981; background-color: rgba(16, 185, 129, 0.02); }
        
        .rule-item { font-size: 11px; font-family: monospace; transition: color 0.2s ease; }
        .rule-valid { color: #059669 !important; font-weight: 600; }
        .rule-invalid { color: #94a3b8; }
      `}</style>

      <div className="card border-0 p-4 p-md-5 bg-white rounded-4 animate__animated animate__fadeIn" 
           style={{ 
             maxWidth: '780px', 
             width: '100%',
             boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
           }}>

        <div className="text-center mb-4 pb-2">
          <h2 className="h4 fw-extrabold text-dark m-0" style={{ fontWeight: '800', letterSpacing: '-0.5px' }}>Solicitar Credenciamento</h2>
          <p className="text-muted small m-0 mt-1 font-monospace" style={{ fontSize: '11px' }}>Acesso unificado para servidores ativos do ICET</p>
        </div>

        {errorFeedback && (
          <div className="alert alert-danger py-2.5 px-3 small border-0 mb-4 d-flex align-items-center gap-2 rounded-3">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span className="fw-semibold" style={{ fontSize: '12px' }}>{errorFeedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 💻 GRID LAYOUT DE DUAS COLUNAS PARA DESKTOP */}
          <div className="row g-0 row-cols-1 row-cols-md-2 gap-md-4">
            
            {/* COLUNA ESQUERDA: DADOS PESSOAIS */}
            <div className="d-flex flex-column flex-grow-1" style={{ minWidth: '0' }}>
              <h3 className="h6 fw-bold text-slate-800 font-monospace mb-3 text-uppercase" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>Identificação Cadastral</h3>
              
              <div className="premium-floating-group">
                <input type="text" className="premium-input-field" placeholder=" " value={formData.nome_completo} onChange={e => setPayload(p => ({...p, nome_completo: e.target.value}))} disabled={isSubmitting} required />
                <label>Nome Completo</label>
              </div>

              <div className="premium-floating-group">
                <input type="email" className={`premium-input-field ${formData.email && !formData.email.includes('@ufam.edu.br') ? 'border-warning' : ''}`} placeholder=" " value={formData.email} onChange={e => setPayload(p => ({...p, email: e.target.value}))} disabled={isSubmitting} required />
                <label>E-mail Institucional (@ufam.edu.br)</label>
              </div>

              <div className="premium-floating-group">
                <input type="text" className={`premium-input-field ${formData.siape && !isSiapeValid ? 'border-danger' : ''}`} placeholder=" " value={formData.siape} onChange={e => setPayload(p => ({...p, siape: e.target.value.replace(/\D/g, '')}))} disabled={isSubmitting} required />
                <label>Número SIAPE</label>
              </div>
            </div>

            {/* COLUNA DIREITA: SEGURANÇA E DOCUMENTO */}
            <div className="d-flex flex-column flex-grow-1" style={{ minWidth: '0' }}>
              <h3 className="h6 fw-bold text-slate-800 font-monospace mb-3 text-uppercase" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>Credenciais Lógicas</h3>

              <div className="premium-floating-group">
                <input type="text" className="premium-input-field" placeholder=" " value={formData.username} onChange={e => setPayload(p => ({...p, username: e.target.value}))} disabled={isSubmitting} required />
                <label>Nome de Usuário (Ex: nome.sobrenome)</label>
              </div>

              <div className="premium-floating-group mb-2">
                <input type="password" className="premium-input-field" placeholder=" " value={formData.password} onChange={e => setPayload(p => ({...p, password: e.target.value}))} disabled={isSubmitting} required />
                <label>Definir Nova Senha</label>
              </div>

              {/* Checklist Vivo de Complexidade de Senha (Estilo Stripe/Google) */}
              <div className="mb-3 px-1 d-flex flex-column gap-1">
                <div className={`rule-item ${senhaRegras.length ? 'rule-valid' : 'rule-invalid'}`}>
                  <i className={`fa-solid ${senhaRegras.length ? 'fa-circle-check' : 'fa-circle'} me-1.5`}></i> Mínimo de 8 caracteres
                </div>
                <div className={`rule-item ${senhaRegras.uppercase ? 'rule-valid' : 'rule-invalid'}`}>
                  <i className={`fa-solid ${senhaRegras.uppercase ? 'fa-circle-check' : 'fa-circle'} me-1.5`}></i> Uma letra maiúscula (A-Z)
                </div>
                <div className={`rule-item ${senhaRegras.special ? 'rule-valid' : 'rule-invalid'}`}>
                  <i className={`fa-solid ${senhaRegras.special ? 'fa-circle-check' : 'fa-circle'} me-1.5`}></i> Um número e caractere especial (@, #, $)
                </div>
              </div>

              {/* Área de Dropzone de Comprovação Funcional */}
              <div className="mb-2">
                <div className="premium-dropzone-wrapper" onClick={() => document.getElementById('premium-file-hidden-input').click()}>
                  <i className={`fa-solid ${fileName ? 'fa-file-circle-check text-success' : 'fa-cloud-arrow-up text-muted'} fa-lg mb-2 d-block`}></i>
                  <span className="d-block text-dark fw-bold" style={{ fontSize: '11px' }}>
                    {fileName ? fileName : "Arraste seu contracheque ou crachá aqui"}
                  </span>
                  <span className="text-muted font-monospace d-block mt-1" style={{ fontSize: '9px' }}>
                    PDF ou Imagem (Máx: 4MB)
                  </span>
                </div>
                <input id="premium-file-hidden-input" type="file" className="d-none" accept="image/*,application/pdf" onChange={handleFileChange} disabled={isSubmitting} />
              </div>
            </div>

          </div>

          {/* 🧾 RODAPÉ DO CARD COM LINHA DIVISÓRIA SUTIL */}
          <div className="pt-3 border-top d-flex flex-sm-row flex-column-reverse justify-content-end align-items-center gap-3 w-100 mt-4">
            <button type="button" className="btn btn-link shadow-none font-monospace text-muted text-decoration-none py-2" style={{ fontSize: '11px' }} onClick={() => onNavigate('login')} disabled={isSubmitting}>
              <i className="fa-solid fa-arrow-left small me-1"></i> Voltar ao Login
            </button>
            <button type="submit" className="btn btn-success py-2.5 px-4 fw-bold text-white shadow-sm border-0 rounded-3 text-uppercase font-monospace" style={{ backgroundColor: '#10b981', fontSize: '11px', letterSpacing: '0.5px' }} disabled={isFormInvalid}>
              {isSubmitting ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
              {isSubmitting ? "Sincronizando..." : "Finalizar Cadastro"}
            </button>
          </div>
        </form>

        {/* MODAL DE SUCESSO HOMOLOGADO */}
        {showSuccessModal && (
          <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 9999, backdropFilter: 'blur(3px)' }}>
            <div className="bg-white p-4 mx-3 text-center rounded-4 border shadow-xl animate__animated animate__zoomIn" style={{ maxWidth: '440px', width: '100%' }}>
              <div className="p-2.5 bg-success bg-opacity-10 text-success rounded-circle d-inline-block mb-3">
                <i className="fa-solid fa-circle-check fa-2xl"></i>
              </div>
              <h3 className="h5 fw-extrabold text-dark mb-2" style={{ fontWeight: '800', letterSpacing: '-0.3px' }}>Solicitação em Fila técnica</h3>
              <p className="text-muted small mb-4 px-1" style={{ lineHeight: '1.6', fontSize: '12px' }}>
                Para garantir a conformidade institucional, seus dados funcionais foram encaminhados para a esteira de auditoria. Um e-mail de liberação lógica será disparado para sua conta institucional em até 24 horas úteis.
              </p>
              <div className="d-grid">
                <button className="btn text-white fw-bold py-2.5 shadow-sm font-monospace text-uppercase" onClick={handleModalClose} style={{ fontSize: '11px', backgroundColor: '#0f172a', letterSpacing: '0.5px' }}>
                  Retornar ao Portal de Login
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}