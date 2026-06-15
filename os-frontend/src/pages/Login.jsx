import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/Input';

export function Login({ onLoginSuccess }) {
  const [credentials, setCredentials] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const { login, loading } = useAuth();

  const updateField = (field, value) => {
    // Heurística 9: Prevenção e recuperação de erro ativa ao alterar o campo
    if (error) setError(''); 
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  const executarAutenticacao = async () => {
    if (!credentials.login || !credentials.password || loading) return;

    try {
      const result = await login({
        login: credentials.login.trim(),
        password: credentials.password
      });

      if (result && result.success) {
        onLoginSuccess(); // Dispara a navegação para o Painel TI com segurança
      } else {
        // Heurística 9: Captura mensagens textuais granulares do FastAPI
        setError(result?.message || "Usuário ou senha incorretos. Tente novamente.");
      }
    } catch (err) {
      // 🛡️ Intercepta o estouro assíncrono do 401 sem quebrar a renderização
      setError(err?.message || "Usuário ou senha incorretos. Tente novamente.");
    }
  };

  // Heurística 5: Prevenção de erros bloqueando submissão vazia
  const isInvalid = !credentials.login.trim() || !credentials.password.trim();

  return (
    <div className="row justify-content-center align-items-center animate__animated animate__zoomIn" style={{ minHeight: '60vh' }}>
      <div className="col-md-5 col-lg-4">
        <div className="surface shadow-lg border-0">
          <div className="text-center mb-4">
            <div className="icon-circle mb-3 mx-auto" style={{ 
              width: '60px', 
              height: '60px', 
              backgroundColor: 'rgba(5, 150, 105, 0.1)', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--icet-primary)'
            }}>
              <i className="fa-solid fa-lock-open fa-xl"></i>
            </div>
            <h2 className="h4 fw-bold" style={{ color: 'var(--icet-dark)' }}>Acesso Restrito</h2>
            <p className="text-muted small">Entre com suas credenciais institucionais para gerenciar o sistema.</p>
          </div>

          {/* 🚀 MUDANÇA SÊNIOR: Removemos o onSubmit do form para mitigar page refresh indesejado */}
          <form onSubmit={(e) => e.preventDefault()} className="row g-3">
            <Input 
              label="Usuário / Login" 
              value={credentials.login} 
              onChange={(v) => updateField('login', v)} 
              placeholder="Digite seu login"
              disabled={loading}
            />
            
            <Input 
              label="Senha de Acesso" 
              type="password"
              value={credentials.password} 
              onChange={(v) => updateField('password', v)} 
              placeholder="********"
              disabled={loading}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isInvalid) executarAutenticacao(); }} // Mantém o submit pelo Enter com segurança
            />

            {error && (
              <div className="col-12 animate__animated animate__shakeX">
                <div className="alert alert-danger py-2 px-3 small border-0 d-flex align-items-center gap-2" style={{ borderRadius: 'var(--radius-sm)' }}>
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span className="fw-semibold">{error}</span>
                </div>
              </div>
            )}

            <div className="col-12 mt-4">
              <button 
                type="button" // 🚀 MUDANÇA SÊNIOR: Tipo alterado para button impedindo refresh
                className="btn-icet w-100 py-2 fw-bold" 
                disabled={isInvalid || loading}
                onClick={executarAutenticacao} // Gatilho explícito controlado
              >
                {loading ? (
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>Autenticando...</span>
                  </div>
                ) : "Entrar no Sistema"}
              </button>
            </div>
          </form>

          {/* Heurística 10: Ajuda e Documentação */}
          <div className="mt-4 pt-3 border-top">
            <p className="text-center text-muted m-0" style={{ fontSize: '10px', letterSpacing: '0.5px', lineThickness: '1.2' }}>
              AMBIENTE DE HOMOLOGAÇÃO ICET<br/>
              CREDENCIAIS PADRÃO: <strong className="text-dark">admin / admin1234</strong>
            </p>
          </div>  
        </div>
      </div>
    </div>
  );
}