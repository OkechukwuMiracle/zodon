import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ScanSearch, History, Info, X } from 'lucide-react';
import Logo from './Logo.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/investigate', label: 'New Investigation', icon: ScanSearch },
  { to: '/history', label: 'Investigation History', icon: History },
  { to: '/about', label: 'About Zodon', icon: Info },
];

function NavItems({ onNavigate }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive ? 'bg-ink-800 font-medium text-white' : 'text-slate-400 hover:bg-ink-900 hover:text-slate-100'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : ''}`} aria-hidden="true" />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Footer() {
  return (
    <div className="mt-auto border-t border-ink-800 px-6 py-4 text-[11px] leading-relaxed text-slate-500">
      Assessments are evidence-based estimates, not guarantees. Never enter passwords or codes into Zodon.
    </div>
  );
}

export default function AppSidebar({ mobileOpen, onClose }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink-950 lg:flex">
        <div className="flex h-16 items-center px-6">
          <Logo />
        </div>
        <NavItems />
        <Footer />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close navigation" />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-ink-950">
            <div className="flex h-16 items-center justify-between px-6">
              <Logo />
              <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:text-white" aria-label="Close navigation">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavItems onNavigate={onClose} />
            <Footer />
          </aside>
        </div>
      )}
    </>
  );
}
