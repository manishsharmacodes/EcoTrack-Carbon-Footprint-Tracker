import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { HiOutlineMenu } from 'react-icons/hi';
import './Layout.css';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      
      <div className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Mobile Header */}
        <header className="mobile-header">
          <Link to="/dashboard" className="mobile-header-logo">
            <span className="logo-icon">🌿</span>
            <span>EcoTrack</span>
          </Link>
          <button className="mobile-menu-btn" onClick={toggleSidebar}>
            <HiOutlineMenu size={24} />
          </button>
        </header>
        
        <Outlet />
      </div>
    </div>
  );
}
