import { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth.js';
import * as profileService from '../../services/profileService.js';
import FormField from '../../components/forms/FormField.jsx';
import './Profile.css';

function initialsOf(name, email) {
  const source = (name || '').trim() || (email || '').trim();
  if (!source) return 'FT';
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

export default function Profile() {
  const { profile, session } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(null);

  const email = session?.user?.email ?? '';
  const initials = initialsOf(profile?.full_name, email);
  const avatarPath = profile?.avatar_path ?? null;

  // Load a fresh temporary link whenever the stored photo changes.
  useEffect(() => {
    let cancelled = false;
    async function loadAvatar() {
      const result = await profileService.getMyAvatarUrl(avatarPath);
      if (cancelled) return;
      setAvatarUrl(result.error ? null : result.data);
    }
    loadAvatar();
    return () => {
      cancelled = true;
    };
  }, [avatarPath]);

  return (
    <div className="pf-page">
      <header className="pf-head">
        <p className="pf-eyebrow">FitTrack / Member</p>
        <h1 className="pf-title">Profile</h1>
        <p className="pf-sub">Manage your account details.</p>
      </header>

      {/* Identity and photo */}
      <section className="pf-card pf-identity">
        <div className={`pf-avatar${avatarUrl ? ' pf-avatar--photo' : ''}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Your profile photo" className="pf-avatar__img" />
          ) : (
            <span aria-hidden="true">{initials}</span>
          )}
        </div>

        <div className="pf-identity__body">
          <p className="pf-identity__name">{profile?.full_name || 'Your name'}</p>
          <p className="pf-identity__email">{email || 'No email on file'}</p>
          <span className="pf-tag">Member</span>
        </div>
      </section>

      {/* Account details */}
      <section className="pf-card" aria-labelledby="profile-details-title">
        <h2 id="profile-details-title" className="pf-card__title">
          Account details
        </h2>

        <form
          noValidate
          onSubmit={(event) => event.preventDefault()}
          className="pf-form"
          aria-label="Profile form"
        >
          <FormField id="profile-name" label="Full name">
            <input
              id="profile-name"
              type="text"
              autoComplete="name"
              className="pf-input"
              value={profile?.full_name ?? ''}
              readOnly
            />
          </FormField>

          <FormField id="profile-email" label="Email" hint="To change your email, contact an administrator.">
            <input
              id="profile-email"
              type="email"
              className="pf-input pf-input--readonly"
              value={email}
              readOnly
            />
          </FormField>

          <div className="pf-role">
            <p className="pf-role__label">Role</p>
            <p className="pf-role__text">
              Member. Roles are managed by an administrator and cannot be changed here.
            </p>
          </div>

          <div>
            <button type="submit" className="pf-btn" disabled>
              Save changes
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}