import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, PhoneOutgoing, Bot, Settings, LogOut, Menu, Terminal, Mic, Network } from 'lucide-react';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'DASHBOARD', path: '/app/dashboard' },
    { icon: Bot, label: 'AGENTS', path: '/app/agents' },
    { icon: Mic, label: 'TEXT-TO-SPEECH', path: '/app/voice-cloning', featured: true },
    { icon: Network, label: 'FLOW BUILDER', path: '/app/visual-builder' },
    { icon: Users, label: 'LEADS', path: '/app/leads' },
    { icon: PhoneOutgoing, label: 'CAMPAIGNS', path: '/app/campaigns' },
  ];

  return (
    <div className="flex h-screen bg-stone-100 overflow-hidden font-mono">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-black text-white transform transition-transform duration-300 ease-in-out border-r-4 border-black
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center h-20 px-6 border-b-2 border-white/20 bg-stone-900">
          <div className="w-10 h-10 bg-orange-600 flex items-center justify-center border-2 border-white mr-3 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <Terminal className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter">VOICE.OS</span>
        </div>

        <div className="px-6 py-4 border-b border-stone-800 text-xs text-stone-500">
            <span className="block uppercase font-bold mb-1">Operator:</span>
            <span className="text-white truncate block">{currentUser?.email}</span>
        </div>

        <nav className="flex flex-col p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center px-4 py-3 border-2 transition-all duration-200 relative
                ${isActive 
                  ? 'bg-orange-600 text-white border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] translate-x-[-2px] translate-y-[-2px]' 
                  : item.featured
                    ? 'text-orange-400 border-orange-600 hover:border-orange-400 hover:text-orange-300 hover:bg-stone-800'
                    : 'text-stone-400 border-transparent hover:border-white hover:text-white hover:bg-stone-800'}
              `}
            >
              <item.icon className="h-5 w-5 mr-3" />
              <span className="font-bold tracking-widest">{item.label}</span>
              {item.featured && (
                <span className="ml-auto text-[8px] px-1.5 py-0.5 bg-orange-600 text-white font-black border border-white">
                  NEW
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t-2 border-white/20 bg-stone-900">
          <NavLink
            to="/app/activity"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `
              flex items-center w-full px-4 py-3 border-2 transition-all
              ${isActive 
                ? 'bg-orange-600 text-white border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' 
                : 'text-stone-400 hover:text-white hover:bg-stone-800 border-transparent hover:border-white'}
            `}
          >
            <Settings className="h-5 w-5 mr-3" />
            <span className="font-bold">SYSTEM</span>
          </NavLink>
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-stone-400 hover:text-white hover:bg-stone-800 border-2 border-transparent hover:border-white transition-all mt-2"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className="font-bold">EJECT</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-stone-100 relative">
        {/* Grid Background Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-5" 
             style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        {/* Mobile Header */}
        <header className="flex items-center justify-between h-16 px-4 bg-white border-b-4 border-black lg:hidden z-10 relative">
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-black hover:bg-stone-200 border-2 border-black rounded-none"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="ml-3 text-lg font-bold uppercase">Voice.OS</span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;