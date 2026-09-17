import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * Shared marketing-site navbar.
 * Converted from the repeated <header class="site-header"> markup + inline
 * hamburger-toggle <script> that was duplicated across index.html, sparkle.html,
 * parv.html and contact.html. Behavior (hamburger open/close, same links) is
 * preserved 1:1 — only the DOM classList toggling became React state.
 *
 * NOTE: in the original index.html the logo/"CITY TOPPERS" nav links pointed to
 * "#" instead of "index.html" (a leftover placeholder). Since all pages now
 * share this one header, those links are pointed at the real Home route so
 * navigation actually works everywhere, matching what sparkle.html/parv.html
 * already did.
 *
 * Login button: added per requirements — links to the existing admin
 * Login page at "/login". Does not touch Login.jsx, ProtectedRoute's
 * auth gating, or any Redux auth logic; it's a plain nav link.
 */
export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((open) => !open);

  return (
    <header className="site-header">
      <nav className="nav">
        <Link className="logo" to="/">
          <img src="/assets/images/site/logo.svg" alt="City Topper's Logo" />
        </Link>
        <ul className="nav-links">
          <li><Link to="/">CITY TOPPERS</Link></li>
          <li><Link to="/city-sparkle">CITY SPARKLE</Link></li>
          <li><Link to="/parv">PARV</Link></li>
        </ul>
      
        <Link className="btn-join" to="/contact">Join Community</Link>
          <Link className="btn-login" to="/login">Login</Link>
        <button
          className={`hamburger${menuOpen ? " open" : ""}`}
          id="hamburger"
          aria-label="Toggle menu"
          onClick={toggleMenu}
        >
          <span></span><span></span><span></span>
        </button>
      </nav>

      {/* Mobile menu */}
      <div className={`mobile-menu${menuOpen ? " open" : ""}`} id="mobile-menu">
        <ul>
          <li><Link to="/" onClick={() => setMenuOpen(false)}>CITY TOPPERS</Link></li>
          <li><Link to="/city-sparkle" onClick={() => setMenuOpen(false)}>CITY SPARKLE</Link></li>
          <li><Link to="/parv" onClick={() => setMenuOpen(false)}>PARV</Link></li>
        </ul>
        <Link className="btn-login mobile-login" to="/login" onClick={() => setMenuOpen(false)}>
          Login
        </Link>
        <Link className="btn-join mobile-join" to="/contact" onClick={() => setMenuOpen(false)}>
          Join Community
        </Link>
      </div>
    </header>
  );
}
