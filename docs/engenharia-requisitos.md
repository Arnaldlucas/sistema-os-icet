## 🛠️ 2. Requisitos Funcionais (RF) e Não Funcionais (RNF)

### *Requisitos Funcionais (RF)*



* *[RF-001] Autenticação Segura via JWT:* O sistema deve validar chaves de acesso emitindo chaves encriptadas temporárias para controle de sessão.

* *[RF-002] Triagem Automatizada por Nível (RBAC):* O sistema deve ler o perfil do usuário para liberar abas exclusivas da TI (Fila de Homologação de Contas e Quadro Kanban).

* *[RF-003] Linha do Tempo Cumulativa (Timeline):* Toda mudança de status na OS deve salvar um registro com carimbo de hora, autor e ação, impedindo a perda do histórico.

* *[RF-004] Emissão de Balanço Anual:* O sistema deve compilar estatísticas consolidadas e gerar um relatório limpo adaptado para folhas físicas A4.



### *Requisitos Não Funcionais (RNF)*



* *[RNF-001] Persistência Relacional Assíncrona:* O banco de dados deve utilizar o motor do *PostgreSQL* operando em concorrência assíncrona (async/await) para suportar acessos simultâneos sem travar requisições.

* *[RNF-002] Criptografia de Credenciais em Repouso:* Nenhuma senha de servidor pode ser guardada em texto plano; todas devem passar pelo algoritmo adaptativo bCrypt.

* *[RNF-003] Ciclo de Vida do Token (SLA do Turno):* Os tokens JWT devem expirar estritamente em 480 minutos (8 horas), casando com o tempo máximo da jornada de trabalho do servidor.

* *[RNF-004] Fluidez Visual Responsiva:* A interface do painel de governança deve se auto-ajustar usando grades simétricas, sendo proibido o uso de barras de rolagem horizontais em desktops.

## 🔒 3. Regras de Negócio Rígidas (Business Rules - RN)



* *RN-01 — Bloqueio de Provedores Externos:* É proibido cadastrar contas com provedores públicos como Gmail, Yahoo ou Outlook. O sistema recusa em tempo de execução se o input não for @ufam.edu.br.

* *RN-02 — Janela Efêmera de Chaves OTP:* Códigos de recuperação de acesso enviados por e-mail expiram estritamente após 15 minutos em memória volátil, sendo destruídos após o prazo.

* *RN-03 — Herança Dinâmica de Privilégios (Bypass):* Se o cargo funcional digitado na auditoria cadastral contiver "subgerente", "gti" ou "cpd", a API injeta escopo administrativo de admin no token assinado automaticamente.

* *RN-04 — Trava Transacional de Encerramento:* O banco rejeita alterações de estado para Concluído ou Cancelado se a requisição não vier acompanhada do laudo técnico descritivo.
