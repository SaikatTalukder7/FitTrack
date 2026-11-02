import { Link } from 'react-router-dom';
import '../../styles/theme.css';
import './InfoPage.css';

const STEPS = [
  {
    title: 'Create your account',
    body: 'Enter your full name, email address, and a password of at least 8 characters. Type the password again to confirm it.',
    points: ['Use an email address you can access', 'New accounts start as member accounts'],
  },
  {
    title: 'Verify your email',
    body: 'We send a verification link to the address you signed up with. Open the email and click the link to confirm it is yours.',
    points: ['Check your spam folder if it does not arrive', 'Use Resend verification email if you need a new link'],
  },
  {
    title: 'Log in',
    body: 'Sign in with your email and password. FitTrack opens the right area for you automatically, based on your role.',
    points: ['Members open their own area', 'Gym staff open the admin area'],
  },
];

const HELP = [
  {
    title: 'Did not get the verification email?',
    body: 'Wait a few minutes and check your spam folder. If it still has not arrived, use Resend verification email on the verification page.',
  },
  {
    title: 'Forgot your password?',
    body: 'Choose Forgot password on the login page. We send a link to your email, and you can choose a new password from there.',
  },
  {
    title: 'Reset link not working?',
    body: 'Reset links expire after a short time. Request a new link from the Forgot password page and use the latest email.',
  },
];

export default function HowItWorks() {
  return (
    <div className="ft-info">
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