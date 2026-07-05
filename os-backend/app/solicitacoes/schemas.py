"""
Esquemas de Validação e Serialização Consistente para Ordens de Serviço (Pydantic).

Mapeia os contratos de entrada e saída das requisições para blindar a API 
contra payloads corrompidos vindos das exibições do Frontend.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator

# =========================================================================
# 📋 SCHEMAS DE INFRAESTRUTURA DINÂMICA (CENTRAL DE GOVERNANÇA)
# =========================================================================

class BlocoCreateIn(BaseModel):
    """Contrato para criação ou edição de um pavilhão/bloco físico no banco."""
    campus: str = Field(..., description="Unidade correspondente ('CAMPUS_1' ou 'CAMPUS_2').")
    nome: str = Field(..., min_length=2, max_length=100, description="Nome identificador do bloco.")

class BlocoOut(BaseModel):
    """Serialização de saída para a listagem dinâmica de blocos cadastrados."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    campus: str
    nome: str
    is_active: bool
    criado_em: datetime

class CategoriaCreateIn(BaseModel):
    """Contrato para inclusão de novas macro-categorias técnicas de serviços."""
    nome: str = Field(..., min_length=4, max_length=100, description="Nome descritivo da categoria técnica.")
    sla_horas_estimadas: int = Field(48, ge=1, description="Tempo regulamentar de SLA em horas úteis.")

class CategoriaOut(BaseModel):
    """Serialização de saída para as categorias de governança ativas."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    sla_horas_estimadas: int
    is_active: bool
    criado_em: datetime


# =========================================================================
# 📋 SCHEMAS DE OPERAÇÃO DE ORDENS DE SERVIÇO (CHAMADOS)
# =========================================================================

class SolicitacaoCriarIn(BaseModel):
    """Contrato de dados recebidos para abertura de ordens de serviço via Multipart Form."""
    titulo: str = Field(..., min_length=4, max_length=100, description="Assunto ou título resumido do incidente.")
    descricao: str = Field(..., min_length=10, description="Detalhamento técnico do problema observado.")
    categoria: str = Field(..., description="Categoria técnica vinculada.")
    campus: str = Field(..., description="Campus correspondente à ocorrência ('CAMPUS_1' ou 'CAMPUS_2').")
    bloco: str = Field(..., description="Bloco físico onde o incidente ocorreu no ICET.")
    sala: str = Field(..., description="Sala ou Laboratório específico da ocorrência.")

    @field_validator("sala")
    @classmethod
    def validar_sala_numerica_estrita(cls, value: str) -> str:
        """Regra de Negócio: Restringe a sala a no máximo 3 caracteres estritamente numéricos."""
        v_clean = value.strip()
        if not v_clean.isdigit():
            raise ValueError("O campo sala deve conter apenas caracteres numéricos.")
        if len(v_clean) > 3:
            raise ValueError("O campo sala deve conter no máximo 3 dígitos.")
        return v_clean

class AnexoOut(BaseModel):
    """Serialização de saída para metadados de arquivos em anexo."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome_original: str
    tipo_mime: str
    tamanho_bytes: int
    criado_em: datetime

class SolicitacaoDetalheOut(BaseModel):
    """Contrato de resposta estruturado completo para visualização individual e Kanban da OS."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    titulo: str
    descricao: str
    status: str
    categoria: str
    campus: str
    bloco: Optional[str] = None
    sala: Optional[str] = None
    criador_nome: str
    tecnico_nome: Optional[str] = None
    criado_em: datetime
    atualizado_em: datetime
    timeline: List[Dict[str, Any]] = []
    anexos: List[AnexoOut] = []