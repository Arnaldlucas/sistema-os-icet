"""
Roteadores e Endpoints do Barramento de Autenticação e Credenciais (FastAPI).

Gerencia as esteiras assíncronas de Login corporativo, geração de tokens assinados,
auto-cadastro com anexos e fluxos temporais de chaves OTP de recuperação.
"""

import os
import random
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import insert
from app.db.session import get_db 
from app.auth.models import Usuario, GrupoPermissao
from app.auditoria.schemas import (
    LoginPayload,
    UsuarioCadastroIn,
    TokenResponse,
    AlterarSenhaIn,
    CompletarPrimeiroAcessoIn,
    SolicitacaoCodigoRecuperacaoIn,
    RedefinirSenhaPorCodigoIn,
    validar_forca_senha
)

logger = logging.getLogger(__name__)

# Configurações de Segurança e Assinatura Criptográfica JWT
SECRET_KEY = os.getenv("SECRET_KEY", "SUPER_SECRET_KEY_MIGRACAO_UFAM_ICET_2026_SECURITY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

router = APIRouter(prefix="/auth", tags=["Autenticação & Controle de Acesso"])

# Repositório efêmero em memória para validação rápida de chaves OTP e controle de Rate Limit
CODIGOS_RECUPERACAO: Dict[str, Dict[str, Any]] = {}

# Configurações SMTP Institucionais extraídas do ambiente do contêiner
# Mude essas linhas no seu arquivo Python para casar com a sua .env:
SMTP_SERVER = os.getenv("SMTP_HOST", "smtp.gmail.com") # <-- Trocado de SMTP_SERVER para SMTP_HOST
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "arnaldff@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "lsjcpvgpmamlvjdb")

# ==========================================
# FUNÇÕES UTILITÁRIAS DE SEGURANÇA E DISPARO
# ==========================================

def hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)

def verificar_senha(senha_pura: str, senha_hash: str) -> bool:
    return pwd_context.verify(senha_pura, senha_hash)

def criar_token_acesso(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": int(expire.timestamp())})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def enviar_email_otp_sincrono(email_destino: str, codigo_otp: str):
    """Executa o envio físico do código de verificação através do SMTP do ICET/UFAM."""
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = email_destino
        msg['Subject'] = f"Código de Recuperação: {codigo_otp}"

        corpo = f"""
        Olá, Servidor.
        Sua solicitação de redefinição de senha foi recebida pelo sistema institucional.
        Use o código de 6 dígitos abaixo para criar uma nova credencial de acesso:
        
        CÓDIGO: {codigo_otp}
        
        Este código é válido por 15 minutos. Se você não solicitou esta alteração, desconsidere este e-mail.
        """
        msg.attach(MIMEText(corpo, 'plain', 'utf-8'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, email_destino, msg.as_string())
        
        logger.info(f"[SMTP SUCCESS] Código de recuperação enviado para {email_destino}")
    except Exception as smtp_err:
        logger.error(f"[SMTP CRITICAL] Falha física de disparo para {email_destino}: {str(smtp_err)}")

async def get_utilizador_atual(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sessão inválida ou expirada.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    result = await db.execute(select(Usuario).where(Usuario.username == username))
    usuario = result.scalars().first()
    if usuario is None:
        raise credentials_exception
    return usuario

# ==========================================
# ENDPOINTS OPERACIONAIS CONTRATUAIS
# ==========================================

@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginPayload, db: AsyncSession = Depends(get_db)):
    login_input = str(payload.username).strip().lower()

    result = await db.execute(
        select(Usuario).where(
            (Usuario.username == login_input) | 
            (Usuario.email == login_input)
        )
    )
    usuario = result.scalars().first()

    if not usuario or not verificar_senha(payload.password, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Login ou senha incorretos."
        )

    if not usuario.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Esta conta está inativa ou aguardando homologação da Gerência de TI."
        )

    cargo_clean = str(usuario.cargo or '').lower()
    forçar_privilegio_gerencial = "subgerente" in cargo_clean or "cpd" in cargo_clean or "gti" in cargo_clean
    
    role_sessao = "admin" if (usuario.role == "admin" or forçar_privilegio_gerencial) else usuario.role
    grupo_sessao = "Administradores" if role_sessao == "admin" else ("Tecnicos" if role_sessao == "tecnico" else "Docentes")

    access_token = criar_token_acesso(data={
        "sub": usuario.username, 
        "role": role_sessao,
        "siape": usuario.siape, 
        "cargo": usuario.cargo,
        "nome_completo": usuario.nome_completo
    })

    user_compat_data = {
        "id": usuario.id,
        "username": usuario.username,
        "email": usuario.email,
        "siape": usuario.siape, 
        "cargo": usuario.cargo,
        "role": role_sessao,
        "grupo_nome": grupo_sessao
    }

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "first_login_required": usuario.requires_password_change if hasattr(usuario, 'requires_password_change') else False,
        "user": user_compat_data
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def registrar_servidor_auto_cadastro(payload: UsuarioCadastroIn, db: AsyncSession = Depends(get_db)):
    username_gerado = getattr(payload, "username", None)
    username_clean = username_gerado.strip() if username_gerado and isinstance(username_gerado, str) else payload.email.split("@")[0]

    result_email = await db.execute(select(Usuario).where(Usuario.email == payload.email))
    if result_email.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este e-mail institucional já está cadastrado.")
        
    result_siape = await db.execute(select(Usuario).where(Usuario.siape == payload.siape))
    if result_siape.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este número de identificação SIAPE já está registrado.")

    role_gerada = "servidor"

    novo_usuario = Usuario(
        nome_completo=payload.nome_completo,
        username=username_clean,
        email=payload.email,
        siape=payload.siape,
        cargo=payload.cargo,
        role=role_gerada,
        senha_hash=hash_senha(payload.password),
        comprovante_base64=payload.comprovante_base64,
        is_active=False
    )

    db.add(novo_usuario)
    await db.flush()

    nome_grupo_alvo = "Docentes" 
    result_grupo = await db.execute(select(GrupoPermissao).where(GrupoPermissao.nome == nome_grupo_alvo))
    grupo = result_grupo.scalars().first()
    
    if grupo is not None:
        tabela_usuario_grupo = Usuario.grupos.property.secondary
        await db.execute(
            insert(tabela_usuario_grupo).values(usuario_id=novo_usuario.id, grupo_id=grupo.id)
        )

    try:
        await db.commit()
    except Exception as commit_err:
        await db.rollback()
        logger.error(f"[Cadastro] Falha transacional no PostgreSQL: {str(commit_err)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Falha interna ao registrar informações funcionais.")
    
    return {
        "success": True, 
        "status": "sucesso", 
        "message": "Solicitação registrada com sucesso. Aguarde a validação da TI."
    }

@router.post("/forgot-password")
async def solicitar_recuperacao_senha(
    payload: SolicitacaoCodigoRecuperacaoIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Gera chaves OTP de 6 dígitos e despacha via thread em segundo plano com Rate Limiting ativo."""
    email_limpo = payload.email.lower().strip()
    agora = datetime.now(timezone.utc)
    
    # Validação Adaptativa de Rate Limiting (Trava Antispam de 60 segundos)
    registro_existente = CODIGOS_RECUPERACAO.get(email_limpo)
    if registro_existente and "criado_em" in registro_existente:
        tempo_decorrido = (agora - registro_existente["criado_em"]).total_seconds()
        if tempo_decorrido < 60:
            segundos_restantes = int(60 - tempo_decorrido)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Ação bloqueada por segurança. Aguarde {segundos_restantes} segundos para reenviar."
            )

    result = await db.execute(select(Usuario).where(Usuario.email == email_limpo))
    usuario = result.scalars().first()
    
    if not usuario:
        return {"success": True, "status": "sucesso", "message": "Código de verificação enviado se o e-mail constar em nossa base."}

    codigo_otp = str(random.randint(100000, 999999))
    CODIGOS_RECUPERACAO[email_limpo] = {
        "codigo": codigo_otp,
        "criado_em": agora,
        "expira_em": agora + timedelta(minutes=15)
    }

    logger.info(f"[OTP LOCAL-GTI] Nova chave gerada para {email_limpo}: {codigo_otp}")
    
    # Dispara o envio real através da esteira de segundo plano do FastAPI
    background_tasks.add_task(enviar_email_otp_sincrono, email_limpo, codigo_otp)

    return {
        "success": True, 
        "status": "sucesso", 
        "message": "Código de verificação enviado se o e-mail constar em nossa base."
    }

@router.post("/reset-password")
async def redefinir_senha_por_codigo(payload: RedefinirSenhaPorCodigoIn, db: AsyncSession = Depends(get_db)):
    email_limpo = payload.email.lower().strip()
    registro_otp = CODIGOS_RECUPERACAO.get(email_limpo)

    if not registro_otp or registro_otp["codigo"] != payload.codigo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Código de verificação inválido ou inexistente."
        )

    if datetime.now(timezone.utc) > registro_otp["expira_em"]:
        if email_limpo in CODIGOS_RECUPERACAO:
            del CODIGOS_RECUPERACAO[email_limpo]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="O código de verificação expirou. Solicite um novo código."
        )

    result = await db.execute(select(Usuario).where(Usuario.email == email_limpo))
    usuario = result.scalars().first()

    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não localizado.")

    usuario.senha_hash = hash_senha(payload.nova_senha)
    if hasattr(usuario, 'requires_password_change'):
        usuario.requires_password_change = False
    
    db.add(usuario)
    await db.commit()

    if email_limpo in CODIGOS_RECUPERACAO:
        del CODIGOS_RECUPERACAO[email_limpo]

    return {"success": True, "status": "sucesso", "message": "Senha redefinida com sucesso."}

@router.post("/alterar-senha")
async def alterar_senha_usuario(
    payload: AlterarSenhaIn, 
    usuario_atual: Usuario = Depends(get_utilizador_atual), 
    db: AsyncSession = Depends(get_db)
):
    if not verificar_senha(payload.senha_atual, usuario_atual.senha_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A senha atual informada está incorreta.")

    usuario_atual.senha_hash = hash_senha(payload.nova_senha)
    if hasattr(usuario_atual, 'requires_password_change'):
        usuario_atual.requires_password_change = False
    
    db.add(usuario_atual)
    await db.commit()
    
    return {"success": True, "status": "sucesso", "detail": "Senha alterada com sucesso no PostgreSQL."}

@router.post("/complete-first-access")
async def completar_primeiro_acesso(payload: CompletarPrimeiroAcessoIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.username == payload.username))
    usuario = result.scalars().first()
    
    if not usuario or not verificar_senha(payload.senha_provisoria, usuario.senha_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Credenciais provisórias inválidas.")
        
    usuario.senha_hash = hash_senha(payload.nova_senha)
    if hasattr(usuario, 'requires_password_change'):
        usuario.requires_password_change = False
    
    await db.commit()
    return {"success": True, "status": "sucesso"}