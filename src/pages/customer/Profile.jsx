import { useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth.js';
import * as profileService from '../../services/profileService.js';
import Alert from '../../components/common/Alert.jsx';
import FormField from '../../components/forms/FormField.jsx';
import { validateFullName } from '../../utils/validators.js';
import './Profile.css';

function initialsOf(name, email) {
  const source = (name || '').trim() || (email || '').trim();
  if (!source) return 'FT';
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

export default function Profile() {
  const { profile, session, refreshProfile, isDevMode } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [fieldError, setFieldError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [avatarNotice, setAvatarNotice] = useState(null);
  const fileInput = useRef(null);

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

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    const validationError = validateFullName(fullName);
    setFieldError(validationError);
    if (validationError) return;

    setSaving(true);
    const { error } = await profileService.updateMyProfile(profile.id, {
      fullName: fullName.trim(),
    });
    if (error) {
      setSaving(false);
      setFormError(error);
      return;
    }
    await refreshProfile();
    setSaving(false);
    setSuccess('Your profile was saved.');
  }

  async function handlePhotoChosen(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarBusy(true);
    setAvatarError(null);
    setAvatarNotice(null);
    const { error } = await profileService.uploadMyAvatar(profile.id, file);
    setAvatarBusy(false);
    if (error) {
      setAvatarError(error);
      return;
    }
    setAvatarNotice('Your profile photo was updated.');
    await refreshProfile();
  }

  async function handleRemovePhoto() {
    if (!window.confirm('Remove your profile photo?')) return;
    setAvatarBusy(true);
    setAvatarError(null);
    setAvatarNotice(null);
    const { error } = await profileService.removeMyAvatar(profile.id);
    setAvatarBusy(false);
    if (error) {
      setAvatarError(error);
      return;
    }
    setAvatarNotice('Your profile photo was removed.');
    await refreshProfile();
  }

  return (
    <div className="pf-page">
      <header className="pf-head">
        <p className="pf-eyebrow">FitTrack / Member</p>
        <h1 className="pf-title">Profile</h1>
        <p className="pf-sub">Manage your account details.</p>
      </header>

      {isDevMode && (
        <Alert type="warning" title="Development mode">
          Profile changes need the FitTrack server to be running.
        </Alert>
      )}
      {success && <Alert type="success">{success}</Alert>}
      {formError && (
        <Alert type="error" title="Profile not saved">
          {formError.message}
        </Alert>
      )}
      {avatarNotice && <Alert type="success">{avatarNotice}</Alert>}
      {avatarError && (
        <Alert type="error" title="Photo not updated">
          {avatarError.message}
        </Alert>
      )}

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

          <div className="pf-photo-actions">
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="pf-visually-hidden"
              onChange={handlePhotoChosen}
              disabled={isDevMode || avatarBusy}
              aria-label="Choose profile photo"
            />
            <button
              type="button"
              className="pf-btn pf-btn--outline"
              onClick={() => fileInput.current?.click()}
              disabled={isDevMode || avatarBusy}
            >
              {avatarBusy ? 'Uploading…' : avatarPath ? 'Change photo' : 'Add photo'}
            </button>
            {avatarPath && (
              <button
                type="button"
                className="pf-btn pf-btn--danger"
                onClick={handleRemovePhoto}
                disabled={isDevMode || avatarBusy}
              >
                Remove
              </button>
            )}
          </div>
          <p className="pf-hint">JPG, PNG or WebP, up to 2 MB.</p>
        </div>
      </section>

      {/* Account details */}
      <section className="pf-card" aria-labelledby="profile-details-title">
        <h2 id="profile-details-title" className="pf-card__title">
          Account details
        </h2>

        <form noValidate onSubmit={handleSubmit} className="pf-form" aria-label="Profile form">
          <FormField id="profile-name" label="Full name" error={fieldError}>
            <input
              id="profile-name"
              type="text"
              autoComplete="name"
              className="pf-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? 'profile-name-error' : undefined}
              disabled={isDevMode || saving}
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
            <button type="submit" className="pf-btn" disabled={isDevMode || saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}