import React, { useState, useEffect } from 'react';
import { Input } from '../components/Input';
import { Select } from '../components/Select';

/**
 * SUB-COMPONENTE: ListManager (Heurística 8 - Estética Minimalista)
 * Renderiza as coleções de dados com normalização automática de dados legados.
 */
function ListManager({ items, primaryKey, secondaryKey, onDelete, emptyMessage, isRoleStyle = false }) {
  // Função interna para normalizar as strings legadas vindas do banco de dados SQLite
  const normalizarRole = (texto) => {
    if (!texto) return 'user';
    const t = texto.toLowerCase();
    if (t === 'admin' || t.includes('acesso completo') || t.includes('administradores')) {
      return 'admin';
    }
    return 'user';
  };

  return (
    <div className="border-top pt-3 mt-4 overflow-auto style-scroll pe-1" style={{ maxHeight: '350px' }}>
      {items.length === 0 ? (
        <div className="text-center py-5 text-muted font-monospace bg-light rounded-3 border border-dashed" style={{ fontSize: '12px' }}>
          <i className="fa-solid fa-folder-open d-block mb-2 opacity-50 fa-xl"></i>
          {emptyMessage}
        </div>
      ) : (
        <div className="row g-2">
          {items.map((item) => {
            const roleDefinida = normalizarRole(item[secondaryKey]);
            
            return (
              <div className="col-md-6 col-lg-4" key={item.id}>
                <div 
                  className="p-3 rounded-3 d-flex justify-content-between align-items-center animate__animated animate__fadeIn h-100"
                  style={{ 
                    backgroundColor: '#ffffff', 
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderLeft: `4px solid ${roleDefinida === 'admin' ? 'var(--status-resolvido)' : 'var(--icet-muted)'}`
                  }}
                >
                  <div className="text-truncate pe-2">
                    <strong className="d-block text-dark text-truncate small" style={{ letterSpacing: '-0.01em', fontWeight: '600' }}>
                      {item[primaryKey]}
                    </strong>
                    {isRoleStyle ? (
                      <span className={`font-monospace d-block text-truncate mt-1 ${roleDefinida === 'admin' ? 'text-success fw-bold' : 'text-muted'}`} style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                        {roleDefinida === 'admin' ? '⚡ Administrador' : '👤 Servidor / Solicitante'}
                      </span>
                    ) : (
                      <small className="text-muted font-monospace d-block text-truncate mt-1" style={{ fontSize: '11px' }}>
                        {item[secondaryKey] || "Nenhum detalhe informado"}
                      </small>
                    )}
                  </div>
                  <button 
                    className="btn btn-sm btn-link text-muted p-2 border-0 style-btn-delete flex-shrink-0"
                    type="button"
                    title="Remover Registro permanentemente"
                    onClick={() => onDelete(item.id)}
                    style={{ transition: 'var(--transition-smooth)', borderRadius: '50%' }}
                  >
                    <i className="fa-solid fa-trash-can small"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * SUB-COMPONENTE: GroupSection (Remodelado com a sua ideia de Privilégio Mestre)
 */
function GroupSection({ groups, onCreate, onDelete }) {
  const [nome, setNome] = useState('');
  const [role, setRole] = useState('user'); // Padrão inicial como usuário comum

  const isInvalid = !nome.trim() || !role;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isInvalid) return;
    // Enviamos a propriedade role (atribuição) no lugar da antiga descrição em texto
    const success = await onCreate({ nome: nome.trim(), descricao: role });
    if (success) { setNome(''); setRole('user'); }
  };

  return (
    <div className="animate__animated animate__fadeIn">
      <form onSubmit={handleSubmit} className="row g-3 align-items-end">
        <div className="col-md-4">
          <Input label="Identificação do Grupo" value={nome} onChange={setNome} placeholder="Ex: Suporte Redes" />
        </div>
        <div className="col-md-5">
          <Select 
            label="Nível de Privilégio no Sistema (Herdado)" 
            value={role} 
            onChange={setRole} 
            options={[
              { value: 'user', label: 'Acesso Solicitante (Docentes / Servidores)' },
              { value: 'admin', label: 'Acesso Administrativo (Equipe de TI)' }
            ]} 
          />
        </div>
        <div className="col-md-3">
          <button className="btn-icet w-100 py-2 small" disabled={isInvalid} style={{ height: '42px' }}>
            <i className="fa-solid fa-plus small"></i> Adicionar Grupo
          </button>
        </div>
      </form>
      <ListManager 
        items={groups} 
        primaryKey="nome" 
        secondaryKey="descricao" 
        onDelete={onDelete} 
        emptyMessage="Nenhum grupo técnico indexado."
        isRoleStyle={true}
      />
    </div>
  );
}

/**
 * SUB-COMPONENTE: UserSection
 */
function UserSection({ users, groups, onCreate, onDelete }) {
  const [form, setForm] = useState({ nome: '', login: '', email: '', senha: '', grupo_id: '' });

  useEffect(() => {
    if (groups.length > 0 && !form.grupo_id) {
      setForm(prev => ({ ...prev, grupo_id: groups[0].id }));
    }
  }, [groups]);

  const isInvalid = !form.nome.trim() || !form.login.trim() || !form.email.trim() || !form.senha.trim() || !form.grupo_id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isInvalid) return;

    // Localiza o grupo selecionado para capturar a role herdada dele de forma defensiva
    const grupoSelecionado = groups.find(g => String(g.id) === String(form.grupo_id));
    const roleHerdada = grupoSelecionado?.descricao || 'user';

    const success = await onCreate({
      nome: form.nome.trim(),
      login: form.login.trim(),
      email: form.email.trim(),
      senha: form.senha.trim(),
      grupo_id: parseInt(form.grupo_id),
      role: roleHerdada // 🚀 O privilégio do operador agora é espelhado do seu grupo automaticamente!
    });
    
    if (success && groups.length > 0) {
      setForm({ nome: '', login: '', email: '', senha: '', grupo_id: groups[0].id });
    }
  };

  return (
    <div className="animate__animated animate__fadeIn">
      <form onSubmit={handleSubmit} className="row g-3">
        <div className="col-md-4">
          <Input label="Nome Completo" value={form.nome} onChange={(v) => setForm(p => ({...p, nome: v}))} placeholder="Nome do analista" />
        </div>
        <div className="col-md-4">
          <Input label="E-mail Corporativo" type="email" value={form.email} onChange={(v) => setForm(p => ({...p, email: v}))} placeholder="usuario@ufam.edu.br" />
        </div>
        <div className="col-md-4">
          <Select 
            label="Grupo Técnico Associado (Abre privilégio)" 
            value={String(form.grupo_id)} 
            onChange={(v) => setForm(p => ({...p, grupo_id: v}))} 
            options={groups.map(g => ({ value: String(g.id), label: g.nome }))} 
          />
        </div>
        <div className="col-md-4">
          <Input label="Login" value={form.login} onChange={(v) => setForm(p => ({...p, login: v}))} placeholder="arnald.lucas" />
        </div>
        <div className="col-md-4">
          <Input label="Senha Inicial" type="password" value={form.senha} onChange={(v) => setForm(p => ({...p, senha: v}))} placeholder="Mínimo 6 chars" />
        </div>
        <div className="col-md-4 d-flex align-items-end">
          <button className="btn-icet w-100 py-2 small" disabled={isInvalid} style={{ height: '42px' }}>
            <i className="fa-solid fa-user-plus small"></i> Registrar Operador
          </button>
        </div>
      </form>
      <ListManager 
        items={users} 
        primaryKey="nome" 
        secondaryKey="grupo_nome" 
        onDelete={onDelete} 
        emptyMessage="Nenhum operador registrado."
      />
    </div>
  );
}

/**
 * SUB-COMPONENTE: DemandSection
 */
function DemandSection({ demands, onCreate, onDelete }) {
  const [nome, setNome] = useState('');
  const [prazo, setPrazo] = useState('2 dias úteis');
  const isInvalid = !nome.trim() || !prazo.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isInvalid) return;
    const success = await onCreate({ nome: nome.trim(), prazo: prazo.trim() });
    if (success) { setNome(''); setPrazo('2 dias úteis'); }
  };

  return (
    <div className="animate__animated animate__fadeIn">
      <form onSubmit={handleSubmit} className="row g-3 align-items-end">
        <div className="col-md-4">
          <Input label="Nova Categoria Técnica" value={nome} onChange={setNome} placeholder="Ex: Falha no Link de Fibra" />
        </div>
        <div className="col-md-5">
          <Input label="Prazo de Resolução (SLA)" value={prazo} onChange={setPrazo} placeholder="Ex: 24 horas úteis" />
        </div>
        <div className="col-md-3">
          <button className="btn-icet w-100 py-2 small" disabled={isInvalid} style={{ height: '42px' }}>
            <i className="fa-solid fa-thumbtack small"></i> Fixar Demanda
          </button>
        </div>
      </form>
      <ListManager 
        items={demands} 
        primaryKey="nome" 
        secondaryKey="prazo" 
        onDelete={onDelete} 
        emptyMessage="Nenhuma demanda catalogada."
      />
    </div>
  );
}

/**
 * COMPONENTE CENTRALIZADOR: Management (EXPORT PRINCIPAL REMODELADO COM SUB-ABAS)
 */
export function Management({ 
  groups, users, demands, 
  onCreateGroup, onCreateUser, onCreateDemand, 
  onDeleteEntity, setGroups, setUsers, setDemands 
}) {
  const [activeTab, setActiveTab] = useState('groups');

  return (
    <div className="surface border-0 shadow-sm p-4 animate__animated animate__fadeIn">
      <style>{`
        .style-btn-delete:hover {
          color: #ef4444 !important;
          background-color: rgba(239, 68, 68, 0.08) !important;
        }
        .sub-nav-link {
          color: var(--icet-muted);
          font-weight: 600;
          font-size: 14px;
          border: none;
          background: transparent;
          padding: 0.5rem 1rem;
          border-bottom: 2px solid transparent;
          transition: var(--transition-smooth);
        }
        .sub-nav-link:hover {
          color: var(--icet-dark);
        }
        .sub-nav-link.active {
          color: var(--icet-primary);
          border-bottom-color: var(--icet-primary);
        }
      `}</style>

      {/* 🧭 Controladores de Abas de Alta Fidelidade */}
      <div className="d-flex border-bottom mb-4 pb-1 gap-2 overflow-auto">
        <button 
          className={`sub-nav-link ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
          type="button"
        >
          <i className="fa-solid fa-sitemap me-2"></i>Setores & Grupos
        </button>
        <button 
          className={`sub-nav-link ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
          type="button"
        >
          <i className="fa-solid fa-user-shield me-2"></i>Operadores de TI
        </button>
        <button 
          className={`sub-nav-link ${activeTab === 'demands' ? 'active' : ''}`}
          onClick={() => setActiveTab('demands')}
          type="button"
        >
          <i className="fa-solid fa-receipt me-2"></i>Catálogo de Demandas
        </button>
      </div>

      {/* 🔮 Renderização de Escopo Dedicado */}
      <div className="mt-2">
        {activeTab === 'groups' && (
          <GroupSection 
            groups={groups} 
            onCreate={onCreateGroup} 
            onDelete={(id) => onDeleteEntity("/api/groups", id, setGroups, "Grupo de trabalho excluído com sucesso.")} 
          />
        )}

        {activeTab === 'users' && (
          <UserSection 
            users={users} 
            groups={groups} 
            onCreate={onCreateUser} 
            onDelete={(id) => onDeleteEntity("/api/users", id, setUsers, "Credenciais do operador revogadas.")} 
          />
        )}

        {activeTab === 'demands' && (
          <DemandSection 
            demands={demands} 
            onCreate={onCreateDemand} 
            onDelete={(id) => onDeleteEntity("/api/demands", id, setDemands, "Categoria removida do escopo público.")} 
          />
        )}
      </div>
    </div>
  );
}