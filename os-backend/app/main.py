"""
Orquestrador Central e Gateway de Inicialização da API FastAPI (GTI - ICET).

Concentra as diretrizes globais do ciclo de vida da aplicação (Lifespan), injeção 
automática de contas gerenciais protetivas, middlewares de CORS e montagem 
unificada das rotas do ecossistema de Ordens de Serviço.
"""

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

# Sincronização do barramento de dados e roteadores modulares
from app.db.session import engine, async_session_maker, Base
from app.auth.routers import router as auth_router
from app.admin.routers import router as admin_router  # "PORQUÊ": Mapeado para a pasta 'adm' corrigida
from app.solicitacoes.routers import router as os_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Centraliza a validação descritiva de presença física dos metadados de mensageria antes do recebimento de tráfego.
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.ufam.edu.br")
SMTP_PORT = os.getenv("SMTP_PORT", "587")
SMTP_USER = os.getenv("SMTP_USER", "suporte.gti.icet@ufam.edu.br")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerenciador Assíncrono do Ciclo de Vida da Aplicação (FastAPI Lifespan).

    Garante o mapeamento de variáveis de infraestrutura, sincronização estável 
    do banco relacional e injeção do bloco administrativo protetivo antes do boot.

    Args:
        app (FastAPI): Instância global da aplicação em inicialização.
    """
    logger.info(f"[Lifespan] Mapeando barramento de mensageria institucional: Host={SMTP_HOST} | Porta={SMTP_PORT} | User={SMTP_USER}")
    
    logger.info("[Lifespan] Sincronizando e atualizando a estrutura relacional do banco...")
    async with engine.begin() as conn:
        # "PORQUÊ" (MANUTENÇÃO PREVENTIVA DE PERSISTÊNCIA): A instrução drop_all foi intencionalmente 
        # removida da esteira de boot. Isso impede que quedas físicas do servidor ou reinicializações 
        # do container Docker purguem e limpem as tabelas do banco de dados, salvando o histórico real de produção.
        logger.info("[Lifespan] Verificando e instanciando novas colunas físicas no PostgreSQLn...")
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("[Lifespan] Verificando existência do Bloco de Gerência Padrão (Anti-Seed)...")
    async with async_session_maker() as session:
        try:
            from app.auth.models import Usuario 
            from app.auth.routers import hash_senha
            
            # -------------------------------------------------------------
            # 🚀 INJEÇÃO 1: GERENTE MASTER INSTITUCIONAL
            # -------------------------------------------------------------
            email_gerente = "gerente@ufam.edu.br"
            result_gerente = await session.execute(select(Usuario).where(Usuario.email == email_gerente))
            gerente_existente = result_gerente.scalars().first()
            
            if not gerente_existente:
                logger.info(f"[Lifespan] Gerente não encontrado. Criando usuário corporativo: {email_gerente}")
                gerente_ficticio = Usuario(
                    nome_completo="Administrador Geral",  
                    username="gerente.gti",  
                    email=email_gerente,
                    senha_hash=hash_senha("admin123"),
                    siape="99999",
                    cargo="GERENTE OS",
                    role="admin",        # Privilégio mestre global do ecossistema
                    is_active=True       # Ativado por padrão para evitar loop de bloqueio
                )
                session.add(gerente_ficticio)
                logger.info("[Lifespan] Registro de Gerente ('gerente@ufam.edu.br') preparado para gravação.")
            else:
                logger.info("[Lifespan] Usuário Gerente padrão já existe na base.")

            # -------------------------------------------------------------
            # 🚀 INJEÇÃO 2: SUBGERENTE OPERACIONAL DO CPD
            # -------------------------------------------------------------
            email_subgerente = "subgerente@ufam.edu.br"
            result_sub = await session.execute(select(Usuario).where(Usuario.email == email_subgerente))
            sub_existente = result_sub.scalars().first()
            
            if not sub_existente:
                logger.info(f"[Lifespan] Subgerente não encontrado. Criando usuário de suporte: {email_subgerente}")
                subgerente_ficticio = Usuario(
                    nome_completo="Subgerente Técnico CPD",
                    username="subgerente.gti",
                    email=email_subgerente,
                    senha_hash=hash_senha("sub123"),
                    siape="88888",
                    cargo="SUBGERENTE TI",
                    role="tecnico",      # Vinculado nativamente à operação e triagem da fila
                    is_active=True
                )
                session.add(subgerente_ficticio)
                logger.info("[Lifespan] Registro de Subgerente ('subgerente@ufam.edu.br') preparado para gravação.")
            else:
                logger.info("[Lifespan] Usuário Subgerente padrão já existe na base.")
            
            # Commit único e atômico de sementes administrativas (Anti-Seed Protetivo)
            await session.commit()
            logger.info("[Lifespan] Inicialização e checagem de privilégios de Gerência concluída com sucesso.")
            
        except Exception as e:
            logger.error(f"[Lifespan] Erro crítico ao injetar bloco de Gerência automático: {e}")
            await session.rollback()

    yield
    logger.info("[Lifespan] Encerrando barramento assíncrono do servidor backend.")


# Inicialização da Aplicação FastAPI
app = FastAPI(
    title="Sistema de Ordens de Serviço — ICET/UFAM",
    description="API Gateway com persistência assíncrona e controle RBAC.",
    version="2.0.0",
    lifespan=lifespan
)

# Configuração Universal de CORS para Ambiente Local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro Modular e Unificado de Rotas
app.include_router(auth_router, prefix="/api", tags=["Autenticação"])
app.include_router(admin_router, prefix="/api", tags=["Administração"])
app.include_router(os_router, prefix="/api", tags=["Ordens de Serviço"])


@app.get("/api/public/bootstrap", tags=["Configurações Iniciais"])
async def public_bootstrap():
    """
    Fornece metadados públicos e configurações exigidas pela UI reativa antes do fluxo de login.
    """
    return {
        "configuracoes": {
            "permissoes_obrigatorias": {"admin": True, "tecnico": True, "docente": True},
            "manutencao": False
        },
        "demandas": [
            {"id": 1, "categoria": "Rede / Internet", "item": "Instalação de Ponto de Rede"},
            {"id": 2, "categoria": "Hardware / Equipamentos", "item": "Manutenção de Computador / Impressora"},
            {"id": 3, "categoria": "Sistemas / Software", "item": "Problemas de Acesso aos Sistemas UFAM"}
        ],
        "status_permitidos": ["PENDENTE", "EM_ATENDIMENTO", "RESOLVIDO", "CANCELADO"]
    }


@app.get("/", tags=["Healthcheck"])
async def healthcheck():
    """
    Retorna o status de integridade física e o ambiente ativo da API.
    """
    return {
        "status": "healthy",
        "ambiente": "Desenvolvimento Nativo Local",
        "motor_db": "PostgreSQL Assíncrono (asyncpg)"
    }