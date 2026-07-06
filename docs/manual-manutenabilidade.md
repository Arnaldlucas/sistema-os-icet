# 🗂️ CAPÍTULO IV: MANUAL DE MANUTENIBILIDADE E ARQUITETURA DE ARQUIVOS

Este documento detalha a localização exata de cada arquivo, desde a virtualização com Docker até os componentes reativos do React, conectando o código de ponta a ponta de forma autoexplicativa e totalmente fiel ao ecossistema atualizado do sistema.

---

## 🌳 1. Árvore Absoluta de Diretórios do Projeto

Esta é a topologia real do ecossistema unificado, mapeando todas as camadas desacopladas de microsserviços pós-refatoração (Versão 2.1):

```text
os-system/
├── .gitignore                         # Restrições de rastreabilidade de arquivos locais e mídias (.data/)
├── docker-compose.yml                 # Orquestrador multi-container de infraestrutura (Portas: 5600, 8000, 5432)
├── README.md                          # Manual de governança, dicionário de ambiente e comandos de deployment
│
├── os-backend/                        # CAMADA DE SERVIÇOS E API REST (FastAPI)
│   ├── Dockerfile                     # Instruções de build da imagem Python (Criação de diretórios de uploads)
│   ├── requirements.txt               # Dependências contratuais estáveis (FastAPI, SQLAlchemy, asyncpg, Passlib)
│   ├── .env.example                   # Modelo seguro de chaves criptográficas e conexões SMTP de produção
│   ├── main.py                        # Inicializador do servidor ASGI, middleware CORS e Auto-Seed de administradores
│   └── app/
│       ├── __init__.py                # Inicializador de escopo do pacote principal
│       ├── auth/                      # Módulo de Autenticação e Gestão de Identidade Base
│       │   ├── __init__.py
│       │   ├── models.py              # Modelo ORM unificado (Usuario) mapeado sob o RBAC Binário no Postgres
│       │   └── routers.py             # Endpoints REST (Login, Register com upload Base64, e chaves OTP)
│       ├── admin/                     # Módulo de Alto Privilégio e Governança Técnica
│       │   ├── __init__.py
│       │   └── routers.py             # Endpoints críticos: Triagem (Hard-Delete de recusas), Bloqueios e Catálogos
│       ├── db/                        # Camada de Conexão com a Infraestrutura Relacional de Dados
│       │   ├── __init__.py
│       │   ├── base.py                # Classe base declarativa do ORM para unificação de esquemas
│       │   └── session.py             # Fábrica de conexões e sessões assíncronas concorrentes (AsyncSession)
│       └── solicitacoes/              # Módulo de Regras de Negócio e Gestão de Incidentes (GTI)
│           ├── __init__.py
│           ├── models.py              # Entidades físicas do Postgres: Solicitacao, AnexoArquivo e LogAuditoriaSistema
│           ├── schemas.py             # Validação estrutural de payloads de entrada via Pydantic (Trava de caracteres)
│           ├── routers.py             # Endpoints do fluxo Kanban e Rota REST de Streaming de Mídias (FileResponse)
│           └── services.py            # Motor Criptográfico: Validação SHA-256 de imagens e gravação em disco
│
└── os-frontend/                       # CAMADA DE INTERFACE REATIVA (React + Vite)
    ├── Dockerfile                     # Instruções de build da imagem Node e exposição da porta 5600
    ├── package.json                   # Manifesto de dependências de interface (React Router, FontAwesome)
    ├── vite.config.js                 # Configuração do compilador modular e Proxy de escape de CORS para /api
    ├── index.html                     # Ponto de montagem nativo do DOM da aplicação
    └── src/
        ├── main.jsx                   # Ponto de entrada e inicialização do Virtual DOM
        ├── App.jsx                    # Orquestrador central de navegação e encapsulamento de rotas protegidas
        ├── index.css                  # Estilos globais, hovers de alta densidade e regras @media print
        ├── contexts/
        │   └── AuthContext.jsx        # Provedor global de estado de login, persistência JWT e cabeçalhos de rede
        ├── components/
        │   ├── Navbar.jsx             # Cabeçalho superior com indicador de operabilidade e metadados
        │   └── Sidebar.jsx            # Menu de navegação lateral ocultado dinamicamente via RBAC Binário
        └── pages/
            ├── Login.jsx              # Interface de autenticação blindada contra contas com status inativo
            ├── Register.jsx           # Auto-cadastro em colunas simétricas com captura de buffer de crachá
            ├── RecuperarSenha.jsx     # Reset de acesso baseado em passos assíncronos e validação OTP
            ├── RequestForm.jsx        # Formulário reativo de abertura de chamados mapeado por FormData
            ├── Dashboard.jsx          # Central de Governança: Tab Layout de 5 abas integrando a Trilha de Auditoria
            └── ConsultRequests.jsx    # Triagem Kanban: Gaveta lateral de laudos e visualizador de mídias com Fallback

```

---

## 📄 2. Dicionário de Responsabilidades de Arquivos (Rastreabilidade)

### *A. Arquivos Globais de Orquestração (Root)*

* **docker-compose.yml**: O mestre de infraestrutura da aplicação. Configura o isolamento de rede virtual privada em modo bridge (`os_network`), monta os volumes de persistência física no disco rígido do servidor (`postgres_data` e `os_media_data`) e implementa a instrução de `healthcheck` no banco de dados. Isso garante que o contêiner do Backend aguarde a plena prontidão do PostgreSQL antes de inicializar as rotas do Uvicorn, evitando falhas lógicas de rede no boot frio.
* **.gitignore**: Sentinela de segurança do repositório. Impede categoricamente o vazamento de credenciais privadas em texto plano (arquivos `.env`), caches compilados de pacotes (`__pycache__`, `node_modules`) e diretórios de uploads locais contendo documentos de servidores para repositórios públicos.

### *B. Componentes Críticos do Backend (FastAPI)*

* **main.py**: O ponto focal do servidor ASGI. Instancia a aplicação FastAPI, parametriza as regras do middleware CORS (restringindo o consumo de dados exclusivamente ao domínio autorizado do frontend) e orquestra o ciclo de vida global (`lifespan`). O ciclo executa de forma assíncrona o *auto-seed* gerencial, inserindo os administradores de GTI padrão com hash de senhas ativo caso o banco de dados seja provisionado do zero.
* **app/auth/routers.py**: Controla a esteira inicial de controle de acesso. Consolida o endpoint de Login, invoca o `Passlib` para validar o hash bcrypt criptografado e emite a assinatura do token JWT. Gerencia o auto-cadastro retendo a conta como inativa (`is_active=False`) e armazena os códigos efêmeros de recuperação de senha (OTP) em memória volátil por exatos 15 minutos via `BackgroundTasks`.
* **app/auth/models.py**: Camada relacional que define a entidade `Usuario` mapeada declarativamente no Postgres. Contém as restrições estritas de unicidade (`UNIQUE`) para as colunas chaves: Username, Email e SIAPE.
* **app/admin/routers.py**: **O Coração da Governança e Auditoria do Sistema**. Concentra as operações administrativas de alto privilégio. Implementa a lógica de ciclo de vida bifurcada (**RN-005**): executa o **Hard-Delete** (`delete(Usuario)`) para expurgar fisicamente solicitações recusadas (liberando e-mail e SIAPE imediatamente para novas tentativas), e aplica o **Soft-Delete** para congelar contas ativas sem corromper as chaves estrangeiras. Gerencia os gatilhos que alimentam a tabela `LogAuditoriaSistema` e envia as cargas de logs formatadas no endpoint `/bootstrap`.
* **app/solicitacoes/schemas.py**: O muro de validação contratual. Utiliza a biblioteca Pydantic para impor validações de tipo e tamanho de dados de forma assíncrona. Intercepta requisições inválidas vindas do cliente (como descrições com menos de 10 caracteres) e devolve um *HTTP 422 Unprocessable Entity* na camada de rede, impedindo que dados corrompidos atinjam o ORM.
* **app/db/session.py**: Provedor de persistência. Instancia o motor assíncrono do SQLAlchemy baseado no driver `asyncpg`, gerenciando as sessões de transação de forma não bloqueante para absorver acessos simultâneos sem gargalos de threads.
* **app/solicitacoes/routers.py**: Centraliza o fluxo operacional do Kanban e expõe o **Endpoint REST de Streaming de Mídia**. Através da rota `/anexos/{nome_arquivo}`, ele lê os bytes das evidências diretamente do disco físico e faz o streaming para o navegador usando a classe nativa `FileResponse`, resolvendo de forma definitiva falhas de caminhos locais do Windows ou restrições de diretórios estáticos.
* **app/solicitacoes/services.py**: O motor criptográfico de arquivos. Executa a extração do cabeçalho de tipo mime (`content_type`), calcula a assinatura **Hash SHA-256** do binário das fotos para aplicar a **deduplicação de armazenamento** (bloqueando mídias idênticas) e renomeia os arquivos válidos com identificadores únicos **UUID v4** antes da persistência física.

### *C. Componentes Críticos do Frontend (React)*

* **vite.config.js**: O gateway reativo de desenvolvimento. Mapeia a porta lógica estrita de escuta para **:5600** e injeta as diretivas de **Proxy Reverso** para a rota `/api`. O proxy intercepta as chamadas do React e as encaminha silenciosamente para o servidor backend na porta `:8000`, neutralizando de ponta a ponta as rejeições de Cross-Origin (CORS).
* **src/contexts/AuthContext.jsx**: O interceptador e guardião de sessão. Retém a assinatura do Token JWT no armazenamento local do navegador e encapsula o estado reativo de autenticação. Injeta de forma transparente o cabeçalho `Authorization: Bearer <token>` em todas as requisições assíncronas do Axios, realizando a decodificação da matriz do RBAC Binário para as rotas da interface.
* **src/pages/Dashboard.jsx**: **A Interface União de Governança**. Desenvolvida sob o padrão estrutural de abas *(Clean Tab Navigation)* para eliminar poluição visual cognitiva. Integra os formulários de controle geográfico de blocos, cadastros de SLAs de categorias e implementa a aba **Logs do Sistema (Audit Trail)**, consumindo os objetos `JSONb` serializados pelo backend para desenhar a linha do tempo cronológica de ações dos gerentes na tela.
* **src/pages/ConsultRequests.jsx**: A central operacional da fila de chamados. Orquestra o quadro de colunas Kanban, gerencia a abertura da gaveta lateral de laudos técnicos e acopla as regras utilitárias de impressão corporativa limpa através de diretivas `@media print` exclusivas.
* *Módulo Lightbox Blindado:* O modal de visualização de evidências fotográficas consome o link direto da API Streaming e implementa um mecanismo de **Fallback Duplo** na tag de imagem através do manipulador de erro `onError`. Caso o tráfego da API enfrente oscilações de conexão, a interface tenta buscar a rota alternativa automaticamente, blindando a análise visual do administrador contra telas em branco.
