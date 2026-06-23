import React from 'react';

/**
 * COMPONENTE: Groups (Exibição Corporativa Read-Only)
 * Mapeia de forma estática os privilégios agregados para prevenir erros estruturais de consulta.
 *
 * @param {Object} props Parâmetros de contexto recebidos.
 * @param {Array} props.groups Vetor contendo a lista crua de perfis retornada do banco.
 */
export function Groups({ groups }) {
  /**
   * Resuelve as diretrizes visuais e semânticas com base na substring do nome do papel.
   * @param {string} nome Identificador textual do grupo.
   */
  const obterDetalhesGrupo = (nome) => {
    const n = nome.toLowerCase();
    if (n.includes('administradores') || n.includes('admin')) {
      return {
        badge: 'Acesso Total',
        badgeClass: 'bg-danger text-white',
        borderClass: 'border-danger',
        icone: 'fa-user-gear',
        diretriz: 'Responsável pela homologação de usuários, auditoria pessoal e parametrização global do sistema.'
      };
    }
    if (n.includes('tecnicos') || n.includes('tecnico')) {
      return {
        badge: 'Suporte Técnico',
        badgeClass: 'bg-primary text-white',
        borderClass: 'border-primary',
        icone: 'fa-screwdriver-wrench',
        diretriz: 'Custódia de Ordens de Serviço, atendimento da linha do tempo corporativa e triagem de falhas.'
      };
    }
    return {
      badge: 'Solicitante Público',
      badgeClass: 'bg-secondary text-white',
      borderClass: 'border-secondary',
      icone: 'fa-chalkboard-user',
      diretriz: 'Abertura de chamados para infraestrutura, salas de aula e laboratórios do ICET.'
    };
  };

  return (
    <div className="animate__animated animate__fadeIn">
      <div className="alert bg-light border text-secondary rounded-3 d-flex align-items-center mb-4 p-3" style={{ fontSize: '13px' }}>
        <i className="fa-solid fa-building-shield text-primary me-3 fa-xl"></i>
        <div>
          <strong>Diretriz Institucional GTI/UFAM:</strong> Os grupos e papéis de acesso do sistema OS-ICET são definidos de forma estática em conformidade com as regras de permissão da universidade. A alteração de privilégios de um operador deve ser efetuada alterando o seu cargo funcional.
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-5 text-muted font-monospace bg-light rounded-3 border border-dashed" style={{ fontSize: '12px' }}>
          <i className="fa-solid fa-network-wired d-block mb-2 opacity-50 fa-xl"></i>
          Nenhum grupo sincronizado com o banco de dados. Execute o script app.seed.
        </div>
      ) : (
        <div className="row g-3">
          {groups.map((grupo) => {
            const meta = obterDetalhesGrupo(grupo.nome);
            
            return (
              <div className="col-md-6 col-lg-4" key={grupo.id}>
                <div 
                  className="card h-100 border shadow-sm rounded-3 overflow-hidden"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <div className="card-body p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="d-flex align-items-center">
                          <div className={`p-2 rounded-2 text-center me-2 bg-light border ${meta.borderClass}`} style={{ width: '38px', height: '38px' }}>
                            <i className={`fa-solid ${meta.icone} text-dark`}></i>
                          </div>
                          <div>
                            <strong className="d-block text-dark small" style={{ fontWeight: '600' }}>
                              {grupo.nome}
                            </strong>
                            <span className="font-monospace text-muted" style={{ fontSize: '10px' }}>
                              ID interno: #{grupo.id}
                            </span>
                          </div>
                        </div>
                        <span className={`badge rounded-pill small ${meta.badgeClass}`} style={{ fontSize: '10px', fontWeight: '600' }}>
                          {meta.badge}
                        </span>
                      </div>
                      
                      <p className="text-muted mt-2 mb-0" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                        {meta.diretriz}
                      </p>
                    </div>

                    <div className="border-top pt-2 mt-3 d-flex justify-content-between align-items-center" style={{ fontSize: '11px' }}>
                      <span className="text-muted">
                        <i className="fa-solid fa-user-lock me-1"></i> Papel Herdado:
                      </span>
                      <strong className="text-dark font-monospace" style={{ textTransform: 'uppercase' }}>
                        {grupo.descricao || 'user'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}