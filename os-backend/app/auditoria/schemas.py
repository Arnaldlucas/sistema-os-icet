"""
Módulo de Contratos de Dados e Validação de Esquemas Globais (Pydantic).

Este arquivo centraliza as regras de integridade estrutural para fluxos de
Autenticação, Auditoria Transacional e Ordens de Serviço sob governança ITIL v4.
"""

import re
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict

# ==========================================
# VALIDADORES GLOBAIS DE SEGURANÇA
# ==========================================

def validar_forca_senha(password: str) -> str:
    """
    Valida os critérios mínimos de complexidade criptográfica para senhas baseado na OWASP.
    """
    if len(password) < 8:
        raise ValueError("A senha deve conter no mínimo 8 caracteres.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("A senha deve conter pelo menos uma letra maiúscula.")
    if not re.search(r"[a-z]", password):
        raise ValueError("A senha deve conter pelo menos uma letra minúscula.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_+-]", password):
        raise ValueError("A senha deve conter pelo menos um caractere especial (!, @, #, $, etc.).")
    return password


# ==========================================
# SCHEMAS DE AUTENTICAÇÃO E SESSÃO
# ==========================================

class LoginPayload(BaseModel):
    """Payload de entrada contratual para autenticação de usuários."""
    username: str = Field(..., description="Login institucional ou e-mail corporativo do servidor.")
    password: str = Field(..., min_length=4, description="Senha de acesso em texto plano.")

    @field_validator("username")
    @classmethod
    def validar_username_ou_email_institucional(cls, value: str) -> str:
        """Sanitiza a entrada e valida o domínio institucional antes do hit no banco."""
        clean_value = value.strip()
        if "@" in clean_value:
            email_lowercase = clean_value.lower()
            if not email_lowercase.endswith("@ufam.edu.br"):
                raise ValueError("Segurança de Login: Apenas contas institucionais da UFAM são permitidas.")
            return email_lowercase
        return clean_value


class TokenResponse(BaseModel):
    """Payload de saída contendo a assinatura JWT gerada e metadados de sessão."""
    access_token: str = Field(..., description="String criptográfica assinada do Token JWT.")
    token_type: str = Field("bearer", description="Tipo de token padrão para autorização HTTP.")
    first_login_required: bool = Field(..., description="Flag indicativa de necessidade de troca de senha no primeiro acesso.")
    user: Dict[str, Any] = Field(..., description="Dicionário com dados públicos e roles do usuário autenticado.")


# ==========================================
# 🚀 SCHEMAS DO NOVO FLUXO INTERATIVO DE PRÉ-CADASTRO (TOKEN OTP)
# ==========================================

class SolicitacaoTokenCadastroIn(BaseModel):
    """Contrato da etapa 1: Recebe o e-mail prévio para gerar e enviar o código de 6 dígitos."""
    email: EmailStr = Field(..., description="E-mail funcional corporativo do servidor.")

    @field_validator("email")
    @classmethod
    def validar_sufixo_estrito(cls, value: str) -> str:
        email_clean = value.lower().strip()
        if not email_clean.endswith("@ufam.edu.br"):
            raise ValueError("Segurança Institucional: É obrigatório utilizar o e-mail @ufam.edu.br.")
        return email_clean

class VerificacaoTokenCadastroIn(BaseModel):
    """Contrato da etapa 2: Valida se o código inserido pelo usuário no formulário é real."""
    email: EmailStr = Field(..., description="E-mail vinculado à validação do token.")
    codigo: str = Field(..., min_length=6, max_length=6, description="Código de 6 dígitos recebido em caixa de entrada.")


# ==========================================
# SCHEMAS DE CADASTRO E COMPLEMENTAÇÃO (ETAPA FINAL)
# ==========================================

class UsuarioCadastroIn(BaseModel):
    """Contrato rigoroso para a etapa final do credenciamento pós-validação do token."""
    nome_completo: str = Field(..., min_length=3, max_length=100)
    username: str = Field(..., description="Username herdado automaticamente do prefixo do e-mail.")
    email: EmailStr = Field(..., description="E-mail corporativo completo chancelado.")
    siape: str = Field(..., description="Identificador Funcional SIAPE regulamentar.")
    cargo: str = Field("Servidor", description="Cargo funcional padrão mapeado no barramento.")
    password: str = Field(..., description="Senha de acesso inicial.")
    comprovante_base64: Optional[str] = Field(None, description="Imagem do crachá funcional em formato base64.")

    @field_validator("email")
    @classmethod
    def validar_email_institucional(cls, value: str) -> str:
        email_lowercase = value.lower().strip()
        if not email_lowercase.endswith("@ufam.edu.br"):
            raise ValueError("Segurança Institucional: É obrigatório utilizar o e-mail @ufam.edu.br.")
        return email_lowercase

    @field_validator("siape")
    @classmethod
    def validar_siape_limites_estritos(cls, value: str) -> str:
        """🚀 CORREÇÃO EXATA: Exige que o SIAPE seja puramente numérico e possua entre 5 e 12 dígitos."""
        clean_value = value.strip()
        if not clean_value.isdigit():
            raise ValueError("O identificador SIAPE deve conter estritamente caracteres numéricos.")
        if not (5 <= len(clean_value) <= 12):
            raise ValueError("O SIAPE corporativo deve conter uma extensão regulamentar de no mínimo 5 e no máximo 12 dígitos.")
        return clean_value

    @field_validator("cargo")
    @classmethod
    def validar_cargo_institucional(cls, value: str) -> str:
        cargo_clean = value.strip().lower()
        if "servidor" in cargo_clean: return "Servidor"
        if "tecnico" in cargo_clean: return "Tecnico"
        if "docente" in cargo_clean or "professor" in cargo_clean: return "Docente"
        return "Servidor"

    @field_validator("password")
    @classmethod
    def checar_forca_senha_cadastro(cls, value: str) -> str:
        return validar_forca_senha(value)


# ==========================================
# SCHEMAS DE ALTERAÇÃO E TRILHA DE AUDITORIA MESTRE (IMUTÁVEL)
# ==========================================

class AlterarSenhaIn(BaseModel):
    """Contrato de entrada para atualização de credenciais."""
    senha_atual: str = Field(...)
    nova_senha: str = Field(...)

    @field_validator("nova_senha")
    @classmethod
    def checar_forca_nova_senha(cls, value: str) -> str:
        return validar_forca_senha(value)


class CompletarPrimeiroAcessoIn(BaseModel):
    """Contrato de validação para o fluxo obrigatório de quebra de senha provisória."""
    username: str = Field(..., examples=["professor.silva"])
    senha_provisoria: str = Field(..., description="Senha temporária gerada previamente pela GTI.")
    nova_senha: str = Field(..., description="Nova credencial definitiva do servidor.")

    @field_validator("nova_senha")
    @classmethod
    def checar_forca_senha_definitiva(cls, value: str) -> str:
        return validar_forca_senha(value)


class SolicitacaoCodigoRecuperacaoIn(BaseModel):
    """Contrato para solicitação de redefinição de acesso via código OTP (Esqueci a senha)."""
    email: EmailStr = Field(..., examples=["servidor@ufam.edu.br"])

    @field_validator("email")
    @classmethod
    def validar_email_recuperacao(cls, value: str) -> str:
        email_clean = value.lower().strip()
        if not email_clean.endswith("@ufam.edu.br"):
            raise ValueError("O e-mail informado deve pertencer ao domínio institucional da UFAM.")
        return email_clean


class RedefinirSenhaPorCodigoIn(BaseModel):
    """Contrato de submissão da chave OTP e aplicação da nova credencial."""
    email: EmailStr = Field(..., examples=["servidor@ufam.edu.br"])
    codigo: str = Field(..., min_length=6, max_length=6, description="Código verificador de 6 dígitos enviado por e-mail.")
    nova_senha: str = Field(..., description="Nova credencial segura definitiva a ser registrada.")

    @field_validator("nova_senha")
    @classmethod
    def checar_forca_senha_reset(cls, value: str) -> str:
        return validar_forca_senha(value)


class UsuarioOut(BaseModel):
    """Contrato de saída e serialização de dados de usuários para as Dashboards."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome_completo: str
    username: str
    email: str
    siape: str
    cargo: str
    role: str
    is_active: bool
    criado_em: datetime


class LogAuditoriaResponse(BaseModel):
    """Contrato de saída imutável para exibição da Trilha de Auditoria Geral na Central de Governança."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    autor_id: int
    autor_nome: str
    acao: str
    detalhes_json: Optional[Dict[str, Any]] = None
    ip_origem: Optional[str]
    criado_em: datetime