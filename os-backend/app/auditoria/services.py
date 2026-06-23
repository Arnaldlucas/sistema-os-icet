"""
Camada de Serviços e Regras de Negócio de Auditoria (Service Layer).

Concentra os métodos atômicos de inserção assíncrona (Append-Only) e paginação
obrigatória do histórico estruturado do sistema.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.auditoria.models import LogAuditoria
from app.auditoria.schemas import LogAuditoriaCreate

class AuditoriaService:
    
    @staticmethod
    async def registrar_log(db: AsyncSession, log_data: LogAuditoriaCreate) -> LogAuditoria:
        """
        Grava uma nova entrada de log imutável no banco de dados.

        Args:
            db (AsyncSession): Sessão transacional ativa do SQLAlchemy.
            log_data (LogAuditoriaCreate): Objeto de validação contendo os dados do log.

        Returns:
            LogAuditoria: A instância persistida do log de auditoria.
        """
        novo_log = LogAuditoria(
            usuario_id=log_data.usuario_id,
            usuario_nome=log_data.usuario_nome,
            acao=log_data.acao.upper(),
            modulo=log_data.modulo.lower(),
            registro_id=str(log_data.registro_id) if log_data.registro_id else None,
            dados_antigos=log_data.dados_antigos,
            dados_novos=log_data.dados_novos,
            ip_origem=log_data.ip_origem
        )
        db.add(novo_log)
        
        # O uso do flush() em vez de commit() garante atomicidade total (RN02).
        # O log é empurrado para a fila do banco de dados na mesma transação da rota principal.
        # Se a ação principal falhar e der rollback, o log também sofre rollback, evitando logs fantasmas.
        await db.flush()  
        return novo_log

    @staticmethod
    async def listar_logs(db: AsyncSession, skip: int = 0, limit: int = 100):
        """
        Recupera o histórico completo de logs de auditoria de forma paginada.
        """
        query = select(LogAuditoria).order_by(LogAuditoria.criado_em.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()