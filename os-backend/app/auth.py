from datetime import datetime, timedelta, timezone
import os
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models import User
from dotenv import load_dotenv # 🚀 Corrigido para o padrão correto do python-dotenv

# Carrega as variáveis do arquivo .env localizado na raiz do projeto
load_dotenv()
# ==========================================
# CONFIGURAÇÕES DE SEGURANÇA (JWT BLINDADO)
# ==========================================
# 🛡️ Sem fallbacks estáticos de strings de produção expostas no código.
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", 8))

if not SECRET_KEY:
    raise RuntimeError("CRITICAL ERROR: A variável ambiente SECRET_KEY não foi configurada no arquivo .env!")

# Contexto para hash de senhas (compatível com a validação segura)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Define o endpoint onde o FastAPI buscará o token automaticamente
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Função âncora para a injeção do banco de dados ser sobrescritível no main.py
async def get_db_placeholder() -> AsyncSession:
    raise NotImplementedError("Será sobrescritório pelo main.py")

# ==========================================
# FUNÇÕES UTILITÁRIas DE CRIPTOGRAFIA
# ==========================================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se a senha enviada corresponde ao hash. 
    Se o banco legado usar SHA256 simples, fazemos o fallback para garantir compatibilidade.
    """
    import hashlib
    # Fallback para a senha legada do Alexandre (SHA256 puro)
    legacy_hash = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
    if legacy_hash == hashed_password:
        return True
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Gera o hash seguro usando bcrypt para novos usuários."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Gera um Token JWT assinado com tempo de expiração ciente de timezone (Python 3.12+)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ==========================================
# DEPENDÊNCIAS DE AUTENTICAÇÃO DO FASTAPI
# ==========================================
async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme), 
    db: AsyncSession = Depends(get_db_placeholder)
) -> dict:
    """
    Dependência assíncrona que extrai o token JWT da requisição,
    valida as permissões e retorna os dados do usuário no formato esperado pelo frontend.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Acesso não autorizado. Faça login novamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Tratamento preventivo para tokens vazios ou strings corrompidas de inicialização
    if not token or token == "null" or token == "undefined":
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Busca o usuário no banco via SQLAlchemy Assíncrono carregando o relacionamento do grupo
    result = await db.execute(
        select(User).options(selectinload(User.group)).where(User.login == username)
    )
    user = result.scalars().first()
    
    if user is None:
        raise credentials_exception
        
    # Retorna o dicionário exatamente com a estrutura esperada pelo frontend
    return {
        "id": user.id,
        "nome": user.nome,
        "login": user.login,
        "email": user.email,
        "role": user.role,
        "grupo_nome": user.group.nome if user.group else "Sem Grupo"
    }

def is_admin(user: dict) -> bool:
    """Verifica se o dicionário do usuário autenticado possui privilégios de administrador."""
    return bool(user and (user.get("role") == "admin" or user.get("grupo_nome") == "Administradores"))