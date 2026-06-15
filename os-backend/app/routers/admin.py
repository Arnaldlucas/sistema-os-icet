from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from typing import List

from app.models import Group, User, Demand, Request, Interaction
from app.schemas import (
    AdminBootstrapResponse, 
    AdminPermissions,
    GroupResponse, GroupCreate,
    UserSessionResponse, UserCreate,
    DemandResponse, DemandCreate,
    RequestResponse
)
from app.auth import get_current_user, is_admin, get_password_hash, get_db_placeholder

router = APIRouter()

def is_admin(user: dict) -> bool:
    """Verifica internamente se o perfil do usuário possui privilégios administrativos."""
    return user.get("role") == "admin"


# ==========================================
# FUNÇÃO AUXILIAR DE SERIALIZAÇÃO MACRO
# ==========================================
async def _generate_admin_bootstrap_payload(current_user: dict, db: AsyncSession) -> dict:
    admin_status = is_admin(current_user)
    
    result_demands = await db.execute(select(Demand).order_by(Demand.nome))
    demands_list = [DemandResponse.model_validate(d) for d in result_demands.scalars().all()]
    
    groups_list = []
    users_list = []
    requests_list = []
    
    if admin_status:
        result_groups = await db.execute(select(Group).order_by(Group.nome))
        groups_list = [GroupResponse.model_validate(g) for g in result_groups.scalars().all()]
        
        result_users = await db.execute(
            select(User).options(selectinload(User.group)).order_by(User.nome)
        )
        for u in result_users.scalars().all():
            users_list.append(UserSessionResponse(
                id=u.id,
                nome=u.nome,
                login=u.login,
                email=u.email,
                role=u.role,
                grupo_nome=u.group.nome if u.group else "Sem Grupo"
            ))
        
        result_requests = await db.execute(
            select(Request).options(selectinload(Request.interactions)).order_by(Request.id.desc())
        )
        requests_list = result_requests.scalars().all()
    else:
        result_requests = await db.execute(
            select(Request).options(selectinload(Request.interactions))
            .where((Request.owner_user_id == current_user["id"]) | (Request.email == current_user["email"]))
            .order_by(Request.id.desc())
        )
        requests_list = result_requests.scalars().all()

    permissions = AdminPermissions(
        admin=admin_status,
        can_manage=admin_status,
        can_update_status=admin_status,
        can_reports=admin_status,
        can_create_requests=True,
        can_view_own_requests=True
    )

    validated_requests = [RequestResponse.model_validate(req) for req in requests_list]

    validated_current_user = UserSessionResponse(
        id=current_user["id"],
        nome=current_user["nome"],
        login=current_user["login"],
        email=current_user["email"],
        role=current_user["role"],
        grupo_nome=current_user.get("grupo_nome", "Sem Grupo")
    )

    return {
        "user": validated_current_user,
        "permissions": permissions,
        "groups": groups_list,
        "users": users_list,
        "demands": demands_list,
        "requests": validated_requests
    }


@router.get("/api/admin/bootstrap", response_model=AdminBootstrapResponse)
async def get_admin_bootstrap(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_placeholder)
):
    return await _generate_admin_bootstrap_payload(current_user, db)


# ==========================================
# 2. ENDPOINTS AUXILIARES DE CADASTRO (ADMIN)
# ==========================================

@router.post("/api/groups", status_code=status.HTTP_201_CREATED)
async def create_group(
    payload: GroupCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_placeholder)
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acesso negado.")
    
    try:
        novo_grupo = Group(nome=payload.nome.strip(), descricao=payload.descricao.strip())
        db.add(novo_grupo)
        await db.commit()
        await db.refresh(novo_grupo)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um grupo cadastrado com este nome."
        )
    
    created_str = novo_grupo.created_at.isoformat() if hasattr(novo_grupo.created_at, "isoformat") else str(novo_grupo.created_at or "")
    
    return {
        "item": {
            "id": novo_grupo.id,
            "nome": novo_grupo.nome,
            "descricao": novo_grupo.descricao,
            "created_at": created_str
        }
    }


@router.post("/api/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_placeholder)
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acesso negado.")
    
    try:
        hashed = get_password_hash(payload.senha)
        # 🚀 CORREÇÃO SÊ_NIOR: Mapeia o campo role recebido do payload do React dinamicamente
        role_definida = getattr(payload, "role", "user") if hasattr(payload, "role") else "user"
        
        novo_usuario = User(
            nome=payload.nome.strip(),
            login=payload.login.strip(),
            email=payload.email.strip(),
            password_hash=hashed,
            group_id=payload.grupo_id,
            role=role_definida
        )
        db.add(novo_usuario)
        await db.commit()
        await db.refresh(novo_usuario)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este login de usuário ou e-mail já está em uso."
        )
    
    result_user = await db.execute(
        select(User).options(selectinload(User.group)).where(User.id == novo_usuario.id)
    )
    u = result_user.scalars().first()
    
    return {
        "item": {
            "id": u.id,
            "nome": u.nome,
            "login": u.login,
            "email": u.email,
            "role": u.role,
            "grupo_nome": u.group.nome if u.group else "Sem Grupo"
        }
    }


@router.post("/api/demands", status_code=status.HTTP_201_CREATED)
async def create_demand(
    payload: DemandCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_placeholder)
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acesso negado.")
    
    try:
        nova_demanda = Demand(nome=payload.nome.strip(), prazo=payload.prazo.strip())
        db.add(nova_demanda)
        await db.commit()
        await db.refresh(nova_demanda)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um tipo de demanda cadastrado com este nome."
        )
    
    created_str = nova_demanda.created_at.isoformat() if hasattr(nova_demanda.created_at, "isoformat") else str(nova_demanda.created_at or "")
    
    return {
        "item": {
            "id": nova_demanda.id,
            "nome": nova_demanda.nome,
            "prazo": nova_demanda.prazo,
            "created_at": created_str
        }
    }


# ==========================================
# 3. ENDPOINTS AUXILIARES DE EXCLUSÃO (DELETE)
# ==========================================

@router.delete("/api/groups/{group_id}", status_code=status.HTTP_200_OK)
async def delete_group(
    group_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_placeholder)
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acesso negado.")
    
    result = await db.execute(select(Group).where(Group.id == group_id))
    grupo = result.scalars().first()
    
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo não encontrado.")
    
    try:
        await db.delete(grupo)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível remover este grupo pois existem usuários associados a ele."
        )
        
    return {"success": True, "id": group_id}


@router.delete("/api/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_placeholder)
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acesso negado.")
        
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="O usuário administrador logado não pode autoexcluir-se.")

    result = await db.execute(select(User).where(User.id == user_id))
    usuario = result.scalars().first()
    
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        
    # 🛡️ INTERVENÇÃO DE INTEGRIDADE: Anonimiza os chamados abertos por este usuário para evitar fantasmas na UI
    vinc_requests = await db.execute(select(Request).where(Request.owner_user_id == user_id))
    for req in vinc_requests.scalars().all():
        req.nome = "Usuário Removido"
        req.email = "removido@icet.ufam.edu.br"
        req.siape = "0000000"

    await db.delete(usuario)
    await db.commit()
    return {"success": True, "id": user_id}


@router.delete("/api/demands/{demand_id}", status_code=status.HTTP_200_OK)
async def delete_demand(
    demand_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_placeholder)
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acesso negado.")

    result = await db.execute(select(Demand).where(Demand.id == demand_id))
    demanda = result.scalars().first()
    
    if not demanda:
        raise HTTPException(status_code=404, detail="Demanda não encontrada.")
        
    await db.delete(demanda)
    await db.commit()
    return {"success": True, "id": demand_id}


# ==========================================
# 🚀 4. MÓDULO EVOLUTIVO: RESET DA BASE DE TESTES
# ==========================================
@router.post("/api/admin/reset-environment", status_code=status.HTTP_200_OK)
async def reset_environment(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_placeholder)
):
    """
    Trunca as tabelas de Ordens de Serviço e Interações de teste.
    Permite limpar o ambiente de homologação em um clique diretamente pelo painel administrativo restrito.
    """
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Operação restrita ao Administrador Master.")

    try:
        # Executa a limpeza massiva respeitando o ecossistema assíncrono
        await db.execute(select(Interaction))
        await db.execute(select(Request))
        
        # Remove todos os registros sem deletar a estrutura das tabelas
        result_interactions = await db.execute(select(Interaction))
        for item in result_interactions.scalars().all():
            await db.delete(item)
            
        result_requests = await db.execute(select(Request))
        for item in result_requests.scalars().all():
            await db.delete(item)
            
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Falha na limpeza do SQLite: {str(e)}")

    return {"success": True, "message": "Ambiente de ordens de serviço limpo com sucesso."}