import { Link } from 'react-router-dom';
import './Footer.css';

const YEAR = new Date().getFullYear();

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/#features' },
      { label: 'How it works', to: '/#how-it-works' },
      { label: 'Create account', to: '/signup' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Log in', to: '/login' },
      { label: 'Forgot password', to: '/forgot-password' },
    ],
  },
];

// compact = true: used inside the signed-in Admin and Customer area.
// Only the copyright line is shown, with no public sign-in links.
export default function Footer({ compact = false }) {
  if (compact) {
    return (
      <footer className="ft-footer ft-footer--compact">
        <div className="ft-footer__bottom">
          <p>© {YEAR} FitTrack. All rights reserved.</p>
          <p>Train with a plan. Track every step.</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="ft-footer">
      <div className="ft-footer__inner">
        <div className="ft-footer__brand">
          <Link to="/" className="ft-logo">
            fittrack<span>.</span>
          </Link>
          <p>
            Smart gym management and personalized workout planning, for gym owners and the members who train with them.
          </p>
        </div>

        <nav aria-label="Footer navigation" className="ft-footer__cols">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="ft-footer__heading">{column.title}</h3>
              <ul className="ft-footer__list">
                {column.links.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="ft-footer__bottom">
        <p>© {YEAR} FitTrack. All rights reserved.</p>
        <p>Train with a plan. Track every step.</p>
      </div>
    </footer>
  );
}