from contextlib import asynccontextmanager
import hashlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.future import select

from app.models import Base, Group, User, Demand, Request
from app.routers import auth, solicitacoes, admin
from app.auth import get_db_placeholder

# Caminho para o banco de dados SQLite local
DATABASE_URL = "sqlite+aiosqlite:///os_icet.sqlite3"

# Criação do Engine Assíncrono
engine = create_async_engine(DATABASE_URL, echo=True)

# Fábrica de Sessões Assíncronas
async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# ==========================================
# SEEDERS / POPULAÇÃO INICIAL DO BANCO
# ==========================================
def hash_password_legacy(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

async def seed_database(session: AsyncSession):
    """Insere os dados base do ICET/UFAM caso o banco de dados esteja limpo."""
    result = await session.execute(select(Group))
    if result.scalars().first():
        return  # Banco já possui dados

    print("🌱 Populando tabelas com os dados iniciais do ICET/UFAM...")

    # 1. Criação dos Grupos
    g1 = Group(id=1, nome="Administradores", descricao="Acesso completo ao sistema local.")
    g2 = Group(id=2, nome="Docentes", descricao="Podem criar e consultar as próprias solicitações.")
    g3 = Group(id=3, nome="Técnicos Administrativos", descricao="Podem criar e consultar as próprias solicitações.")
    session.add_all([g1, g2, g3])
    await session.flush()

    # 2. Criação dos Usuários com hashes compatíveis
    u1 = User(id=1, nome="Administrador Master", login="admin", email="admin@icet.ufam.edu.br", password_hash=hash_password_legacy("admin1234"), group_id=1, role="admin")
    u2 = User(id=2, nome="Mariana Costa", login="docente", email="mariana.costa@ufam.edu.br", password_hash=hash_password_legacy("docente1234"), group_id=2, role="user")
    u3 = User(id=3, nome="Rafael Lima", login="tecnico", email="rafael.lima@ufam.edu.br", password_hash=hash_password_legacy("tecnico1234"), group_id=3, role="user")
    session.add_all([u1, u2, u3])

    # 3. Criação das Demandas Iniciais
    demandas = [
        Demand(nome="Manutenção de Hardware", prazo="2 dias úteis"),
        Demand(nome="Redes de Computadores", prazo="1 dia útil"),
        Demand(nome="Suporte Audiovisual", prazo="1 dia útil"),
        Demand(nome="Instalação de Software", prazo="3 dias úteis"),
    ]
    session.add_all(demandas)

    # 4. Criação de solicitações de teste para validar os painéis
    req1 = Request(id=1, protocolo="OS-2026-00001", owner_user_id=2, nome="Mariana Costa", siape="2314578", email="mariana.costa@ufam.edu.br", perfil="Docentes", bloco="Bloco B", sala="Laboratório 03", categoria="Manutenção de Hardware", descricao="Computador não liga após queda de energia.", status="Aberto")
    req2 = Request(id=2, protocolo="OS-2026-00002", owner_user_id=3, nome="Rafael Lima", siape="1987643", email="rafael.lima@ufam.edu.br", perfil="Técnicos Administrativos", bloco="Bloco A", sala="Secretaria", categoria="Redes de Computadores", descricao="Impressora de rede sem comunicação.", status="Em Atendimento")
    session.add_all([req1, req2])

    await session.commit()
    print("🚀 Banco de dados pronto e configurado com sucesso!")

# ==========================================
# CICLO DE VIDA DA APLICAÇÃO (LIFESPAN)
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Garante a inicialização do banco antes de receber requisições e limpa recursos no desligamento."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        await seed_database(session)
        
    yield
    await engine.dispose()

# Inicializa o FastAPI aplicando o gerenciador de ciclo de vida moderno
app = FastAPI(
    title="Sistema de Ordem de Serviço de TI - ICET/UFAM",
    description="Backend assíncrono refatorado para desacoplamento de infraestrutura",
    version="2.0.0",
    lifespan=lifespan
)

# ==========================================
# GERENCIAMENTO DE SESSÕES (DEPENDÊNCIA)
# ==========================================
async def get_db_override():
    """Injeta a sessão assíncrona nas rotas e garante o fechamento após a requisição."""
    async with async_session() as session:
        yield session

# Sobrescreve a dependência âncora global unificada localizada no auth.py
app.dependency_overrides[get_db_placeholder] = get_db_override

# ==========================================
# CONFIGURAÇÃO DO MIDDLEWARE DE CORS (ÚNICO)
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusão dos Roteadores Modularizados (Últimas linhas do arquivo)
app.include_router(auth.router)
app.include_router(solicitacoes.router)
app.include_router(admin.router)