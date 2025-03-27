import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  // เปลี่ยนมาใช้ window.location.href แทน Link
  const navigateTo = (path, e) => {
    e.preventDefault();
    window.location.href = path;
  };

  const navItems = [
    { path: '/room', label: 'Room', icon: 'grid-3x3-gap-fill' },
    { path: '/', label: 'Dashboard', icon: 'speedometer2' },
    { path: '/alerts', label: 'ประวัติการแจ้งเตือน', icon: 'bell' }
  ];

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <a 
          className="navbar-brand d-flex align-items-center fw-bold" 
          href="/"
          onClick={(e) => navigateTo('/', e)}
        >
          <i className="bi bi-shield-lock me-2"></i>
          ระบบตรวจจับพฤติกรรมการโกง
        </a>
        <button 
          className="navbar-toggler" 
          type="button" 
          onClick={() => setIsExpanded(!isExpanded)}
          aria-controls="navbarNav" 
          aria-expanded={isExpanded}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div 
          className={`collapse navbar-collapse ${isExpanded ? 'show' : ''}`} 
          id="navbarNav"
        >
          <ul className="navbar-nav ms-auto">
            {navItems.map((item) => (
              <li key={item.path} className="nav-item">
                <a 
                  href={item.path}
                  onClick={(e) => navigateTo(item.path, e)}
                  className={`
                    nav-link fw-bold
                    ${location.pathname === item.path ? 'active' : ''}
                  `}
                >
                  <i className={`bi bi-${item.icon} me-1`}></i>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;