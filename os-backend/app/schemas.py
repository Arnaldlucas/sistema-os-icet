from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ==========================================
# CONFIGURAÇÃO PADRÃO
# ==========================================
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# SCHEMAS DE AUTENTICAÇÃO E USUÁRIOS
# ==========================================
class LoginPayload(BaseModel):
    login: str
    password: str

class UserSessionResponse(BaseSchema):
    id: int
    nome: str
    login: str
    email: str
    role: str
    grupo_nome: Optional[str] = None

class UserCreate(BaseModel):
    nome: str
    login: str
    email: str
    senha: str  # Campo crucial mapeado para a rota POST /api/users
    grupo_id: int
    role: Optional[str] = "user" # 🚀 Injetado para dar suporte ao privilégio amarrado ao Grupo

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserSessionResponse

# ==========================================
# SCHEMAS DE GRUPOS E DEMANDAS
# ==========================================
class GroupResponse(BaseSchema):
    id: int
    nome: str
    descricao: str
    created_at: str

class GroupCreate(BaseModel):
    nome: str
    descricao: Optional[str] = ""

class DemandResponse(BaseSchema):
    id: int
    nome: str
    prazo: str
    created_at: str

class DemandCreate(BaseModel):
    nome: str
    prazo: Optional[str] = "2 dias úteis"

# ==========================================
# SCHEMAS DE INTERAÇÕES (HISTÓRICO)
# ==========================================
class InteractionResponse(BaseSchema):
    id: int
    request_id: int
    user_id: int
    autor_nome: str
    autor_grupo: str
    mensagem: str
    tipo: str
    created_at: str

class InteractionCreate(BaseModel):
    mensagem: str

# ==========================================
# SCHEMAS DE SOLICITAÇÕES / REQUESTS (OS)
# ==========================================
class RequestCreate(BaseModel):
    nome: Optional[str] = None
    siape: str
    email: Optional[str] = None
    perfil: Optional[str] = None
    bloco: str
    sala: str
    categoria: str
    descricao: str
    status: Optional[str] = "Aberto"

class RequestResponse(BaseSchema):
    id: int
    protocolo: str
    owner_user_id: Optional[int] = None
    nome: str
    siape: str
    email: str
    perfil: str
    bloco: str
    sala: str
    categoria: str
    descricao: str
    status: str
    created_at: str
    updated_at: str
    localizacao: str = ""
    interactions: Optional[List[InteractionResponse]] = None

    @classmethod
    def model_validate(cls, obj: Any, **kwargs):
        # Executa a validação padrão do Pydantic baseada nos atributos do modelo
        data = super().model_validate(obj, **kwargs)
        # Injeta dinamicamente a string combinada exigida pelo front do React
        data.localizacao = f"{data.bloco} - {data.sala}"
        return data

class StatusUpdatePayload(BaseModel):
    status: str

class RequestWrapperResponse(BaseModel):
    request: RequestResponse

# ==========================================
# SCHEMA UNIFICADO (BOOTSTRAP ADMIN)
# ==========================================
class AdminPermissions(BaseModel):
    admin: bool
    can_manage: bool
    can_update_status: bool
    can_reports: bool
    can_create_requests: bool = True
    can_view_own_requests: bool = True

class AdminBootstrapResponse(BaseModel):
    user: UserSessionResponse
    permissions: AdminPermissions
    groups: List[GroupResponse]
    users: List[UserSessionResponse]
    demands: List[DemandResponse]
    requests: List[RequestResponse]