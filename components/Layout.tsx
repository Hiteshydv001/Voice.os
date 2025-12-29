import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, PhoneOutgoing, Bot, Settings, LogOut, Menu, Terminal, Mic, Network, X, Calendar } from 'lucide-react';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'DASHBOARD', path: '/app/dashboard', shortLabel: 'HOME' },
    { icon: Bot, label: 'AGENTS', path: '/app/agents', shortLabel: 'AGENTS' },
    { icon: Mic, label: 'TEXT-TO-SPEECH', path: '/app/voice-cloning', featured: true, shortLabel: 'TTS' },
    { icon: Network, label: 'FLOW BUILDER', path: '/app/visual-builder', shortLabel: 'FLOW' },
    { icon: Calendar, label: 'DEMO SCHEDULE', path: '/app/demos', featured: true, shortLabel: 'DEMOS' },
    { icon: Users, label: 'LEADS', path: '/app/leads', shortLabel: 'LEADS' },
    { icon: PhoneOutgoing, label: 'CAMPAIGNS', path: '/app/campaigns', shortLabel: 'CALLS' },
  ];

  // Show only first 4 items in bottom nav
  const bottomNavItems = navItems.slice(0, 4);

  return (
    <div className="flex h-screen bg-stone-100 overflow-hidden font-mono">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-black text-white transform transition-transform duration-300 ease-in-out border-r-4 border-orange-600
        lg:w-64 lg:relative lg:translate-x-0 lg:border-r-4 lg:border-black
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 sm:h-20 px-4 sm:px-6 border-b-2 border-white/20 bg-stone-900">
          <div className="flex items-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-600 flex items-center justify-center border-2 border-white mr-2 sm:mr-3 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <Terminal className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tighter">VOICE.OS</span>
          </div>
          
          {/* Close button - Mobile only */}
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-stone-800 border-2 border-transparent hover:border-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* User Info */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-800 text-xs text-stone-500">
          <span className="block uppercase font-bold mb-1">Operator:</span>
          <span className="text-white truncate block text-sm sm:text-base">{currentUser?.email}</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col p-3 sm:p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center px-3 sm:px-4 py-3 sm:py-3 border-2 transition-all duration-200 relative
                ${isActive 
                  ? 'bg-orange-600 text-white border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] translate-x-[-2px] translate-y-[-2px]' 
                  : item.featured
                    ? 'text-orange-400 border-orange-600 hover:border-orange-400 hover:text-orange-300 hover:bg-stone-800'
                    : 'text-stone-400 border-transparent hover:border-white hover:text-white hover:bg-stone-800'}
              `}
            >
              <item.icon className="h-5 w-5 sm:h-5 sm:w-5 mr-3 flex-shrink-0" />
              <span className="font-bold tracking-widest text-sm sm:text-base">{item.label}</span>
              {item.featured && (
                <span className="ml-auto text-[8px] px-1.5 py-0.5 bg-orange-600 text-white font-black border border-white flex-shrink-0">
                  NEW
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 w-full p-3 sm:p-4 border-t-2 border-white/20 bg-stone-900">
          <button className="hidden sm:flex items-center w-full px-4 py-3 text-stone-400 hover:text-white hover:bg-stone-800 border-2 border-transparent hover:border-white transition-all">
            <Settings className="h-5 w-5 mr-3" />
            <span className="font-bold">SYSTEM</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center sm:justify-start w-full px-4 py-3 text-stone-400 hover:text-white hover:bg-stone-800 border-2 border-transparent hover:border-white transition-all sm:mt-2"
          >
            <LogOut className="h-5 w-5 sm:mr-3" />
            <span className="font-bold ml-2 sm:ml-0">EJECT</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-stone-100 relative pb-16 lg:pb-0">
        {/* Grid Background Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-5" 
             style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        {/* Mobile Header */}
        <header className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 bg-white border-b-4 border-black lg:hidden z-10 relative">
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-black hover:bg-stone-200 border-2 border-black rounded-none active:shadow-none transition-all"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <div className="ml-2 sm:ml-3 flex items-center">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-600 flex items-center justify-center border-2 border-black mr-2">
                <Terminal className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
              <span className="text-sm sm:text-lg font-bold uppercase">Voice.OS</span>
            </div>
          </div>
          
          {/* Mobile User Info */}
          <div className="text-xs text-stone-600 truncate max-w-[120px] sm:max-w-[200px] hidden xs:block">
            {currentUser?.email}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 relative z-10">
          <Outlet />
        </div>

        {/* Bottom Navigation - Mobile Only */}
        <nav className="fixed bottom-0 left-0 right-0 bg-black border-t-4 border-orange-600 lg:hidden z-40">
          <div className="flex items-center justify-around h-16">
            {bottomNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative
                    ${isActive ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-white hover:bg-stone-800'}
                  `}
                >
                  <item.icon className="h-5 w-5 mb-1" />
                  <span className="text-[10px] font-bold tracking-wider">{item.shortLabel}</span>
                  {item.featured && isActive && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
};

export default Layout;