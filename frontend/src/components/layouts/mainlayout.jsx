import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './sidebar';
import Header from './header';
import Footer from './footer';
import MenuAccessGuard from './MenuAccessGuard';
import { NavigationProvider } from '../../hooks/useNavigation';
import './mainlayout.css';

const MainLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const closeMobileMenu = () => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <NavigationProvider>
      <div
        className={`main-layout ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}
      >
        {isMobile && isMobileMenuOpen && (
          <div className="sidebar-overlay" onClick={closeMobileMenu}></div>
        )}

        <Sidebar
          isCollapsed={isCollapsed}
          onNavigate={closeMobileMenu}
        />

        <div className="main-wrapper">
          <Header toggleSidebar={toggleSidebar} isMobile={isMobile} />
          <main className="main-content">
            <MenuAccessGuard>{children || <Outlet />}</MenuAccessGuard>
          </main>
          <Footer />
        </div>
      </div>
    </NavigationProvider>
  );
};

export default MainLayout;
