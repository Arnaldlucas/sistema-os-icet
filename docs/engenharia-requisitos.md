# Engenharia de Requisitos

## 🛠️ 2. Requisitos Funcionais (RF) e Histórias de Usuário (US)

Esta seção mapeia as funcionalidades do sistema utilizando o modelo Ágil (User Stories), garantindo a rastreabilidade exata (`RF-XXX`) para a futura Matriz de Rastreabilidade.

* **[RF-001] Autenticação Segura e Controle de Sessão**
* **História de Usuário:** *Como um* usuário homologado, *eu quero* fazer login com minhas credenciais, *para que* o sistema me autentique via Token JWT e direcione meu acesso com base no meu nível (RBAC).


* **[RF-002] Cadastro e Comprovação Funcional**
* **História de Usuário:** *Como um* servidor não cadastrado, *eu quero* preencher meus dados e enviar um comprovante em PDF/Imagem, *para que* eu entre na Fila de Homologação da Governança.


* **[RF-003] Triagem e Homologação de Contas (RBAC Binário)**
* **História de Usuário:** *Como um* Administrador, *eu quero* acessar a Fila de Homologação para deferir (ativar) novos cadastros ou indeferir com justificativa (aplicando o expurgo imediato do registro pendente), *para que* apenas servidores validados acessem o sistema e e-mails de cadastros errados sejam liberados para novas tentativas.


* **[RF-004] Gestão Direta de Credenciais (Injeção e Bloqueio)**
* **História de Usuário:** *Como um* Administrador, *eu quero* injetar contas ativas diretamente no banco ou bloquear contas suspeitas (preservando o histórico), *para que* eu mantenha a segurança e o controle da malha de usuários.


* **[RF-005] Abertura Dinâmica de Chamados (Upload de Evidências)**
* **História de Usuário:** *Como um* Servidor, *eu quero* abrir uma Ordem de Serviço preenchendo o local dinâmico e enviando uma evidência fotográfica, *para que* a TI seja notificada do incidente.


* **[RF-006] Isolamento de Fila Pessoal**
* **História de Usuário:** *Como um* Servidor, *eu quero* visualizar uma tabela exclusiva com as minhas solicitações, *para que* eu possa acompanhar a evolução dos meus próprios chamados.


* **[RF-007] Fila Kanban e Visão Global de Triagem**
* **História de Usuário:** *Como um* Administrador, *eu quero* ter uma visão global dos chamados (em Tabela ou Quadro Kanban), filtrando por status, categoria e data, *para que* eu priorize os atendimentos.


* **[RF-008] Trânsito de Status e Parecer Técnico**
* **História de Usuário:** *Como um* Administrador, *eu quero* alterar o status da OS (Atendimento, Concluído, Cancelado) emitindo um Laudo Técnico obrigatório, *para que* o fechamento seja auditado e o usuário notificado.


* **[RF-009] Visualização de Evidências via Streaming (Lightbox)**
* **História de Usuário:** *Como um* Administrador, *eu quero* clicar na foto de um chamado e dar zoom em alta resolução, consumindo o arquivo via endpoint REST seguro, *para que* eu analise o defeito físico sem falhas de carregamento.


* **[RF-010] Linha do Tempo Cumulativa (OS Timeline)**
* **História de Usuário:** *Como* auditor do sistema, *eu quero* que o software registre cada mudança de status do chamado em uma linha do tempo vertical (com carimbo de hora e autor), *para que* eu tenha a rastreabilidade do atendimento.


* **[RF-011] Governança de Infraestrutura e SLA (Catálogo)**
* **História de Usuário:** *Como um* Administrador, *eu quero* cadastrar, editar e remover nomes de Blocos Prediais e Categorias de TI (com horas de SLA), *para que* o sistema se adapte ao crescimento físico da UFAM.


* **[RF-012] Trilha de Auditoria Central (Logs do Sistema)**
* **História de Usuário:** *Como um* Administrador, *eu quero* consultar uma aba de Logs do Sistema, *para que* eu veja cronologicamente quem executou ações destrutivas ou de criação no ecossistema de TI.


* **[RF-013] Emissão de Balanço Gerencial (Print CSS)**
* **História de Usuário:** *Como um* Administrador, *eu quero* clicar em um botão de balanço, *para que* o sistema oculte os menus do site e gere um relatório de eficiência formatado perfeitamente para folhas físicas A4.


* **[RF-014] Recuperação de Acesso via Correio Eletrônico**
* **História de Usuário:** *Como um* usuário bloqueado por senha, *eu quero* solicitar um código numérico de 6 dígitos no meu e-mail, *para que* eu possa cadastrar uma nova chave de acesso.



---

## ⚙️ 3. Requisitos Não Funcionais (RNF)

Restrições sistêmicas, de segurança, performance e arquitetura da aplicação.

* **[RNF-001] Persistência Relacional Assíncrona:** O banco de dados deve utilizar o motor *PostgreSQL*, operando através de ORM com concorrência assíncrona (driver `asyncpg` / `await`), garantindo a ausência de travamentos em requisições simultâneas.
* **[RNF-002] Criptografia de Credenciais em Repouso:** Nenhuma senha ou hash de recuperação pode ser guardada em texto plano. Todas devem passar pela suíte criptográfica `bCrypt` via `Passlib`.
* **[RNF-003] Ciclo de Vida do Token JWT:** Os tokens de sessão devem ser gerados sob o algoritmo `HS256` e expirar estritamente em 480 minutos (8 horas), casando com o tempo da jornada de trabalho.
* **[RNF-004] Isolamento e Streaming de Mídias:** Evidências fotográficas devem contornar bloqueios de proxy através de uma arquitetura de API Rest Streaming. Os arquivos são salvos fisicamente no disco e enviados para a interface via `FileResponse`.
* **[RNF-005] Mensageria em Background:** Disparos de e-mail (recusas de cadastro, resolução de chamados e códigos OTP) devem ocorrer obrigatoriamente através de `BackgroundTasks`, impedindo que atrasos na rede do SMTP atrasem a tela do usuário.
* **[RNF-006] Fluidez Visual e UX de Alta Densidade:** O painel de governança deve se auto-ajustar usando o padrão *Clean UI* (Navegação por Abas), sendo vedado o uso de scroll horizontal em resoluções de desktop.

---

## 🔒 4. Regras de Negócio Rígidas (Business Rules - RN)

Diretrizes condicionais inquebráveis aplicadas nas rotas de backend (independente da interface web).

* **[RN-001] Bloqueio de Provedores Externos:** É proibido cadastrar contas usando provedores genéricos (Gmail, Hotmail). O sistema deve invalidar qualquer registro que não possua o sufixo institucional estrito (`@ufam.edu.br`).
* **[RN-002] Escopo de Nível de Acesso (RBAC Binário):** O controle de privilégios opera sob duas matrizes absolutas: `servidor` (Padrão, restrito a operações pessoais) e `admin` (Privilégio elevado para leitura de fila, edição de catálogos e deleção de dados).
* **[RN-003] Trava Transacional de Fechamento Auditado:** O banco rejeitará via `HTTP_400_BAD_REQUEST` qualquer alteração de um chamado para os estados fechados (*CONCLUÍDO* ou *CANCELADO*) se o *payload* não estiver acompanhado de um texto de Laudo/Parecer contendo no mínimo 10 caracteres lógicos.
* **[RN-004] Janela Efêmera de Chaves OTP:** Códigos gerados para recuperação de acesso (`CODIGOS_RECUPERACAO`) possuem janela de validade em memória volátil de exatos 15 minutos, sendo destruídos após o uso ou expiração.
* **[RN-005] Gestão de Ciclo de Vida Cadastral (Hard-Delete vs Soft-Delete):** A remoção de registros de usuários obedece a uma trava condicional bifurcada:
1. Para solicitantes reprovados na triagem inicial, aplica-se o **Hard-Delete**, expurgando fisicamente o registro do banco para liberar o e-mail/SIAPE.
2. Para usuários já homologados e com histórico ativo, aplica-se o **Soft-Delete**, marcando a conta como inativa (`is_active = False`) e injetando a flag `SOFT_DELETED_ACCOUNT` na coluna da senha, impedindo a perda da integridade relacional.


* **[RN-006] Deduplicação Criptográfica de Evidências:** É proibida a alocação de arquivos idênticos no volume físico do servidor. O serviço de upload valida obrigatoriamente a assinatura hash `SHA-256` da imagem contra a base de dados. Hashes repetidos causam *drop* imediato da requisição de upload.

---
