"""
Modelos Relacionais e Estruturas de Domínio de Ordens de Serviço (SQLAlchemy).

Dita a estrutura das tabelas físicas de chamados técnicos, históricos da
linha do tempo e metadados de anexos, operando sob conformidade ITIL v4.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

def obter_timestamp_utc_naive() -> datetime:
    """
    Gera o carimbo de data/hora UTC atual sem fuso horário explícito.

    "PORQUÊ": Garante compatibilidade direta com colunas DateTime comuns do 
    PostgreSQL, evitando distorções de fuso horário local entre instâncias.

    Returns:
        datetime: Objeto datetime UTC naive atual.
    """
    return datetime.utcnow()

class StatusOS(str, enum.Enum):
    """Estados operacionais regulamentares para ciclo de vida de uma O.S."""
    PENDENTE = "PENDENTE"
    EM_ATENDIMENTO = "EM_ATENDIMENTO"
    AGUARDANDO_PECAS = "AGUARDANDO_PECAS"
    RESOLVIDO = "RESOLVIDO"
    CANCELADO = "CANCELADO"

    @classmethod
    def normalizar(cls, valor: str) -> "StatusOS":
        """Mapeia aliases textuais vindos do Frontend para o ENUM correto."""
        val_clean = str(valor).strip().upper()
        if val_clean in ["ABERTO", "PENDENTE", "ABERTA"]: return cls.PENDENTE
        if val_clean in ["EM ATENDIMENTO", "EM_ATENDIMENTO", "EM CURSO", "ATENDIMENTO"]: return cls.EM_ATENDIMENTO
        if val_clean in ["AGUARDANDO PEÇAS", "AGUARDANDO_PECAS"]: return cls.AGUARDANDO_PECAS
        if val_clean in ["RESOLVIDO", "CONCLUÍDO", "CONCLUIDO"]: return cls.RESOLVIDO
        if val_clean in ["CANCELADO", "REJEITADO"]: return cls.CANCELADO
        return cls.PENDENTE

class PrioridadeOS(str, enum.Enum):
    """Níveis de urgência e impacto de incidentes e requisições."""
    BAIXA = "BAIXA"
    MEDIA = "MEDIA"
    ALTA = "ALTA"
    CRITICA = "CRITICA"

    @classmethod
    def normalizar(cls, valor: str) -> "PrioridadeOS":
        """Normaliza strings de impacto para correspondência de escopo."""
        val_clean = str(valor).strip().upper()
        if val_clean in ["BAIXA", "LOW"]: return cls.BAIXA
        if val_clean in ["MÉDIA", "MEDIA", "MEDIUM"]: return cls.MEDIA
        if val_clean in ["ALTA", "HIGH"]: return cls.ALTA
        if val_clean in ["CRÍTICA", "CRITICA", "CRITICAL"]: return cls.CRITICA
        return cls.MEDIA

class TipoEventoTimeline(str, enum.Enum):
    """Classificação de eventos históricos ocorridos na esteira do chamado."""
    MENSAGEM = "MENSAGEM"
    DESPACHO = "DESPACHO"
    MUDANCA_STATUS = "MUDANCA_STATUS"
    ALTERACAO_PRIORIDADE = "ALTERACAO_PRIORIDADE"


class Solicitacao(Base):
    """
    Entidade representativa das Ordens de Serviço e Demandas Tecnológicas.
    """
    __tablename__ = "solicitacoes"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False)
    descricao = Column(Text, nullable=False)
    status = Column(Enum(StatusOS), default=StatusOS.PENDENTE, nullable=False)
    prioridade = Column(Enum(PrioridadeOS), default=PrioridadeOS.MEDIA, nullable=False)
    
    # Modelo Geográfico Simplificado (Abertura em etapa única unificada)
    categoria = Column(String(100), nullable=False)
    subcategoria = Column(String(100), nullable=False)
    tipo_ambiente = Column(String(20), default="INTERNO", nullable=False)
    bloco = Column(String(50), nullable=False)
    andar = Column(String(30), nullable=True)
    sala = Column(String(100), nullable=False)
    ponto_referencia = Column(String(255), nullable=True)
    
    # Gestão de Inventário e Integração de Ativos (ITIL Asset Management)
    numero_patrimonio = Column(String(30), nullable=True)
    
    # "PORQUÊ": Uso de RESTRICT para o criador e SET NULL para o técnico.
    # Impede que uma conta de servidor seja deletada caso ele possua chamados abertos 
    # (segurança de dados). Se a conta do técnico for removida, a OS volta para a fila
    # órfã com técnico nulo, sem quebrar o registro da solicitação original.
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    tecnico_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    
    criado_em = Column(DateTime, default=obter_timestamp_utc_naive)
    atualizado_em = Column(DateTime, default=obter_timestamp_utc_naive, onupdate=obter_timestamp_utc_naive)

    criador = relationship("Usuario", foreign_keys=[usuario_id])
    tecnico = relationship("Usuario", foreign_keys=[tecnico_id])
    
    # "PORQUÊ": cascade="all, delete-orphan" força a limpeza automática de registros dependentes.
    # Se a ordem de serviço principal for expurgada permanentemente pelo administrador,
    # as interações e referências físicas dos anexos caem em cascata, evitando lixo órfão.
    timeline = relationship("InteracaoTimeline", back_populates="solicitacao", cascade="all, delete-orphan")
    anexos = relationship("AnexoArquivo", back_populates="solicitacao", cascade="all, delete-orphan")


class InteracaoTimeline(Base):
    """Tabela de registro histórico de interações e auditoria operacional do chamado."""
    __tablename__ = "interacoes_timeline"

    id = Column(Integer, primary_key=True, index=True)
    solicitacao_id = Column(Integer, ForeignKey("solicitacoes.id", ondelete="CASCADE"), nullable=False)
    autor_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=True)
    
    tipo_evento = Column(Enum(TipoEventoTimeline), default=TipoEventoTimeline.MENSAGEM, nullable=False)
    conteudo = Column(Text, nullable=False)
    criado_em = Column(DateTime, default=obter_timestamp_utc_naive)

    solicitacao = relationship("Solicitacao", back_populates="timeline")
    autor = relationship("Usuario")


class AnexoArquivo(Base):
    """Mapeamento de referências e metadados de uploads no storage físico do servidor."""
    __tablename__ = "anexos_arquivos"

    id = Column(Integer, primary_key=True, index=True)
    solicitacao_id = Column(Integer, ForeignKey("solicitacoes.id", ondelete="CASCADE"), nullable=False)
    nome_original = Column(String(255), nullable=False)
    nome_armazenado = Column(String(255), nullable=False) 
    caminho_fisico = Column(String(500), nullable=False)
    tipo_mime = Column(String(100), nullable=False)      
    tamanho_bytes = Column(Integer, nullable=False)
    
    file_hash = Column(String(64), nullable=False, unique=True) 
    criado_em = Column(DateTime, default=obter_timestamp_utc_naive)

    solicitacao = relationship("Solicitacao", back_populates="anexos")