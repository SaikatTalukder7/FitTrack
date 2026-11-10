import { Link } from 'react-router-dom';
import '../../styles/theme.css';
import './InfoPage.css';

const STEPS = [
  {
    title: 'Create your account',
    body: 'Sign up with your name, email, and a password of at least 8 characters.',
    points: ['Confirm your password', 'Use an email you can access'],
  },
  {
    title: 'Verify your email',
    body: 'Open the verification email and follow its link to confirm your address.',
    points: ['Check spam if it is missing', 'Resend a link from the verification page'],
  },
  {
    title: 'Log in',
    body: 'Sign in with your email and password to open your FitTrack area.',
    points: ['Members see their own area', 'Staff see the admin area'],
  },
];

const HELP = [
  {
    title: 'Did not get the verification email?',
    body: 'Check spam, then resend the link from the verification page.',
  },
  {
    title: 'Forgot your password?',
    body: 'Choose Forgot password on the login page and follow the email link.',
  },
  {
    title: 'Reset link not working?',
    body: 'Links expire. Request a new one and use the latest email.',
  },
];

export default function HowItWorks() {
  return (
    <div className="ft-info ft-info--how-it-works">
      <section className="ft-info-hero">
        <div className="ft-info-wrap">
          <p className="ft-info-eyebrow">How it works</p>
          <h1 className="ft-info-title">Three steps from sign-up to your area</h1>
          <p className="ft-info-lead">
            Setting up your FitTrack account takes only a few minutes. Here is what happens at each step.
          </p>
        </div>
      </section>

      <section className="ft-info-section">
        <ol className="ft-info-wrap ft-timeline">
          {STEPS.map((step, index) => (
            <li key={step.title} className="ft-timeline__item">
              <span className="ft-timeline__num">{index + 1}</span>
              <div className="ft-info-card">
                <h2 className="ft-info-card__title">{step.title}</h2>
                <p className="ft-info-card__body">{step.body}</p>
                <ul className="ft-info-points">
                  {step.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="ft-info-section ft-info-section--white">
        <div className="ft-info-wrap">
          <h2 className="ft-info-h2">If something goes wrong</h2>
          <div className="ft-info-grid">
            {HELP.map((item) => (
              <article key={item.title} className="ft-info-card">
                <h3 className="ft-info-card__title">{item.title}</h3>
                <p className="ft-info-card__body">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ft-info-cta">
        <div className="ft-info-wrap">
          <h2>Ready to create your account?</h2>
          <div className="ft-info-actions">
            <Link to="/signup" className="ft-info-btn ft-info-btn--primary">
              Join now
            </Link>
            <Link to="/faq" className="ft-info-btn ft-info-btn--ghost">
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}