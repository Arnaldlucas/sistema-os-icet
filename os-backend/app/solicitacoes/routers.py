"""
Portas de Entrada e Rotas REST para o Domínio de Ordens de Serviço (FastAPI).

Abstrai o controle HTTP para criação de chamados, isolamento horizontal (RBAC) de listagens,
e injeção de pareceres técnicos auditados no encerramento de atividades.
"""
from fastapi.responses import FileResponse
import logging
import os
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Form, File, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, Unicode, delete
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.auth.routers import get_utilizador_atual
from app.admin.routers import exigir_administrador
from app.auth.models import Usuario
from app.solicitacoes.models import Solicitacao, InteracaoTimeline, StatusOS, TipoEventoTimeline, BlocoPredio, CategoriaTecnica, LogAuditoriaSistema

# RESTAURADO: Importação dos esquemas operacionais exigidos pelas assinaturas do FastAPI
from app.solicitacoes.schemas import BlocoCreateIn, BlocoOut, CategoriaCreateIn, CategoriaOut
BASE_DIR_ROUTER = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR_ROUTER = os.path.join(BASE_DIR_ROUTER, ".data", "uploads")
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/requests", tags=["Ordens de Serviço — Módulo 2 e 3"])

class StatusUpdatePayload(BaseModel):
    """Contrato de entrada para trânsito de estado e fechamento auditado."""
    status: str = Field(..., description="Novo status operativo enviado pela interface.")
    parecer_tecnico: Optional[str] = Field(None, description="Justificativa, Parecer ou Motivo de recusa.")

# ==========================================
# MOTORES DE NOTIFICAÇÃO ASSÍNCRONA
# ==========================================

async def enviar_email_fechamento_os(email_destino: str, os_id: int, status_novo: str, justificativa: str, titulo_os: str):
    """Dispara e-mails formais em HTML informando Resolução ou Recusa Direta do chamado."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER", "arnaldff@gmail.com")
    smtp_pass = os.getenv("SMTP_PASSWORD", "lsjcpvgpmamlvjdb")

    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = email_destino
    msg['Subject'] = f"[GTI ICET] Atualização Definitiva da O.S. #{os_id}"

    status_txt = "RESOLVIDA E CONCLUÍDA" if status_novo == "RESOLVIDO" else "RECUSADA E CANCELADA"
    cor_status = "#059669" if status_novo == "RESOLVIDO" else "#dc2626"
    justificativa_clean = justificativa if justificativa else "Nenhuma observação complementar foi registrada pela equipe técnica."

    corpo_html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px;">
                <h2 style="color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-top:0;">Atualização de Ordem de Serviço</h2>
                <p>Prezado(a) Servidor(a),</p>
                <p>Sua Ordem de Serviço de código <strong>#{os_id}</strong> foi processada e encerrada pela equipe técnica da GTI.</p>
                <table style="width: 100%; margin: 15px 0; font-size: 14px;">
                    <tr><td><strong>Título do Chamado:</strong></td><td>{titulo_os}</td></tr>
                    <tr><td><strong>Status Final:</strong></td><td style="color: {cor_status}; font-weight: bold;">{status_txt}</td></tr>
                </table>
                <div style="background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #0284c7; margin-top: 15px;">
                    <strong style="display: block; margin-bottom: 5px; font-size:13px; color:#1e293b;">Despacho / Parecer Técnico:</strong>
                    <em style="font-size: 13px; color: #334155;">"{justificativa_clean}"</em>
                </div>
                <p style="margin-top: 25px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                    GTI - Instituto de Ciências Exatas e Tecnologia (ICET/UFAM)<br/>
                    Sistema sob conformidade ITIL v4 e Governança Regional.
                </p>
            </div>
        </body>
    </html>
    """
    msg.attach(MIMEText(corpo_html, 'html', 'utf-8'))
    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, email_destino, msg.as_string())
        server.quit()
    except Exception as e:
        logger.error(f"[SMTP ERROR] Falha no envio do e-mail da OS #{os_id}: {str(e)}")


# =========================================================================
# 🏛️ CENTRAL DE GOVERNANÇA: CRUD DINÂMICO E COMPLETO DE BLOCOS PREDIAIS
# =========================================================================

@router.post("/blocos", response_model=BlocoOut, status_code=status.HTTP_201_CREATED)
async def criar_bloco_infraestrutura(payload: BlocoCreateIn, db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)):
    """Injeta dinamicamente um novo bloco predial de campus no Postgres."""
    novo_bloco = BlocoPredio(campus=payload.campus, nome=payload.nome.strip(), is_active=True)
    db.add(novo_bloco)
    
    log_auditoria = LogAuditoriaSistema(
        autor_id=admin_atual.id, autor_nome=admin_atual.nome_completo, acao="CRIACAO_BLOCO_CAMPUS",
        detalhes_json={"campus": payload.campus, "bloco_nome": payload.nome.strip()}
    )
    db.add(log_auditoria)
    await db.commit()
    await db.refresh(novo_bloco)
    return novo_bloco

@router.get("/blocos", response_model=List[BlocoOut])
async def listar_blocos_infraestrutura(db: AsyncSession = Depends(get_db)):
    """Retorna os pavilhões ativos para alimentar os seletores do front."""
    result = await db.execute(select(BlocoPredio).where(BlocoPredio.is_active == True).order_by(BlocoPredio.nome.asc()))
    return result.scalars().all()

@router.put("/blocos/{bloco_id}", response_model=BlocoOut)
async def editar_bloco_infraestrutura(bloco_id: int, payload: BlocoCreateIn, db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)):
    """Permite alterar o nome de um bloco existente."""
    result = await db.execute(select(BlocoPredio).where(BlocoPredio.id == bloco_id))
    bloco = result.scalars().first()
    if not bloco:
        raise HTTPException(status_code=404, detail="Bloco predial não localizado.")

    nome_antigo = bloco.nome
    bloco.nome = payload.nome.strip()
    bloco.campus = payload.campus

    log_auditoria = LogAuditoriaSistema(
        autor_id=admin_atual.id, autor_nome=admin_atual.nome_completo, acao="EDICAO_BLOCO_CAMPUS",
        detalhes_json={"id": bloco_id, "nome_antigo": nome_antigo, "nome_novo": bloco.nome, "campus": bloco.campus}
    )
    db.add(log_auditoria)
    await db.commit()
    await db.refresh(bloco)
    return bloco

@router.delete("/blocos/{bloco_id}")
async def deletar_bloco_infraestrutura(bloco_id: int, db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)):
    """Remove ou inativa um bloco predial."""
    result = await db.execute(select(BlocoPredio).where(BlocoPredio.id == bloco_id))
    bloco = result.scalars().first()
    if not bloco:
        raise HTTPException(status_code=404, detail="Bloco predial não localizado.")

    log_auditoria = LogAuditoriaSistema(
        autor_id=admin_atual.id, autor_nome=admin_atual.nome_completo, acao="EXCLUSAO_BLOCO_PREDIAL",
        detalhes_json={"bloco_nome": bloco.nome, "campus": bloco.campus}
    )
    db.add(log_auditoria)
    await db.execute(delete(BlocoPredio).where(BlocoPredio.id == bloco_id))
    await db.commit()
    return {"success": True, "detail": "Bloco predial expurgado com sucesso da infraestrutura."}


# =========================================================================
# 🏛️ CENTRAL DE GOVERNANÇA: CRUD DINÂMICO E COMPLETO DE CATEGORIAS TÉCNICAS
# =========================================================================

@router.post("/categorias", response_model=CategoriaOut, status_code=status.HTTP_201_CREATED)
async def criar_categoria_catalogo(payload: CategoriaCreateIn, db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)):
    """Injeta uma nova categoria de incidente técnico no catálogo de serviços."""
    nova_cat = CategoriaTecnica(nome=payload.nome.strip().upper(), sla_horas_estimadas=payload.sla_horas_estimadas, is_active=True)
    db.add(nova_cat)
    
    log_auditoria = LogAuditoriaSistema(
        autor_id=admin_atual.id, autor_nome=admin_atual.nome_completo, acao="CRIACAO_CATEGORIA_SLA",
        detalhes_json={"categoria": payload.nome.strip().upper(), "sla_horas": payload.sla_horas_estimadas}
    )
    db.add(log_auditoria)
    await db.commit()
    await db.refresh(nova_cat)
    return nova_cat

@router.get("/categorias", response_model=List[CategoriaOut])
async def listar_categorias_catalogo(db: AsyncSession = Depends(get_db)):
    """Retorna o catálogo de serviços estruturado em conformidade com o ITIL."""
    result = await db.execute(select(CategoriaTecnica).where(CategoriaTecnica.is_active == True).order_by(CategoriaTecnica.nome.asc()))
    return result.scalars().all()

@router.put("/categorias/{categoria_id}", response_model=CategoriaOut)
async def editar_categoria_catalogo(categoria_id: int, payload: CategoriaCreateIn, db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)):
    """Permite alterar o nome técnico ou o acordo de horas (SLA) de uma categoria existente."""
    result = await db.execute(select(CategoriaTecnica).where(CategoriaTecnica.id == categoria_id))
    cat = result.scalars().first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria técnica não encontrada.")

    nome_antigo = cat.nome
    cat.nome = payload.nome.strip().upper()
    cat.sla_horas_estimadas = payload.sla_horas_estimadas

    log_auditoria = LogAuditoriaSistema(
        autor_id=admin_atual.id, autor_nome=admin_atual.nome_completo, acao="EDICAO_CATEGORIA_TECNICA",
        detalhes_json={"id": categoria_id, "nome_antigo": nome_antigo, "nome_novo": cat.nome, "sla_horas": cat.sla_horas_estimadas}
    )
    db.add(log_auditoria)
    await db.commit()
    await db.refresh(cat)
    return cat

@router.delete("/categorias/{categoria_id}")
async def deletar_categoria_catalogo(categoria_id: int, db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)):
    """Remove uma macro-categoria do catálogo de serviços técnicos."""
    result = await db.execute(select(CategoriaTecnica).where(CategoriaTecnica.id == categoria_id))
    cat = result.scalars().first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria técnica não localizada.")

    log_auditoria = LogAuditoriaSistema(
        autor_id=admin_atual.id, autor_nome=admin_atual.nome_completo, acao="EXCLUSAO_CATEGORIA_TECNICA",
        detalhes_json={"categoria_nome": cat.nome}
    )
    db.add(log_auditoria)
    await db.execute(delete(CategoriaTecnica).where(CategoriaTecnica.id == categoria_id))
    await db.commit()
    return {"success": True, "detail": "Macro-categoria removida do catálogo com sucesso."}


# ==========================================
# ENDPOINTS OPERACIONAIS DA FILA E TRÂNSITO
# ==========================================

def serializar_os(os_item: Solicitacao) -> Dict[str, Any]:
    """Helper estrutural para garantir simetria de dados exata entre GET, POST e PUT."""
    data_conclusao = os_item.atualizado_em.isoformat() if os_item.status in [StatusOS.RESOLVIDO, StatusOS.CANCELADO] else None
    return {
        "id": os_item.id, 
        "nome": os_item.criador.nome_completo if os_item.criador else "Servidor Omitido",
        "titulo": os_item.titulo, 
        "descricao": os_item.descricao, 
        "status": os_item.status.value,
        "categoria": os_item.categoria, 
        "campus": os_item.campus, 
        "bloco": os_item.bloco, 
        "sala": os_item.sala,
        "numero_patrimonio": os_item.numero_patrimonio,
        "criador_nome": os_item.criador.nome_completo if os_item.criador else "Servidor", 
        "tecnico_nome": os_item.tecnico.nome_completo if os_item.tecnico else "Aguardando Atribuição", 
        "criado_em": os_item.criado_em.isoformat() if os_item.criado_em else None, 
        "atualizado_em": os_item.atualizado_em.isoformat() if os_item.atualizado_em else None,
        "data_conclusao": data_conclusao,
        "timeline": [{
            "id": t.id, 
            "autor_nome": t.autor.nome_completo if t.autor else "Sistema", 
            "status_novo": t.tipo_evento.value, 
            "conteudo": t.conteudo, 
            "criado_em": t.criado_em.isoformat() if t.criado_em else None
        } for t in os_item.timeline],
        "anexos": [{
            "id": a.id, 
            "nome_original": a.nome_original, 
            "nome_armazenado": a.nome_armazenado, 
            "tipo_mime": a.tipo_mime, 
            "tamanho_bytes": a.tamanho_bytes, 
            "criado_em": a.criado_em.isoformat() if a.criado_em else None
        } for a in os_item.anexos]
    }

@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def criar_ordem_servico(
    titulo: str = Form(...), descricao: str = Form(...), categoria: str = Form(...),
    campus: str = Form(...), bloco: str = Form(...), sala: str = Form(...),
    arquivo: Optional[UploadFile] = File(None), usuario_atual: Usuario = Depends(get_utilizador_atual), db: AsyncSession = Depends(get_db)
):
    from app.solicitacoes.services import SolicitacaoService
    sala_clean = sala.strip()
    if not sala_clean.isdigit() or len(sala_clean) > 3:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A sala deve conter apenas números de no máximo 3 dígitos.")

    nova_os = await SolicitacaoService.criar_chamado(
        db=db, usuario_id=usuario_atual.id, titulo=titulo.strip(), descricao=descricao.strip(),
        categoria=categoria.strip(), campus=campus.strip(), bloco=bloco.strip(), sala=sala_clean, arquivo=arquivo
    )

    result = await db.execute(
        select(Solicitacao)
        .options(
            selectinload(Solicitacao.criador),
            selectinload(Solicitacao.tecnico),
            selectinload(Solicitacao.anexos),
            selectinload(Solicitacao.timeline).selectinload(InteracaoTimeline.autor)
        )
        .where(Solicitacao.id == nova_os.id)
    )
    os_completa = result.scalars().first()
    return serializar_os(os_completa)

@router.get("", response_model=List[Dict[str, Any]])
async def listar_ordens_servico(usuario_atual: Usuario = Depends(get_utilizador_atual), db: AsyncSession = Depends(get_db)):
    query = select(Solicitacao).options(
        selectinload(Solicitacao.criador), 
        selectinload(Solicitacao.tecnico), 
        selectinload(Solicitacao.anexos),
        selectinload(Solicitacao.timeline).selectinload(InteracaoTimeline.autor)
    )
    user_cargo = getattr(usuario_atual, "cargo", "").lower() if usuario_atual.cargo else ""
    is_admin_master = usuario_atual.role == "admin" or usuario_atual.username == "gerente.gti" or usuario_atual.email == "gerente@ufam.edu.br"
    is_tecnico_cpd = usuario_atual.role == "tecnico" and ("gti" in user_cargo or "cpd" in user_cargo or "tecnico da gti" in user_cargo or "subgerente" in user_cargo)
    
    if not (is_admin_master or is_tecnico_cpd): 
        query = query.where(Solicitacao.usuario_id == usuario_atual.id)
    
    query = query.order_by(Solicitacao.atualizado_em.desc())
    result = await db.execute(query)
    
    return [serializar_os(os_item) for os_item in result.scalars().all()]
    
@router.put("/{solicitacao_id}/status", response_model=Dict[str, Any])
async def atualizar_status_ordem(
    solicitacao_id: int, payload: StatusUpdatePayload, background_tasks: BackgroundTasks, 
    usuario_atual: Usuario = Depends(get_utilizador_atual), db: AsyncSession = Depends(get_db)
):
    user_cargo = getattr(usuario_atual, "cargo", "").lower() if usuario_atual.cargo else ""
    is_tecnico_valido = usuario_atual.role in ["admin", "tecnico"] or "subgerente" in user_cargo or "cpd" in user_cargo or "gti" in user_cargo
    
    if not is_tecnico_valido:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso Negado: Operação restrita à equipe técnica da GTI.")

    result = await db.execute(
        select(Solicitacao)
        .options(
            selectinload(Solicitacao.criador),
            selectinload(Solicitacao.tecnico),
            selectinload(Solicitacao.anexos),
            selectinload(Solicitacao.timeline).selectinload(InteracaoTimeline.autor)
        )
        .where(Solicitacao.id == solicitacao_id)
    )
    os_alvo = result.scalars().first()

    if not os_alvo: 
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de Serviço não encontrada.")
    if os_alvo.status in [StatusOS.RESOLVIDO, StatusOS.CANCELADO]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operação bloqueada: O chamado já se encontra finalizado.")

    status_enum = StatusOS.normalizar(payload.status)
    
    if status_enum == StatusOS.CANCELADO and payload.parecer_tecnico and len(payload.parecer_tecnico.strip()) < 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="É obrigatório inserir uma Justificativa de Recusa de no mínimo 10 caracteres.")

    os_alvo.status = status_enum
    os_alvo.tecnico_id = usuario_atual.id

    conteudo_log = f"Log do Sistema: Status alterado para '{status_enum.value}' por {usuario_atual.nome_completo}."
    if payload.parecer_tecnico and payload.parecer_tecnico.strip():
        prefixo = "Justificativa de Recusa" if status_enum == StatusOS.CANCELADO else "Parecer Técnico"
        conteudo_log = f"{prefixo} por {usuario_atual.nome_completo}: {payload.parecer_tecnico.strip()}"

    historico_log = InteracaoTimeline(
        solicitacao_id=os_alvo.id, autor_id=usuario_atual.id,
        tipo_evento=TipoEventoTimeline.MUDANCA_STATUS if status_enum not in [StatusOS.RESOLVIDO, StatusOS.CANCELADO] else TipoEventoTimeline.DESPACHO,
        conteudo=conteudo_log
    )
    db.add(historico_log)
    await db.commit()
    
    # Atualiza o objeto na sessão para serializar com os relacionamentos atualizados
    await db.refresh(os_alvo)

    email_solicitante = os_alvo.criador.email if os_alvo.criador else None
    if status_enum in [StatusOS.RESOLVIDO, StatusOS.CANCELADO] and email_solicitante:
        background_tasks.add_task(enviar_email_fechamento_os, email_solicitante, os_alvo.id, status_enum.value, payload.parecer_tecnico, os_alvo.titulo)
    
    return serializar_os(os_alvo)

    # No FINAL do arquivo, crie a rota inteligente que entrega o arquivo:
@router.get("/anexos/{nome_arquivo}", tags=["Mídias"])
async def visualizar_imagem_anexa(nome_arquivo: str):
    """Lê o arquivo do disco do Windows e devolve o binário puro, sem falhas de rota estática."""
    caminho_fisico = os.path.join(UPLOAD_DIR_ROUTER, nome_arquivo)
    
    if not os.path.exists(caminho_fisico):
        raise HTTPException(status_code=404, detail="Evidência fotográfica não encontrada no servidor.")
        
    return FileResponse(caminho_fisico)