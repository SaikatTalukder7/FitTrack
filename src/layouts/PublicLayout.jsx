import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import DevModeBanner from '../components/common/DevModeBanner.jsx';
import '../styles/theme.css';
import './PublicLayout.css';

export default function PublicLayout() {
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