import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/Input';
import { Register } from './Register'; 
import RecuperarSenha from './RecuperarSenha';

/**
 * @component Login
 * @description Componente gateway de acesso e autenticação corporativa.
 * Força o preenchimento Pixel Perfect do Split-Screen eliminando frestas periféricas.
 */
export function Login({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); 
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  const mudarModo = (novoModo) => {
    setError('');
    setMode(novoModo);
  };

  const handleLogin = async () => {
    setError('');
    if (!loginForm.username.trim() || !loginForm.password) {
      setError("Por favor, preencha o login e a senha para acessar.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await login({
        username: loginForm.username.trim(),
        password: loginForm.password
      });
      
      if (result && result.success) {
        onLoginSuccess();
      } else {
        setError(result.message || "Erro desconhecido ao tentar realizar o acesso.");
      }
    } catch (err) {
      setError(err.message || "Falha crítica na comunicação com o ecossistema.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDownLogin = (e) => {
    if (e.key === 'Enter' && !isSubmitting) handleLogin();
  };

  if (mode === 'forgot') {
    return (
      <div className="row justify-content-center align-items-center w-100 m-0" style={{ minHeight: '75vh' }}>
        <RecuperarSenha onBack={() => mudarModo('login')} />
      </div>
    );
  }

  if (mode === 'register') {
    return (
      <div className="row justify-content-center align-items-center w-100 m-0" style={{ minHeight: '75vh' }}>
        <Register onNavigate={(target) => mudarModo(target)} />
      </div>
    );
  }

  return (
    <div className="row g-0 w-100 m-0 bg-white position-fixed top-0 start-0 vh-100 vw-100 overflow-hidden" style={{ zIndex: 1050 }}>
      <style>{`
        .login-brand-panel { 
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          height: 100vh !important;
        }
        .login-form-panel {
          height: 100vh !important;
        }
        .login-input-wrapper input { 
          padding: 0.75rem 1rem !important; 
          border-radius: 8px !important; 
          border: 1px solid #cbd5e1 !important; 
          transition: all 0.2s ease; 
        }
        .login-input-wrapper input:focus { 
          border-color: #10b981 !important; 
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1) !important; 
        }
        .btn-premium-action { 
          background-color: #0f172a; 
          color: #fff; 
          transition: all 0.2s ease; 
          border-radius: 8px; 
          border: 0; 
          font-size: 14px; 
        }
        .btn-premium-action:hover:not(:disabled) { 
          background-color: #1e293b; 
          transform: translateY(-1px); 
        }
        .btn-premium-action:active:not(:disabled) { 
          transform: translateY(0); 
        }
      `}</style>

      {/* 🌌 LADO ESQUERDO: COMPOSIÇÃO PURA SEM VAZAMENTOS VERTICAIS */}
      <div className="col-lg-5 d-none d-lg-flex flex-column justify-content-between p-5 text-white login-brand-panel">
        <div>
          <span className="badge px-3 py-2 text-uppercase font-monospace fw-bold" style={{ letterSpacing: '1px', fontSize: '11px', color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <i className="fa-solid fa-graduation-cap me-2"></i>Universidade Federal do Amazonas
          </span>
        </div>

        <div className="my-auto py-5">
          <h1 className="display-6 fw-extrabold text-white mb-4 lh-sm" style={{ fontWeight: '800', letterSpacing: '-1px' }}>
            Infraestrutura & <br/><span style={{ color: '#10b981' }}>Suporte Tecnológico</span>
          </h1>
          <p className="fs-6 fw-normal mb-0" style={{ color: '#94a3b8', lineHeight: '1.7', maxWidth: '95%' }}>
            Central corporativa unificada triada pela Gerência de Tecnologia da Informação do campus ICET. Solicite reparos preventivos, manutenção avançada de laboratórios e governança de rede em uma esteira ágil de atendimento.
          </p>
        </div>

        <div className="border-top border-secondary border-opacity-20 pt-4">
          <small className="font-monospace text-uppercase d-block mb-3" style={{ fontSize: '10px', letterSpacing: '1px', color: '#10b981', fontWeight: '700' }}>Governança Ativa de TI</small>
          <div className="d-flex gap-4 font-monospace" style={{ fontSize: '12px', color: '#64748b' }}>
            <span><i className="fa-solid fa-circle-check text-success me-2"></i>Triagem Síncrona</span>
            <span><i className="fa-solid fa-bolt text-warning me-2"></i>Suporte Presencial</span>
          </div>
        </div>
      </div>

      {/* 📑 LADO DIREITO: FORMULÁRIO PREENCHENDO 100% DA ALTURA DIRETA */}
      <div className="col-lg-7 d-flex flex-column justify-content-center align-items-center p-4 p-md-5 bg-white login-form-panel">
        <div className="w-100 d-flex flex-column gap-4 mx-auto" style={{ maxWidth: '400px' }}>
          
          <div className="text-center text-lg-start mb-1">
            <h2 className="h3 fw-bold text-dark m-0" style={{ fontWeight: '800', letterSpacing: '-0.5px' }}>OS &bull; ICET</h2>
            <p className="text-muted small m-0 mt-1">Faça login para acessar a central de governança.</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 px-3 small border-0 d-flex align-items-center gap-2 m-0 animate__animated animate__shakeX rounded-3">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span className="fw-semibold" style={{ fontSize: '12px' }}>{error}</span>
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()} className="d-flex flex-column gap-3">
            
            <div className="login-input-wrapper">
              <Input 
                label="Login Institucional" 
                value={loginForm.username} 
                onChange={(v) => { setLoginForm(p => ({ ...p, username: v })); }} 
                placeholder="usuario.sobrenome"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="login-input-wrapper position-relative">
              <div className="d-flex justify-content-between align-items-baseline position-absolute w-100" style={{ top: '0', zIndex: '2' }}>
                <span style={{ visibility: 'hidden' }}>Spacer</span>
                <button type="button" className="btn btn-link p-0 small text-decoration-none font-monospace text-muted" style={{ fontSize: '10px', letterSpacing: '0.2px' }} onClick={() => mudarModo('forgot')} disabled={isSubmitting}>
                  Esqueceu sua senha?
                </button>
              </div>
              <Input 
                label="Senha de Acesso" 
                type="password"
                value={loginForm.password} 
                onChange={(v) => { setLoginForm(p => ({ ...p, password: v })); }} 
                placeholder="••••••••"
                disabled={isSubmitting}
                onKeyDown={handleKeyDownLogin} 
              />
            </div>

            <div className="w-100 mt-4">
              <button type="button" className="btn-premium-action w-100 py-3 fw-bold d-flex justify-content-center align-items-center shadow-sm" disabled={isSubmitting} onClick={handleLogin}>
                {isSubmitting ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                {isSubmitting ? "Autenticando..." : "Entrar no Sistema"}
              </button>
            </div>

            <div className="w-100 text-center mt-2 d-flex align-items-center justify-content-center gap-1.5 flex-wrap" style={{ fontSize: '12px' }}>
              <span className="text-muted">Novo Servidor?</span>
              <button 
                type="button" 
                className="btn btn-link p-0 fw-bold text-decoration-none d-inline-flex align-items-center" 
                onClick={() => mudarModo('register')} 
                disabled={isSubmitting}
                style={{ color: '#10b981' }}
              >
                Credencie-se aqui
              </button>
            </div>

          </form>
        </div>
      </div>

    </div>
  );
}