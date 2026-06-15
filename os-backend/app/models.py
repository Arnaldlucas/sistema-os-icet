from datetime import datetime
from typing import List, Optional
from sqlalchemy import Integer, String, Text, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    descricao: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(String, nullable=False, server_default=func.current_timestamp())

    # Relacionamentos
    users: Mapped[List["User"]] = relationship("User", back_populates="group")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String, nullable=False)
    login: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    group_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("groups.id"), nullable=True)
    role: Mapped[str] = mapped_column(String, nullable=False, default="user")
    created_at: Mapped[str] = mapped_column(String, nullable=False, server_default=func.current_timestamp())

    # Relacionamentos
    group: Mapped[Optional["Group"]] = relationship("Group", back_populates="users")
    requests: Mapped[List["Request"]] = relationship("Request", back_populates="owner")
    interactions: Mapped[List["Interaction"]] = relationship("Interaction", back_populates="user")


class Demand(Base):
    __tablename__ = "demands"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    prazo: Mapped[str] = mapped_column(String, nullable=False, default="2 dias úteis")
    created_at: Mapped[str] = mapped_column(String, nullable=False, server_default=func.current_timestamp())


class Request(Base):
    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    protocolo: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    owner_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    nome: Mapped[str] = mapped_column(String, nullable=False)
    siape: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    perfil: Mapped[str] = mapped_column(String, nullable=False)
    bloco: Mapped[str] = mapped_column(String, nullable=False)
    sala: Mapped[str] = mapped_column(String, nullable=False)
    categoria: Mapped[str] = mapped_column(String, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="Aberto")
    created_at: Mapped[str] = mapped_column(String, nullable=False, server_default=func.current_timestamp())
    updated_at: Mapped[str] = mapped_column(String, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    # Relacionamentos
    owner: Mapped[Optional["User"]] = relationship("User", back_populates="requests")
    interactions: Mapped[List["Interaction"]] = relationship("Interaction", back_populates="request", cascade="all, delete-orphan")


class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[int] = mapped_column(Integer, ForeignKey("requests.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    autor_nome: Mapped[str] = mapped_column(String, nullable=False)
    autor_grupo: Mapped[str] = mapped_column(String, nullable=False)
    mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[str] = mapped_column(String, nullable=False, default="mensagem")
    created_at: Mapped[str] = mapped_column(String, nullable=False, server_default=func.current_timestamp())

    # Relacionamentos
    request: Mapped["Request"] = relationship("Request", back_populates="interactions")
    user: Mapped["User"] = relationship("User", back_populates="interactions")