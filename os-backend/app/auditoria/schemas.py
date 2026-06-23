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
# VALIDADORES GLOBAIS
# ==========================================

def validar_forca_senha(password: str) -> str:
    """
    Valida os critérios mínimos de complexidade criptográfica para senhas.

    Args:
        password (str): Texto plano da senha informada pelo usuário.

    Returns:
        str: A senha validada e higienizada.

    Raises:
        ValueError: Caso a senha falhe em algum dos critérios de segurança.
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
        """
        Garante conformidade estrita com o domínio institucional da UFAM.

        "Caso o utilizador tente realizar o login utilizando o formato completo
        de e-mail, o validador sanitiza a entrada e barra domínios externos antes que
        a consulta atinja a camada do banco de dados, mitigando vetores de ataque.
        """


    @field_validator("username")
    @classmethod
    def validar_username_ou_email_institucional(cls, value: str) -> str:
        clean_value = value.strip()
        if "@" in clean_value:
            email_lowercase = clean_value.lower()
            if not email_lowercase.endswith("@ufam.edu.br"):
                raise ValueError("Segurança de Login...")
            return email_lowercase
        return clean_value


class TokenResponse(BaseModel):
    """Payload de saída contendo a assinatura JWT gerada e metadados de sessão."""
    access_token: str = Field(..., description="String criptográfica assinada do Token JWT.")
    token_type: str = Field("bearer", description="Tipo de token padrão para autorização HTTP.")
    first_login_required: bool = Field(..., description="Flag indicativa de necessidade de troca de senha no primeiro acesso.")
    user: Dict[str, Any] = Field(..., description="Dicionário com dados públicos e roles do usuário autenticado.")


# ==========================================
# SCHEMAS DE CADASTRO E GERENCIAMENTO
# ==========================================

class UsuarioCadastroIn(BaseModel):
    """Contrato rigoroso para validação de novos auto-cadastros de servidores."""
    nome_completo: str = Field(..., min_length=3, max_length=100, examples=["Arnald Lucas"])
    username: Optional[str] = Field(None, description="Username institucional derivado (opcional no envio).")
    email: EmailStr = Field(..., examples=["servidor@ufam.edu.br"])
    siape: str = Field(..., min_length=4, max_length=15, examples=["1234567"])
    cargo: str = Field(..., description="Cargo funcional mapeado internamente para controle de acessos.")
    password: str = Field(..., description="Senha de acesso inicial a ser criptografada.")
    comprovante_base64: Optional[str] = Field(None, description="String em formato Base64 do crachá/contracheque para auditoria.")

    @field_validator("email")
    @classmethod
    def validar_email_institucional(cls, value: str) -> str:
        """Força o uso exclusivo do domínio institucional oficial no cadastro."""
        email_lowercase = value.lower().strip()
        if not email_lowercase.endswith("@ufam.edu.br"):
            raise ValueError("Segurança Institucional: É obrigatório utilizar o e-mail @ufam.edu.br.")
        return email_lowercase

    @field_validator("siape")
    @classmethod
    def validar_siape_numerico(cls, value: str) -> str:
        """Garante a integridade do identificador funcional SIAPE."""
        if not value.isdigit():
            raise ValueError("O identificador SIAPE deve conter estritamente números.")
        if len(value) < 4:
            raise ValueError("O SIAPE deve possuir no mínimo 4 dígitos.")
        return value

    @field_validator("cargo")
    @classmethod
    def validar_cargo_institucional(cls, value: str) -> str:
        """
        Normaliza e classifica a string de cargo enviada pela interface do usuário.

        "Evita falhas de validação (Erro 422) causadas por variações de caixa
        ou sinonímias textuais (ex: 'professor' mapeia nativamente para 'Docente'),
        reduzindo a rigidez do formulário de entrada.
        """
        cargo_clean = value.strip().lower()
        if "servidor" in cargo_clean:
            return "Servidor"
        if "tecnico" in cargo_clean:
            return "Tecnico"
        if "docente" in cargo_clean or "professor" in cargo_clean:
            return "Docente"
        raise ValueError("Cargo inválido. Utilize 'Servidor', 'Docente' ou 'Tecnico'.")

    @field_validator("password")
    @classmethod
    def checar_forca_senha_cadastro(cls, value: str) -> str:
        """Intercepta a senha de cadastro e invoca a esteira de validação de força."""
        return validar_forca_senha(value)


# ==========================================
# SCHEMAS DE RECUPERAÇÃO E ALTERAÇÃO DE SENHA
# ==========================================

class AlterarSenhaIn(BaseModel):
    """Contrato de entrada para atualização de credenciais de usuários autenticados."""
    model_config = ConfigDict(extra="ignore")

    senha_atual: str = Field(..., description="A credencial ativa atual do usuário.")
    nova_senha: str = Field(..., description="A nova senha segura a ser cadastrada.")

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
    """Contrato para solicitação de redefinição de acesso via código OTP."""
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


# ==========================================
# SCHEMAS DE SAÍDA (SERIALIZAÇÃO)
# ==========================================

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
    criado_em: datetime
    comprovante_base64: Optional[str] = None


class LogAuditoriaCreate(BaseModel):
    """Contrato interno de entrada para estruturação de novos registros de trilha de auditoria."""
    usuario_id: Optional[int] = None
    usuario_nome: Optional[str] = None
    acao: str
    modulo: str
    registro_id: Optional[str] = None
    dados_antigos: Optional[dict[str, Any]] = None
    dados_novos: Optional[dict[str, Any]] = None
    ip_origem: Optional[str] = None


class LogAuditoriaResponse(BaseModel):
    """Contrato de saída e serialização do histórico transacional de auditoria do sistema."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: Optional[int]
    usuario_nome: Optional[str]
    acao: str
    modulo: str
    registro_id: Optional[str]
    dados_antigos: Optional[dict[str, Any]] = None
    dados_novos: Optional[dict[str, Any]] = None
    ip_origem: Optional[str]
    criado_em: datetime


# =========================================================================
# 🚀 SCHEMAS DE ORDENS DE SERVIÇO (WIZARD ETAPA 1 E DASHBOARDS)
# =========================================================================

class SolicitacaoCreateIn(BaseModel):
    """
    Schema Sênior Otimizado para recepção e triagem de Ordens de Serviço.

    "Flexibiliza o recebimento do payload do novo formulário prático de etapa única,
    fornecendo strings normais e padronizadas por default para os campos que saíram da UI,
    impedindo quebras contratuais com o banco de dados.
    """
    categoria: str = Field(..., description="Macro-categoria técnica (ex: REDE E CONECTIVIDADE, AUDIOVISUAL).")
    subcategoria: Optional[str] = Field("Geral / Chamado Direto", description="Subcategoria legada normalizada.")
    prioridade: Optional[str] = Field("MEDIA", description="Nível de urgência base definido transacionalmente.")
    tipo_ambiente: Optional[str] = Field("UNIVERSAL", description="Escopo predial simplificado.")
    bloco: str = Field(..., description="Texto descritivo do Prédio/Setor da ocorrência.")
    sala_ou_espaco: str = Field(..., description="Texto descritivo da Sala, Laboratório ou Ponto de Referência.")
    numero_patrimonio: Optional[str] = Field(None, description="Etiqueta opcional de patrimônio UFAM.")
    descricao: str = Field(..., min_length=10, description="Detalhamento técnico operacional do incidente.")
    comprovante_base64: Optional[str] = Field(None, description="Anexo fotográfico ou log opcional.")

    @field_validator("categoria")
    @classmethod
    def validar_macro_categoria(cls, value: str) -> str:
        """Valida se a macro-categoria pertence à matriz de Governança corporativa da GTI."""
        permitidas = [
            "REDE E CONECTIVIDADE", 
            "HARDWARE E EQUIPAMENTOS", 
            "SISTEMAS E SOFTWARE", 
            "AUDIOVISUAL", 
            "SEGURANÇA DA INFORMAÇÃO / ACESSO",
            "OUTROS / SOLICITAÇÃO GERAL"
        ]
        val_upper = value.strip().upper()
        if val_upper not in permitidas:
            raise ValueError("Categoria inválida. Escolha entre as opções regulamentares.")
        return val_upper


class SolicitacaoOut(BaseModel):
    """Schema de serialização para renderizar ordens de serviço nas Dashboards corporativas."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    descricao: str
    prioridade: str
    categoria: str
    subcategoria: str
    tipo_ambiente: str
    bloco: str
    andar: Optional[str] = None
    sala_ou_espaco: str
    ponto_referencia: Optional[str] = None
    numero_patrimonio: Optional[str] = None
    status: str
    criado_por_id: int
    tecnico_id: Optional[int] = None
    comprovante_base64: Optional[str] = None
    criado_em: datetime
    atualizado_em: datetime