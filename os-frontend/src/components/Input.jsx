import React from 'react';

/**
 * COMPONENTE: Input (Entrada de dados customizada)
 * Amarra os componentes gerando chaves de ID normalizadas dinamicamente.
 *
 * @param {Object} props Dicionário de propriedades do input.
 * @param {string} props.label Texto de exibição da label superior.
 * @param {string} props.type Tipo HTML5 do elemento (text, password, etc).
 * @param {string} props.value Estado reativo vinculado à propriedade.
 * @param {Function} props.onChange Callback de atualização de estado.
 * @param {string} props.col Classe de dimensionamento do grid Bootstrap.
 * @param {boolean} props.disabled Flag de desativação contra múltiplos cliques.
 * @param {string} props.placeholder Texto de auxílio visual.
 */
export function Input({ label, type = "text", value = "", onChange, col = "col-12", disabled = false, placeholder = "" }) {
  // Garante a geração de strings seguras para correlacionar o 'htmlFor' e o 'id', 
  // atendendo automaticamente aos critérios WCAG de acessibilidade.
  const id = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\W+/g, "-");

  return (
    <div className={col}>
      <label className="form-label fw-semibold small mb-1" htmlFor={id}>{label}</label>
      <input 
        className="form-control" 
        id={id} 
        type={type} 
        value={value} 
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)} 
        required 
        disabled={disabled}     
      />
    </div>
  );
}