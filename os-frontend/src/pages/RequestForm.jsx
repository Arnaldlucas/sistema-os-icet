import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { TextArea } from '../components/TextArea';

const emptyRequest = {
  nome: "",
  siape: "",
  email: "",
  perfil: "Docente",
  bloco: "",
  sala: "",
  categoria: "Manutenção de Hardware",
  descricao: ""
};

export function RequestForm({ onCreateRequest }) {
  const { user, request } = useAuth();
  const [form, setForm] = useState(emptyRequest);
  const [demands, setDemands] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Regra de negócio: Se o usuário logado não for admin, ele tem perfil limitado (campos travados)
  const isLimitedUser = user && user.grupo_nome !== "Administradores";

  // Carrega as categorias de demandas públicas em tempo real da API FastAPI
  useEffect(() => {
    async function fetchPublicDemands() {
      try {
        const endpoint = user ? '/api/admin/bootstrap' : '/api/public/bootstrap';
        const data = await request(endpoint);
        setDemands(data.demands || []);
      } catch (error) {
        console.error("Falha ao carregar as demandas do catálogo:", error);
      }
    }
    fetchPublicDemands();
  }, [user, request]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  // Heurística 5: Validação proativa. O botão de envio permanece travado se houver campos vazios
  const isFormInvalid = useMemo(() => {
    const nomeValid = isLimitedUser ? true : form.nome.trim().length > 0;
    const emailValid = isLimitedUser ? true : form.email.trim().length > 0;
    
    return (
      !nomeValid ||
      !emailValid ||
      form.siape.trim().length === 0 ||
      form.bloco.trim().length === 0 ||
      form.sala.trim().length === 0 ||
      form.descricao.trim().length === 0
    );
  }, [form, isLimitedUser]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isFormInvalid || submitting) return;

    setSubmitting(true);

    // Força a higienização dos dados removendo espaços extras (Trim) antes de bater na API
    const sanitizedPayload = {
      nome: isLimitedUser ? user.nome : form.nome.trim(),
      email: isLimitedUser ? user.email : form.email.trim(),
      perfil: isLimitedUser ? user.grupo_nome : form.perfil,
      siape: form.siape.trim(),
      bloco: form.bloco.trim(),
      sala: form.sala.trim(),
      categoria: form.categoria,
      descricao: form.descricao.trim()
    };

    const success = await onCreateRequest(sanitizedPayload);
    if (success) {
      setForm(emptyRequest); // Heurística 3: Reseta o estado limpando o formulário após gravação
    }
    setSubmitting(false);
  };

  return (
    <section className="surface animate__animated animate__fadeIn">
      <div className="row g-4">
        {/* Painel Informativo Lateral */}
        <div className="col-lg-4 border-end pe-lg-4">
          <h2 className="h4 fw-bold mb-3" style={{ color: "var(--icet-dark)" }}>Abertura de Chamado</h2>
          <p className="text-muted small">
            Utilize este canal para registrar incidentes ou solicitações de suporte em infraestrutura de rede, hardware ou sistemas no campus ICET.
          </p>
          <div className="alert alert-info small border-0 shadow-sm mt-3" style={{ backgroundColor: "rgba(5, 150, 105, 0.05)", color: "var(--icet-dark)" }}>
            <strong>Nota de Atendimento:</strong> Certifique-se de preencher a localização exata do bloco e da sala para agilizar a alocação do técnico responsável.
          </div>
          <button 
            className="btn btn-sm btn-outline-secondary w-100 mt-2"
            type="button"
            onClick={() => setForm(emptyRequest)}
            disabled={submitting}
          >
            Limpar Todos os Campos
          </button>
        </div>

        {/* Formulário Interativo */}
        <div className="col-lg-8">
          <form className="row g-3" onSubmit={handleSubmit}>
            <Input 
              label="Nome do Solicitante" 
              value={isLimitedUser ? user.nome : form.nome} 
              onChange={(v) => updateField("nome", v)} 
              disabled={isLimitedUser}
              placeholder="Digite seu nome completo"
            />
            <Input 
              label="Matrícula SIAPE" 
              value={form.siape} 
              onChange={(v) => updateField("siape", v)} 
              col="col-sm-6"
              placeholder="Ex: 1234567"
            />
            <Input 
              label="E-mail Institucional" 
              type="email"
              value={isLimitedUser ? user.email : form.email} 
              onChange={(v) => updateField("email", v)} 
              col="col-sm-6"
              disabled={isLimitedUser}
              placeholder="usuario@ufam.edu.br"
            />
            <Select 
              label="Vínculo Institucional" 
              value={isLimitedUser ? user.grupo_nome : form.perfil} 
              onChange={(v) => updateField("perfil", v)} 
              options={["Docente", "Técnico Administrativo em Educação"]} 
              col="col-sm-6"
              disabled={isLimitedUser}
            />
            <Select 
              label="Categoria do Incidente" 
              value={form.categoria} 
              onChange={(v) => updateField("categoria", v)} 
              options={demands.map(d => d.nome)} 
              col="col-sm-6"
            />
            <Input 
              label="Bloco Físico" 
              value={form.bloco} 
              onChange={(v) => updateField("bloco", v)} 
              col="col-sm-6"
              placeholder="Ex: Bloco A"
            />
            <Input 
              label="Sala / Laboratório" 
              value={form.sala} 
              onChange={(v) => updateField("sala", v)} 
              col="col-sm-6"
              placeholder="Ex: Sala 102"
            />
            <TextArea 
              label="Descrição Detalhada do Problema" 
              value={form.descricao} 
              onChange={(v) => updateField("descricao", v)} 
              placeholder="Forneça detalhes técnicos do mau funcionamento ou comportamento do equipamento..."
            />
            
            <div className="col-12 d-flex justify-content-end mt-4">
              <button 
                type="submit" 
                className="btn-icet px-4" 
                disabled={isFormInvalid || submitting}
              >
                {submitting ? "Transmitindo Dados..." : "Registrar Ordem de Serviço"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}