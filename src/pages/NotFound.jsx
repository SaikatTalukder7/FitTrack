import { Link } from 'react-router-dom';
import '../styles/theme.css';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="ft-notfound">
      <p className="ft-notfound__code">404</p>
      <h1 className="ft-notfound__title">Page not found</h1>
      <Link to="/" className="ft-btn ft-btn--primary">
        Back to home
      </Link>
    </div>
  );
}