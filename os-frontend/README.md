# Sistema de Ordem de Serviço TI ICET/UFAM

Aplicação local baseada no backlog do produto. Usa React.js, Bootstrap e Tailwind CSS no front-end e um backend Python com SQLite para testes funcionais.

## Telas incluídas

- Início
- Cadastro de solicitação de serviço
- Login da Gerência de TI
- Cadastro de senha
- Recuperação de senha
- Painel restrito
- Alteração de senha
- Consulta de solicitações
- Emissão de relatórios
- Gerenciamento de grupos, usuários e demandas
- Detalhe completo da solicitação ao clicar na consulta
- Histórico de interações/chat entre solicitante e atendimento

## Como abrir

Execute:

```bash
python backend.py
```

Acesse:

```text
http://127.0.0.1:5600
```

Usuário provisório:

```text
login: admin
senha: admin1234
```

Contas de teste por grupo:

```text
admin / admin1234
Grupo: Administradores
Acesso: total ao sistema, incluindo relatórios, gerenciamento e atualização de status.

docente / docente1234
Grupo: Docentes
Acesso: criar solicitações autenticadas, consultar apenas as próprias solicitações e interagir no histórico do atendimento.

tecnico / tecnico1234
Grupo: Técnicos Administrativos
Acesso: criar solicitações autenticadas, consultar apenas as próprias solicitações e interagir no histórico do atendimento.
```

Observação: o cadastro de solicitações exige usuário autenticado. Administradores podem visualizar todos os chamados, alterar status e registrar observações no histórico do atendimento.
