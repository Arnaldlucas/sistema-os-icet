"""
Orquestrador Central e Gateway de Inicialização da API FastAPI (GTI - ICET).

Concentra as diretrizes globais do ciclo de vida da aplicação (Lifespan), injeção 
automática e segura de contas gerenciais protetivas via variáveis de ambiente, 
middlewares de CORS e montagem unificada das rotas do ecossistema.
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
from app.admin.routers import router as admin_router  
from app.solicitacoes.routers import router as os_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Centraliza a validação descritiva de presença física dos metadados de mensageria
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = os.getenv("SMTP_PORT", "587")
SMTP_USER = os.getenv("SMTP_USER", "arnaldff@gmail.com")

# Coleta defensiva das credenciais do Auto-Seed via escopo do ambiente
SEED_ADMIN_NAME = os.getenv("SEED_ADMIN_NAME", "Gerência Geral GTI")
SEED_ADMIN_USERNAME = os.getenv("SEED_ADMIN_USERNAME", "gerente.gti")
SEED_ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "gti.suporte@ufam.edu.br")
SEED_ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD") # Sem fallback padrão por segurança

SEED_TECNICO_NAME = os.getenv("SEED_TECNICO_NAME", "Subgerente Técnico CPD")
SEED_TECNICO_USERNAME = os.getenv("SEED_TECNICO_USERNAME", "subgerente.gti")
SEED_TECNICO_EMAIL = os.getenv("SEED_TECNICO_EMAIL", "subgerente.gti@ufam.edu.br")
SEED_TECNICO_PASSWORD = os.getenv("SEED_TECNICO_PASSWORD") # Sem fallback padrão por segurança

# Sincronização Absoluta do Caminho de Mídia
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, ".data", "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    logger.info(f"[Boot] Diretório físico de armazenamento verificado em: {UPLOAD_DIR}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerenciador Assíncrono do Ciclo de Vida da Aplicação (FastAPI Lifespan).
    """
    logger.info(f"[Lifespan] Mapeando barramento de mensageria institucional: Host={SMTP_HOST} | Porta={SMTP_PORT} | User={SMTP_USER}")
    
    logger.info("[Lifespan] Sincronizando e atualizando a estrutura relacional do banco...")
    async with engine.begin() as conn:
        logger.info("[Lifespan] Verificando e instanciando novas colunas físicas no PostgreSQL...")
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("[Lifespan] Verificando existência do Bloco de Gerência Padrão (Anti-Seed)...")
    async with async_session_maker() as session:
        try:
            from app.auth.models import Usuario 
            from app.auth.routers import hash_senha
            
            # Garantia de segurança: Bloqueia a injeção se as senhas lógicas não foram mapeadas no .env
            if not SEED_ADMIN_PASSWORD or not SEED_TECNICO_PASSWORD:
                logger.warning("[Lifespan] Injeção de contas abortada: SEED_ADMIN_PASSWORD ou SEED_TECNICO_PASSWORD ausentes no .env.")
            else:
                # -------------------------------------------------------------
                # 🚀 INJEÇÃO 1: GERENTE MASTER INSTITUCIONAL REAL (GTI)
                # -------------------------------------------------------------
                result_gerente = await session.execute(select(Usuario).where(Usuario.email == SEED_ADMIN_EMAIL))
                gerente_existente = result_gerente.scalars().first()
                
                if not gerente_existente:
                    logger.info(f"[Lifespan] Gerente não encontrado. Criando usuário corporativo: {SEED_ADMIN_EMAIL}")
                    gerente_instancia = Usuario(
                        nome_completo=SEED_ADMIN_NAME,  
                        username=SEED_ADMIN_USERNAME,  
                        email=SEED_ADMIN_EMAIL,
                        senha_hash=hash_senha(SEED_ADMIN_PASSWORD), 
                        siape="99999",
                        cargo="GERENTE OS",
                        role="admin",        
                        is_active=True       
                    )
                    session.add(gerente_instancia)
                
                # -------------------------------------------------------------
                # 🚀 INJEÇÃO 2: SUBGERENTE OPERACIONAL REAL
                # -------------------------------------------------------------
                result_sub = await session.execute(select(Usuario).where(Usuario.email == SEED_TECNICO_EMAIL))
                sub_existente = result_sub.scalars().first()
                
                if not sub_existente:
                    logger.info(f"[Lifespan] Subgerente não encontrado. Criando usuário de suporte: {SEED_TECNICO_EMAIL}")
                    subgerente_instancia = Usuario(
                        nome_completo=SEED_TECNICO_NAME,
                        username=SEED_TECNICO_USERNAME,
                        email=SEED_TECNICO_EMAIL,
                        senha_hash=hash_senha(SEED_TECNICO_PASSWORD),
                        siape="88888",
                        cargo="SUBGERENTE TI",
                        role="tecnico",      
                        is_active=True
                    )
                    session.add(subgerente_instancia)
                
                await session.commit()
                logger.info("[Lifespan] Inicialização e checagem de privilégios de Gerência concluída com sucesso.")
            
        except Exception as e:
            logger.error(f"[Lifespan] Erro crítico ao injetar bloco de Gerência automático: {e}")
            await session.rollback()

    yield
    logger.info("[Lifespan] Encerrando barramento assíncrono do servidor backend.")


app = FastAPI(
    title="Sistema de Ordens de Serviço — ICET/UFAM",
    description="API Gateway com frequência assíncrona e controle RBAC.",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Em produção real na UFAM, o Nginx limitará isso ao domínio institucional
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api", tags=["Autenticação"])
app.include_router(admin_router, prefix="/api", tags=["Administração"])
app.include_router(os_router, prefix="/api", tags=["Ordens de Serviço"])


@app.get("/api/public/bootstrap", tags=["Configurações Iniciais"])
async def public_bootstrap():
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
    return {
        "status": "healthy",
        "ambiente": "Produção Conteinerizada Homologada",
        "motor_db": "PostgreSQL Assíncrono (asyncpg)",
        "upload_directory": UPLOAD_DIR
    }