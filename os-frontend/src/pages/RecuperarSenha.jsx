import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * @component RecuperarSenha
 * @description Interface para redefinição de credenciais via chaves OTP assíncronas e validação combinatória de segurança.
 * @param {Object} props - Propriedades contratuais do componente.
 * @param {Function} props.onBack - Callback de retorno para a tela de autenticação primária.
 */
export default function RecuperarSenha({ onBack }) {
  const { request } = useAuth();
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [status, setStatus] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  const [resendTimer, setResendTimer] = useState(0);

  const inputRefs = useRef([]);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  /**
   * Avalia os critérios de complexidade estrita da senha baseando-se em pesos combinatórios de 20%.
   * @param {string} pass - Texto plano contido no input.
   * @returns {Object} Configurações estruturais do indicador de força.
   */
  const avaliarForcaSenha = (pass) => {
    if (!pass) return { texto: "Não Informada", cor: "text-muted", largura: "0%", bg: "bg-secondary", pontos: 0 };
    
    let pontos = 0;
    if (pass.length >= 8) pontos += 20;
    if (/[A-Z]/.test(pass)) pontos += 20;
    if (/[a-z]/.test(pass)) pontos += 20;
    if (/[0-9]/.test(pass)) pontos += 20;
    if (/[^A-Za-z0-9]/.test(pass)) pontos += 20;

    if (pontos <= 40) return { texto: "Insegura", cor: "#ef4444", largura: "40%", bg: "bg-danger", pontos };
    if (pontos <= 60) return { texto: "Fraca", cor: "#f59e0b", largura: "60%", bg: "bg-warning", pontos };
    if (pontos <= 80) return { texto: "Aceitável", cor: "#3b82f6", largura: "80%", bg: "bg-info", pontos };
    return { texto: "Senha Forte e Segura", cor: "#10b981", largura: "100%", bg: "bg-success", pontos };
  };

  const forcaSenha = avaliarForcaSenha(novaSenha);
  
  const isPasswordInvalid = 
    !novaSenha || 
    forcaSenha.pontos < 100 || 
    novaSenha !== confirmarSenha || 
    otp.join('').length < 6 ||
    loading;

  const handleOtpChange = (value, index) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '').split('');
    if (pastedData.length > 0) {
      const newOtp = [...otp];
      pastedData.forEach((char, i) => { if (i < 6) newOtp[i] = char; });
      setOtp(newOtp);
      const focusIndex = pastedData.length < 6 ? pastedData.length : 5;
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleCancelar = () => {
    if (email || novaSenha) {
      const confirmar = window.confirm("Deseja cancelar a recuperação? O processo atual será descartado.");
      if (confirmar) onBack();
    } else {
      onBack();
    }
  };

  /**
   * Encaminha o e-mail para geração e disparo do código de verificação institucional.
   */
  const handleSolicitarCodigo = async (e) => {
    if (e) e.preventDefault();
    const emailHigienizado = email.trim().toLowerCase();

    if (!emailHigienizado.endsWith('@ufam.edu.br')) {
      setStatus({ type: 'warning', text: 'Segurança Institucional: Utilize seu e-mail @ufam.edu.br.' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', text: 'Gerando código de segurança...' });
    
    try {
      await request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: emailHigienizado })
      });
      setStep(2);
      setResendTimer(60);
      setStatus({ type: 'success', text: 'Código enviado! Verifique sua caixa de entrada institucional.' });
    } catch (err) {
      setStatus({ type: 'danger', text: err.message || 'Falha ao processar solicitação de código.' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Envia o payload completo ao backend para validação síncrona do token OTP e alteração da senha.
   */
  const handleRedefinirSenha = async (e) => {
    e.preventDefault();
    const codigoCompleto = otp.join('');
    
    if (codigoCompleto.length < 6) {
      setStatus({ type: 'warning', text: 'Preencha todos os 6 dígitos do código recebido.' });
      return;
    }
    if (forcaSenha.pontos < 100) {
      setStatus({ type: 'warning', text: 'A senha informada não atende aos critérios mínimos de segurança corporativa.' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', text: 'Validando token e atualizando credenciais...' });
    
    try {
      const res = await request('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          codigo: codigoCompleto, 
          nova_senha: novaSenha 
        })
      });

      if (res && res.success) {
        setStep(3);
        setStatus({ type: '', text: '' });
      } else {
        setStatus({ type: 'danger', text: res?.message || 'Código de verificação incorreto ou expirado.' });
      }
    } catch (err) {
      setStatus({ type: 'danger', text: err.message || 'Falha de comunicação com o servidor de credenciais.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-100 min-vh-100 position-fixed top-0 start-0 d-flex align-items-center justify-content-center p-3 overflow-y-auto"
         style={{
           background: 'linear-gradient(180deg, #064e3b 0%, #0f172a 100%)',
           zIndex: 1045
         }}>
      
      <style>{`
        .premium-input-field { width: 100%; padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13.5px; transition: all 0.2s ease; color: #1f2937; background-color: #f8fafc; }
        .premium-input-field:focus { outline: none; border-color: #10b981; background-color: #fff; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.08); }
        .otp-premium-input { width: 44px; height: 54px; text-align: center; font-weight: 700; font-size: 1.4rem; border-radius: 8px; border: 1px solid #cbd5e1; background-color: #f8fafc; transition: all 0.2s ease; }
        .otp-premium-input:focus { outline: none; border-color: #10b981; background-color: #fff; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.1); }
      `}</style>

      <div className="card border-0 p-4 p-sm-5 bg-white rounded-4 animate__animated animate__fadeIn" 
           style={{ 
             maxWidth: '460px', 
             width: '100%',
             boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
           }}>
           
        {step === 3 ? (
          <div className="text-center py-3 animate__animated animate__fadeIn">
            <div className="icon-circle mb-3 mx-auto d-flex align-items-center justify-content-center text-success shadow-sm" style={{ width: '60px', height: '60px', backgroundColor: '#eafaf1', borderRadius: '50%' }}>
              <i className="fa-solid fa-circle-check fa-2xl"></i>
            </div>
            <h3 className="h5 fw-extrabold text-dark mb-2" style={{ fontWeight: '800', letterSpacing: '-0.3px' }}>Acesso Homologado!</h3>
            <p className="text-muted small mb-4 px-1" style={{ lineHeight: '1.6', fontSize: '12.5px' }}>
              Sua credencial corporativa foi atualizada com sucesso no banco de dados da UFAM. Você já pode acessar a plataforma utilizando sua nova senha.
            </p>
            <div className="pt-3 border-top w-100 mt-2">
              <button type="button" className="btn btn-success py-2.5 fw-bold text-white shadow-sm border-0 rounded-3 text-uppercase font-monospace w-100" style={{ backgroundColor: '#10b981', fontSize: '11px', letterSpacing: '0.5px' }} onClick={onBack}>
                Retornar à Tela de Login
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-4 pb-1">
              <div className="bg-success bg-opacity-10 p-3 rounded-circle d-inline-block mb-3">
                <i className={`fa-solid ${step === 1 ? 'fa-envelope-open-text' : 'fa-shield-halved'} text-success fa-2xl`}></i>
              </div>
              <h2 className="h4 fw-extrabold text-dark m-0" style={{ fontWeight: '800', letterSpacing: '-0.5px' }}>{step === 1 ? 'Recuperar Acesso' : 'Validar Identidade'}</h2>
              <p className="text-muted small m-0 mt-1.5 font-monospace" style={{ fontSize: '11px' }}>
                {step === 1 
                  ? 'Informe seu e-mail institucional. Enviaremos um código OTP exclusivo para você.' 
                  : 'Enviamos um código de 6 dígitos para o e-mail informado.'}
              </p>
            </div>

            {status.text && (
              <div className={`alert alert-${status.type === 'danger' ? 'danger' : status.type === 'warning' ? 'warning' : 'info'} py-2.5 px-3 small border-0 d-flex align-items-center gap-2 mb-4 rounded-3 animate__animated animate__headShake`} style={{ fontSize: '12px' }}>
                <span className="fw-semibold">{status.text}</span>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleSolicitarCodigo}>
                <div className="mb-4">
                  <label className="form-label font-monospace small fw-bold text-muted" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>E-MAIL INSTITUCIONAL</label>
                  <input 
                    type="email" 
                    className="premium-input-field" 
                    placeholder="exemplo@ufam.edu.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                
                <div className="pt-3 border-top d-flex flex-column gap-2 w-100 mt-2">
                  <button type="submit" className="btn btn-success py-2.5 fw-bold text-white shadow-sm border-0 rounded-3 text-uppercase font-monospace d-flex align-items-center justify-content-center" style={{ backgroundColor: '#10b981', fontSize: '11px', letterSpacing: '0.5px' }} disabled={loading || !email}>
                    {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fa-solid fa-paper-plane me-2"></i>}
                    {loading ? 'Processando...' : 'Enviar Código OTP'}
                  </button>
                  <button type="button" className="btn btn-link shadow-none font-monospace text-muted text-decoration-none py-1 mx-auto mt-1" style={{ fontSize: '11px' }} onClick={handleCancelar} disabled={loading}>
                    <i className="fa-solid fa-arrow-left small me-1"></i> Voltar ao Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRedefinirSenha}>
                <div className="mb-4 text-center">
                  <label className="form-label font-monospace small fw-bold text-muted d-block mb-2.5" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>CÓDIGO DE VERIFICAÇÃO</label>
                  <div className="d-flex justify-content-center gap-2 mb-2">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => inputRefs.current[idx] = el}
                        type="text"
                        maxLength="1"
                        className="otp-premium-input shadow-sm"
                        value={digit}
                        onChange={(e) => handleOtpChange(e.target.value, idx)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        onPaste={handlePaste}
                        disabled={loading}
                        autoComplete="off"
                      />
                        ))}
                  </div>
                  
                  <div className="text-center mt-2.5">
                    <button type="button" className="btn btn-link btn-sm text-decoration-none text-success p-0 font-monospace" style={{ fontSize: '11px' }} disabled={resendTimer > 0 || loading} onClick={() => handleSolicitarCodigo(null)}>
                      {resendTimer > 0 ? `Reenviar código em ${resendTimer}s` : 'Não recebi o código? Reenviar'}
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label font-monospace small fw-bold text-muted" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>NOVA SENHA DE ACESSO</label>
                  <div className="input-group">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      className="premium-input-field" 
                      style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      disabled={loading}
                      required 
                    />
                    <button type="button" className="btn btn-light border" style={{ borderColor: '#cbd5e1', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }} onClick={() => setShowPassword(!showPassword)}>
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-secondary`}></i>
                    </button>
                  </div>
                  
                  <div className="mt-2 px-1">
                    <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '10px' }}>
                      <span className="text-muted font-monospace">Complexidade:</span>
                      <span className="fw-bold font-monospace" style={{ color: forcaSenha.cor }}>{forcaSenha.texto}</span>
                    </div>
                    <div className="progress" style={{ height: '4px' }}>
                      <div className={`progress-bar ${forcaSenha.bg}`} role="progressbar" style={{ width: forcaSenha.largura, transition: 'all 0.3s' }} />
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label font-monospace small fw-bold text-muted" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>CONFIRMAR NOVA SENHA</label>
                  <input 
                    type="password" 
                    className="premium-input-field" 
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    disabled={loading}
                    required 
                  />
                </div>

                <div className="pt-3 border-top d-flex flex-column gap-2 w-100 mt-2">
                  <button type="submit" className="btn btn-success py-2.5 fw-bold text-white shadow-sm border-0 rounded-3 text-uppercase font-monospace d-flex align-items-center justify-content-center" style={{ backgroundColor: '#059669', fontSize: '11px', letterSpacing: '0.5px' }} disabled={isPasswordInvalid}>
                    {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fa-solid fa-lock me-2"></i>}
                    {loading ? 'Salvando...' : 'Salvar e Acessar'}
                  </button>
                  <button type="button" className="btn btn-link shadow-none font-monospace text-muted text-decoration-none py-1 mx-auto mt-1" style={{ fontSize: '11px' }} onClick={handleCancelar} disabled={loading}>
                    <i className="fa-solid fa-arrow-left small me-1"></i> Cancelar Operação
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}