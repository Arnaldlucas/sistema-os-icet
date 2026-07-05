import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * @component Register
 * @description Central de Credenciamento Base do ICET/UFAM em 2 Etapas com herança automatizada de prefixo corporativo.
 */
export function Register({ onNavigate }) {
  const { registerUser, requestRegisterToken, verifyRegisterToken } = useAuth();
  
  // Controle de fluxo de fluxo de estado: 'EMAIL' (Etapa 1) ou 'FORMULARIO' (Etapa 2)
  const [etapaCadastro, setEtapaCadastro] = useState('EMAIL');
  const [emailPrefix, setEmailPrefix] = useState('');
  const [tokenOtp, setTokenOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const [formData, setPayload] = useState({
    nome_completo: '',
    siape: '',
    cargo: 'Servidor', // Classe base unificada regulamentar
    password: ''
  });

  const [comprovanteBase64, setComprovanteBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSolicitarToken = async (e) => {
    e.preventDefault();
    if (!emailPrefix.trim()) return;
    setIsSubmitting(true);
    setErrorFeedback('');
    try {
      const res = await requestRegisterToken(emailPrefix);
      if (res && res.success) {
        alert("Código de verificação efêmero disparado para a sua caixa institucional.");
      } else {
        setErrorFeedback(res?.message || "Erro de barramento ao gerar chave de validação.");
      }
    } catch {
      setErrorFeedback("Falha física de comunicação com o servidor UFAM.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidarToken = async (e) => {
    e.preventDefault();
    if (!tokenOtp.trim() || tokenOtp.length !== 6) return;
    setIsSubmitting(true);
    setErrorFeedback('');
    try {
      const res = await verifyRegisterToken(emailPrefix, tokenOtp);
      if (res && res.success) {
        setEtapaCadastro('FORMULARIO');
      } else {
        setErrorFeedback(res?.message || "Token OTP incorreto ou tempo limite expirado.");
      }
    } catch {
      setErrorFeedback("Erro de barramento na verificação do token.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("Segurança do Storage: O documento digital anexado deve possuir no máximo 4MB.");
      e.target.value = "";
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setComprovanteBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== confirmPassword) {
      setErrorFeedback("A confirmação de senha diverge da credencial definida.");
      return;
    }
    setIsSubmitting(true);
    setErrorFeedback('');

    // 🚀 INJEÇÃO AUTOMÁTICA DE METADADOS: Herda e normaliza os dados do Passo 1
    const prefixoHigienizado = emailPrefix.trim().toLowerCase();
    const payloadFinal = {
      nome_completo: formData.nome_completo.trim(),
      username: prefixoHigienizado, // O username passa a ser o prefixo puro do e-mail de forma imutável
      email: `${prefixoHigienizado}@ufam.edu.br`,
      siape: formData.siape.trim(),
      cargo: formData.cargo,
      password: formData.password,
      comprovante_base64: comprovanteBase64
    };

    try {
      const res = await registerUser(payloadFinal);
      if (res && res.success) {
        setShowSuccessModal(true);
      } else {
        setErrorFeedback(res?.message || "Inconsistência estrutural ao salvar solicitação.");
      }
    } catch {
      setErrorFeedback("Erro transacional de rede ao consolidar informações funcionais.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ SOLUÇÃO DO CRASH: Função de fechamento do modal declarada corretamente no escopo
  const handleModalClose = () => {
    setShowSuccessModal(false);
    setErrorFeedback('');
    if (onNavigate) onNavigate('login');
  };

  const checarRegras = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>_+-]/.test(formData.password)
  };

  // 🚀 VALIDAÇÃO ESTRITA DO SIAPE: Exige apenas números entre 5 e 12 dígitos
  const isSiapeValid = /^\d{5,12}$/.test(formData.siape.trim());

  const isFormInvalid = 
    !formData.nome_completo.trim() || 
    !isSiapeValid ||
    !comprovanteBase64 ||
    !checarRegras.length || !checarRegras.uppercase || !checarRegras.special ||
    isSubmitting;

  return (
    <div className="w-100 min-vh-100 position-fixed top-0 start-0 d-flex align-items-center justify-content-center p-3 overflow-y-auto"
         style={{ background: 'linear-gradient(180deg, #064e3b 0%, #0f172a 100%)', zIndex: 1045 }}>
      
      <style>{`
        .premium-floating-group { position: relative; margin-bottom: 1.25rem; width: 100%; }
        .premium-floating-group label { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 13px; transition: all 0.2s ease; pointer-events: none; padding: 0 4px; }
        .premium-floating-group input:focus ~ label,
        .premium-floating-group input:not(:placeholder-shown) ~ label { top: 0; transform: translateY(-50%); font-size: 11px; color: #10b981; font-weight: 700; background-color: #fff; }
        .premium-input-field { width: 100%; padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13.5px; transition: all 0.2s ease; color: #1f2937; background-color: #fff; }
        .premium-input-field:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.08); }
        .premium-dropzone-wrapper { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 1.25rem; text-align: center; background-color: rgba(248, 250, 252, 0.7); cursor: pointer; }
        .rule-item { font-size: 11px; font-family: monospace; }
        .rule-valid { color: #059669 !important; font-weight: 600; }
        .rule-invalid { color: #94a3b8; }
      `}</style>

      <div className="card border-0 p-4 p-md-5 bg-white rounded-4 shadow-2xl animate__animated animate__fadeIn" style={{ maxWidth: '740px', width: '100%' }}>
        <div className="text-center mb-4">
          <h2 className="h4 fw-bold text-dark m-0" style={{ fontWeight: '800' }}>Portal de Credenciamento — ICET</h2>
          <p className="text-muted small m-0 mt-1 font-monospace">Validação de Segurança e Identidade de Servidores</p>
        </div>

        {errorFeedback && (
          <div className="alert alert-danger py-2 px-3 small border-0 mb-4 rounded-3 d-flex align-items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span style={{ fontSize: '12px' }}>{errorFeedback}</span>
          </div>
        )}

        {/* 🚀 ETAPA 1: FLUXO DE VERIFICAÇÃO DE EMAIL */}
        {etapaCadastro === 'EMAIL' && (
          <div className="animate__animated animate__fadeIn">
            <form onSubmit={handleSolicitarToken} className="mb-4">
              <label className="form-label text-secondary small fw-bold font-monospace text-uppercase" style={{ fontSize: '10px' }}>Passo 1: Identificar E-mail Institucional</label>
              <div className="d-flex gap-2 align-items-center">
                <input type="text" className="premium-input-field text-end" placeholder="username" value={emailPrefix} onChange={e => setEmailPrefix(e.target.value.replace(/[^A-Za-z0-9._-]/g, ''))} required style={{ flex: '1' }} />
                <span className="fw-bold text-dark font-monospace px-2 py-2 bg-light rounded-3" style={{ fontSize: '14px' }}>@ufam.edu.br</span>
                <button type="submit" className="btn btn-dark px-3 py-2.5 rounded-3 fw-bold font-monospace" style={{ fontSize: '12px' }} disabled={isSubmitting || !emailPrefix}>
                  {isSubmitting ? "Enviando..." : "Enviar Código"}
                </button>
              </div>
            </form>

            <form onSubmit={handleValidarToken}>
              <label className="form-label text-secondary small fw-bold font-monospace text-uppercase" style={{ fontSize: '10px' }}>Passo 2: Inserir Código de 6 dígitos</label>
              <div className="premium-floating-group">
                <input type="text" className="premium-input-field font-monospace text-center fs-5" placeholder=" " value={tokenOtp} onChange={e => setTokenOtp(e.target.value.replace(/\D/g, '').substring(0,6))} required />
                <label className="w-100 text-center" style={{ left: 0 }}>Código Verificador</label>
              </div>
              <div className="d-grid mt-3">
                <button type="submit" className="btn btn-success py-2.5 text-white fw-bold font-monospace rounded-3" style={{ backgroundColor: '#10b981' }} disabled={tokenOtp.length !== 6 || isSubmitting}>
                  Validar e Prosseguir <i className="fa-solid fa-arrow-right ms-1"></i>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 🚀 ETAPA 2: COMPLEMENTAÇÃO DOS DADOS FUNCIONAIS (TRAVADO ATRÁS DO TOKEN) */}
        {etapaCadastro === 'FORMULARIO' && (
          <form onSubmit={handleFinalSubmit} className="animate__animated animate__fadeIn">
            <div className="p-2 mb-3 bg-light border rounded-3 font-monospace" style={{ fontSize: '12px' }}>
              <i className="fa-solid fa-envelope-circle-check text-success me-1.5"></i> Identidade Chancelada: <strong className="text-dark">{emailPrefix.toLowerCase()}@ufam.edu.br</strong>
            </div>

            <div className="row g-0 row-cols-1 row-cols-md-2 gap-md-4">
              
              <div className="d-flex flex-column flex-grow-1">
                <h3 className="h6 fw-bold font-monospace text-uppercase mb-3" style={{ fontSize: '10px', color: '#10b981' }}>Identificação Corporativa</h3>
                
                <div className="premium-floating-group">
                  <input type="text" className="premium-input-field" placeholder=" " value={formData.nome_completo} onChange={e => setPayload(p => ({...p, nome_completo: e.target.value}))} required />
                  <label>Nome Completo</label>
                </div>

                <div className="premium-floating-group">
                  <input type="text" className="premium-input-field" placeholder=" " value={formData.siape} onChange={e => setPayload(p => ({...p, siape: e.target.value.replace(/\D/g, '')}))} required />
                  <label>Identificador Funcional SIAPE (5 a 12 dígitos)</label>
                </div>

                <div className="mb-2">
                  <div className="premium-dropzone-wrapper" onClick={() => document.getElementById('file-hidden').click()}>
                    <i className={`fa-solid ${fileName ? 'fa-file-circle-check text-success' : 'fa-cloud-arrow-up text-muted'} mb-1 d-block`}></i>
                    <span className="d-block text-dark fw-bold" style={{ fontSize: '11px' }}>{fileName ? fileName : "Anexar Comprovação Funcional"}</span>
                    <span className="text-muted d-block" style={{ fontSize: '9px' }}>Crachá ou Contracheque Oficial (Máx 4MB)</span>
                  </div>
                  <input id="file-hidden" type="file" className="d-none" accept="image/*,application/pdf" onChange={handleFileChange} />
                </div>
              </div>

              <div className="d-flex flex-column flex-grow-1">
                <h3 className="h6 fw-bold font-monospace text-uppercase mb-3" style={{ fontSize: '10px', color: '#10b981' }}>Segurança de Credenciais</h3>

                <div className="premium-floating-group mb-2 position-relative">
                  <input type={showPassword ? "text" : "password"} className="premium-input-field pe-5" placeholder=" " value={formData.password} onChange={e => setPayload(p => ({...p, password: e.target.value}))} required />
                  <label>Senha de Acesso</label>
                  <button type="button" className="btn position-absolute top-50 end-0 translate-middle-y border-0 bg-transparent text-muted px-3" onClick={() => setShowPassword(!showPassword)}>
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>

                <div className="premium-floating-group mb-2">
                  <input type="password" className="premium-input-field" placeholder=" " value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                  <label>Confirme a Senha</label>
                </div>

                <div className="mb-3 d-flex flex-column gap-1 bg-light p-2 rounded-3">
                  <div className={`rule-item ${checarRegras.length ? 'rule-valid' : 'rule-invalid'}`}><i className="fa-solid fa-circle-check me-1"></i> Mínimo de 8 caracteres</div>
                  <div className={`rule-item ${checarRegras.uppercase ? 'rule-valid' : 'rule-invalid'}`}><i className="fa-solid fa-circle-check me-1"></i> Uma letra maiúscula</div>
                  <div className={`rule-item ${checarRegras.special ? 'rule-valid' : 'rule-invalid'}`}><i className="fa-solid fa-circle-check me-1"></i> Caractere especial e número</div>
                </div>
              </div>

            </div>

            <div className="pt-3 border-top d-flex justify-content-end gap-3 mt-4">
              <button type="submit" className="btn btn-success py-2 px-4 fw-bold text-white shadow-sm border-0 rounded-3 text-uppercase font-monospace" style={{ backgroundColor: '#10b981', fontSize: '11px' }} disabled={isFormInvalid}>
                {isSubmitting ? "Enviando para Auditoria..." : "Solicitar Credenciamento"}
              </button>
            </div>
          </form>
        )}

        <div className="text-center mt-3 pt-2 border-top">
          <button type="button" className="btn btn-link text-muted font-monospace text-decoration-none small" style={{ fontSize: '11px' }} onClick={() => onNavigate('login')}>
            <i className="fa-solid fa-arrow-left me-1"></i> Voltar à tela de login
          </button>
        </div>

        {showSuccessModal && (
          <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 9999, backdropFilter: 'blur(2px)' }}>
            <div className="bg-white p-4 mx-3 text-center rounded-4 shadow-xl" style={{ maxWidth: '420px', width: '100%' }}>
              <div className="text-success mb-2"><i className="fa-solid fa-circle-check fa-2xl"></i></div>
              <h3 className="h5 fw-bold text-dark mb-2">Solicitação Enviada!</h3>
              <p className="text-muted small mb-4" style={{ fontSize: '12px' }}>A sua identidade institucional foi confirmada com sucesso. Os dados funcionais e o anexo do crachá foram protocolados e enviados para a Fila de Homologação da Gerência de TI. Você receberá uma notificação em até 24 horas úteis.</p>
              <button className="btn btn-dark w-100 py-2 fw-bold font-monospace text-uppercase" onClick={handleModalClose} style={{ fontSize: '11px' }}>Retornar ao Login</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}