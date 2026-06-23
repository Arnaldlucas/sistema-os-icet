"""
Rotas Operacionais da API de Auditoria e Rastreabilidade (FastAPI).

Disponibiliza os endpoints de leitura de logs transacionais para a equipe
de segurança e gerenciamento master da GTI.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db  # Sincronizado com o padrão de sessão get_db do projeto
from app.auditoria.schemas import LogAuditoriaResponse
from app.auditoria.services import AuditoriaService
from app.auth.routers import get_utilizador_atual
from app.auth.models import Usuario

router = APIRouter(prefix="/auditoria", tags=["Auditoria"])

@router.get("/", response_model=list[LogAuditoriaResponse])
async def obter_logs(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(get_utilizador_atual)
):
    """
    GET /api/auditoria
    Permite rastrear o histórico completo de ações de segurança do ecossistema.

    Restrito estritamente a administradores e subgerentes por travas de segurança.
    """
    user_cargo = getattr(usuario_atual, "cargo", "").lower() if usuario_atual.cargo else ""
    is_admin = usuario_atual.role == "admin" or "administrador" in user_cargo or "subgerente" in user_cargo
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso Negado: A leitura de logs de auditoria é exclusiva da Gerência de TI."
        )

    logs = await AuditoriaService.listar_logs(db=db, skip=skip, limit=limit)
    return logs