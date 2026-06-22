# Importa a classe Base do motor de sessões
from app.db.session import Base

# Importação maciça de todos os modelos de domínio (Garante o rastreamento do ORM)
from app.auth.models import Usuario, GrupoPermissao
from app.solicitacoes.models import Solicitacao, InteracaoTimeline, AnexoArquivo

# Objeto macro exportado para o inicializador da aplicação
metadata = Base.metadata