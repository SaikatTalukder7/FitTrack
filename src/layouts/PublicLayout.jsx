import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import DevModeBanner from '../components/common/DevModeBanner.jsx';
import '../styles/theme.css';
import './PublicLayout.css';

export default function PublicLayout() {
  const location = useLocation();

  // Scroll to the top on every page click, even when the same link is clicked again.
  // Links with a #hash are skipped so /#features still scrolls to that section.
  useEffect(() => {
    if (location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.key, location.hash]);

  return (
    <div className="ft-public">
      <a href="#main-content" className="ft-skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="ft-public__main">
        <DevModeBanner />
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}