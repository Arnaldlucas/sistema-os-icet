"""
Roteadores e Endpoints do Barramento de Autenticação e Credenciais (FastAPI).

Gerencia as esteiras assíncronas de Login corporativo, geração de tokens assinados,
solicitação de credenciamento com anexos e fluxos temporais de chaves OTP de recuperação.
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
    SolicitacaoTokenCadastroIn,
    VerificacaoTokenCadastroIn,
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

# Repositório efêmero em memória para validação rápida de chaves OTP de recuperação
CODIGOS_RECUPERACAO: Dict[str, Dict[str, Any]] = {}

# Configurações SMTP Institucionais extraídas do ambiente do contêiner
SMTP_SERVER = os.getenv("SMTP_HOST", "smtp.gmail.com")
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
    data_copy = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    data_copy.update({"exp": int(expire.timestamp())})
    return jwt.encode(data_copy, SECRET_KEY, algorithm=ALGORITHM)

def enviar_email_otp_sincrono(email_destino: str, codigo_otp: str, template_cadastro: bool = False):
    """Executa o envio físico do código de verificação através do SMTP institucional."""
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = email_destino
        
        if template_cadastro:
            msg['Subject'] = f"[GTI ICET] Código de Verificação de Cadastro: {codigo_otp}"
            titulo = "Confirmação de Identidade Institucional"
            texto_principal = "Recebemos sua solicitação de validação prévia de e-mail para credenciamento no ecossistema de Ordens de Serviço do ICET/UFAM."
            rodape = "Se você não iniciou este fluxo no portal de cadastro, ignore este e-mail por segurança."
        else:
            msg['Subject'] = f"[GTI ICET] Código de Recuperação de Senha: {codigo_otp}"
            titulo = "Redefinição de Credenciais Corporativas"
            texto_principal = "Sua solicitação de redefinição de senha foi homologada pelo sistema de segurança do portal."
            rodape = "Este código é restrito. Se você não solicitou esta alteração, modifique suas credenciais imediatamente."

        corpo_html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 25px; border-radius: 8px;">
                    <h2 style="color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-top: 0;">{titulo}</h2>
                    <p>Prezado(a) Servidor(a),</p>
                    <p>{texto_principal}</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 5px; background: #f1f5f9; padding: 10px 25px; border-radius: 6px; border: 1px dashed #cbd5e1; color: #0f172a;">
                            {codigo_otp}
                        </span>
                    </div>
                    <p style="font-size: 13px; color: #475569;"><strong>Aviso de Expiração:</strong> Este token operacional possui validade estrita de 15 minutos.</p>
                    <p style="margin-top: 25px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                        {rodape}<br/><br/>
                        GTI - Instituto de Ciências Exatas e Tecnologia (ICET/UFAM)
                    </p>
                </div>
            </body>
        </html>
        """
        msg.attach(MIMEText(corpo_html, 'html', 'utf-8'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, email_destino, msg.as_string())
        
        logger.info(f"[SMTP SUCCESS] Token enviado para {email_destino}")
    except Exception as smtp_err:
        logger.error(f"[SMTP CRITICAL] Falha no disparo de e-mail para {email_destino}: {str(smtp_err)}")

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
# 🏛️ ENDPOINTS DE PRÉ-CADASTRO (FLUXO INTERATIVO 2 ETAPAS)
# ==========================================

@router.post("/register/request-token")
async def solicitar_token_cadastro(payload: SolicitacaoTokenCadastroIn, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Etapa 1 UX: Valida e-mail e despacha ou atualiza o Token OTP de 6 dígitos sem bloquear reenvios."""
    email_limpo = payload.email.lower().strip()
    
    result_existente = await db.execute(select(Usuario).where(Usuario.email == email_limpo))
    usuario_existente = result_existente.scalars().first()
    
    # 🚀 CORREÇÃO INTELIGENTE: Só bloqueia o cadastro se o e-mail pertencer a uma conta ATIVA e homologada.
    if usuario_existente and usuario_existente.senha_hash != "PROTECTED_TOKEN_STAGE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este e-mail institucional já está cadastrado no sistema.")
        
    codigo_otp = str(random.randint(100000, 999999))
    agora = datetime.now(timezone.utc)
    expiracao = agora + timedelta(minutes=15)
    
    if usuario_existente:
        # Reenvio seguro: se o usuário já iniciou a Etapa 1 e pediu o código de novo, atualiza sem travar.
        usuario_existente.codigo_verificacao = codigo_otp
        usuario_existente.codigo_expira_em = expiracao
    else:
        # Novo fluxo: cria o rastro temporário de token
        usuario_pendente = Usuario(
            nome_completo="Cadastro Temporário",
            username=f"temp_{codigo_otp}_{int(agora.timestamp())}",
            email=email_limpo,
            siape=f"TEMP_{random.randint(10000, 99999)}",
            cargo="Servidor",
            senha_hash="PROTECTED_TOKEN_STAGE",
            is_active=False,
            codigo_verificacao=codigo_otp,
            codigo_expira_em=expiracao
        )
        db.add(usuario_pendente)
        
    await db.commit()
    background_tasks.add_task(enviar_email_otp_sincrono, email_limpo, codigo_otp, True)
    
    return {"success": True, "message": "Código de validação enviado com sucesso para a sua caixa institucional."}


@router.post("/register/verify-token")
async def verificar_token_cadastro(payload: VerificacaoTokenCadastroIn, db: AsyncSession = Depends(get_db)):
    """Etapa 2 UX: Intercepta o código inserido e chancela a veracidade do e-mail institucional."""
    email_limpo = payload.email.lower().strip()
    
    result = await db.execute(select(Usuario).where(Usuario.email == email_limpo))
    usuario = result.scalars().first()
    
    if not usuario or usuario.codigo_verificacao != payload.codigo:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código de verificação incorreto.")
        
    if datetime.now(timezone.utc) > usuario.codigo_expira_em.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este código expirou. Reinicie o fluxo de validação.")
        
    return {"success": True, "message": "E-mail institucional chancelado. Prossiga para o preenchimento de dados."}

# ==========================================
# ENDPOINTS OPERACIONAIS PADRÃO
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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login ou senha incorretos.")

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
        "sub": usuario.username, "role": role_sessao, "siape": usuario.siape, 
        "cargo": usuario.cargo, "nome_completo": usuario.nome_completo
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "first_login_required": usuario.requires_password_change if hasattr(usuario, 'requires_password_change') else False,
        "user": {
            "id": usuario.id, "username": usuario.username, "email": usuario.email,
            "siape": usuario.siape, "cargo": usuario.cargo, "role": role_sessao, "grupo_nome": grupo_sessao
        }
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def registrar_servidor_auto_cadastro(payload: UsuarioCadastroIn, db: AsyncSession = Depends(get_db)):
    """Finalização do Cadastro: Recebe o formulário completo e joga em estado BLOQUEADO para análise do gerente."""
    email_limpo = payload.email.lower().strip()
    
    result = await db.execute(select(Usuario).where(Usuario.email == email_limpo))
    usuario_existente = result.scalars().first()
    
    if not usuario_existente or usuario_existente.senha_hash != "PROTECTED_TOKEN_STAGE":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Quebra de Segurança: Realize a validação prévia de token OTP primeiro.")

    result_username = await db.execute(select(Usuario).where(Usuario.username == payload.username.strip()))
    if result_username.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este nome de usuário corporativo já está em uso.")

    result_siape = await db.execute(select(Usuario).where(Usuario.siape == payload.siape.strip()))
    if result_siape.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este identificador SIAPE já está registrado.")

    # Mutação segura do registro temporário para o formulário real preenchido
    usuario_existente.nome_completo = payload.nome_completo
    usuario_existente.username = payload.username.strip()
    usuario_existente.siape = payload.siape.strip()
    usuario_existente.cargo = payload.cargo
    usuario_existente.senha_hash = hash_senha(payload.password)
    usuario_existente.comprovante_base64 = payload.comprovante_base64
    usuario_existente.codigo_verificacao = None  
    usuario_existente.codigo_expira_em = None
    usuario_existente.is_active = False # 🚀 BLOQUEADO RIGOROSO: Só o gerente ativa.

    nome_grupo_alvo = "Docentes" 
    result_grupo = await db.execute(select(GrupoPermissao).where(GrupoPermissao.nome == nome_grupo_alvo))
    grupo = result_grupo.scalars().first()
    
    if grupo is not None:
        tabela_usuario_grupo = Usuario.grupos.property.secondary
        await db.execute(insert(tabela_usuario_grupo).values(usuario_id=usuario_existente.id, grupo_id=grupo.id))

    await db.commit()
    return {"success": True, "message": "Cadastro consolidado com sucesso. Aguarde a validação de crachá da TI."}

@router.post("/forgot-password")
async def solicitar_recuperacao_senha(payload: SolicitacaoCodigoRecuperacaoIn, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    email_limpo = payload.email.lower().strip()
    agora = datetime.now(timezone.utc)
    
    registro_existente = CODIGOS_RECUPERACAO.get(email_limpo)
    if registro_existente and (agora - registro_existente["criado_em"]).total_seconds() < 60:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Ação bloqueada. Aguarde 60 segundos para reenviar.")

    result = await db.execute(select(Usuario).where(Usuario.email == email_limpo))
    if not result.scalars().first():
        return {"success": True, "message": "Código enviado se o e-mail constar em nossa base."}

    codigo_otp = str(random.randint(100000, 999999))
    CODIGOS_RECUPERACAO[email_limpo] = {"codigo": codigo_otp, "criado_em": agora, "expira_em": agora + timedelta(minutes=15)}
    
    background_tasks.add_task(enviar_email_otp_sincrono, email_limpo, codigo_otp, False)
    return {"success": True, "message": "Código enviado se o e-mail constar em nossa base."}

@router.post("/reset-password")
async def redefinir_senha_por_codigo(payload: RedefinirSenhaPorCodigoIn, db: AsyncSession = Depends(get_db)):
    email_limpo = payload.email.lower().strip()
    registro_otp = CODIGOS_RECUPERACAO.get(email_limpo)

    if not registro_otp or registro_otp["codigo"] != payload.codigo:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código de verificação inválido.")

    if datetime.now(timezone.utc) > registro_otp["expira_em"]:
        if email_limpo in CODIGOS_RECUPERACAO: del CODIGOS_RECUPERACAO[email_limpo]
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O código expirou. Solicite um novo.")

    result = await db.execute(select(Usuario).where(Usuario.email == email_limpo))
    usuario = result.scalars().first()
    if not usuario: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não localizado.")

    usuario.senha_hash = hash_senha(payload.nova_senha)
    if hasattr(usuario, 'requires_password_change'): usuario.requires_password_change = False
    
    await db.commit()
    if email_limpo in CODIGOS_RECUPERACAO: del CODIGOS_RECUPERACAO[email_limpo]
    return {"success": True, "message": "Senha redefinida com sucesso."}

@router.post("/alterar-senha")
async def alterar_senha_usuario(payload: AlterarSenhaIn, usuario_atual: Usuario = Depends(get_utilizador_atual), db: AsyncSession = Depends(get_db)):
    if not verificar_senha(payload.senha_atual, usuario_atual.senha_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A senha atual está incorreta.")
    usuario_atual.senha_hash = hash_senha(payload.nova_senha)
    await db.commit()
    return {"success": True, "detail": "Senha alterada com sucesso."}

@router.post("/complete-first-access")
async def completar_primeiro_acesso(payload: CompletarPrimeiroAcessoIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.username == payload.username))
    usuario = result.scalars().first()
    if not usuario or not verificar_senha(payload.senha_provisoria, usuario.senha_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Credenciais provisórias inválidas.")
    usuario.senha_hash = hash_senha(payload.nova_senha)
    if hasattr(usuario, 'requires_password_change'): usuario.requires_password_change = False
    await db.commit()
    return {"success": True}