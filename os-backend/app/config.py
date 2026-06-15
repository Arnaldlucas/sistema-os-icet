import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Configuração para usar SQLite local (não depende de servidor instalado)
DATABASE_URL = "sqlite:///./banco.db"

# Criação do motor de conexão
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}  # Necessário apenas para o SQLite
)

# Configuração da fábrica de sessões
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Classe Base para a criação dos Modelos das Tabelas
Base = declarative_base()

# Função Utilitária para abrir e fechar a sessão do banco
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()