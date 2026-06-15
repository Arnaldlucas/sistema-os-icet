import React from 'react';

export function Select({ label, options, value, onChange, col = "col-12", disabled = false }) {
  const id = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\W+/g, "-");
  const normalizedOptions = options.map((opt) => typeof opt === "string" ? { value: opt, label: opt } : opt);

  return (
    <div className={col}>
      <label className="form-label fw-semibold small mb-1" htmlFor={id}>{label}</label>
      <select 
        className="form-select" 
        id={id} 
        value={value} 
        onChange={(event) => onChange(event.target.value)} 
        required 
        disabled={disabled}
      >
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}