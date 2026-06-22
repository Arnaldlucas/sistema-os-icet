"""
Modelos Relacionais e Estruturas de Domínio de Autenticação (SQLAlchemy).

Define as tabelas de controle de acesso baseado em funções (RBAC) e as 
entidades de armazenamento dos servidores vinculados ao ICET/UFAM.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

# Tabela associativa para mapeamento NxM (Muitos-para-Muitos) entre Usuários e Grupos
# Isola o relacionamento de escopos. O uso de ondelete="CASCADE" garante
# que se um usuário ou grupo for excluído, o vínculo na tabela intermediária é desfeito 
# de forma atômica no PostgreSQL, prevenindo violações de chaves estrangeiras.
usuario_grupo_associacao = Table(
    "usuario_grupo_associacao",
    Base.metadata,
    Column("usuario_id", Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True),
    Column("grupo_id", Integer, ForeignKey("grupos_permissao.id", ondelete="CASCADE"), primary_key=True)
)

class GrupoPermissao(Base):
    """
    Entidade representativa dos escopos e grupos de permissão no modelo RBAC.
    """
    __tablename__ = "grupos_permissao"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(50), unique=True, nullable=False)
    descricao = Column(String(255), nullable=True)
    escopos = Column(String(500), nullable=False)  # Strings serializadas separadas por vírgula
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    usuarios = relationship("Usuario", secondary=usuario_grupo_associacao, back_populates="grupos")

class Usuario(Base):
    """
    Entidade principal de gerenciamento dos servidores e técnicos do ICET/UFAM.

    Contém os metadados funcionais, credenciais criptografadas em hash bCrypt 
    e propriedades de estado necessárias para a esteira de auditoria predial.
    """
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome_completo = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    siape = Column(String(20), unique=True, nullable=False, index=True)
    cargo = Column(String(50), nullable=False)
    
    role = Column(String(20), nullable=False, default="servidor")  # Papel base unificado
    senha_hash = Column(String(255), nullable=False)
    
    # String longa ilimitada mapeada para receber buffers Base64 complexos.
    # Permite armazenar o contracheque ou crachá digital anexado no auto-cadastro 
    # sem a necessidade de acoplar serviços complexos de File Storage externos (AWS S3/MinIO).
    comprovante_base64 = Column(String, nullable=True)

    # Governança e Regras de Negócio de Acesso
    is_active = Column(Boolean, default=False)  # Bloqueado até homologação manual da gerência
    requires_password_change = Column(Boolean, default=True)  # Força a quebra de senhas provisórias
    
    aprovado_em = Column(DateTime(timezone=True), nullable=True)
    aprovado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    grupos = relationship("GrupoPermissao", secondary=usuario_grupo_associacao, back_populates="usuarios")