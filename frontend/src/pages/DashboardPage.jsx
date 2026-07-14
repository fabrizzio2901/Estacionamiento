import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParkingGrid from '../components/ParkingGrid';
import DriverPanel from '../components/DriverPanel';
import AdminPanel from '../components/AdminPanel';
import PaymentPage from './PaymentPage';
import WalletPage from './WalletPage';
import ParkingAssistant from '../components/ParkingAssistant';

const NAV_ITEMS = [
  {
    id: 'map', label: 'Mapa', roles: ['ADMIN', 'DRIVER'],
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
  },
  {
    id: 'session', label: 'Mi Estancia', roles: ['DRIVER'],
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    id: 'wallet', label: 'Billetera', roles: ['DRIVER'],
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  },
  {
    id: 'payments', label: 'Pagos', roles: ['DRIVER'],
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  },
  {
    id: 'admin', label: 'Admin', roles: ['ADMIN'],
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('map');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(user?.role));
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="noise-overlay" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-parking-border bg-parking-bg/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-parking-accent flex items-center justify-center shadow-lg shadow-parking-accent/30">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <span className="font-display text-xl font-bold text-white">ParkIQ</span>
            <span className="hidden sm:block text-xs font-mono text-parking-muted bg-parking-surface px-2 py-0.5 rounded-full border border-parking-border">
              v3.0
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNav.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-body font-medium transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-parking-accent text-white shadow-md shadow-parking-accent/30'
                    : 'text-parking-muted hover:text-white hover:bg-parking-card'
                }`}>
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-parking-text">{user?.name}</p>
              <p className="text-xs text-parking-muted font-mono">
                {user?.role === 'ADMIN' ? '⚙ Admin' : '🚗 Conductor'}
              </p>
            </div>
            <button onClick={handleLogout}
              className="w-9 h-9 rounded-xl bg-parking-card border border-parking-border hover:border-parking-occupied/50 flex items-center justify-center transition-all text-parking-muted hover:text-parking-occupied"
              title="Cerrar sesión">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 rounded-xl bg-parking-card border border-parking-border flex items-center justify-center text-parking-muted">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-parking-border bg-parking-surface px-4 py-3 flex gap-2 overflow-x-auto">
            {visibleNav.map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                className={`flex-shrink-0 flex flex-col items-center gap-1 py-2 px-3 rounded-xl text-xs font-body font-medium transition-all ${
                  activeTab === item.id ? 'bg-parking-accent text-white' : 'text-parking-muted'
                }`}>
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {activeTab === 'map'      && <ParkingGrid />}
        {activeTab === 'session'  && user?.role === 'DRIVER' && <DriverPanel />}
        {activeTab === 'wallet'   && user?.role === 'DRIVER' && <WalletPage />}
        {activeTab === 'payments' && user?.role === 'DRIVER' && <PaymentPage />}
        {activeTab === 'admin'    && user?.role === 'ADMIN'  && <AdminPanel />}
      </main>

<ParkingAssistant />

      <footer className="border-t border-parking-border py-4 px-4">
        <p className="text-center text-xs text-parking-muted font-mono">
          ParkIQ v3.0 © 2024 — RF-01…RF-19 implementados
        </p>
      </footer>
    </div>
  );
}
