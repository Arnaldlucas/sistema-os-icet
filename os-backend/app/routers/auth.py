from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models import User
from app.schemas import LoginPayload, LoginResponse
from app.auth import verify_password, create_access_token, get_db_placeholder
from app.tasks import log_system_audit_task

# Criamos o roteador sem prefixo para mapear a rota exata exigida pelo frontend
router = APIRouter()

@router.post("/api/auth/login", response_model=LoginResponse)
async def login(
    payload: LoginPayload, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_placeholder)
):
    """
    Endpoint estrito de login. Recebe 'login' e 'password',
    valida contra o banco de dados (com fallback para SHA256 legado)
    e gera um token de acesso JWT real.
    """
    login_clean = payload.login.strip()
    password_clean = payload.password.strip()  # Remove espaços invisíveis preventivamente
    
    # Busca o usuário de forma assíncrona trazendo os dados do grupo acoplados
    result = await db.execute(
        select(User)
        .options(selectinload(User.group))
        .where(User.login == login_clean)
    )
    user = result.scalars().first()
    
    # Valida usuário e senha usando a função com dupla checagem (Bcrypt / SHA256)
    if not user or not verify_password(password_clean, user.password_hash):
        # Registra a tentativa falha em segundo plano
        background_tasks.add_task(
            log_system_audit_task, 
            user_login=login_clean, 
            acao="login_falho", 
            detalhes="Tentativa de login com credenciais inválidas."
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas. Verifique seu login e senha."
        )
    
    # Gera o Token JWT contendo o login do usuário no 'sub'
    access_token = create_access_token(data={"sub": user.login})
    
    # Monta a resposta exatamente como a estrutura do dicionário que o React espera
    user_data = {
        "id": user.id,
        "nome": user.nome,
        "login": user.login,
        "email": user.email,
        "role": user.role,
        "grupo_nome": user.group.nome if user.group else "Sem Grupo"
    }
    
    # Registra o sucesso em segundo plano
    background_tasks.add_task(
        log_system_audit_task, 
        user_login=user.login, 
        acao="login_sucesso", 
        detalhes=f"Usuário autenticado com sucesso. Role: {user.role}"
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data   
    }