import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/theme.css';
import './Landing.css';

const TAGS = ['Email verification', 'Password recovery', 'Role-based access', 'Show or hide password'];

const FEATURES = [
  {
    title: 'Email verification',
    body: 'Confirm your email address before you start using your account.',
  },
  {
    title: 'Password recovery',
    body: 'Forgot your password? Get a secure reset link by email and choose a new one.',
  },
  {
    title: 'Show or hide password',
    body: 'Check what you type with the eye button on every password field.',
  },
  {
    title: 'Role-based access',
    body: 'Members and gym staff each see only the pages meant for them.',
  },
];

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export default function Landing() {
  const location = useLocation();

  // Navbar links such as /#features scroll to that section.
  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.key, location.hash]);

  // Scroll reveal: elements with .ft-reveal-on fade in when they enter the screen.
  useEffect(() => {
    const items = document.querySelectorAll('.ft-lp .ft-reveal-on');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="ft-lp">
      {/* Hero */}
      <section className="ft-lp-hero">
        <div className="ft-lp-hero__grid">
          <div className="ft-lp-hero__content ft-reveal-on">
            <p className="ft-lp-kicker">Gym management and member accounts</p>
            <h1 className="ft-lp-hero__title">
              Push Your <span>Limits</span> with FitTrack
            </h1>
            <p className="ft-lp-hero__text">
              Secure member accounts from sign-up to log in, with password recovery and role-based access, so you
              can focus on training.
            </p>

            <div className="ft-lp-actions">
              <Link to="/signup" className="ft-lp-btn ft-lp-btn--primary">
                Join now <Arrow />
              </Link>
              <Link to="/login" className="ft-lp-btn ft-lp-btn--ghost">
                Log in
              </Link>
            </div>

            <ul className="ft-lp-chips">
              {TAGS.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>

            <p className="ft-lp-secure">
              <LockIcon /> Your data is protected by sign-in and access rules.
            </p>
          </div>

          <div className="ft-lp-hero__art ft-reveal-on" style={{ '--d': '0.2s' }}>
            <img src="/images/hero-athlete.webp" alt="" className="ft-lp-hero__img" />
          </div>
        </div>
      </section>

      {/* Photo banner */}
      <section className="ft-lp-banner">
        <div className="ft-lp-banner__inner ft-reveal-on">
          <p className="ft-lp-kicker">One account, one secure place</p>
          <h2 className="ft-lp-banner__title">Built for members and gym staff alike</h2>
          <p className="ft-lp-banner__text">
            Sign in once and FitTrack takes you to the area that matches your role, with every page protected from
            visitors who are not signed in.
          </p>
          <div className="ft-lp-actions">
            <Link to="/how-it-works" className="ft-lp-btn ft-lp-btn--ghost">
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="ft-lp-section">
        <div className="ft-lp-section__inner">
          <div className="ft-lp-head ft-reveal-on">
            <p className="ft-lp-eyebrow">Features</p>
            <h2 className="ft-lp-title">Secure accounts for everyone</h2>
            <p className="ft-lp-lead">Account access that is easy to use and careful with your information.</p>
          </div>

          <div className="ft-lp-grid">
            {FEATURES.map((feature, index) => (
              <div key={feature.title} className="ft-lp-cell ft-reveal-on" style={{ '--d': `${index * 0.08}s` }}>
                <article className="ft-lp-card">
                  <span className="ft-lp-card__num">0{index + 1}</span>
                  <h3 className="ft-lp-card__title">{feature.title}</h3>
                  <p className="ft-lp-card__body">{feature.body}</p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="ft-lp-cta">
        <div className="ft-reveal-on">
          <h2 className="ft-lp-cta__title">Ready to start your fitness journey?</h2>
          <p className="ft-lp-cta__text">Create your account in a few minutes and confirm your email to get started.</p>
          <div className="ft-lp-actions ft-lp-actions--center">
            <Link to="/signup" className="ft-lp-btn ft-lp-btn--primary">
              Join now <Arrow />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}