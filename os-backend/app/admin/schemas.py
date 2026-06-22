"""
Contratos de Dados e Esquemas de Validação para o Módulo de Administração (Pydantic).

Garante tipagem forte, documentação automática Swagger/OpenAPI e validação de payloads
de entrada e saída para a Central de Governança corporativa da GTI.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any
from app.auditoria.schemas import UsuarioOut

class AprovarUsuarioIn(BaseModel):
    """
    Contrato de entrada para validação cadastral de novos servidores.
    """
    is_approve: bool = Field(
        ..., 
        description="Flag de homologação. True ativa a conta na UFAM; False expurga o registro."
    )

class AdminBootstrapResponse(BaseModel):
    """
    Contrato estruturado de saída para carga inicial do painel de governança administrativa.
    """
    user: Dict[str, Any] = Field(
        ..., 
        description="Metadados encapsulados do perfil do administrador/subgerente logado."
    )
    permissions: List[str] = Field(
        ..., 
        description="Lista de escopos funcionais e tokens de controle de acesso ativo."
    )
    estatisticas: Dict[str, int] = Field(
        ..., 
        description="Dicionário contendo volumetrias agregadas de chamados em tempo real."
    )
    usuarios_pendentes: List[UsuarioOut] = Field(
        ..., 
        description="Lista serializada de contas aguardando análise de crachá/Siape."
    )