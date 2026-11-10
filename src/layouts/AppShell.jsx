import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Alert from '../components/common/Alert.jsx';
import Footer from './Footer.jsx';
import '../styles/theme.css';
import './AppShell.css';

export default function AppShell({ area, navItems, disableNavigation = false }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState(null);

  async function handleSignOut() {
    setSignOutError(null);
    const { error } = await signOut();
    if (error) {
      setSignOutError(error);
      return;
    }
    navigate('/', { replace: true });
  }

  // NavLink adds the "active" class automatically when the route matches.
  const renderLinks = () =>
    navItems.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className="ft-navlink"
        aria-disabled={disableNavigation || undefined}
        onClick={disableNavigation ? (event) => event.preventDefault() : undefined}
      >
        {item.label}
      </NavLink>
    ));

  return (
    <div className="ft-shell">
      {/* Desktop sidebar */}
      <aside className="ft-sidebar">
        <div className="ft-sidebar__brand">
          <div className="ft-brand">
            <span className="ft-brand__mark" aria-hidden="true">
              F
            </span>
            <span>FitTrack</span>
          </div>
          <p className="ft-area">{area}</p>
        </div>

        <nav aria-label={`${area} navigation`} className="ft-sidebar__nav">
          {renderLinks()}
        </nav>

        <div className="ft-sidebar__footer">
          <p className="ft-sidebar__user">{profile?.full_name}</p>
          <button type="button" onClick={handleSignOut} className="ft-signout">
            Sign out
          </button>
        </div>
      </aside>

      <div className="ft-main-wrap">
        {/* Mobile header with horizontally scrollable navigation */}
        <header className="ft-mobile-header">
          <div className="ft-mobile-header__top">
            <div>
              <div className="ft-brand">
                <span className="ft-brand__mark" aria-hidden="true">
                  F
                </span>
                <span>FitTrack</span>
              </div>
              <p className="ft-area">{area}</p>
            </div>
            <button type="button" onClick={handleSignOut} className="ft-signout">
              Sign out
            </button>
          </div>
          <nav aria-label={`${area} navigation (mobile)`} className="ft-mobile-header__nav">
            {renderLinks()}
          </nav>
        </header>

        <main className="ft-main">
          {signOutError && (
            <div className="ft-main__alert">
              <Alert type="error" title="Sign-out failed">
                {signOutError.message}
              </Alert>
            </div>
          )}
          <Outlet />
        </main>

        <Footer compact />
      </div>
    </div>
  );
}
