# 🗂️ CAPÍTULO IV: MANUAL DE MANUTENIBILIDADE E ARQUITETURA DE ARQUIVOS

Este documento detalha a localização exata de cada arquivo, desde a virtualização com Docker até os componentes reativos do React, conectando o código de ponta a ponta de forma autoexplicativa.

---

## 🌳 1. Árvore Absoluta de Diretórios do Projeto

Esta é a topologia real do ecossistema unificado, mapeando todas as camadas desacopladas de microsserviços:

```text
os-system/
├── .gitignore                         # Restrições de rastreabilidade de arquivos locais
├── docker-compose.yml                 # Orquestrador multi-container de infraestrutura (Front, Back, DB)
├── README.md                          # Manual de governança e comandos de deployment
│
├── os-backend/                        # CAMADA DE SERVIÇOS E API REST (FastAPI)
│   ├── Dockerfile                     # Instruções de build da imagem Python Alpine/Slim
│   ├── requirements.txt               # Dependências contratuais de pacotes (FastAPI, PyJWT, Passlib)
│   ├── .env.example                   # Modelo de chaves e strings de conexão de produção
│   ├── main.py                        # Inicializador do servidor ASGI e do middleware CORS
│   └── app/
│       ├── __init__.py                # Inicializador de escopo do pacote principal
│       ├── auth/                      # Módulo de Autenticação e Gestão de Credenciais
│       │   ├── __init__.py
│       │   ├── models.py              # Modelos ORM (Usuario, GrupoPermissao) mapeados no Postgres
│       │   └── routers.py             # Endpoints REST (Login, Register, OTP, Password Reset)
│       ├── auditoria/                 # Módulo de Validação e Contratos Pydantic
│       │   ├── __init__.py
│       │   └── schemas.py             # Schemas de inputs/outputs e validação rígida de dados
│       ├── db/                        # Camada de Conexão com a Infraestrutura de Dados
│       │   ├── __init__.py
│       │   ├── base.py                # Classe base declarativa do ORM para mapeamentos
│       │   └── session.py             # Fábrica de conexões e sessões assíncronas (AsyncSession)
│       └── solicitacoes/              # Módulo de Regras de Negócio das Ordens de Serviço
│           ├── __init__.py
│           ├── models.py              # Tabelas físicas da OS e logs da Timeline de auditoria
│           ├── schemas.py             # Validação de payloads de abertura e laudos técnicos
│           └── routers.py             # Endpoints de controle Kanban, pareceres e relatórios gerenciais
│
└── os-frontend/                       # CAMADA DE INTERFACE REATIVA (React + Vite)
    ├── Dockerfile                     # Instruções de build da imagem Node e servidor Nginx
    ├── package.json                   # Manifesto de dependências e scripts de automação NPM
    ├── vite.config.js                 # Configuração do compilador, plugins e proxies reversos
    ├── index.html                     # Ponto de montagem nativo do DOM da aplicação
    └── src/
        ├── main.jsx                   # Ponto de entrada do interpretador React
        ├── App.jsx                    # Orquestrador central de navegação e estado de modais (Shell)
        ├── index.css                  # Estilos globais e correções estruturais de contraste e hover
        ├── contexts/
        │   └── AuthContext.jsx        # Provedor global de estado de login, RBAC e envio de tokens JWT
        ├── components/
        │   ├── Navbar.jsx             # Cabeçalho superior com indicador de conexão ativa
        │   └── Sidebar.jsx            # Menu de navegação lateral baseado em regras de nível
        └── pages/
            ├── Login.jsx              # Interface de credenciamento e validação de sessão
            ├── Register.jsx           # Auto-cadastro balanceado em colunas com modal de SLA de 24h
            ├── RecuperarSenha.jsx     # Reset de acesso baseado nas chaves OTP efêmeras
            ├── RequestForm.jsx        # Formulário de abertura de chamados com respiro vertical
            ├── Dashboard.jsx          # Painel Unificado de Governança (Fila fluida sem rolagem horizontal)
            └── ConsultRequests.jsx    # Triagem Kanban, Gaveta de Análise Humana e Impressão CSS

```
## 📄 2. Dicionário de Responsabilidades de Arquivos (Rastreabilidade)

### *A. Arquivos Globais de Orquestração*

* **docker-compose.yml**: Define e amarra os três microsserviços. Garante a integridade na inicialização: cria a rede virtual privada `os_network`, monta o volume físico `postgres_data` no disco do servidor, inicializa o PostgreSQL e aguarda o banco estar pronto para só então dar o gatilho de inicialização da API FastAPI, prevenindo falhas de conexão de rede.
* **.gitignore**: Protege a integridade do repositório, impedindo que arquivos locais do sistema operacional, diretórios temporários (`__pycache__`, `node_modules`) e arquivos sensíveis contendo senhas reais (`.env`) vazem para o controle de versão público.

### *B. Componentes Críticos do Backend (FastAPI)*

* **main.py**: O coração do servidor. Instancia o FastAPI, configura e injeta as regras de cabeçalho do middleware CORS (restringindo quais origens de frontend podem fazer chamadas na API) e automatiza a geração do catálogo interativo OpenAPI (Swagger) exposto para auditoria técnica na rota `/docs`.
* **app/auth/routers.py**: Controla toda a esteira de segurança e autenticação. Concentra os tratamentos de erro de login, a conversão de arquivos para Base64 no auto-cadastro, as regras de herança de privilégio para os cargos de TI (Bypass) e a lógica de prevenção de enumeração de e-mails na recuperação de acesso.
* **app/auth/models.py**: Realiza a ponte declarativa do ORM com as tabelas de credenciais do Postgres, definindo restrições de unicidade (`UNIQUE`) e chaves primárias.
* **app/auditoria/schemas.py**: O arquivo de contratos de dados. Utiliza o Pydantic para travar as entradas do sistema. Se o frontend enviar um payload com um e-mail sem `@ufam.edu.br` ou com um SIAPE fora da regra de tamanho, este arquivo intercepta a requisição e devolve um erro HTTP 422 imediatamente, impedindo que requisições inválidas atinjam o banco de dados.
* **app/db/session.py**: Estabelece o barramento assíncrono. Cria a fábrica de conexões baseada no driver assíncrono do PostgreSQL, gerando o `AsyncSession` que é injetado como dependência nos endpoints para viabilizar concorrência em alta performance.
* **app/solicitacoes/routers.py**: Gerencia a lógica do negócio de chamados. Controla a mudança de status do Kanban, calcula os tempos de SLA e aplica a regra de negócio que rejeita o encerramento da OS caso o laudo técnico do parecer esteja ausente.

### *C. Componentes Críticos do Frontend (React)*

* **src/main.jsx**: O ponto de partida da interface. Inicializa o React, injeta a árvore do DOM e renderiza o componente raiz sob o modo estrito de validação do ciclo de vida da aplicação.
* **src/App.jsx**: Atua como o *App Shell* (orquestrador de navegação baseado em estado). Gerencia centralizadamente qual página renderizar na tela, captura feedbacks globais e renderiza os componentes transversais permanentes (`Navbar` e `Sidebar`).
* **src/contexts/AuthContext.jsx**: O guardião de dados da interface. Gerencia o estado global de login do servidor, intercepta as chamadas de API injetando o cabeçalho `Authorization: Bearer <token>` em todas as requisições assíncronas e decodifica as regras de nível de acesso (RBAC).
* **src/pages/Dashboard.jsx**: O painel de governança dos gestores e técnicos. Implementa o layout de controle de filas responsivo, utilizando quebras automáticas simétricas que eliminaram definitivamente as antigas setas de rolagem horizontal que inutilizavam o monitor.
* **src/pages/ConsultRequests.jsx**: Consolida o quadro Kanban visual e a gaveta lateral de triagem humana. A gaveta lateral foi completamente limpa de jargões técnicos (como o termo "Metadados") e dados estáticos de exemplo (`usuario@ufam`), organizando os dados operacionais em um painel claro de fácil leitura.
