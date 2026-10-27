import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const SECTION_LINKS = [
  { to: '/#features', hash: '#features', label: 'Features' },
  { to: '/#how-it-works', hash: '#how-it-works', label: 'How it works' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu whenever the page or section changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  const onHomePage = location.pathname === '/';
  const isHomeActive = onHomePage && !location.hash;

  function handleHomeClick() {
    setOpen(false);
    if (onHomePage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const linkClass = (active) => `ft-navbar__link${active ? ' active' : ''}`;

  return (
    <header className={`ft-navbar${scrolled ? ' is-scrolled' : ''}`}>
      <div className="ft-navbar__inner">
        <Link to="/" className="ft-nav-logo" onClick={handleHomeClick}>
          fittrack<span>.</span>
        </Link>

        <nav aria-label="Main navigation" className="ft-navbar__links">
          <Link to="/" className={linkClass(isHomeActive)} onClick={handleHomeClick}>
            Home
          </Link>
          {SECTION_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={linkClass(onHomePage && location.hash === item.hash)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ft-navbar__actions">
          <Link to="/login" className="ft-navbar__login">
            Log in
          </Link>
          <Link to="/signup" className="ft-navbar__cta">
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="ft-navbar__toggle"
          aria-expanded={open}
          aria-controls="ft-mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="ft-navbar__bar" />
          <span className="ft-navbar__bar" />
          <span className="ft-navbar__bar" />
        </button>
      </div>

      <div id="ft-mobile-menu" className={`ft-navbar__mobile${open ? ' is-open' : ''}`}>
        <Link to="/" className={linkClass(isHomeActive)} onClick={handleHomeClick}>
          Home
        </Link>
        {SECTION_LINKS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={linkClass(onHomePage && location.hash === item.hash)}
          >
            {item.label}
          </Link>
        ))}
        <Link to="/login" className="ft-navbar__link">
          Log in
        </Link>
        <Link to="/signup" className="ft-navbar__cta">
          Get started
        </Link>
      </div>
    </header>
  );
}