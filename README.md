<h1>🐳 Sistema de Ordens de Serviço de TI (Sistema OS - ICET/UFAM)</h1>

<p align="center">
    <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-Compose-blue?logo=docker&logoColor=white" alt="Docker Compose" /></a>
    <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61DAFB?logo=react&logoColor=black" alt="React Vite" /></a>
    <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/Database-PostgreSQL%2015%20(Async)-336791?logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
</p>

<p>
    O <strong>Sistema OS</strong> é uma solução de engenharia de software full-stack e assíncrona, projetada especificamente para atender à demanda da <strong>Gerência de Tecnologia da Informação (GTI) do Instituto de Ciências Exatas e Tecnologia de Itacoatiara (ICET/UFAM)</strong>. O sistema automatiza o ciclo de vida completo de chamados técnicos, oferecendo controle rígido de papéis (RBAC), auditoria imutável de transições de estados e processamento de mensageria em segundo plano.
</p>

<hr />

<h2>🏗️ 1. Engenharia, Arquitetura e Fluxo de Dados</h2>
<p>
    A aplicação foi projetada sob os padrões modernos de sistemas distribuídos e conteinerizados, dividindo-se em camadas isoladas através de uma rede virtual bridge chamada <code>gti_network</code>.
</p>

<ul>
    <li><strong>Camada de Apresentação (os-frontend):</strong> Interface SPA desenvolvida em React 18 e TypeScript, utilizando o construtor modular Vite. Entrega alta velocidade de renderização para as tabelas dinâmicas da Fila de Atendimento e controle de Acordo de Nível de Serviço (SLA).</li>
    <li><strong>Camada de Negócio (os-backend):</strong> API RESTful construída em Python 3.11 com framework FastAPI. Funciona de forma não bloqueante via barramento ASGI Uvicorn, tratando requisições concorrentes sem travamento de threads.</li>
    <li><strong>Camada de Persistência (Database):</strong> Banco relacional PostgreSQL 15 gerenciado através do ORM SQLAlchemy. Toda a comunicação do servidor de aplicação com o banco de dados é puramente assíncrona, utilizando a biblioteca especializada <code>asyncpg</code>.</li>
</ul>

<hr />

<h2>📂 2. Mapeamento e Árvore Completa do Projeto</h2>
<p>
    Abaixo está detalhada a organização estrutural do repositório raiz, especificando o papel de cada subdiretório e arquivo chave do ecossistema:
</p>

<pre>
sistema-os-icet/
├── docker-compose.yml         # Orquestrador mestre dos contêineres (Postgres, Backend e Frontend)
├── README.md                  # Documentação e manual técnico de inicialização do sistema
├── os-backend/                # Diretório raiz da API assíncrona em Python
│   ├── Dockerfile             # Instruções de montagem da imagem Linux + dependências Python
│   ├── requirements.txt       # Lista de bibliotecas externas (FastAPI, SQLAlchemy, asyncpg, passlib)
│   ├── app/                   # Código fonte estruturado da aplicação
│   │   ├── main.py            # Ponto de entrada da API e configuração do ciclo de vida (Lifespan)
│   │   ├── database.py        # Configuração do motor assíncrono (create_async_engine) do SQLAlchemy
│   │   ├── auth_routers.py    # Rotas de segurança, RBAC, geração de JWT e credenciais SMTP
│   │   ├── auditoria/         # Módulo responsável pela validação estrutural e logs de ações
│   │   └── db/                # Modelos de tabelas e gerenciamento de sessões com o banco
├── os-frontend/               # Diretório raiz da interface web reativa
│   ├── Dockerfile             # Instruções de montagem do contêiner Node.js para ambiente de desenvolvimento
│   ├── package.json           # Manifesto de dependências JavaScript e scripts de execução (Vite dev)
│   ├── vite.config.ts         # Configurações do compilador modular Vite
│   └── src/                   # Componentes estruturais da interface gráfica
│       ├── App.tsx            # Componente central e gerenciador de rotas visuais
│       └── main.tsx           # Inicializador e renderizador da árvore DOM do React
</pre>

<hr />

<h2>📊 3. Dicionário de Variáveis de Ambiente Backend (os-backend/.env)</h2>
<p>
    O ecossistema consome chaves configuradas em tempo de execução para garantir a modularidade e segurança dos dados. Segue a tabela técnica de propriedades:
</p>

<table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%;">
    <thead>
        <tr style="background-color: #f2f2f2;">
            <th>Variável de Ambiente</th>
            <th>Módulo Consumidor</th>
            <th>Função Operacional e Descrição Técnica</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>DATABASE_URL</code></td>
            <td><code>database.py</code></td>
            <td>URL de conexão assíncrona segura. Injeta o driver para o Postgres: <code>postgresql+asyncpg://postgres:root_password_ufam_2026@database:5432/sistema_os_db</code>.</td>
        </tr>
        <tr>
            <td><code>SECRET_KEY</code></td>
            <td><code>auth_routers.py</code></td>
            <td>Chave criptográfica simétrica de alta entropia para criptografar e assinar as claims de payload dos tokens JWT.</td>
        </tr>
        <tr>
            <td><code>ACCESS_TOKEN_EXPIRE_MINUTES</code></td>
            <td><code>auth_routers.py</code></td>
            <td>Tempo rígido de expiração do token de acesso na sessão do usuário, estabelecido em 480 minutos.</td>
        </tr>
        <tr>
            <td><code>SMTP_HOST</code></td>
            <td><code>auth_routers.py</code></td>
            <td>Endereço do barramento de e-mails institucional para despacho de notificações em segundo plano (Background Tasks).</td>
        </tr>
    </tbody>
</table>

<hr />

<h2>🚀 4. Manual de Instrução Operacional à Prova de Falhas</h2>
<p>
    Siga detalhadamente os passos ordenados abaixo para clonar, buildar e rodar o ecossistema completo na sua máquina local de maneira automatizada:
</p>

<h3>Passo 1: Clonar o Repositório e Entrar na Raiz</h3>
<p>Abra o terminal de comandos da sua preferência (PowerShell ou Bash) e execute as linhas abaixo:</p>
<pre>
git clone https://github.com/Arnaldlucas/sistema-os-icet.git
cd sistema-os-icet
</pre>

<h3>Passo 2: Higienização de Portas e Volumes (Reset de Segurança)</h3>
<p>Para garantir que contêineres antigos ou lixo de cache não fiquem travando a porta lógica 5432 do PostgreSQL ou a porta 8000 do FastAPI no seu sistema operacional, force a limpeza completa executando:</p>
<pre>
docker compose down -v
</pre>

<h3>Passo 3: Inicialização da Infraestrutura Automatizada</h3>
<p>Execute o comando abaixo para compilar os Dockerfiles, configurar a rede integrada e colocar os servidores em funcionamento ativo:</p>
<pre>
docker compose up --build
</pre>

<h3>Passo 4: Acessar os Módulos do Sistema</h3>
<p>Assim que os logs do terminal indicarem que o Uvicorn e o Vite inicializaram, abra o seu navegador de internet e utilize os seguintes links de acesso:</p>
<ul>
    <li>💻 <strong>Interface de Navegação (Frontend React):</strong> <a href="http://localhost:5173" target="_blank">http://localhost:3000</a></li>
    <li>⚙️ <strong>Documentação Interativa da API (Swagger UI Backend):</strong> <a href="http://localhost:8000/docs" target="_blank">http://localhost:8000/docs</a></li>
</ul>

<hr />

<h2>⚙️ 5. Comandos Úteis para Administração e Auditoria Técnica</h2>
<p>
    Utilize os comandos abaixo em uma nova janela de terminal, sempre posicionada na pasta raiz do projeto, para inspecionar a saúde do barramento:
</p>

<ul>
    <li><strong>Monitorar logs do sistema em tempo real:</strong> <code>docker compose logs -f</code></li>
    <li><strong>Verificar consumo de memória e integridade dos processos:</strong> <code>docker compose ps</code></li>
    <li><strong>Parar a execução mantendo os dados salvos:</strong> <code>docker compose down</code></li>
</ul>
