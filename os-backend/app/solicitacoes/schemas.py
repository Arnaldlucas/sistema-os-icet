"""
Esquemas de Validação e Serialização Consistente para Ordens de Serviço (Pydantic).

Mapeia os contratos de entrada e saída das requisições para blindar a API 
contra payloads corrompidos vindos das exibições do Frontend.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class SolicitacaoCriarIn(BaseModel):
    """Contrato de dados legados rígidos recebidos para abertura de ordens de serviço (CA 4.1)."""
    titulo: str = Field(..., min_length=4, max_length=100, description="Assunto ou título resumido do incidente.")
    descricao: str = Field(..., min_length=10, description="Detalhamento técnico do problema observado.")
    prioridade: str = Field(..., description="Nível de urgência cru correspondente ('BAIXA', 'MEDIA', 'ALTA').")
    categoria: str = Field(..., description="Categoria técnica selecionada pelo servidor.")
    bloco: str = Field(..., description="Bloco físico onde o incidente ocorreu no ICET.")
    sala: str = Field(..., description="Sala ou Laboratório específico da ocorrência.")

class AnexoOut(BaseModel):
    """Serialização de saída para metadados de arquivos em anexo."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome_original: str
    tipo_mime: str
    tamanho_bytes: int
    criado_em: datetime

class SolicitacaoDetalheOut(BaseModel):
    """Contrato de resposta estruturado completo para visualização individual da OS."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    titulo: str
    descricao: str
    status: str
    prioridade: str
    categoria: str
    bloco: Optional[str] = None
    sala: Optional[str] = None
    criador_nome: str
    tecnico_nome: Optional[str] = None
    criado_em: datetime
    atualizado_em: datetime
    timeline: List[Dict[str, Any]] = []
    anexos: List[AnexoOut] = []