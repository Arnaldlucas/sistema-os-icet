import React from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';

/**
 * @component MainLayout
 * @description Componente de casca semântica global. Envolve as páginas do ecossistema
 * garantindo o posicionamento correto do Header, Aside e Main via flexbox/grid.
 */
export function MainLayout({ children, page, setPage, isAdmin, isTecnico, handleLogoutRequest, isAuthenticated }) {
  return (
    <div className="app-shell d-flex flex-column min-vh-100 bg-light">
      
      {/* 🧭 NAVIGATIONAL HEADER (Fixo no Topo) */}
      <header className="w-100 sticky-top" style={{ zIndex: 1030 }}>
        <Navbar currentPage={page} onNavigate={setPage} onLogoutRequested={handleLogoutRequest} />
      </header>

      <div className="d-flex flex-grow-1 position-relative w-100">
        
        {/* 🎛️ ASIDE BAR (Menu Lateral Condicional) */}
        {isAuthenticated && (
          <aside className="navigation-aside h-100 sticky-top" style={{ top: '60px', zIndex: 1020 }}>
            <Sidebar currentPage={page} onNavigate={setPage} isAdmin={isAdmin} isTecnico={isTecnico} />
          </aside>
        )}

        {/* 💻 MAIN CONTENT VIEWPORT (Onde as páginas internas renderizam) */}
        <main className="flex-grow-1 animate__animated animate__fadeIn" style={{ minWidth: 0, padding: !isAuthenticated ? '0' : '2.5rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
}