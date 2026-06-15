import React from 'react';

export function TextArea({ label, value = "", onChange, rows = "4", placeholder = "" }) {
  const id = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\W+/g, "-");

  return (
    <div className="col-12">
      <label className="form-label fw-semibold small mb-1" htmlFor={id}>{label}</label>
      <textarea 
        className="form-control" 
        id={id} 
        rows={rows} 
        value={value} 
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)} 
        required
      ></textarea>
    </div>
  );
}