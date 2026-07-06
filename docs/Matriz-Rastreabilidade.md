# Matriz de Rastreabilidade: Requisitos, Regras e Arquivos


<table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 13px; text-align: left; margin: 20px 0; border: 1px solid #dcdcdc;">
    <thead>
        <tr style="background-color: #0288d1; color: white;">
            <th style="padding: 12px; border: 1px solid #dcdcdc; width: 8%;">ID RF</th>
            <th style="padding: 12px; border: 1px solid #dcdcdc; width: 22%;">Descrição do Requisito Funcional</th>
            <th style="padding: 12px; border: 1px solid #dcdcdc; width: 8%;">ID RN</th>
            <th style="padding: 12px; border: 1px solid #dcdcdc; width: 20%;">Regra de Negócio Vinculada</th>
            <th style="padding: 12px; border: 1px solid #dcdcdc; width: 22%;">Componente / Arquivo Backend</th>
            <th style="padding: 12px; border: 1px solid #dcdcdc; width: 20%;">Interface / Arquivo Frontend</th>
        </tr>
    </thead>
    <tbody>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-001</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Autenticação Segura via E-mail/Username com emissão de Token JWT.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN-002</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Decodifica a *role* (RBAC Binário) nativamente dentro do Token.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/auth/routers.py<br>app/auth/models.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/Login.jsx<br>src/contexts/AuthContext.jsx</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-002</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Auto-cadastro funcional exigindo SIAPE, E-mail e arquivo PDF/Base64.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN-001</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Bloqueio expresso de e-mails que não possuem sufixo @ufam.edu.br.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/auth/routers.py<br>app/auth/models.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/Register.jsx</td>
        </tr>
 <thead>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-003</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Homologação ou Recusa de Contas Pendentes pela Governança de TI.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN-005</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Grava Log de Auditoria. Recusas aplicam <strong>Hard-Delete</strong> expurgando o registro e liberando o E-mail.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/admin/routers.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/Dashboard.jsx</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-004</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Injeção Direta de contas e Bloqueio de Segurança.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN-002, RN-005</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Impede exclusão física de contas ativas (<strong>Soft-Delete</strong>), alterando apenas o Hash e a flag <code>is_active</code>.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/admin/routers.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/Dashboard.jsx</td>
        </tr>
 <thead>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-005</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Abertura reativa de OS enviando metadados textuais e binário de imagem via FormData.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN-006</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Cálculo de Hash SHA-256 e gravação física no volume Docker (Deduplicação de Mídia).</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/solicitacoes/routers.py<br>app/solicitacoes/services.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/RequestForm.jsx</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-006</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Isolamento de Fila Pessoal (Listagem de OS do requisitante).</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN-002</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Filtra registros limitando a exibição estritamente ao <code>usuario_id</code> da sessão JWT.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/solicitacoes/routers.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/ConsultRequests.jsx</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-009</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Renderização de Evidências Fotográficas e Zoom via Lightbox.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN-004</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Consome arquivos através de endpoint REST dedicado (Streaming <code>FileResponse</code>) com Fallback visual.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/solicitacoes/routers.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/ConsultRequests.jsx</td>
        </tr>
 <thead>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-007</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Fila Kanban Operacional consolidando todos os chamados institucionais.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN-002</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Rota blindada via <code>Depends()</code> permitindo leitura global apenas para escopo Admin.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/solicitacoes/routers.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/ConsultRequests.jsx</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-008</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Trânsito operacional de status de OS (Em Atendimento, Resolvido, Cancelado).</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN-003</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">A transação exige Parecer Técnico descritivo (mín. 10 caracteres lógicos) para os estados fechados.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/solicitacoes/routers.py<br>app/solicitacoes/services.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/ConsultRequests.jsx</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-010</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Registro Cumulativo de Ações do Chamado (Timeline History).</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN-003</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Gravação atômica simultânea da mudança de status na tabela <code>InteracaoTimeline</code>.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/solicitacoes/routers.py<br>app/solicitacoes/models.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/ConsultRequests.jsx</td>
        </tr>
 <thead>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-011</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Gerenciador Dinâmico de Catálogos (Acréscimo/Exclusão de Blocos e SLAs).</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN-005</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Gatilho de auditoria gerado pelo <code>app/admin/routers.py</code> em cada deleção da infraestrutura.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/admin/routers.py<br>app/solicitacoes/schemas.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/Dashboard.jsx</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-012</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Tela Visual de Trilha de Auditoria (Audit Trail Viewer).</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN-005</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Carrega payload <code>JSONb</code> via endpoint Bootstrap e serializa cronologicamente na tela do administrador.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/admin/routers.py<br>app/solicitacoes/models.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/Dashboard.jsx</td>
        </tr>
 <thead>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-013</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Emissão de Relatório Balanço de Eficiência para Impressão.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">N/A</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Uso de CSS <code>@media print</code> para ocultar a UI e expor a Data Table limpa formatada em A4.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/admin/routers.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/ConsultRequests.jsx</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF-014</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Recuperação de Acesso via Chave OTP.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN-004</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Delegado via <code>BackgroundTasks</code> SMTP. O Hash volátil em memória expira estritamente após 15 min.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">app/auth/routers.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">src/pages/RecuperarSenha.jsx</td>
        </tr>
    </tbody>
</table>
