import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Importação profissional de pacotes direto dos node_modules
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'animate.css/animate.min.css';

// Seu arquivo de estilos customizados entra por último para sobressair
import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);