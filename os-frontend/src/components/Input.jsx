import React from 'react';

export function Input({ label, type = "text", value = "", onChange, col = "col-12", disabled = false, placeholder = "" }) {
  // Normaliza o ID para manter conformidade semântica e acessibilidade (Heurística 4)
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