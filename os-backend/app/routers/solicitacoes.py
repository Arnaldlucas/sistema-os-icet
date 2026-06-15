from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Dict, List, Any
from pydantic import BaseModel
import datetime

from app.models import User, Demand, Request, Interaction
from app.schemas import (
    DemandResponse, 
    RequestCreate, 
    RequestWrapperResponse, 
    RequestResponse, 
    StatusUpdatePayload
)
from app.auth import get_current_user, is_admin, get_db_placeholder
from app.tasks import send_notification_email_task, log_system_audit_task

router = APIRouter()

# Esquema local para validação do corpo da nova interação
class InteractionCreatePayload(BaseModel):
    mensagem: str
    tipo: str = "usuario"  # Define o padrão para interações textuais de usuários

# ==========================================
# 1. BOOTSTRAP PÚBLICO (DEMANDAS)
# ==========================================
@router.get("/api/public/bootstrap", response_model=Dict[str, List[DemandResponse]])
async def get_public_bootstrap(db: AsyncSession = Depends(get_db_placeholder)):
    """Retorna a lista de todas as demandas cadastradas para preencher o formulário inicial."""
    result = await db.execute(select(Demand).order_by(Demand.nome))
    demands = result.scalars().all()
    return {"demands": demands}

# ==========================================
# 2. CRIAÇÃO DE ORDEM DE SERVIÇO (OS)
# ==========================================
@router.post("/api/requests", response_model=RequestWrapperResponse, status_code=status.HTTP_201_CREATED)
async def create_public_request(
    payload: RequestCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_placeholder)
):
    """
    Cria uma nova Ordem de Serviço. Se for usuário comum, 
    sobrescreve os dados de contato com as informações seguras do JWT.
    """
    request_data = payload.model_dump()
    owner_user_id = None

    # Se NÃO for administrador, aplica as travas de segurança do legado
    if not is_admin(current_user):
        request_data["nome"] = current_user["nome"]
        request_data["email"] = current_user["email"]
        request_data["perfil"] = current_user["grupo_nome"]
        owner_user_id = current_user["id"]
    else:
        # Se for admin criando, tenta associar ao usuário que possui o e-mail enviado
        result_user = await db.execute(select(User).where(User.email == request_data["email"]))
        found_user = result_user.scalars().first()
        if found_user:
            owner_user_id = found_user.id

    # Cria a instância inicial com o protocolo temporário para obter o ID incremental do banco
    nova_os = Request(
        protocolo="PENDENTE",
        owner_user_id=owner_user_id,
        nome=request_data["nome"],
        siape=request_data["siape"],
        email=request_data["email"],
        perfil=request_data["perfil"],
        bloco=request_data["bloco"],
        sala=request_data["sala"],
        categoria=request_data["categoria"],
        descricao=request_data["descricao"],
        status=request_data.get("status", "Aberto")
    )

    db.add(nova_os)
    await db.flush()  # Descarrega no banco para gerar o nova_os.id sem fechar a transação

    # Gera o protocolo no padrão estrito baseado no ano de 2026
    nova_os.protocolo = f"OS-2026-{nova_os.id:05d}"
    
    # Cria a primeira interação automática do sistema exigida pelo frontend
    interacao_sistema = Interaction(
        request_id=nova_os.id,
        user_id=current_user["id"],
        autor_nome=current_user["nome"],
        autor_grupo=current_user["grupo_nome"],
        mensagem="Solicitação cadastrada no sistema.",
        tipo="sistema"
    )
    db.add(interacao_sistema)
    
    await db.commit()
    
    # Força o recarregamento assíncrono acoplando o relacionamento de interações
    result_os = await db.execute(
        select(Request)
        .options(selectinload(Request.interactions))
        .where(Request.id == nova_os.id)
    )
    nova_os_carregada = result_os.scalars().first()

    # Dispara e-mail de confirmação e log de auditoria em segundo plano
    background_tasks.add_task(send_notification_email_task, email_destinatario=nova_os_carregada.email, protocolo=nova_os_carregada.protocolo, acao="criacao")
    background_tasks.add_task(log_system_audit_task, user_login=current_user["login"], acao="criacao_os", detalhes=f"OS {nova_os_carregada.protocolo} criada.")

    return {"request": RequestResponse.model_validate(nova_os_carregada)}

# ==========================================
# 3. ATUALIZAÇÃO DE STATUS DA OS (ADMIN)
# ==========================================
@router.put("/api/requests/{request_id}/status", response_model=RequestWrapperResponse)
async def update_request_status(
    request_id: int,
    payload: StatusUpdatePayload,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_placeholder)
):
    """Atualiza o status de uma OS. Rota restrita a Administradores."""
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seu grupo não tem permissão para atualizar status."
        )

    # Busca a Ordem de Serviço pelo ID
    result = await db.execute(select(Request).where(Request.id == request_id))
    ordem_servico = result.scalars().first()

    if not ordem_servico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitação não encontrada."
        )

    # Atualiza o status
    ordem_servico.status = payload.status
    
    # Registra a interação de alteração de status no histórico
    interacao_status = Interaction(
        request_id=ordem_servico.id,
        user_id=current_user["id"],
        autor_nome=current_user["nome"],
        autor_grupo=current_user["grupo_nome"],
        mensagem=f"Status da solicitação alterado para '{payload.status}'.",
        tipo="sistema"
    )
    db.add(interacao_status)
    
    await db.commit()
    
    # Força o recarregamento também na rota de alteração de status por segurança
    result_os = await db.execute(
        select(Request)
        .options(selectinload(Request.interactions))
        .where(Request.id == ordem_servico.id)
    )
    ordem_servico_carregada = result_os.scalars().first()

    # Dispara notificações em segundo plano
    background_tasks.add_task(send_notification_email_task, email_destinatario=ordem_servico_carregada.email, protocolo=ordem_servico_carregada.protocolo, acao="status")
    background_tasks.add_task(log_system_audit_task, user_login=current_user["login"], acao="atualizacao_status", detalhes=f"OS {ordem_servico_carregada.protocolo} alterada para {payload.status}.")

    return {"request": RequestResponse.model_validate(ordem_servico_carregada)}

# ==========================================
# 4. BUSCA DETALHADA DE UMA OS POR ID (DETALHES)
# ==========================================
@router.get("/api/requests/{request_id}", response_model=RequestWrapperResponse)
async def get_request_details(
    request_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_placeholder)
):
    """Retorna os detalhes e o histórico de interações de uma OS específica por ID."""
    result = await db.execute(
        select(Request)
        .options(selectinload(Request.interactions))
        .where(Request.id == request_id)
    )
    ordem_servico = result.scalars().first()

    if not ordem_servico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitação não encontrada."
        )

    # Segurança: Se não for admin, impede o usuário de xeretar OS de terceiros
    if not is_admin(current_user) and ordem_servico.owner_user_id != current_user["id"] and ordem_servico.email != current_user["email"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para visualizar esta solicitação."
        )

    return {"request": RequestResponse.model_validate(ordem_servico)}

# ==========================================
# 5. ADICIONAR NOVA INTERAÇÃO/MENSAGEM EM UMA OS
# ==========================================
@router.post("/api/requests/{request_id}/interactions", response_model=RequestWrapperResponse, status_code=status.HTTP_201_CREATED)
async def create_request_interaction(
    request_id: int,
    payload: InteractionCreatePayload,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_placeholder)
):
    """Permite adicionar mensagens no histórico e retorna a OS inteira atualizada para o React."""
    # 1. Valida a existência da OS informada
    result = await db.execute(select(Request).where(Request.id == request_id))
    ordem_servico = result.scalars().first()

    if not ordem_servico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitação não encontrada."
        )

    # 2. Segurança: Apenas administradores ou o dono legítimo da OS podem comentar
    if not is_admin(current_user) and ordem_servico.owner_user_id != current_user["id"] and ordem_servico.email != current_user["email"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para adicionar comentários nesta solicitação."
        )

    # 3. Instancia e persiste o comentário no banco de dados
    nova_interacao = Interaction(
        request_id=request_id,
        user_id=current_user["id"],
        autor_nome=current_user["nome"],
        autor_grupo=current_user["grupo_nome"],
        mensagem=payload.mensagem.strip(),
        tipo=payload.tipo
    )
    db.add(nova_interacao)
    
    # Atualiza a data de modificação da OS pai para sincronismo estrito do dashboard
    ordem_servico.updated_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    await db.commit()

    # 4. Busca a OS inteira recarregada contendo todo o histórico atualizado
    result_os = await db.execute(
        select(Request)
        .options(selectinload(Request.interactions))
        .where(Request.id == request_id)
    )
    ordem_servico_carregada = result_os.scalars().first()


    # ==========================================
# 6. LISTAGEM GERAL DE ORDENS DE SERVIÇO (DASHBOARD)
# ==========================================
@router.get("/api/requests", response_model=List[RequestResponse])
async def list_requests(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_placeholder)
):
    """
    Lista as Ordens de Serviço do banco SQLite de forma segura.
    Se for administrador, lista todas. Se for usuário comum, filtra apenas as dele.
    """
    if is_admin(current_user):
        # Admin visualiza a fila inteira do ICET
        query = select(Request).options(selectinload(Request.interactions)).order_by(Request.id.desc())
    else:
        # Usuário comum só enxerga as próprias solicitações criadas por ele
        query = (
            select(Request)
            .options(selectinload(Request.interactions))
            .where((Request.owner_user_id == current_user["id"]) | (Request.email == current_user["email"]))
            .order_by(Request.id.desc())
        )
        
    result = await db.execute(query)
    lista_os = result.scalars().all()
    
    # Retorna uma lista limpa diretamente, que é o que o React espera receber via GET
    return [RequestResponse.model_validate(os) for os in lista_os]
