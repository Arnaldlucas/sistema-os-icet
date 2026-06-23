import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# 🚀 DEFESA DE AMBIENTE LOCAL: Captura o .env ou força o IP numérico do banco rodando no Docker
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:gti_icet_2026@127.0.0.1:5432/os_icet_db"
)

# Nota de Engenharia: Certifique-se de alinhar os dados acima (usuario, senha e nome do banco)
# com os valores reais configurados no seu docker-compose.yml para o postgres_db.

print(f"[SQLAlchemy] Conectando ao banco via barramento: {DATABASE_URL.split('@')[-1]}")

# Configuração do motor assíncrono do SQLAlchemy
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True  # Evita conexões derrubadas ou inativas
)

# Fábrica de Sessões Assíncronas
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    """
    Injeção de dependência assíncrona para escopos de requisições FastAPI.
    Garante o fechamento atômico e preventivo da sessão sob qualquer cenário.
    """
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()