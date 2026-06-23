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
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF01</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Solicitação de cadastro preenchendo Nome, E-mail, Vínculo e SIAPE.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN01, RN02</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Restrição de domínio @ufam.edu.br e unicidade cadastral.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/auth/routers.py<br>os-backend/app/auth/services.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/pages/Register.js</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF02</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Validação e impedimento de duplicatas de username, email ou SIAPE.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN02</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Unicidade de registro funcional ativa no banco de dados.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/auth/models.py<br>os-backend/app/auth/services.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/pages/Register.js</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF03</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Autenticação via par de credenciais válidas e hash Bcrypt.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN02</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Verificação de integridade contra contas ativas do MySQL.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/auth/routers.py<br>os-backend/app/auth/services.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/pages/Login.js</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF04</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Expedição de token criptográfico JWT contendo expiração e escopo role.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN03</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Temporalidade crítica do token com limite estrito de 480 minutos.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/auth/routers.py<br>os-backend/app/auth/services.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/contexts/AuthContext.js</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF05</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Controle de acesso e restrição de rotas via RBAC (técnico/admin).</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN03</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Interceptação ativa baseada nos escopos decodificados do JWT.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/auth/routers.py<br>os-backend/app/admin/routers.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/components/Sidebar.js</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF06</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Recuperação de credenciais via envio de chave OTP temporária.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN04</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Ciclo de vida efêmero e uso único dos hashes em memória.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/auth/routers.py<br>os-backend/app/auth/services.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/pages/RecuperarSenha.js</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF07</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Registro de OS inserindo Título, Bloco, Sala, Categoria e Descrição.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN05, RN06</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Vínculo de propriedade ao criador e consistência física no ICET.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/solicitacoes/routers.py<br>os-backend/app/solicitacoes/services.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/pages/RequestForm.js</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF08</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Validação de payload da descrição, rejeitando menos de 10 caracteres.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN07</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Descrição qualitativa mínima obrigatória nos contratos de entrada.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/solicitacoes/schemas.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/components/TextArea.js</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF09</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Geração de número sequencial indexado e único (Protocolo de OS).</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN05</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Incremento automático atômico gerenciado síncronamente na persistência.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/solicitacoes/models.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/pages/RequestForm.js</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF10</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Listagem e filtragem de OS criadas sob o próprio username do servidor.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN05</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Isolamento estrito de dados pertencentes apenas ao requisitante.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/solicitacoes/routers.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/pages/ConsultRequests.js</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF11</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Mural técnico com listagem atualizada e filtros de triagem da GTI.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN10</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Visualização macro da fila restrita a perfis da gerência tecnológica.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/solicitacoes/routers.py<br>os-backend/app/admin/routers.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/pages/Dashboard.js</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF12</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Transição de status lógicos seguindo a esteira da máquina de estados.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN08, RN10</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Direcionalidade rígida progressiva e vinculação do ID do técnico.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/solicitacoes/routers.py<br>os-backend/app/solicitacoes/services.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/pages/Dashboard.js</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF13</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Bloqueio de transição para status finais se omitido o parecer técnico.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN09</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Obrigatoriedade de encerramento técnico via exceção HTTP 400.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/solicitacoes/services.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/pages/Dashboard.js</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF14</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Cálculo e exibição em tempo real do cronômetro dinâmico de SLA.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN11</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Cálculo atrelado automaticamente com base na criticidade e triagem.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/solicitacoes/services.py<br>os-backend/app/admin/services.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/pages/Dashboard.js</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF15</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Encaminhamento de e-mails em HTML corporativos para contas @ufam.edu.br.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN12</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Disparo condicionado estritamente à mutação operacional de status.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/solicitacoes/services.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">Ação em Segundo Plano</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF16</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Despacho de notificações pesadas de e-mail via Background Tasks.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN12</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Processamento delegado em segundo plano para resposta imediata HTTP 200.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/solicitacoes/routers.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/pages/Dashboard.js</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #0288d1;">RF17</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Persistência de logs de auditoria imutáveis (tabela logs_systems).</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-weight: bold; color: #ef6c00;">RN13</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc;">Imutabilidade absoluta rastro federal; inibição de rotas DELETE/UPDATE.</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-backend/app/auditoria/models.py<br>os-backend/app/auditoria/services.py</td>
            <td style="padding: 10px; border: 1px solid #dcdcdc; font-family: monospace;">os-frontend/src/pages/Dashboard.js</td>
        </tr>
    </tbody>
</table>
