"""
Modelos Relacionais e Estruturas de Domínio de Ordens de Serviço (SQLAlchemy).

Dita a estrutura das tabelas físicas de chamados técnicos, históricos da
linha do tempo e metadados de anexos, operando sob conformidade ITIL v4.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean, JSON
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

def obter_timestamp_utc_naive() -> datetime:
    """Gera o carimbo de data/hora UTC atual sem fuso horário explícito."""
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

class TipoEventoTimeline(str, enum.Enum):
    """Classificação de eventos históricos ocorridos na esteira do chamado."""
    MENSAGEM = "MENSAGEM"
    DESPACHO = "DESPACHO"
    MUDANCA_STATUS = "MUDANCA_STATUS"


# ==============================================================================
# 🏛️ CENTRAL DE GOVERNANÇA: NOVAS TABELAS DE INFRAESTRUTURA DINÂMICA
# ==============================================================================

class BlocoPredio(Base):
    """
    Entidade de gerenciamento dinâmico de Pavilhões e Blocos físicos do ICET.
    Substitui constantes estáticas e permite controle total via Central de Governança.
    """
    __tablename__ = "blocos_predios"

    id = Column(Integer, primary_key=True, index=True)
    campus = Column(String(50), nullable=False, index=True)  # CAMPUS_1 ou CAMPUS_2
    nome = Column(String(100), nullable=False)
    
    # Soft Delete integrado: Evita quebra física de chaves se houver chamado vinculado
    is_active = Column(Boolean, default=True, nullable=False)
    criado_em = Column(DateTime, default=obter_timestamp_utc_naive)


class CategoriaTecnica(Base):
    """
    Entidade de classificação técnica do catálogo de serviços de TI (GTI).
    Garante flexibilidade para novos tipos de incidentes corporativos sem manutenção de código.
    """
    __tablename__ = "categorias_tecnicas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), unique=True, nullable=False)
    sla_horas_estimadas = Column(Integer, default=48, nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    criado_em = Column(DateTime, default=obter_timestamp_utc_naive)


# ==============================================================================
# 🔐 SEGURANÇA E AUDITORIA MESTRE (IMUTÁVEL)
# ==============================================================================

class LogAuditoriaSistema(Base):
    """
    Trilha de Auditoria Central do Ecossistema (Audit Trail).
    Registra de forma definitiva e imutável as ações administrativas críticas dos gerentes.
    """
    __tablename__ = "logs_auditoria_sistema"

    id = Column(Integer, primary_key=True, index=True)
    autor_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    autor_nome = Column(String(100), nullable=False)
    
    acao = Column(String(50), nullable=False, index=True)  # ex: EXCLUSAO_USUARIO, CADASTRO_BLOCO
    
    # Campo estruturado nativo para armazenar estados passados e novos payloads (JSON)
    detalhes_json = Column(JSON, nullable=True)
    
    ip_origem = Column(String(45), nullable=True)  # Suporta mapeamento de IPv4 e IPv6
    criado_em = Column(DateTime, default=obter_timestamp_utc_naive, nullable=False)

    autor = relationship("Usuario")


# ==============================================================================
# 📋 ESTRUTURA OPERACIONAL DE ORDENS DE SERVIÇO (CHAMADOS E INTERAÇÕES)
# ==============================================================================

class Solicitacao(Base):
    """Entidade representativa das Ordens de Serviço e Demandas Tecnológicas do ICET."""
    __tablename__ = "solicitacoes"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False)
    descricao = Column(Text, nullable=False)
    status = Column(Enum(StatusOS), default=StatusOS.PENDENTE, nullable=False)
    
    campus = Column(String(50), nullable=False)
    categoria = Column(String(100), nullable=False)
    subcategoria = Column(String(100), default="GERAL", nullable=False)
    tipo_ambiente = Column(String(20), default="INTERNO", nullable=False)
    bloco = Column(String(50), nullable=False)
    andar = Column(String(30), nullable=True)
    sala = Column(String(10), nullable=False)  
    ponto_referencia = Column(String(255), nullable=True)
    numero_patrimonio = Column(String(30), nullable=True)
    
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    tecnico_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    
    criado_em = Column(DateTime, default=obter_timestamp_utc_naive)
    atualizado_em = Column(DateTime, default=obter_timestamp_utc_naive, onupdate=obter_timestamp_utc_naive)

    criador = relationship("Usuario", foreign_keys=[usuario_id])
    tecnico = relationship("Usuario", foreign_keys=[tecnico_id])
    
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