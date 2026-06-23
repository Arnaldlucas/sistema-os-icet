"""
Módulo de Gestão Administrativa e Governança de Contas (GTI - ICET).

Este módulo concentra os endpoints de alto privilégio do sistema, permitindo
a homologação de novas contas de servidores (Siape), extração de volumetrias
anuais de chamados e expurgo permanente de registros (DeleteUser).
"""

import logging
import os
from typing import List, Optional, Dict, Any
from email.mime.text import MIMEText

import aiosmtplib
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, Unicode

from app.db.session import get_db
from app.auth.models import Usuario
from app.auth.routers import get_utilizador_atual, CODIGOS_RECUPERACAO
from app.solicitacoes.models import Solicitacao

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Gestão Administrativa — Módulo 3"])

# Configurações globais do Servidor de Mensageria SMTP (Forçado para Teste Gmail)
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "arnaldff@gmail.com"
SMTP_PASSWORD = "lsjcpvgpmamlvjdb"

class AprovarUsuarioIn(BaseModel):
    """Payload de entrada contratual para homologação de servidores (CA 7.1)."""
    is_approve: bool = Field(..., description="Flag booleana. True para aprovar e ativar, False para excluir.")
    justificativa: Optional[str] = Field(None, description="Motivo opcional pré-padronizado.")

async def exigir_administrador(usuario_atual: Usuario = Depends(get_utilizador_atual)) -> Usuario:
    """Verifica se o usuário logado possui privilégios da equipe de gestão da GTI."""
    user_cargo = getattr(usuario_atual, "cargo", "").lower() if usuario_atual.cargo else ""
    is_operador_gti = "administrador" in user_cargo or "subgerente" in user_cargo or "gti" in user_cargo or "cpd" in user_cargo
    is_master = usuario_atual.username == "admin" or getattr(usuario_atual, "role", "") == "admin"

    if not (is_master or is_operador_gti):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: Operação restrita à Gerência de TI."
        )
    return usuario_atual


async def enviar_notificacao_homologacao_async(email_destinatario: str, nome_servidor: str, status_aprovado: bool, motivo_recusa: Optional[str] = None):
    """Despacha o veredito padronizado da análise cadastral para o Gmail do servidor."""
    if status_aprovado:
        assunto = "[GTI OS-ICET] Credenciamento Homologado com Sucesso"
        corpo_html = f"""
        <html>
            <body style="font-family: monospace; color: #0f172a;">
                <div style="max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 24px; border-radius: 8px;">
                    <h2 style="color: #059669; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Cadastro Liberado</h2>
                    <p>Olá, <strong>{nome_servidor}</strong>,</p>
                    <p>Seu pedido de credenciamento na plataforma de Ordens de Serviço foi analisado e aprovado.</p>
                    <p>Sua conta funcional encontra-se ativada no sistema de solicitação de serviço OS.</p>
                    <p>Você já pode realizar o acesso utilizando suas credenciais institucionais.</p>
                    <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 8px;">Mensagem automática. Por favor, não responda.</p>
                </div>
            </body>
        </html>
        """
    else:
        assunto = "[GTI OS-ICET] Solicitação de Credenciamento Recusada"
        corpo_html = f"""
        <html>
            <body style="font-family: monospace; color: #0f172a;">
                <div style="max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 24px; border-radius: 8px;">
                    <h2 style="color: #dc2626; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Cadastro Recusado</h2>
                    <p>Olá, <strong>{nome_servidor}</strong>,</p>
                    <p>Sua solicitação de acesso ao sistema de Ordens de Serviço do ICET foi indeferida pela Gerência de TI por inconsistência nos dados funcionais ou falta de documentos comprobatórios obrigatórios.</p>
                    <p>Para novas solicitações, realize um novo auto-cadastro anexando uma comprovação funcional válida.</p>
                    <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 8px;">Mensagem automática. Por favor, não responda.</p>
                </div>
            </body>
        </html>
        """

    mensagem = MIMEText(corpo_html, "html", "utf-8")
    mensagem["Subject"] = assunto
    mensagem["From"] = SMTP_USER
    mensagem["To"] = email_destinatario

    try:
        await aiosmtplib.send(
            mensagem,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            use_tls=False,
            start_tls=True,
            validate_certs=False,
            timeout=10.0
        )
        logger.info(f"[SMTP SUCCESS] Notificação enviada via Gmail para {email_destinatario}")
    except Exception as smtp_error:
        logger.error(f"[SMTP ERROR] Falha no disparo do e-mail administrativo: {str(smtp_error)}")


@router.get("/bootstrap")
async def bootstrap_administrativo(
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(get_utilizador_atual)
):
    """Carrega indicadores gerenciais, volumetrias de chamados e listas de usuários."""
    user_cargo = getattr(usuario_atual, "cargo", "").lower() if usuario_atual.cargo else ""
    is_admin = usuario_atual.username == "admin" or usuario_atual.role == "admin" or "administrador" in user_cargo or "subgerente" in user_cargo

    user_data = {
        "id": usuario_atual.id,
        "username": usuario_atual.username,
        "email": usuario_atual.email,
        "cargo": usuario_atual.cargo or "Servidor",
        "role": usuario_atual.role,
        "grupo_nome": "Administradores" if is_admin else ("Tecnicos" if usuario_atual.role == "tecnico" else "Docentes")
    }

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito: O painel gerencial é exclusivo da equipe GTI."
        )

    result_pendentes = await db.execute(
        select(Usuario).where(Usuario.is_active == False).order_by(Usuario.id.desc())
    )
    lista_pendentes = result_pendentes.scalars().all()
    
    result_ativos = await db.execute(
        select(Usuario).where(
            (Usuario.is_active == True) & 
            (Usuario.username != 'admin') & 
            (Usuario.id != usuario_atual.id)
        ).order_by(Usuario.nome_completo.asc())
    )
    lista_ativos = result_ativos.scalars().all()

    c_abertos = await db.execute(select(func.count(Solicitacao.id)).where(func.lower(Solicitacao.status.cast(Unicode)) == "pendente"))
    c_atendimento = await db.execute(select(func.count(Solicitacao.id)).where(func.lower(Solicitacao.status.cast(Unicode)) == "em_atendimento"))
    c_resolvidos = await db.execute(select(func.count(Solicitacao.id)).where(func.lower(Solicitacao.status.cast(Unicode)) == "resolvido"))

    estatisticas_painel = {
        "cadastros_pendentes": len(lista_pendentes),
        "chamados_abertos": c_abertos.scalar() or 0,
        "chamados_atendimento": c_atendimento.scalar() or 0,
        "chamados_resolvidos": c_resolvidos.scalar() or 0
    }

    return {
        "user": user_data,
        "permissions": ["admin:tudo", "os:status", "os:triagem"],
        "estatisticas":  estatisticas_painel,
        "usuarios_pendentes": [{
            "id": u.id,
            "nome_completo": u.nome_completo,
            "email": u.email,
            "siape": u.siape,
            "cargo": u.cargo,
            "is_active": u.is_active,
            "comprovante_base64": u.comprovante_base64 
        } for u in lista_pendentes],
        "users": [{  
            "id": u.id,
            "nome_completo": u.nome_completo,
            "email": u.email,
            "siape": u.siape,
            "cargo": u.cargo,
            "is_active": u.is_active
        } for u in lista_ativos]
    }

@router.post("/users/{usuario_id}/approve")
async def approve_cadastro_servidor(
    usuario_id: int,
    payload: AprovarUsuarioIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin_atual: Usuario = Depends(exigir_administrador)
):
    """Homologa ou rejeita a entrada de novas contas de servidores (US07)."""
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalars().first()

    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cadastro do servidor não localizado.")

    email_alvo = str(usuario.email).lower().strip()
    nome_alvo = str(usuario.nome_completo)

    if not payload.is_approve:
    
        if email_alvo in CODIGOS_RECUPERACAO:
            del CODIGOS_RECUPERACAO[email_alvo]
            
        await db.delete(usuario)
        await db.commit()
        
        background_tasks.add_task(enviar_notificacao_homologacao_async, email_alvo, nome_alvo, False)
        return {"success": True, "status": "sucesso", "detail": "Cadastro recusado e expurgado com sucesso."}

    usuario.is_active = True
    await db.commit()
    
    background_tasks.add_task(enviar_notificacao_homologacao_async, email_alvo, nome_alvo, True)
    return {"success": True, "status": "sucesso", "detail": f"Servidor {usuario.nome_completo} homologado com sucesso."}

@router.delete("/users/{usuario_id}", status_code=status.HTTP_200_OK)
async def deletar_usuario_sistema(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    admin_atual: Usuario = Depends(exigir_administrador)
):
    """
    Remove definitivamente uma conta de servidor, transferindo a propriedade
    de suas ordens de serviço e interações na timeline para evitar violações
    de chaves estrangeiras (Foreign Keys) no PostgreSQL.
    """
    if usuario_id == admin_atual.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Operação bloqueada: Não é permitido auto-expurgar a conta de gerência ativa."
        )

    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalars().first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="O registro do servidor não foi localizado na base do ICET."
        )

    email_alvo = str(usuario.email).lower().strip()
    id_do_admin = int(admin_atual.id)

    try:
        # 1️⃣ TRATAMENTO DA TABELA 'solicitacoes' (NOT NULL - TRANSFERE PRO ADMIN)
        result_solicitacoes = await db.execute(
            select(Solicitacao).where(Solicitacao.usuario_id == usuario_id)
        )
        solicitacoes_vinculadas = result_solicitacoes.scalars().all()
        for os_chamado in solicitacoes_vinculadas:
            os_chamado.usuario_id = id_do_admin
            db.add(os_chamado)

        # 2️⃣ TRATAMENTO DA TABELA 'interacoes_timeline' 
        
        try:
            from sqlalchemy import text
            # Executa um update direto via texto para garantir compatibilidade caso o modelo não esteja importado
            await db.execute(
                text("UPDATE interacoes_timeline SET autor_id = :admin_id WHERE autor_id = :user_id"),
                {"admin_id": id_do_admin, "user_id": usuario_id}
            )
        except Exception as timeline_mod_err:
            logger.warning(f"[Exclusão] Aviso ao tentar mesclar interacoes_timeline: {timeline_mod_err}")

        # Sincroniza os pacotes relacionais com o banco de dados antes do expurgo
        await db.flush()

        # Limpa o repositório efêmero de códigos OTP se houver
        if email_alvo in CODIGOS_RECUPERACAO:
            del CODIGOS_RECUPERACAO[email_alvo]

        # 3️⃣ EXPURGO DEFINITIVO DO USUÁRIO
        await db.delete(usuario)
        await db.commit()
        
        return {
            "success": True, 
            "status": "sucesso", 
            "detail": f"A conta do servidor {usuario.nome_completo} foi permanentemente removida da base."
        }
    except Exception as err:
        await db.rollback()
        logger.error(f"🚨 [ALERTA MAXIMO ARNALD] Tentando deletar o ID {usuario_id}: {str(err)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao executar expurgo do registro por amarrações complexas de histórico."
        )