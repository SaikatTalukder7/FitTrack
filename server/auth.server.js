// Authentication: bcrypt password hashes, JWT session cookie, email verification and password reset tokens.
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { getCookie, setCookie, deleteCookie } from './http.js';
import { AppError, invalid, newId, nowIso } from './db.server.js';
import { isEmailConfigured, sendEmail, verificationEmail, resetEmail } from './email.server.js';

const COOKIE = 'ft_session';
const SESSION_DAYS = 7;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError('Sign-in is not configured (JWT_SECRET is missing).', 'CONFIG_ERROR');
  return new TextEncoder().encode(secret);
}

async function issueSession(user) {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user._id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
  setCookie(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return toSession(user);
}

function toSession(user) {
  return { user: { id: user._id, email: user.email } };
}

// Reads the session cookie and loads the user. The role always comes from the database, not the token.
export async function getCurrentUser(db) {
  const token = getCookie(COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (!payload.sub) return null;
    const user = await db.collection('users').findOne({ _id: payload.sub });
    if (!user || !user.email_verified) return null;
    return user;
  } catch {
    return null;
  }
}

async function sha256(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function createToken(db, userId, type, hours) {
  await db.collection('auth_tokens').deleteMany({ user_id: userId, type });
  const token = randomToken();
  await db.collection('auth_tokens').insertOne({
    _id: newId(),
    token_hash: await sha256(token),
    user_id: userId,
    type,
    expires_at: new Date(Date.now() + hours * 3600 * 1000),
  });
  return token;
}

async function consumeToken(db, token, type, { remove = true } = {}) {
  if (!token || typeof token !== 'string' || token.length > 200) return null;
  const record = await db.collection('auth_tokens').findOne({ token_hash: await sha256(token), type });
  if (!record || record.expires_at < new Date()) return null;
  if (remove) await db.collection('auth_tokens').deleteMany({ user_id: record.user_id, type });
  return record;
}

function cleanEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) throw invalid('Enter a valid email address.');
  return email;
}

function checkPassword(value) {
  const password = String(value ?? '');
  if (password.length < PASSWORD_MIN) throw invalid(`Password must be at least ${PASSWORD_MIN} characters.`);
  if (password.length > 72) throw invalid('Password must be 72 characters or fewer.');
  return password;
}

async function sendVerification(db, user, origin) {
  const token = await createToken(db, user._id, 'verify', 24);
  await sendEmail({
    to: user.email,
    subject: 'Confirm your FitTrack email',
    html: verificationEmail(user.full_name, `${origin}/verify-email?token=${token}`),
  });
}

export const authHandlers = {
  'auth.session': {
    auth: 'public',
    run: async ({ user }) => (user ? toSession(user) : null),
  },

  'auth.signUp': {
    auth: 'public',
    run: async ({ db, args, origin }) => {
      const email = cleanEmail(args.email);
      const password = checkPassword(args.password);
      const fullName = String(args.fullName ?? '').trim();
      if (!fullName) throw invalid('Full name is required.');
      if (fullName.length > 120) throw invalid('Full name must be 120 characters or fewer.');

      const existing = await db.collection('users').findOne({ email });
      if (existing) throw new AppError('An account with this email already exists. Try logging in instead.', 'EXISTING_USER');

      const emailOn = isEmailConfigured();
      const now = nowIso();
      const user = {
        _id: newId(),
        email,
        password_hash: await bcrypt.hash(password, 10),
        full_name: fullName,
        role: 'customer', // New accounts are always customers. Roles are changed only in the database.
        avatar_path: null,
        email_verified: !emailOn,
        created_at: now,
        updated_at: now,
      };
      await db.collection('users').insertOne(user);

      if (!emailOn) return { user: { id: user._id, email }, session: await issueSession(user) };
      await sendVerification(db, user, origin);
      return { user: { id: user._id, email }, session: null };
    },
  },

  'auth.signIn': {
    auth: 'public',
    run: async ({ db, args }) => {
      const email = String(args.email ?? '').trim().toLowerCase();
      const password = String(args.password ?? '');
      const user = email ? await db.collection('users').findOne({ email }) : null;
      const matches = user ? await bcrypt.compare(password, user.password_hash) : false;
      if (!user || !matches) throw new AppError('Invalid login credentials', 'invalid_credentials');
      if (!user.email_verified) {
        throw new AppError('Email not confirmed. Open the verification link we emailed you, or request a new one.', 'email_not_confirmed');
      }
      return issueSession(user);
    },
  },

  'auth.signOut': {
    auth: 'public',
    run: async () => {
      deleteCookie(COOKIE, { path: '/' });
      return null;
    },
  },

  'auth.resendVerification': {
    auth: 'public',
    run: async ({ db, args, origin }) => {
      const email = cleanEmail(args.email);
      if (!isEmailConfigured()) throw new AppError('Email sending is not set up yet.', 'EMAIL_NOT_CONFIGURED');
      const user = await db.collection('users').findOne({ email });
      // Same response whether or not the account exists, so emails cannot be probed.
      if (user && !user.email_verified) await sendVerification(db, user, origin);
      return null;
    },
  },

  'auth.verifyEmail': {
    auth: 'public',
    run: async ({ db, args }) => {
      const record = await consumeToken(db, args.token, 'verify');
      if (!record) throw new AppError('This verification link is invalid or has expired.', 'INVALID_TOKEN');
      await db.collection('users').updateOne({ _id: record.user_id }, { $set: { email_verified: true, updated_at: nowIso() } });
      const user = await db.collection('users').findOne({ _id: record.user_id });
      if (!user) throw new AppError('This verification link is invalid or has expired.', 'INVALID_TOKEN');
      return issueSession(user);
    },
  },

  'auth.requestPasswordReset': {
    auth: 'public',
    run: async ({ db, args, origin }) => {
      const email = cleanEmail(args.email);
      if (!isEmailConfigured()) {
        throw new AppError('Password reset emails are not set up yet. Ask the gym administrator for help.', 'EMAIL_NOT_CONFIGURED');
      }
      const user = await db.collection('users').findOne({ email });
      if (user) {
        const token = await createToken(db, user._id, 'reset', 1);
        await sendEmail({
          to: user.email,
          subject: 'Reset your FitTrack password',
          html: resetEmail(user.full_name, `${origin}/reset-password?token=${token}`),
        });
      }
      return null;
    },
  },

  'auth.checkResetToken': {
    auth: 'public',
    run: async ({ db, args }) => {
      const record = await consumeToken(db, args.token, 'reset', { remove: false });
      return { valid: Boolean(record) };
    },
  },

  'auth.resetPassword': {
    auth: 'public',
    run: async ({ db, args }) => {
      const password = checkPassword(args.password);
      const record = await consumeToken(db, args.token, 'reset');
      if (!record) throw new AppError('This reset link is invalid or has expired. Request a new one.', 'INVALID_TOKEN');
      // Opening a reset link from the inbox also proves the email address.
      await db.collection('users').updateOne(
        { _id: record.user_id },
        { $set: { password_hash: await bcrypt.hash(password, 10), email_verified: true, updated_at: nowIso() } }
      );
      deleteCookie(COOKIE, { path: '/' });
      return null;
    },
  },
};
