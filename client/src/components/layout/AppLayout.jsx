import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar.jsx';
import AppHeader from './AppHeader.jsx';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-64">
        <AppHeader onOpenMenu={() => setMobileOpen(true)} />
        <main id="main" className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-6 lg:py-8 2xl:max-w-7xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
