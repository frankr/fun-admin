import React from 'react';
import { Link, NavLink } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        {/* Top Navigation Bar */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 px-6 lg:px-10 py-3 bg-white dark:bg-slate-900 sticky top-0 z-50">
          <div className="flex items-center gap-4 text-slate-900 dark:text-slate-100">
            <Link to="/" className="flex items-center gap-4">
              <div className="size-8 bg-primary rounded-lg text-white flex items-center justify-center">
                <span className="material-symbols-outlined">rocket_launch</span>
              </div>
              <h2 className="text-lg font-bold leading-tight tracking-tight">Funzinga Admin</h2>
            </Link>
            <nav className="hidden md:flex items-center gap-6 ml-8">
              <NavLink to="/" className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-slate-600 dark:text-slate-400 hover:text-primary'}`
              }>Activities</NavLink>
              <NavLink to="/users" className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-slate-600 dark:text-slate-400 hover:text-primary'}`
              }>Users</NavLink>
              <a href="#" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">Reports</a>
              <a href="#" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">Settings</a>
            </nav>
          </div>
          <div className="flex flex-1 justify-end gap-4 lg:gap-8 items-center">
            <div className="flex gap-2">
              <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <span className="material-symbols-outlined">account_circle</span>
              </button>
            </div>
            <div className="bg-primary/20 bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-primary/30" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAwSBBx6xCCucBOKpbh_7sFN1UyB0MPzK8XYvODrIId8GHj-agltD7GEbRkU0Dnc5QoAilv2DDa20bH3dzuSw0a9CcX-AHQc20WcL3zgF1iVufNAqe6C04kmZuP_e324YYqm9FAE3MTQHLjUsfeSStoXsUyqeLTXxuo0SAy6C8UeyFTz1M5YIxDPkOq_FtnA3cL6CTnVM4cgyBF9XDHBABOdOh5G8fcJq_q1RcyIqlXrwkpMkpzQFkUZTWg8gpn6HIY0bhiqq1Qu18-")' }}></div>
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
