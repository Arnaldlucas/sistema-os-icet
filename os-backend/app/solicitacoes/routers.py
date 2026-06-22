"""
Portas de Entrada e Rotas REST para o Domínio de Ordens de Serviço (FastAPI).

Abstrai o controle HTTP para criação de chamados, isolamento horizontal (RBAC) de listagens,
e injeção de pareceres técnicos auditados no encerramento de atividades.
"""

import logging
import httpx
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.auth.routers import get_utilizador_atual
from app.auth.models import Usuario
from app.solicitacoes.models import Solicitacao, InteracaoTimeline, PrioridadeOS, StatusOS, TipoEventoTimeline
from app.auditoria.schemas import SolicitacaoCreateIn, SolicitacaoOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/requests", tags=["Ordens de Serviço — Módulo 2 e 3"])

class StatusUpdatePayload(BaseModel):
    """Contrato de entrada para trânsito de estado e fechamento auditado."""
    status: str = Field(..., description="Novo status operativo enviado pela interface.")
    parecer_tecnico: Optional[str] = Field(None, description="Justificativa ou parecer técnico de fechamento.")


async def disparar_webhook_notificacao_gti(os_id: int, status_novo: str, solicitante_nome: str):
    """
    Dispara payloads de integração assíncronos para a central de notificações externa.

    "PORQUÊ": Esta função deve ser invocada estritamente como BackgroundTask no FastAPI.
    Fazer a requisição HTTP assíncrona fora da thread principal assegura impacto zero no
    tempo de resposta (TTFB) da rota para o operador que está salvando a OS.
    """
    webhook_url = "https://gti.ufam.edu.br/hooks/notifications" 
    payload_comunicacao = {
        "sistema": "GTI Ordens de Servico",
        "evento": "MUDANCA_STATUS_OS",
        "os_id": os_id,
        "status": status_novo,
        "mensagem": f"Atenção {solicitante_nome}: A sua Ordem de Serviço #{os_id} transitou para o estado '{status_novo}'."
    }
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            await client.post(webhook_url, json=payload_comunicacao)
            logger.info(f"[Webhook] Notificação de trânsito enviada para O.S. #{os_id}.")
    except Exception as hook_err:
        logger.warning(f"[Webhook Fallback] Canal receptor offline ou inacessível: {str(hook_err)}")


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def criar_ordem_servico(
    payload: SolicitacaoCreateIn, 
    usuario_atual: Usuario = Depends(get_utilizador_atual),
    db: AsyncSession = Depends(get_db)
):
    """
    POST /api/requests
    Registra e instancia uma nova Ordem de Serviço gerando o evento inicial na timeline.
    """
    prioridade_enum = PrioridadeOS.normalizar(payload.prioridade or "MEDIA")
    status_inicial = StatusOS.PENDENTE

    nova_os = Solicitacao(
        titulo=payload.categoria.strip(), 
        descricao=payload.descricao.strip(),
        status=status_inicial,
        prioridade=prioridade_enum,
        categoria=payload.categoria.strip(),
        subcategoria=payload.subcategoria.strip() if payload.subcategoria else "Geral / Chamado Direto",
        tipo_ambiente="UNIVERSAL",
        bloco=payload.bloco.strip(),
        andar=None, 
        sala=payload.sala_ou_espaco.strip(),
        ponto_referencia=None,
        numero_patrimonio=payload.numero_patrimonio.strip() if payload.numero_patrimonio else None,
        usuario_id=usuario_atual.id,
        tecnico_id=None
    )

    db.add(nova_os)
    await db.flush()

    evento_inicial = InteracaoTimeline(
        solicitacao_id=nova_os.id,
        autor_id=usuario_atual.id,
        tipo_evento=TipoEventoTimeline.MENSAGEM,
        conteudo="Abertura de Chamado: Solicitação registrada e enviada para a fila de triagem da GTI sob governança ITIL v4."
    )
    db.add(evento_inicial)
    
    try:
        await db.commit()
    except Exception as err:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Falha transacional ao persistir a ordem de serviço: {str(err)}"
        )

    result = await db.execute(
        select(Solicitacao)
        .options(selectinload(Solicitacao.criador), selectinload(Solicitacao.timeline))
        .where(Solicitacao.id == nova_os.id)
    )
    os_completa = result.scalars().first()

    interacoes_formatadas = [{
        "id": t.id,
        "autor_nome": os_completa.criador.nome_completo,
        "status_novo": "PENDENTE",
        "conteudo": t.conteudo,
        "criado_em": t.criado_em
    } for t in os_completa.timeline]

    return {
        "id": os_completa.id,
        "titulo": os_completa.titulo,
        "descricao": os_completa.descricao,
        "status": os_completa.status.value,
        "prioridade": os_completa.prioridade.value,
        "categoria": os_completa.categoria,
        "bloco": os_completa.bloco,
        "sala": os_completa.sala,
        "criador_nome": os_completa.criador.nome_completo,
        "tecnico_nome": "Aguardando Atribuição",
        "criado_em": os_completa.criado_em,
        "atualizado_em": os_completa.atualizado_em,
        "timeline": interacoes_formatadas,
        "anexos": []
    }


@router.get("", response_model=List[Dict[str, Any]])
async def listar_ordens_servico(
    usuario_atual: Usuario = Depends(get_utilizador_atual),
    db: AsyncSession = Depends(get_db)
):
    """
    GET /api/requests
    Aplica o isolamento horizontal de registros baseado em escopos RBAC (US05).
    """
    query = select(Solicitacao).options(
        selectinload(Solicitacao.criador),
        selectinload(Solicitacao.tecnico),
        selectinload(Solicitacao.timeline),
        selectinload(Solicitacao.anexos)
    )
    
    user_cargo = getattr(usuario_atual, "cargo", "").lower() if usuario_atual.cargo else ""
    
    # "PORQUÊ" (ISOLAMENTO DE FILA): Aplica simetria para as contas gestoras (Admin e Subgerente).
    # Caso o usuário logado não seja da equipe de TI do CPD, injeta uma cláusula WHERE estrita na query,
    # fazendo com que ele enxergue única e exclusivamente os chamados que ele mesmo abriu.
    is_admin_master = usuario_atual.role == "admin" or usuario_atual.username == "gerente.gti" or usuario_atual.email == "gerente@ufam.edu.br"
    is_tecnico_cpd = usuario_atual.role == "tecnico" and ("gti" in user_cargo or "cpd" in user_cargo or "tecnico da gti" in user_cargo or "subgerente" in user_cargo)
    
    if not (is_admin_master or is_tecnico_cpd):
        query = query.where(Solicitacao.usuario_id == usuario_atual.id)
    
    query = query.order_by(Solicitacao.atualizado_em.desc())
    result = await db.execute(query)
    solicitacoes = result.scalars().all()
    
    retorno = []
    for os_item in solicitacoes:
        nome_tecnico = os_item.tecnico.nome_completo if os_item.tecnico else "Aguardando Atribuição"
        
        retorno.append({
            "id": os_item.id,
            "nome": os_item.criador.nome_completo if os_item.criador else "Servidor Omitido",
            "titulo": os_item.titulo,
            "descricao": os_item.descricao,
            "status": os_item.status.value if hasattr(os_item.status, "value") else str(os_item.status),
            "prioridade": os_item.prioridade.value if hasattr(os_item.prioridade, "value") else str(os_item.prioridade),
            "categoria": os_item.categoria,
            "bloco": os_item.bloco,
            "sala": os_item.sala,
            "numero_patrimonio": os_item.numero_patrimonio,
            "tecnico_nome": nome_tecnico,
            "criado_em": os_item.create_time if hasattr(os_item, 'create_time') else os_item.criado_em,
            "atualizado_em": os_item.atualizado_em,
            "timeline": [
                {
                    "id": t.id,
                    "autor_nome": t.autor.nome_completo if t.autor else "Sistema",
                    "status_novo": t.tipo_evento.value,
                    "conteudo": t.conteudo,
                    "criado_em": t.criado_em
                } for t in os_item.timeline
            ],
            "anexos": []
        })
    return retorno


@router.put("/{solicitacao_id}/status")
async def atualizar_status_ordem(
    solicitacao_id: int,
    payload: StatusUpdatePayload,
    background_tasks: BackgroundTasks, 
    usuario_atual: Usuario = Depends(get_utilizador_atual),
    db: AsyncSession = Depends(get_db)
):
    """
    PUT /api/requests/{id}/status
    Modifica o estado operativo de uma O.S., validando travas e injetando pareceres técnicos.
    """
    user_cargo = getattr(usuario_atual, "cargo", "").lower() if usuario_atual.cargo else ""
    is_tecnico_valido = usuario_atual.role in ["admin", "tecnico"] or "subgerente" in user_cargo or "cpd" in user_cargo or "gti" in user_cargo
    
    if not is_tecnico_valido:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Acesso Negado: Operação restrita à equipe técnica da GTI."
        )

    result = await db.execute(
        select(Solicitacao)
        .options(selectinload(Solicitacao.criador))
        .where(Solicitacao.id == solicitacao_id)
    )
    os_alvo = result.scalars().first()

    if not os_alvo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de Serviço não encontrada.")

    # "PORQUÊ" (IMUTABILIDADE DO HISTÓRICO): Bloqueia modificações estruturais em chamados já finalizados.
    # Garante que ordens arquivadas como RESOLVIDO ou CANCELADO permaneçam congeladas para fins de auditoria interna.
    if os_alvo.status in [StatusOS.RESOLVIDO, StatusOS.CANCELADO]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operação bloqueada: Esta Ordem de Serviço já se encontra finalizada e imutável."
        )

    status_enum = StatusOS.normalizar(payload.status)
    os_alvo.status = status_enum
    
    if status_enum in [StatusOS.RESOLVIDO, StatusOS.CANCELADO]:
        os_alvo.tecnico_id = usuario_atual.id

    conteudo_log = f"Log do Sistema: Status alterado para '{status_enum.value}' por {usuario_atual.nome_completo}."
    if payload.parecer_tecnico and payload.parecer_tecnico.strip():
        conteudo_log = f"Parecer Técnico por {usuario_atual.nome_completo}: {payload.parecer_tecnico.strip()}"

    historico_log = InteracaoTimeline(
        solicitacao_id=os_alvo.id,
        autor_id=usuario_atual.id,
        tipo_evento=TipoEventoTimeline.MUDANCA_STATUS if status_enum not in [StatusOS.RESOLVIDO, StatusOS.CANCELADO] else TipoEventoTimeline.DESPACHO,
        conteudo=conteudo_log
    )
    db.add(historico_log)
    
    await db.commit()

    nome_solicitante = os_alvo.criador.nome_completo if os_alvo.criador else "Servidor"
    background_tasks.add_task(disparar_webhook_notificacao_gti, os_alvo.id, status_enum.value, nome_solicitante)

    return {"success": True, "status": "sucesso", "message": "Status e histórico de auditoria gravados com sucesso."}