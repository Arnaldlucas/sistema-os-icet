"""
Modelos de Dados do Módulo de Auditoria e Rastreabilidade (SQLAlchemy).

Estabelece a estrutura física da tabela log_auditoria no PostgreSQL para 
armazenamento imutável de transações, acessos e alterações críticas.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, JSON
from app.db.base_class import Base  # Certifique-se de que aponta para sua classe declarativa base

class LogAuditoria(Base):
    """
    Representação física da tabela log_auditoria no banco de dados.

    Guarda dados imutáveis de ações de usuários, modificações de estados de 
    tabelas secundárias (dados antigos vs novos) e endereços IP de origem.
    """
    __tablename__ = "log_auditoria"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    usuario_id = Column(Integer, nullable=True)
    usuario_nome = Column(String(150), nullable=True)
    acao = Column(String(100), nullable=False)  # Ex: INSERT, UPDATE, DELETE, LOGIN
    modulo = Column(String(50), nullable=False)  # Ex: auth, solicitacoes, adm
    registro_id = Column(String(50), nullable=True)  # ID da entidade modificada
    

    dados_antigos = Column(JSON, nullable=True)
    dados_novos = Column(JSON, nullable=True)
    
    ip_origem = Column(String(45), nullable=True)  # Suporta escopos IPv4 e IPv6
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)