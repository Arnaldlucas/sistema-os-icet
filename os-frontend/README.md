# 🐳 Sistema de Ordens de Serviço de TI (Sistema OS - ICET/UFAM)

[![Docker Compose](https://img.shields.io/badge/Docker-Compose-blue?logo=docker&logoColor=white)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20(Async)-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)

O **Sistema OS** é uma plataforma full-stack moderna desenvolvida especificamente para o **Instituto de Ciências Exatas e Tecnologia de Itacoatiara (ICET/UFAM)**. O objetivo do sistema é centralizar, automatizar e otimizar a gestão e a triagem de ordens de serviço de suporte técnico e TI do campus, substituindo processos descentralizados por um fluxo de trabalho auditável, performático e baseado em métricas reais de SLA.

---

## 🏗️ Arquitetura e Engenharia do Ecossistema

O ecossistema foi totalmente conteinerizado e isolado via **Docker** e **Docker Compose**, eliminando a necessidade de instalar interpretadores ou gerenciadores de pacotes locais (`Python`, `Node.js`, etc.) na máquina do desenvolvedor.

### 🎛️ Backend (`os-backend`)
* **Framework:** `FastAPI` (Python 3.11+) operando de forma 100% assíncrona.
* **ORM & Banco de Dados:** `SQLAlchemy 2.0` com driver assíncrono `aiosqlite` sobre banco `SQLite`.
* **Segurança & Permissões:** Sistema de autenticação via tokens JWT com uma estrutura rigorosa de herança de privilégios e escopos baseados em grupos de operadores.
* **Autogestão de Dados (Lifespan):** O ciclo de vida da API conta com rotinas automáticas de migração e injeção de massa de dados de teste (*seed*), criando o banco estruturado automaticamente caso ele não exista na primeira execução.

### 💻 Frontend (`os-frontend`)
* **Framework & Build:** `React` com `Vite` e `TypeScript` para uma interface SPA (*Single Page Application*) ultra-veloz.
* **Estilização:** `TailwindCSS` proporcionando um design responsivo, limpo e focado na usabilidade do operador técnico.
* **Servidor de Produção:** `Nginx` embarcado no contêiner para distribuição otimizada dos ativos estáticos compilados (*build*).

---

## ⚡ Pré-requisitos para Execução

Para rodar todo o sistema na sua máquina, você precisa apenas de:

1. **Docker Desktop** instalado e configurado.
2. No Windows, certifique-se de que o **WSL2 (Windows Subsystem for Linux)** está ativo.
3. **Git** para clonagem e controle de versão.

---

## 🚀 Como Executar o Sistema (Guia Rápido)

Siga os passos abaixo no terminal da sua máquina (Prompt de Comando, PowerShell ou Terminal do Linux/macOS).

### 1. Clonar o Repositório
```bash
git clone [https://github.com/Arnaldlucas/sistema-os-icet.git](https://github.com/Arnaldlucas/sistema-os-icet.git)
cd sistema-os-icet
```
2. Configurar as Variáveis de Ambiente (.env)
Por motivos de segurança, arquivos contendo chaves de criptografia e senhas não são enviados ao GitHub. Fornecemos um modelo padrão profissional (.env.example). Execute o comando para criar o arquivo oficial a partir do exemplo:

No Windows (PowerShell):
```bash
copy os-backend/.env.example os-backend/.env
```
No Linux / macOS / Git Bash:
```bash
cp os-backend/.env.example os-backend/.env
```
Nota: O arquivo padrão já vem pré-configurado para funcionar perfeitamente dentro do ambiente de contêineres do Docker.

3. Inicializar o Ecossistema via Docker
Na pasta raiz do projeto (onde está o arquivo docker-compose.yml), execute o comando para buildar as imagens e subir os contêineres em segundo plano (detached mode):
```bash
docker compose up --build -d
```
O Docker irá baixar as imagens base, instalar as dependências do Python e do Node internamente, compilar o frontend e ligar os servidores.

4. Acessar as Aplicações
Assim que o processo terminar, as portas locais estarão mapeadas. Abra o seu navegador e acesse:

Interface do Frontend (React): http://localhost:3000

Documentação Interativa da API (Swagger UI): http://localhost:8000/docs

Status/Healthcheck do Backend: http://localhost:8000/api/admin/bootstrap

🛠️ Gerenciamento e Comandos Úteis
Se precisar monitorar ou intervir no ambiente, utilize os comandos abaixo na raiz do projeto:

Ver os logs em tempo real (essencial para QA e Debug):
```bash
docker compose logs -f 
```
Ver o status dos contêineres e consumo de memória:
```bash
docker compose ps
```
Derrubar o sistema (parar os contêineres):
```bash
docker compose down
```
Resetar completamente o banco de dados e aplicar novas migrações:
```bash
docker compose down -v
docker compose up --build -d
```

# 📊 Estrutura de Variáveis de Ambiente Backend (`.env`)

O arquivo `os-backend/.env` suporta as seguintes configurações essenciais:

| Variável | Descrição | Valor Padrão para Desenvolvimento |
| :--- | :--- | :--- |
| `DATABASE_URL` | URL de conexão assíncrona com o banco SQLite. | `sqlite+aiosqlite:///app/data/os_icet.sqlite3` |
| `SECRET_KEY` | Chave criptográfica usada para assinar os tokens JWT. | `chave_secreta_de_teste_do_icet_12345` |
| `ENVIRONMENT` | Define o comportamento do ambiente (logs/debug). | `development` |

...

## 📝 Contribuição, Requisitos e Garantia de Qualidade (QA)

Este repositório serve como ambiente central para o plano de trabalho de Engenharia de Requisitos e QA do campus. O mapeamento de fluxos, validação de regras de negócio de TI (SLA, escopo de chamados e perfis de acesso) e a escrita dos cenários de teste utilizam esta infraestrutura conteinerizada estável como ambiente de homologação padrão.
