import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Acoplamento estrito de dependências de folhas de estilo globais (Passo 4 - Heurística 4)
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'animate.css/animate.min.css';

import './index.css'; 

/**
 * Ponto de Entrada Mestre da Aplicação React (Mounting Engine).
 * Instancia a árvore Virtual DOM injetando a interceptação estrita do StrictMode.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);