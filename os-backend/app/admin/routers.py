"""
Módulo de Gestão Administrativa e Governança de Contas (GTI - ICET).

Este módulo concentra os endpoints de alto privilégio do sistema, permitindo
a homologação de novas contas de servidores (Siape), extração de volumetrias
anuais de chamados, gerenciamento dinâmico de blocos/categorias e injeção direta de usuários.
"""

import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, Unicode, delete
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.auth.models import Usuario
from app.auth.routers import get_utilizador_atual, CODIGOS_RECUPERACAO, hash_senha
from app.solicitacoes.models import Solicitacao, LogAuditoriaSistema, BlocoPredio, CategoriaTecnica

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Gestão Administrativa — Módulo 3"])

# Configurações globais do Servidor de Mensageria SMTP parametrizados via Contêiner
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "arnaldff@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "lsjcpvgpmamlvjdb")

class AprovarUsuarioIn(BaseModel):
    """Payload de entrada contratual para homologação de servidores (CA 7.1)."""
    is_approve: bool = Field(..., description="Flag booleana. True para aprovar e ativar, False para rejeitar crachá.")
    justificativa: Optional[str] = Field(None, description="Motivo ou justificativa da recusa.")

class CriarUsuarioDiretoIn(BaseModel):
    """Payload para injeção direta de novos usuários ativos pela gerência sem homologação."""
    nome_completo: str = Field(..., example="Arnald Lucas")
    email: EmailStr = Field(..., example="arnald@ufam.edu.br")
    siape: str = Field(..., example="1234567")
    cargo: str = Field(..., example="Servidor Standard")
    password: str = Field(..., example="SenhaSegura123")
    # 🚀 FIX RBAC BINÁRIO: Níveis de escopo absolutos
    role: str = Field("servidor", example="admin")

async def exigir_administrador(usuario_atual: Usuario = Depends(get_utilizador_atual)) -> Usuario:
    """Verifica se o usuário logado possui privilégios da equipe de gestão da GTI."""
    user_cargo = getattr(usuario_atual, "cargo", "").lower() if usuario_atual.cargo else ""
    is_operador_gti = "administrador" in user_cargo or "subgerente" in user_cargo or "gti" in user_cargo or "cpd" in user_cargo
    is_master = usuario_atual.username == "admin" or getattr(usuario_atual, "role", "") == "admin" or usuario_atual.username == "gerente.gti"

    if not (is_master or is_operador_gti):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: Operação restrita à Gerência de TI."
        )
    return usuario_atual

def enviar_notificacao_homologacao_sincrona(email_destinatario: str, nome_servidor: str, status_aprovado: bool, justificativa: Optional[str] = None):
    """Despacha o veredito padronizado da análise cadastral para o e-mail do servidor em background."""
    msg = MIMEMultipart()
    msg["From"] = SMTP_USER
    msg["To"] = email_destinatario

    if status_aprovado:
        msg["Subject"] = "[GTI OS-ICET] Credenciamento Homologado com Sucesso"
        texto = "Seu pedido de credenciamento na plataforma de Ordens de Serviço foi analisado e APROVADO."
        status_banner = "<h2 style='color: #059669;'>Cadastro Ativado com Sucesso</h2>"
    else:
        msg["Subject"] = "[GTI OS-ICET] Solicitação de Credenciamento Recusada"
        motivo = justificativa if justificativa else "Inconsistência nos dados funcionais ou imagem de comprovante ilegível."
        texto = f"Sua solicitação de acesso foi indeferida pela Gerência de TI.<br/><strong>Motivo:</strong> {motivo}<br/><br/>Por favor, acesse o portal e refaça o envio anexando uma comprovação funcional válida."
        status_banner = "<h2 style='color: #dc2626;'>Cadastro Indeferido (Crachá Rejeitado)</h2>"

    corpo_html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #0f172a; line-height:1.6;">
            <div style="max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 24px; border-radius: 8px;">
                {status_banner}
                <p>Olá, <strong>{nome_servidor}</strong>,</p>
                <p>{texto}</p>
                <p>GTI - Instituto de Ciências Exatas e Tecnologia (ICET/UFAM)</p>
            </div>
        </body>
    </html>
    """
    msg.attach(MIMEText(corpo_html, "html", "utf-8"))
    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, email_destinatario, msg.as_string())
        server.quit()
    except Exception as e:
        logger.error(f"[SMTP ERROR] Falha no envio da homologação: {str(e)}")


# =========================================================================
# 🏛️ ROTAS GET: LISTAGENS E FILTROS DE AUDITORIA DE CONTAS
# =========================================================================

@router.get("/users/pending", response_model=List[Dict[str, Any]])
async def listar_solicitacoes_pendentes(db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)):
    """Retorna estritamente as contas que preencheram o crachá e aguardam homologação humana (ignora bloqueados)."""
    result = await db.execute(
        select(Usuario)
        .where(
            (Usuario.is_active == False) & 
            (Usuario.senha_hash != "PROTECTED_TOKEN_STAGE") & 
            (Usuario.senha_hash != "REJEITADO_PELO_GERENTE") &
            (Usuario.senha_hash != "CONTA_BLOQUEADA_GERENCIA")
        )
        .order_by(Usuario.id.desc())
    )
    lista_pendentes = result.scalars().all()
    return [{
        "id": u.id, "nome_completo": u.nome_completo, "email": u.email,
        "siape": u.siape, "cargo": u.cargo, "is_active": u.is_active, "comprovante_base64": u.comprovante_base64
    } for u in lista_pendentes]


@router.get("/bootstrap")
async def bootstrap_administrativo(db: AsyncSession = Depends(get_db), usuario_atual: Usuario = Depends(get_utilizador_atual)):
    """Carrega indicadores gerenciais, volumetrias de chamados, blocos cadastrados, categorias e as listas organizadas."""
    user_cargo = getattr(usuario_atual, "cargo", "").lower() if usuario_atual.cargo else ""
    is_admin = usuario_atual.username == "admin" or usuario_atual.role == "admin" or "administrador" in user_cargo or "subgerente" in user_cargo or usuario_atual.username == "gerente.gti"

    if not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito: Painel exclusivo da equipe GTI.")

    # 🚀 FIX: Contas bloqueadas administrativamente (CONTA_BLOQUEADA_GERENCIA) não entram de forma alguma na fila de pendentes
    result_pendentes = await db.execute(
        select(Usuario)
        .where(
            (Usuario.is_active == False) & 
            (Usuario.senha_hash != "PROTECTED_TOKEN_STAGE") & 
            (Usuario.senha_hash != "REJEITADO_PELO_GERENTE") &
            (Usuario.senha_hash != "CONTA_BLOQUEADA_GERENCIA")
        )
        .order_by(Usuario.id.desc())
    )
    lista_pendentes = result_pendentes.scalars().all()
    
    # 🚀 FIX: Lista todos os usuários cadastrados, EXCETO o admin atual, os que estão PENDENTES e os REJEITADOS
    result_todos = await db.execute(
        select(Usuario)
        .where(
            (Usuario.id != usuario_atual.id) &
            (Usuario.senha_hash != "PROTECTED_TOKEN_STAGE") &
            (Usuario.senha_hash != "REJEITADO_PELO_GERENTE")
        )
        .order_by(Usuario.nome_completo.asc())
    )
    lista_todos = result_todos.scalars().all()

    # 🚀 REQUISITO: Puxa todos os blocos pré-definidos e dinâmicos para a central de governança poder gerenciar/deletar
    result_blocos = await db.execute(select(BlocoPredio).order_by(BlocoPredio.campus.asc(), BlocoPredio.nome.asc()))
    lista_blocos = result_blocos.scalars().all()

    # 🚀 REQUISITO: Puxa todas as macro-categorias do catálogo de serviços para controle e exclusão
    result_categorias = await db.execute(select(CategoriaTecnica).order_by(CategoriaTecnica.nome.asc()))
    lista_categorias = result_categorias.scalars().all()

    # 🚀 CARGA DE AUDITORIA: Extrai e organiza os últimos 150 logs para a aba de auditoria visual do Frontend
    result_logs = await db.execute(select(LogAuditoriaSistema).order_by(LogAuditoriaSistema.id.desc()).limit(150))
    lista_logs_bruta = result_logs.scalars().all()

    c_abertos = await db.execute(select(func.count(Solicitacao.id)).where(func.lower(Solicitacao.status.cast(Unicode)) == "pendente"))
    c_atendimento = await db.execute(select(func.count(Solicitacao.id)).where(func.lower(Solicitacao.status.cast(Unicode)) == "em_atendimento"))
    c_resolvidos = await db.execute(select(func.count(Solicitacao.id)).where(func.lower(Solicitacao.status.cast(Unicode)) == "resolvido"))

    result_balanco_os = await db.execute(select(Solicitacao).options(selectinload(Solicitacao.criador), selectinload(Solicitacao.tecnico)).order_by(Solicitacao.id.desc()))
    lista_os_balanco = result_balanco_os.scalars().all()

    return {
        "user": {
            "id": usuario_atual.id, "username": usuario_atual.username, "email": usuario_atual.email,
            "cargo": usuario_atual.cargo or "Servidor", "role": usuario_atual.role, "grupo_nome": "Administradores"
        },
        "permissions": ["admin:tudo", "os:status", "os:triagem"],
        "estatisticas": {
            "cadastros_pendentes": len(lista_pendentes), "chamados_abertos": c_abertos.scalar() or 0,
            "chamados_atendimento": c_atendimento.scalar() or 0, "chamados_resolvidos": c_resolvidos.scalar() or 0
        },
        "usuarios_pendentes": [{"id": u.id, "nome_completo": u.nome_completo, "email": u.email, "siape": u.siape, "cargo": u.cargo, "is_active": u.is_active, "comprovante_base64": u.comprovante_base64 } for u in lista_pendentes],
        "users": [{"id": u.id, "nome_completo": u.nome_completo, "email": u.email, "siape": u.siape, "cargo": u.cargo, "is_active": u.is_active, "senha_hash_flag": u.senha_hash, "role": u.role} for u in lista_todos],
        "blocos_infraestrutura": [{"id": b.id, "campus": b.campus, "nome": b.nome, "is_active": b.is_active} for b in lista_blocos],
        "categorias_catalogo": [{"id": c.id, "nome": c.nome, "sla_horas_estimadas": c.sla_horas_estimadas, "is_active": c.is_active} for c in lista_categorias],
        
        # Estruturação limpa dos logs para exibição em linha do tempo
        "logs_auditoria": [{
            "autor_nome": log.autor_nome,
            "acao": log.acao,
            "data_hora": log.criado_em.strftime("%d/%m/%Y - %H:%M") if hasattr(log, 'criado_em') and log.criado_em else "Data indisponível",
            "detalhes": " | ".join([f"{str(k).replace('_', ' ').title()}: {v}" for k, v in (log.detalhes_json or {}).items()])
        } for log in lista_logs_bruta],
        
        "balanco_fechamento": [{
            "id": os_item.id,
            "criado_em": os_item.criado_em.isoformat() if os_item.criado_em else None,
            "solicitante": os_item.criador.nome_completo if os_item.criador else "Servidor",
            "titulo": os_item.titulo,
            "categoria": os_item.categoria,
            "localizacao": f"{os_item.bloco} - Sala {os_item.sala}",
            "status": os_item.status.value,
            "tecnico_executor": os_item.tecnico.nome_completo if os_item.tecnico else "Aguardando Atribuição"
        } for os_item in lista_os_balanco]
    }


# =========================================================================
# 🏛️ ROTAS POST: CONTROLE, HOMOLOGAÇÃO E TRAVAS GERENCIAIS
# =========================================================================

@router.post("/users/create-direct")
async def criar_usuario_diretamente(payload: CriarUsuarioDiretoIn, db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)):
    """🚀 REQUISITO NOVO: Permite à Gerência criar e injetar um novo usuário diretamente ativo, sem fila de homologação."""
    username_derivado = payload.email.split("@")[0]
    
    # Verifica se já existe um usuário cadastrado com esse e-mail ou SIAPE
    existente = await db.execute(select(Usuario).where((Usuario.email == payload.email) | (Usuario.siape == payload.siape)))
    if existente.scalars().first():
        raise HTTPException(status_code=400, detail="Conflito cadastral: E-mail ou SIAPE já registrado no sistema.")

    novo_usuario = Usuario(
        nome_completo=payload.nome_completo,
        username=username_derivado,
        email=payload.email,
        siape=payload.siape,
        cargo=payload.cargo,
        role=payload.role,
        senha_hash=hash_senha(payload.password), # Gera o hash nativo e seguro da senha enviada
        is_active=True # Salva o usuário diretamente homologado e pronto para o login
    )
    db.add(novo_usuario)

    # Loga a operação na tabela de LogAuditoriaSistema apontando quem realizou a criação
    log_sistema = LogAuditoriaSistema(
        autor_id=admin_atual.id,
        autor_nome=admin_atual.nome_completo,
        acao="INJEÇÃO_DIRETA_USUARIO",
        detalhes_json={"alvo_nome": payload.nome_completo, "alvo_email": payload.email, "siape": payload.siape, "nivel_acesso": payload.role}
    )
    db.add(log_sistema)
    await db.commit()

    return {"success": True, "detail": f"Usuário {payload.nome_completo} injetado diretamente no banco como ATIVO."}


@router.post("/users/{usuario_id}/approve")
async def approve_cadastro_servidor(
    usuario_id: int, payload: AprovarUsuarioIn, background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)
):
    """Homologa ou rejeita a entrada de novos servidores. Se rejeitado, aplica Hard Delete para liberar o email/SIAPE."""
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalars().first()

    if not usuario: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cadastro não localizado.")

    email_alvo = str(usuario.email).lower().strip()
    nome_alvo = str(usuario.nome_completo)

    if not payload.is_approve:
        # 1. Primeiro cria o Log de Auditoria imutável detalhando a recusa
        log_sistema = LogAuditoriaSistema(
            autor_id=admin_atual.id, autor_nome=admin_atual.nome_completo, acao="RECUSA_CADASTRO_CRACHA",
            detalhes_json={"usuario_rejeitado": nome_alvo, "email": email_alvo, "justificativa": payload.justificativa}
        )
        db.add(log_sistema)
        
        # 2. Executa o Hard Delete expurgando o cadastro pendente do banco de dados
        await db.execute(delete(Usuario).where(Usuario.id == usuario_id))
        await db.commit()
        
        # 3. Dispara o e-mail pro solicitante tentar de novo
        background_tasks.add_task(enviar_notificacao_homologacao_sincrona, email_alvo, nome_alvo, False, payload.justificativa)
        return {"success": True, "detail": "Solicitação de crachá indeferida e cadastro expurgado. Histórico de auditoria gravado."}

    # Fluxo de Aprovação normal
    usuario.is_active = True
    
    log_sistema = LogAuditoriaSistema(
        autor_id=admin_atual.id, autor_nome=admin_atual.nome_completo, acao="APROVACAO_USUARIO",
        detalhes_json={"usuario_homologado": nome_alvo, "email": email_alvo, "siape": usuario.siape}
    )
    db.add(log_sistema)
    await db.commit()
    
    background_tasks.add_task(enviar_notificacao_homologacao_sincrona, email_alvo, nome_alvo, True)
    return {"success": True, "detail": f"Servidor {usuario.nome_completo} homologado com sucesso."}


@router.post("/users/{usuario_id}/block")
async def bloquear_usuario_sistema(usuario_id: int, db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)):
    """🚀 FIX SOLICITADO: Bloqueia a conta e marca como 'CONTA_BLOQUEADA_GERENCIA' para mantê-la cinza e fora da fila de homologação."""
    if usuario_id == admin_atual.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Operação bloqueada: Não é permitido auto-bloqueio.")

    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalars().first()

    if not usuario: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servidor não localizado.")
    
    usuario.is_active = False  
    usuario.senha_hash = "CONTA_BLOQUEADA_GERENCIA" # Marcação de barramento de segurança física
    
    log_sistema = LogAuditoriaSistema(
        autor_id=admin_atual.id, autor_nome=admin_atual.nome_completo, acao="BLOQUEIO_ADMINISTRATIVO_CONTA",
        detalhes_json={"usuario_suspenso": usuario.nome_completo, "email": usuario.email, "siape": usuario.siape}
    )
    db.add(log_sistema)
    await db.commit()

    return {"success": True, "detail": f"A conta de {usuario.nome_completo} foi bloqueada administrativamente e congelada."}


@router.post("/users/{usuario_id}/unblock")
async def desbloquear_usuario_sistema(usuario_id: int, db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)):
    """Reativa diretamente uma conta suspensa pelo gerente sem passar por nova validação de crachá."""
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalars().first()

    if not usuario: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servidor não localizado.")
    
    usuario.is_active = True  
    usuario.senha_hash = "REATIVADA_PELO_GERENTE" # Remove o status de congelamento
    
    log_sistema = LogAuditoriaSistema(
        autor_id=admin_atual.id, autor_nome=admin_atual.nome_completo, acao="ATIVACAO_ADMINISTRATIVA_CONTA",
        detalhes_json={"usuario_reativado": usuario.nome_completo, "email": usuario.email, "siape": usuario.siape}
    )
    db.add(log_sistema)
    await db.commit()

    return {"success": True, "detail": f"A conta de {usuario.nome_completo} foi reativada com sucesso."}


@router.delete("/users/{usuario_id}")
async def deletar_usuario_sistema(usuario_id: int, db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)):
    """🚨 REALIZA O SOFT DELETE: Desativa de forma definitiva mas preserva integridade e chaves no Postgres."""
    if usuario_id == admin_atual.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é permitido desativar a conta gerencial ativa.")

    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalars().first()

    if not usuario: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servidor não localizado.")
    
    usuario.is_active = False
    usuario.senha_hash = "SOFT_DELETED_ACCOUNT"  
    
    log_sistema = LogAuditoriaSistema(
        autor_id=admin_atual.id, autor_nome=admin_atual.nome_completo, acao="EXCLUSAO_USUARIO_SOFT_DELETE",
        detalhes_json={"usuario_desativado": usuario.nome_completo, "email": usuario.email, "siape": usuario.siape}
    )
    db.add(log_sistema)
    await db.commit()

    return {"success": True, "detail": f"A conta de {usuario.nome_completo} foi desativada. Histórico de chamados preservado."}


# =========================================================================
# 🏛️ EXCLUSÃO DE INFRAESTRUTURA DINÂMICA (BLOCO E CATEGORIAS)
# =========================================================================

@router.delete("/blocos/{bloco_id}")
async def deletar_bloco_infraestrutura(bloco_id: int, db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)):
    """🚀 NOVO ENDPOINT: Permite à Central de Governança expurgar um bloco do mapa de infraestrutura."""
    result = await db.execute(select(BlocoPredio).where(BlocoPredio.id == bloco_id))
    bloco = result.scalars().first()
    if not bloco:
        raise HTTPException(status_code=404, detail="Bloco predial não encontrado.")

    log_sistema = LogAuditoriaSistema(
        autor_id=admin_atual.id, autor_nome=admin_atual.nome_completo, acao="EXCLUSAO_BLOCO_PREDIAL",
        detalhes_json={"bloco_nome": bloco.nome, "campus": bloco.campus}
    )
    db.add(log_sistema)
    await db.execute(delete(BlocoPredio).where(BlocoPredio.id == bloco_id))
    await db.commit()
    return {"success": True, "detail": "Bloco predial removido com sucesso de toda a malha."}


@router.delete("/categorias/{categoria_id}")
async def deletar_categoria_catalogo(categoria_id: int, db: AsyncSession = Depends(get_db), admin_atual: Usuario = Depends(exigir_administrador)):
    """🚀 NOVO ENDPOINT: Permite à Central de Governança deletar macro-categorias do catálogo de serviços técnicos."""
    result = await db.execute(select(CategoriaTecnica).where(CategoriaTecnica.id == categoria_id))
    categoria = result.scalars().first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria técnica não localizada.")

    log_sistema = LogAuditoriaSistema(
        autor_id=admin_atual.id, autor_nome=admin_atual.nome_completo, acao="EXCLUSAO_CATEGORIA_TECNICA",
        detalhes_json={"categoria_nome": categoria.nome}
    )
    db.add(log_sistema)
    await db.execute(delete(CategoriaTecnica).where(CategoriaTecnica.id == categoria_id))
    await db.commit()
    return {"success": True, "detail": "Macro-categoria removida do catálogo de serviços técnicos."}