import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * @component Profile
 * @description Centralizador de dados cadastrais e segurança do operador.
 * Implementa arquitetura em colunas assimétricas e listagens estruturadas limpas.
 */
export function Profile({ user, triggerToast }) {
  const { request } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [senha, setSenha] = useState({ atual: '', nova: '', confirmacao: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const avaliarForcaSenha = (pass) => {
    if (!pass) return { texto: "Não Informada", cor: "text-muted", largura: "0%", bg: "bg-secondary" };
    if (pass.length < 8) return { texto: "Muito Fraca", cor: "text-danger", largura: "25%", bg: "bg-danger" };
    const temMaiuscula = /[A-Z]/.test(pass);
    const temEspecial = /[!@#$%^&*(),.?":{}|<>_+-]/.test(pass);
    if (pass.length >= 8 && temMaiuscula && temEspecial) return { texto: "Forte e Segura", cor: "text-success", largura: "100%", bg: "bg-success" };
    return { texto: "Média / Aceitável", cor: "text-warning", largura: "60%", bg: "bg-warning" };
  };

  const forcaSenha = avaliarForcaSenha(senha.nova);
  const isPasswordInvalid = !senha.atual || senha.nova.length < 8 || senha.nova !== senha.confirmacao || isSubmitting;

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (isPasswordInvalid) return;

    setIsSubmitting(true);
    try {
      const res = await request('/api/auth/alterar-senha', {
        method: 'PUT',
        body: JSON.stringify({
          senha_atual: senha.atual,
          nova_senha: senha.nova
        })
      });

      if (res && res.success !== false) {
        if (typeof triggerToast === 'function') triggerToast("Sua credencial de acesso foi alterada com sucesso.", "success");
        setSenha({ atual: '', nova: '', confirmacao: '' });
        setShowModal(false);
      } else {
        throw new Error(res?.message || "A senha atual informada está incorreta.");
      }
    } catch (err) {
      if (typeof triggerToast === 'function') triggerToast(err.message || "Falha de rede ao alterar senha.", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-100 container-fluid p-0 animate__animated animate__fadeIn">
      <style>{`
        .profile-label { font-size: 11px; color: #64748b; font-weight: 500; font-family: monospace; text-uppercase: true; letter-spacing: 0.5px; }
        .profile-value { font-size: 13px; color: #1f2937; font-weight: 700; display: block; margin-top: 2px; }
        .border-layout-subtle { border-color: #f1f5f9 !important; }
      `}</style>

      {/* 📊 CABEÇALHO UNIFICADO */}
      <div className="d-flex justify-content-between align-items-center border-bottom mb-5 pb-3 flex-wrap gap-2">
        <h4 className="h5 fw-extrabold m-0 text-dark" style={{ fontWeight: '800', letterSpacing: '-0.3px' }}>
          <i className="fa-solid fa-user-gear text-success me-2"></i>Configurações da Conta
        </h4>
        <div className="small font-monospace text-secondary">
          ID Operador: <strong className="text-dark font-monospace">#{user?.id || "N/A"}</strong>
        </div>
      </div>

      {/* 🚀 LAYOUT EM DUAS COLUNAS ASSIMÉTRICAS */}
      <div className="row g-4 m-0 w-100">
        
        {/* COLUNA ESQUERDA (4 COLUNAS): Identificação Estável e Segurança */}
        <div className="col-lg-4 p-0 pe-lg-3 d-flex flex-column gap-4">
          
          <div className="text-center text-lg-start d-flex flex-column align-items-center align-items-lg-start gap-3">
            <div className="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center font-monospace shadow-sm border" style={{ width: '70px', height: '70px', fontSize: '22px', backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)' }}>
              {(user?.nome_completo || "S").substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="d-flex align-items-center justify-content-center justify-content-lg-start gap-2 flex-wrap">
                <h2 className="h5 fw-extrabold m-0 text-dark" style={{ fontWeight: '800' }}>{user?.nome_completo || "Servidor"}</h2>
              </div>
              <span className="badge bg-success bg-opacity-10 text-success font-monospace text-uppercase mt-1.5 px-2 py-1" style={{ fontSize: '9px', fontWeight: '700' }}>
                {user?.cargo || "Operador"}
              </span>
              <p className="text-muted m-0 font-monospace mt-2" style={{ fontSize: '11px' }}>{user?.email || "usuario@ufam.edu.br"}</p>
            </div>
          </div>

          <div className="pt-4 border-top border-layout-subtle">
            <h4 className="h6 fw-bold font-monospace text-muted text-uppercase mb-3" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>Segurança de Acesso</h4>
            <button 
              type="button" 
              className="btn btn-sm btn-white border border-light-subtle shadow-sm font-monospace text-uppercase py-2 px-3 fw-bold text-secondary bg-white w-100 rounded-3"
              onClick={() => setShowModal(true)}
              style={{ fontSize: '11px' }}
            >
              <i className="fa-solid fa-key me-2 text-warning"></i>Modificar Senha
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA (8 COLUNAS): Central de Metadados e Atividade */}
        <div className="col-lg-8 p-0 ps-lg-3 border-start border-layout-subtle">
          <div className="d-flex flex-column gap-5 ps-lg-4">
            
            {/* Registro Institucional sem Caixas Falsas */}
            <div>
              <h3 className="h6 fw-bold text-dark font-monospace text-uppercase mb-4" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                <i className="fa-solid fa-passport me-2 text-muted"></i>Registro Institucional
              </h3>
              <div className="row g-4 row-cols-1 row-cols-sm-2">
                <div>
                  <span className="profile-label">Identificador SIAPE</span>
                  <strong className="profile-value font-monospace">{user?.siape || "Não Informado"}</strong>
                </div>
                <div>
                  <span className="profile-label">Perfil Regulamentar</span>
                  <strong className="profile-value text-success font-monospace">{(user?.role || 'user').toUpperCase()}</strong>
                </div>
                <div>
                  <span className="profile-label">Instituição</span>
                  <strong className="profile-value">Universidade Federal do Amazonas</strong>
                </div>
                <div>
                  <span className="profile-label">Lotação de Vínculo</span>
                  <strong className="profile-value">Campus Itacoatiara &mdash; ICET</strong>
                </div>
              </div>
            </div>

            {/* MÓDULO ANTIVAZIO: Estatísticas e Atividade Recente */}
            <div className="border-top border-layout-subtle pt-4">
              <h3 className="h6 fw-bold text-dark font-monospace text-uppercase mb-4" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                <i className="fa-solid fa-chart-line me-2 text-muted"></i>Produtividade e Atividade
              </h3>
              <div className="row g-3 mb-4">
                <div className="col-6">
                  <div className="bg-light bg-opacity-50 border rounded-3 p-3 font-monospace">
                    <span className="text-muted small d-block mb-1" style={{ fontSize: '10px' }}>Status da Conta</span>
                    <strong className="text-success small"><i className="fa-solid fa-circle-check me-1"></i>HOMOLOGADO / ATIVO</strong>
                  </div>
                </div>
                <div className="col-6">
                  <div className="bg-light bg-opacity-50 border rounded-3 p-3 font-monospace">
                    <span className="text-muted small d-block mb-1" style={{ fontSize: '10px' }}>Canal Notificação</span>
                    <strong className="text-dark small text-truncate d-block">{user?.email?.substring(0, 18) || "GTI"}...</strong>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 🧾 POP-UP MODAL REFINADO DE ALTERAÇÃO DE CREDENCIAL */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(2px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-bottom p-3 bg-light">
                <h5 className="modal-title h6 fw-bold font-monospace text-uppercase text-dark m-0">
                  <i className="fa-solid fa-shield-halved me-2 text-success"></i>Alterar Senha
                </h5>
                <button type="button" className="btn-close shadow-none btn-sm" onClick={() => setShowModal(false)}></button>
              </div>
              
              <form onSubmit={handleUpdatePassword}>
                <div className="modal-body d-flex flex-column gap-3 p-4">
                  <div>
                    <label className="form-label small fw-semibold text-secondary">Senha Atual</label>
                    <input 
                      type="password" 
                      className="form-control shadow-none" 
                      style={{ fontSize: '13px' }}
                      value={senha.atual} 
                      onChange={(e) => setSenha(p => ({...p, atual: e.target.value}))} 
                      placeholder="Insira sua senha atual" 
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label small fw-semibold text-secondary">Nova Senha</label>
                    <div className="input-group">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        className="form-control shadow-none" 
                        style={{ fontSize: '13px' }}
                        value={senha.nova} 
                        onChange={(e) => setSenha(p => ({...p, nova: e.target.value}))} 
                        placeholder="Mínimo de 8 dígitos" 
                        disabled={isSubmitting}
                        required
                      />
                      <button type="button" className="btn btn-light border" onClick={() => setShowPassword(!showPassword)}>
                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} small text-secondary`}></i>
                      </button>
                    </div>
                    
                    {senha.nova.length > 0 && (
                      <div className="mt-2 px-1">
                        <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '9px' }}>
                          <span className="text-muted font-monospace">Complexidade:</span>
                          <span className={`fw-bold ${forcaSenha.cor} font-monospace`}>{forcaSenha.texto}</span>
                        </div>
                        <div className="progress" style={{ height: '4px' }}>
                          <div className={`progress-bar ${forcaSenha.bg}`} role="progressbar" style={{ width: forcaSenha.largura, transition: 'all 0.3s' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="form-label small fw-semibold text-secondary">Confirmar Nova Senha</label>
                    <input 
                      type="password" 
                      className="form-control shadow-none" 
                      style={{ fontSize: '13px' }}
                      value={senha.confirmacao} 
                      onChange={(e) => setSenha(p => ({...p, confirmacao: e.target.value}))} 
                      placeholder="Repita a nova senha" 
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer border-top p-3 d-flex gap-2 justify-content-end">
                  <button type="button" className="btn btn-sm btn-light border px-3 font-monospace" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-sm btn-success fw-bold text-white px-3" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} disabled={isPasswordInvalid}>
                    {isSubmitting ? "Salvando..." : "Salvar Alteração"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}