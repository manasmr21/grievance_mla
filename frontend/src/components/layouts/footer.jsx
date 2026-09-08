import React from 'react';
import { Link } from 'react-router-dom';
import './footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-left">
        <div className="footer-logo">
          <div className="footer-logo-icon">
            <i className="fa-solid fa-building-columns"></i>
          </div>
          <div className="footer-logo-text">
            <h3>MLA Connect</h3>
            <p>Copyright 2026 MLA Connect. All rights reserved.</p>
          </div>
        </div>
      </div>

      <div className="footer-links">
        <Link to="#">Privacy Policy</Link>
        <span className="divider"></span>
        <Link to="#">Terms of Service</Link>
      </div>
    </footer>
  );
};

export default Footer;
