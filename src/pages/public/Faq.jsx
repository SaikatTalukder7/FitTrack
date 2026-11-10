import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/theme.css';
import './InfoPage.css';

const FAQS = [
  {
    q: 'What do I need to create an account?',
    a: 'Your full name, an email address you can access, and a password of at least 8 characters.',
  },
  {
    q: 'Do I need to verify my email?',
    a: 'Yes. We send a verification link to your email. Click it to confirm the address before you start using your account.',
  },
  {
    q: 'I did not receive the verification email. What should I do?',
    a: 'Check your spam or junk folder and wait a few minutes. If it still has not arrived, use Resend verification email on the verification page.',
  },
  {
    q: 'I forgot my password. How do I reset it?',
    a: 'Go to the login page and choose Forgot password. Enter your email, open the link we send you, and choose a new password.',
  },
  {
    q: 'My reset link does not work. Why?',
    a: 'Reset links expire after a short time and can only be used once. Request a new link and use the most recent email.',
  },
  {
    q: 'Can I see the password I am typing?',
    a: 'Yes. Every password field has an eye button. Click it to show the password, and click it again to hide it.',
  },
  {
    q: 'What is the difference between member and admin accounts?',
    a: 'Members see their own area. Admin accounts are for gym staff and open the admin area. Your role decides which area you can open.',
  },
  {
    q: 'Can I change my own role to admin?',
    a: 'No. Roles are set by the gym team. Your account cannot give itself admin access.',
  },
  {
    q: 'Is my information safe?',
    a: 'Your account is protected by sign-in and access rules, so you can only see your own information. Pages that need a sign-in redirect visitors to the login page.',
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="ft-info ft-info--faq">
      <section className="ft-info-hero">
        <div className="ft-info-wrap">
          <p className="ft-info-eyebrow">FAQ</p>
          <h1 className="ft-info-title">Frequently asked questions</h1>
          <p className="ft-info-lead">
            Quick answers about signing up, verifying your email, and getting back into your account.
          </p>
        </div>
      </section>

      <section className="ft-info-section">
        <div className="ft-faq">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            return (
              <div key={item.q} className={`ft-faq-item${isOpen ? ' is-open' : ''}`}>
                <h2>
                  <button
                    type="button"
                    className="ft-faq-q"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  >
                    <span>{item.q}</span>
                    <span className="ft-faq-icon" aria-hidden="true">
                      +
                    </span>
                  </button>
                </h2>
                <div id={panelId} role="region" className="ft-faq-a" hidden={!isOpen}>
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ft-info-cta">
        <div className="ft-info-wrap">
          <h2>Still have a question?</h2>
          <div className="ft-info-actions">
            <Link to="/signup" className="ft-info-btn ft-info-btn--primary">
              Join now
            </Link>
            <Link to="/how-it-works" className="ft-info-btn ft-info-btn--ghost">
              See how it works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}