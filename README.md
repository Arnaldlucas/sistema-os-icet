<h1>🐳 Sistema de Ordens de Serviço de TI (Sistema OS - ICET/UFAM)</h1>

<p align="center">
    <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-Compose-blue?logo=docker&logoColor=white" alt="Docker Compose" /></a>
    <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61DAFB?logo=react&logoColor=black" alt="React Vite" /></a>
    <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/Database-PostgreSQL%2015%20(Async)-336791?logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
</p>

<p>
    O <strong>Sistema OS</strong> é uma solução de engenharia de software de alta performance, distribuída e assíncrona, projetada especificamente para atender às demandas de missão crítica da <strong>Gerência de Tecnologia da Informação (GTI) do Instituto de Ciências Exatas e Tecnologia de Itacoatiara (ICET/UFAM)</strong>. O sistema automatiza o ciclo de vida completo de chamados técnicos, oferecendo controle rígido de papéis (RBAC), auditoria imutável via persistência de transições de estados e processamento assíncrono de e-mails em segundo plano.
</p>

<hr />

<h2>🏗️ 1. Engenharia, Arquitetura e Fluxo de Dados</h2>
<p>
    A aplicação foi projetada sob padrões rigorosos de sistemas conteinerizados, dividindo-se em camadas fortemente desacopladas através de uma rede virtual bridge isolada chamada <code>os_network</code>.
</p>

<ul>
    <li><strong>Camada de Apresentação (os-frontend):</strong> Interface SPA desenvolvida em React, utilizando o construtor ultraveloz Vite. Entrega alta reatividade e disponibiliza um Proxy Reverso interno em seu arquivo de configuração para interceptar a rota de comunicação com a API, blindando a aplicação contra falhas e bloqueios de CORS (Cross-Origin Resource Sharing). A interface roda na porta pública <code>:5600</code>.</li>
    <li><strong>Camada de Negócio (os-backend):</strong> API RESTful construída com Python e framework FastAPI, operando sobre o servidor ASGI Uvicorn na porta <code>:8000</code>. O processamento ocorre de forma 100% assíncrona, tratando requisições concorrentes massivas de maneira não bloqueante.</li>
    <li><strong>Camada de Persistência (Database):</strong> Banco de dados relacional PostgreSQL 15 rodando na porta interna isolada <code>:5432</code>. A camada de banco de dados implementa um mecanismo ativo de <em>healthcheck</em> (baseado em <code>pg_isready</code>), que bloqueia a inicialização dos serviços do Backend até que o Postgres esteja totalmente pronto para receber conexões, mitigando <i>race conditions</i> no boot da infraestrutura. Toda a comunicação do ORM SQLAlchemy é realizada via driver especializado <code>asyncpg</code>.</li>
</ul>

<hr />

<h2>💾 2. Mecanismos Avançados e Regras de Negócio Core</h2>
<p>
    O ecossistema implementa rotinas avançadas de segurança, otimização de infraestrutura e persistência de dados mapeadas conforme os requisitos corporativos reais:
</p>

<ul>
    <li><strong>Motor de Gestão de Mídias e Deduplicação:</strong> As evidências fotográficas anexadas aos chamados são tratadas no backend por meio de criptografia de Hash SHA-256. Caso dois usuários enviem arquivos idênticos, o sistema realiza uma Deduplicação Automática, armazenando uma única cópia física no volume nomeado e apenas referenciando os ponteiros lógicos. Os arquivos aprovados ganham nomes gerados por UUID v4 e são salvos no diretório local físico seguro <code>.data/uploads</code>.</li>
    <li><strong>Barramento de Streaming REST e UX Defensiva:</strong> O Frontend jamais consome as mídias expondo caminhos estáticos ou diretórios diretos. O Backend disponibiliza um endpoint REST dedicado de Streaming de Mídia que lê o binário do disco e o transmite sob demanda via <code>FileResponse</code>. Na camada de interface, o componente de exibição em formato Gaveta de Triagem utiliza um componente de Lightbox reativo com suporte a Fallback Duplo (através do gatilho <code>onError</code> do React) para impedir telas em branco caso ocorram oscilações temporárias na API.</li>
    <li><strong>Matriz de Segurança e RBAC Binário:</strong> O controle de acessos (Role-Based Access Control) é segregado de forma absoluta em duas funções de privilégio: <code>servidor</code> (restrito à abertura, visualização e acompanhamento de suas próprias ordens de serviço) e <code>admin</code> (permissão global para gerenciar a fila do Kanban, alterar catálogos de categorias e inspecionar trilhas de auditoria). A sessão é Stateful/Stateless controlada por Token JWT assinado com o algoritmo HMAC-SHA256 (HS256) e possui expiração rígida de <strong>480 minutos (8 horas)</strong>, sincronizada com a jornada diária institucional de trabalho. Senhas em repouso são tratadas com hash de segurança bcrypt via Passlib.</li>
    <li><strong>Efemeridade e Recuperação de Credenciais:</strong> Fluxos de redefinição de senhas acionam tarefas assíncronas em segundo plano via <code>BackgroundTasks</code> do FastAPI. O sistema despacha chaves numéricas OTP (One-Time Password) de 6 dígitos que ficam guardadas em uma estrutura de memória volátil do servidor com tempo de expiração determinado em exatos <strong>15 minutos</strong> antes de serem totalmente expurgadas.</li>
    <li><strong>Bifurcação no Ciclo de Vida Cadastral (Regra Rígida RN-005):</strong> O gerenciamento e a deleção de contas de usuários operam em dois caminhos totalmente distintos e excludentes:
        <ol>
            <li><em>Contas Ativas ou Homologadas:</em> Para preservar rigorosamente a integridade referencial histórica do banco de dados (chaves estrangeiras vinculadas a Ordens de Serviço antigas), estes usuários sofrem <strong>Soft-Delete</strong>. O registro recebe o marcador <code>is_active=False</code> e sua senha atual é substituída pela string/flag fixa <code>SOFT_DELETED_ACCOUNT</code>, bloqueando qualquer nova autenticação de forma permanente.</li>
            <li><em>Solicitantes Pendentes Rejeitados:</em> Quando o administrador recusa o pré-cadastro de um usuário na Fila de Homologação da GTI, o backend realiza um <strong>Hard-Delete</strong> físico direto (<code>delete(Usuario)</code>) no banco do PostgreSQL após logar o evento de auditoria. Isso remove os dados de forma definitiva e extingue imediatamente as restrições de unicidade (<code>UNIQUE</code>) dos campos de E-mail e SIAPE, permitindo que o servidor submeta um novo cadastro imediatamente sem sofrer com erros de duplicidade ou travar a tela.</li>
        </ol>
    </li>
    <li><strong>Central de Governança e Audit Trail:</strong> O Dashboard adota uma arquitetura limpa em abas horizontais e centraliza a carga de indicadores estáticos e de operabilidade a partir de uma chamada unificada ao endpoint <code>/bootstrap</code>. Dentre as abas, a tela de Linha do Tempo consome dados estruturados da tabela <code>LogAuditoriaSistema</code>, renderizando cronologicamente payloads serializados em formato <code>JSONB</code> de todas as ações críticas e sensíveis tomadas na plataforma (exclusão de salas, bloqueios intencionais de contas, injeções ou modificações manuais de dados via bypass).</li>
</ul>

<hr />

<h2>📊 3. Dicionário de Variáveis de Ambiente Backend (os-backend/.env)</h2>
<p>
    O ecossistema consome chaves e configurações estruturadas em tempo de execução para garantir a segurança, portabilidade e modularidade dos dados sensíveis. Segue o mapeamento técnico da matriz de variáveis:
</p>

<table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 14px; margin-top: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <thead>
        <tr style="background-color: #0F4C81; color: #FFFFFF; text-align: left;">
            <th style="padding: 12px; border: 1px solid #CBD5E1; font-weight: bold; width: 30%;">Variável de Ambiente</th>
            <th style="padding: 12px; border: 1px solid #CBD5E1; font-weight: bold; width: 20%;">Módulo Consumidor</th>
            <th style="padding: 12px; border: 1px solid #CBD5E1; font-weight: bold; width: 50%;">Função Operacional e Descrição Técnica</th>
        </tr>
    </thead>
    <tbody>
        <tr style="background-color: #F8FAFC;">
            <td style="padding: 12px; border: 1px solid #CBD5E1; font-family: monospace; font-weight: bold; color: #0F4C81;"><code>DATABASE_URL</code></td>
            <td style="padding: 12px; border: 1px solid #CBD5E1; font-family: monospace; color: #334155;">app/db/session.py</td>
            <td style="padding: 12px; border: 1px solid #CBD5E1; color: #334155; line-height: 1.5;">String de conexão assíncrona segura que injeta o driver especialista do Postgres e gerencia o pool de sessões sem risco de deadlocks: <code style="font-family: monospace;">postgresql+asyncpg://postgres:root_password_ufam_2026@database:5432/sistema_os_db</code>.</td>
        </tr>
        <tr style="background-color: #EEF2F7;">
            <td style="padding: 12px; border: 1px solid #CBD5E1; font-family: monospace; font-weight: bold; color: #0F4C81;"><code>SECRET_KEY</code></td>
            <td style="padding: 12px; border: 1px solid #CBD5E1; font-family: monospace; color: #334155;">app/auth/routers.py</td>
            <td style="padding: 12px; border: 1px solid #CBD5E1; color: #334155; line-height: 1.5;">Segredo criptográfico simétrico de alta entropia utilizado pelo algoritmo HS256 para assinar as <em>claims</em> e garantir o princípio da não-repudiação nos payloads dos tokens JWT emitidos.</td>
        </tr>
        <tr style="background-color: #F8FAFC;">
            <td style="padding: 12px; border: 1px solid #CBD5E1; font-family: monospace; font-weight: bold; color: #0F4C81;"><code>ACCESS_TOKEN_EXPIRE_MINUTES</code></td>
            <td style="padding: 12px; border: 1px solid #CBD5E1; font-family: monospace; color: #334155;">app/auth/routers.py</td>
            <td style="padding: 12px; border: 1px solid #CBD5E1; color: #334155; line-height: 1.5;">Tempo limite de expiração compulsória do token de sessão do usuário no frontend, estabelecido em <strong>480 minutos (8 horas)</strong> para refletir exatamente a jornada diária padrão do servidor público.</td>
        </tr>
        <tr style="background-color: #EEF2F7;">
            <td style="padding: 12px; border: 1px solid #CBD5E1; font-family: monospace; font-weight: bold; color: #0F4C81;"><code>SMTP_HOST</code></td>
            <td style="padding: 12px; border: 1px solid #CBD5E1; font-family: monospace; color: #334155;">app/auth/routers.py</td>
            <td style="padding: 12px; border: 1px solid #CBD5E1; color: #334155; line-height: 1.5;">Endereço de rede do barramento SMTP institucional da UFAM utilizado para o disparo assíncrono em plano de fundo (Background Tasks) de e-mails contendo o código numérico OTP efêmero de 15 minutos.</td>
        </tr>
    </tbody>
</table>

<hr />

<h2>🚀 4. Manual de Instrução Operacional à Prova de Falhas</h2>
<p>
    Siga à risca os passos ordenados abaixo para clonar, compilar a infraestrutura dockerizada e executar o ecossistema completo localmente de maneira previsível e limpa:
</p>

<h3>Passo 1: Clonar o Repositório e Entrar na Raiz</h3>
<p>Abra o terminal do seu sistema de preferência (Bash ou PowerShell) e faça o download do repositório estrutural executando o comando:</p>
<pre><code>git clone https://github.com/Arnaldlucas/sistema-os-icet.git
cd sistema-os-icet</code></pre>

<h3>Passo 2: Higienização de Portas e Volumes (Reset de Segurança)</h3>
<p>Para mitigar conflitos decorrentes de execuções anteriores, lixos persistidos em cache ou travamentos nas portas lógicas <code>:5432</code> (PostgreSQL), <code>:8000</code> (FastAPI) e <code>:5600</code> (React/Vite), limpe totalmente os contêineres e expurgue os volumes nomeados utilizando:</p>
<pre><code>docker compose down -v</code></pre>

<h3>Passo 3: Inicialização da Infraestrutura Automatizada</h3>
<p>Inicie o processo de orquestração multi-container. Este comando criará a rede isolada <code>os_network</code>, montará os volumes <code>postgres_data</code> e <code>os_media_data</code>, disparará o healthcheck do banco de dados e compilará as imagens otimizadas:</p>
<pre><code>docker compose up --build</code></pre>

<h3>Passo 4: Acessar os Módulos do Sistema</h3>
<p>Assim que o barramento do Docker Compose reportar o status estável das aplicações (Uvicorn aceitando requisições e Vite com o servidor ativo), utilize o seu navegador web para operar os ambientes através das portas corretas:</p>
<ul>
    <li>💻 <strong>Interface de Navegação (SPA React + Vite):</strong> <a href="http://localhost:5600" target="_blank">http://localhost:5600</a></li>
    <li>⚙️ <strong>Documentação Interativa da API (Swagger UI Backend):</strong> <a href="http://localhost:8000/docs" target="_blank">http://localhost:8000/docs</a></li>
</ul>

<hr />

<h2>⚙️ 5. Comandos Úteis para Administração e Auditoria Técnica</h2>
<p>
    Utilize os utilitários de linha de comando abaixo para inspecionar, depurar e garantir a sustentabilidade da malha de contêineres em tempo de execução:
</p>

<ul>
    <li><strong>Monitorar o fluxo de logs unificado em tempo real:</strong><br/><code>docker compose logs -f</code></li>
    <li><strong>Inspecionar a integridade física de processos, mapeamento de portas e saúde (Healthcheck):</strong><br/><code>docker compose ps</code></li>
    <li><strong>Encerrar os serviços graciosamente (Graceful Shutdown) preservando o estado dos dados:</strong><br/><code>docker compose down</code></li>
    <li><strong>Acessar o terminal bash interativo do contêiner de banco de dados para consultas SQL manuais:</strong><br/><code>docker compose exec database psql -U postgres -d sistema_os_db</code></li>
</ul>

```
