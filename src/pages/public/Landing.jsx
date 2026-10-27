import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/theme.css';
import './Landing.css';

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
};

const HIGHLIGHTS = [
  {
    title: 'Secure sign-up',
    body: 'Create an account and confirm your email address.',
    icon: <path d="M4 6h16v12H4zM4 7l8 6 8-6" />,
  },
  {
    title: 'Password recovery',
    body: 'Reset a forgotten password with a secure email link.',
    icon: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
  },
  {
    title: 'Role-based access',
    body: 'Admins and customers each get their own area.',
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
];

const FEATURES = [
  {
    title: 'Email verification',
    body: 'Confirm your email before you start using your account.',
  },
  {
    title: 'Password recovery',
    body: 'Forgot your password? Request a secure reset link.',
  },
  {
    title: 'Show or hide password',
    body: 'Check what you type with the eye button on password fields.',
  },
  {
    title: 'Role-based access',
    body: 'Signed-out visitors are sent to log in, and each role sees only its own pages.',
  },
];

const STEPS = [
  { title: 'Create your account', body: 'Sign up with your name, email, and password.' },
  { title: 'Verify your email', body: 'Open the link we send to confirm your email address.' },
  { title: 'Log in', body: 'Sign in and go to the area that matches your role.' },
];

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function Landing() {
  const location = useLocation();

  // When the URL has a hash (for example /#features), scroll to that section.
  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.key, location.hash]);

  return (
    <div className="ft-landing">
      {/* Hero: fills the screen below the navbar */}
      <section className="ft-hero">
        <div className="ft-hero__main">
          <div className="ft-hero__content ft-reveal">
            <ul className="ft-hero__dots" aria-hidden="true">
              <li />
              <li />
              <li />
              <li />
            </ul>

            <p className="ft-hero__kicker">Smart gym management</p>
            <h1 className="ft-hero__title">FITTRACK</h1>
            <p className="ft-hero__text">
              Secure sign-up, login, and password recovery for FitTrack members and staff. Start with a
              verified account.
            </p>

            <div className="ft-hero__actions">
              <Link to="/signup" className="ft-pill">
                Get started <ArrowIcon />
              </Link>
              <Link to="/login" className="ft-text-link">
                Log in
              </Link>
            </div>
          </div>

          <div className="ft-hero__visual ft-reveal ft-reveal--delay" aria-hidden="true">
            <svg className="ft-hero__art" viewBox="0 0 480 440">
              <circle className="ft-art__bg" cx="240" cy="220" r="200" />
              <circle className="ft-art__ring" cx="240" cy="220" r="150" />
              <g transform="rotate(-20 240 220)">
                <rect className="ft-art__bar" x="60" y="208" width="360" height="24" rx="12" />
                <rect className="ft-art__plate" x="84" y="150" width="40" height="140" rx="14" />
                <rect className="ft-art__plate ft-art__plate--inner" x="134" y="176" width="26" height="88" rx="9" />
                <rect className="ft-art__plate ft-art__plate--inner" x="320" y="176" width="26" height="88" rx="9" />
                <rect className="ft-art__plate" x="356" y="150" width="40" height="140" rx="14" />
              </g>
            </svg>
          </div>
        </div>

        <div className="ft-hero__features">
          {HIGHLIGHTS.map((item) => (
            <div key={item.title} className="ft-highlight">
              <svg className="ft-highlight__icon" {...ICON_PROPS}>
                {item.icon}
              </svg>
              <div>
                <h2 className="ft-highlight__title">{item.title}</h2>
                <p className="ft-highlight__body">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="ft-section">
        <div className="ft-section__head">
          <p className="ft-eyebrow">Features</p>
          <h2 className="ft-section__title">Secure accounts for everyone</h2>
          <p className="ft-section__lead">
            FitTrack keeps account access simple and secure for every user.
          </p>
        </div>

        <div className="ft-features">
          {FEATURES.map((feature, index) => (
            <article key={feature.title} className="ft-feature">
              <span className="ft-feature__num">0{index + 1}</span>
              <h3 className="ft-feature__title">{feature.title}</h3>
              <p className="ft-feature__body">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="ft-section ft-section--tint">
        <div className="ft-section__head">
          <p className="ft-eyebrow">How it works</p>
          <h2 className="ft-section__title">Three steps to get started</h2>
        </div>

        <ol className="ft-steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="ft-step">
              <span className="ft-step__num">{index + 1}</span>
              <h3 className="ft-step__title">{step.title}</h3>
              <p className="ft-step__body">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Call to action */}
      <section className="ft-cta">
        <h2 className="ft-cta__title">Ready to start your fitness journey?</h2>
        <p className="ft-cta__text">
          Create your account in a few minutes and confirm your email to get started.
        </p>
        <Link to="/signup" className="ft-pill ft-pill--light">
          Get started <ArrowIcon />
        </Link>
      </section>
    </div>
  );
}