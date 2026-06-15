import asyncio
import logging
from datetime import datetime

# Configuração básica de log para exibir as notificações no terminal do servidor FastAPI
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OS_ICET_TASKS")

async def send_notification_email_task(email_destinatario: str, protocolo: str, acao: str):
    """
    Simula o envio assíncrono de um e-mail de notificação para o usuário ou técnico.
    Utiliza asyncio.sleep para não bloquear o loop de eventos principal do FastAPI.
    """
    try:
        logger.info(f" Enfileirando notificação de e-mail para: {email_destinatario}")
        
        # Simula o delay de rede de um servidor SMTP real (ex: UFAM / Outlook) sem travar o app
        await asyncio.sleep(2.0)
        
        timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        
        # Estrutura a mensagem baseada na ação realizada na Ordem de Serviço
        if acao == "criacao":
            assunto = f"[ICET/UFAM] Nova Ordem de Serviço Cadastrada - {protocolo}"
            corpo = f"Sua solicitação foi registrada com sucesso sob o protocolo {protocolo} em {timestamp}."
        elif acao == "status":
            assunto = f"[ICET/UFAM] Atualização de Status da OS - {protocolo}"
            corpo = f"O status da sua Ordem de Serviço {protocolo} foi atualizado pela equipe de TI em {timestamp}."
        else:
            assunto = f"[ICET/UFAM] Movimentação na OS - {protocolo}"
            corpo = f"Houve uma nova interação registrada no protocolo {protocolo}."

        logger.info("=" * 60)
        logger.info(f"📧 E-MAIL ENVIADO COM SUCESSO!")
        logger.info(f"Para: {email_destinatario}")
        logger.info(f"Assunto: {assunto}")
        logger.info(f"Conteúdo: {corpo}")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"❌ Erro ao processar tarefa de e-mail em segundo plano: {e}")


async def log_system_audit_task(user_login: str, acao: str, detalhes: str):
    """
    Registra logs de auditoria de ações críticas executadas no sistema
    (como tentativas de login, criação de OS ou alteração de privilégios).
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger.info(f"📝 [AUDITORIA] [{timestamp}] Usuário: {user_login} | Ação: {acao} | Detalhes: {detalhes}")