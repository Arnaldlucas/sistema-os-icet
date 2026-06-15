from sqlalchemy.orm import Session
from app.config import SessionLocal, engine, Base
from app.models import Gerente, Docente
from app.auth import hash_password

def populate_database():
    # Garante que as tabelas existem
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Verifica se já existem dados para não duplicar
        if db.query(Gerente).first() is None:
            print("Populando banco de dados com dados de teste...")
            
            # Cadastra um membro da Gerência de TI (GTI)
            admin_user = Gerente(
                name="Raimundo Carlos",
                email="rdocarlos@ufam.edu.br",
                cargo="Gerente de TI",
                password=hash_password("gti123")  # Senha criptografada
            )
            
            # Cadastra um Servidor Comum (Docente)
            docente_user = Docente(
                nome="Alternei de Souza",
                email="arnald.lucas@ufam.edu.br",
                siape=22252526,
                bloco="X",
                sala=10
            )

            db.add(admin_user)
            db.add(docente_user)
            db.commit()
            print("✅ Dados de teste inseridos com sucesso! (Senha padrão: gti123)")
        else:
            print("ℹ️ Banco de dados já possui dados cadastrados.")
            
    except Exception as e:
        print(f"❌ Erro ao popular banco: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate_database()