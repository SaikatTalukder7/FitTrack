import { useCallback, useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth.js';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import FormField from '../../components/forms/FormField.jsx';
import * as membershipService from '../../services/membershipService.js';
import * as purchaseService from '../../services/purchaseService.js';
import './Membership.css';

const STATUS_LABEL = {
  pending: 'Waiting for confirmation',
  approved: 'Approved',
  rejected: 'Rejected',
};

const money = (value) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function daysRemaining(endDate) {
  if (!endDate) return null;
  const end = new Date(`${endDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
}

export default function Membership() {
  const { profile, isDevMode } = useAuth();
  const customerId = profile?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [plans, setPlans] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [requests, setRequests] = useState([]);
  const [bkashNumber, setBkashNumber] = useState('');

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState({ sender: '', transactionId: '' });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      setError('Your account information is not ready. Refresh the page and try again.');
      return;
    }
    setLoading(true);
    setError('');
    // Keep statuses correct before showing them (expired and scheduled memberships).
    await purchaseService.refreshMembershipStatuses();

    const [planResult, membershipResult, requestResult, settingResult] = await Promise.all([
      membershipService.listPlans(),
      membershipService.listMemberships({ customerId }),
      purchaseService.listMyPurchaseRequests(customerId),
      purchaseService.getBkashNumber(),
    ]);

    const failed = [planResult, membershipResult, requestResult, settingResult].find((r) => r.error);
    setError(failed?.error?.message || '');
    setPlans(planResult.data || []);
    setMemberships(membershipResult.data || []);
    setRequests(requestResult.data || []);
    setBkashNumber(settingResult.data?.value || '');
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const active = memberships.find((m) => m.status === 'active') || null;
  const upcoming = memberships
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
  const pendingRequest = requests.find((r) => r.status === 'pending') || null;
  const canBuy = !isDevMode && !pendingRequest && Boolean(bkashNumber);
  const remaining = active ? daysRemaining(active.end_date) : null;

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(bkashNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFormError({ message: 'Copy is not available here. Select the number and copy it manually.' });
    }
  }

  async function submitRequest(event) {
    event.preventDefault();
    setFormError(null);
    setNotice('');
    setSubmitting(true);
    const { error: submitError } = await purchaseService.submitPurchaseRequest({
      planId: selectedPlan.id,
      senderNumber: form.sender.trim(),
      transactionId: form.transactionId.trim(),
    });
    setSubmitting(false);
    if (submitError) {
      setFormError(submitError);
      return;
    }
    setSelectedPlan(null);
    setForm({ sender: '', transactionId: '' });
    setNotice('Your payment details were sent. The gym will confirm it after checking the bKash payment.');
    await load();
  }

  if (loading) {
    return (
      <div className="mb-page">
        <section className="mb-card mb-card--center">
          <Spinner label="Loading membership" />
        </section>
      </div>
    );
  }

  return (
    <div className="mb-page">
      <header className="mb-head">
        <p className="mb-eyebrow">FitTrack / Member</p>
        <h1 className="mb-title">Membership</h1>
        <p className="mb-sub">View your plan, buy a new one, and track your payment requests.</p>
      </header>

      {isDevMode && (
        <Alert type="warning" title="Development mode">
          Buying a membership needs the FitTrack server to be running.
        </Alert>
      )}
      {error && (
        <Alert type="error" title="Could not load membership">
          {error}
        </Alert>
      )}
      {notice && <Alert type="success">{notice}</Alert>}

      {/* Current and upcoming membership */}
      <section className="mb-card">
        <h2 className="mb-card__title">Your membership</h2>
        {active ? (
          <div className="mb-current">
            <div className="mb-current__top">
              <div>
                <p className="mb-label">Current plan</p>
                <p className="mb-current__name">{active.membership_plans?.name || 'Membership'}</p>
              </div>
              <span className="mb-tag mb-tag--approved">Active</span>
            </div>
            <div className="mb-dates">
              <div className="mb-date">
                <span>Started</span>
                <strong>{formatDate(active.start_date)}</strong>
              </div>
              <div className="mb-date">
                <span>Ends</span>
                <strong>{formatDate(active.end_date)}</strong>
              </div>
              <div className="mb-date">
                <span>Days left</span>
                <strong>{remaining}</strong>
              </div>
            </div>
          </div>
        ) : (
          <p className="mb-muted">You do not have an active membership right now. Choose a plan below to buy one.</p>
        )}

        {upcoming.length > 0 && (
          <div className="mb-upcoming">
            <p className="mb-label">Starts after your current membership</p>
            {upcoming.map((m) => (
              <div key={m.id} className="mb-upcoming__item">
                <span>{m.membership_plans?.name || 'Membership'}</span>
                <span>
                  {formatDate(m.start_date)} → {formatDate(m.end_date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Plans and payment */}
      <section className="mb-card">
        <h2 className="mb-card__title">Available plans</h2>

        {pendingRequest && (
          <Alert type="info" title="A payment is waiting for confirmation">
            You can buy another plan after the gym confirms or rejects your current request.
          </Alert>
        )}
        {!bkashNumber && !isDevMode && (
          <Alert type="warning" title="Payment number not set yet">
            The gym has not set its bKash number yet. Please check back later or contact the gym.
          </Alert>
        )}

        {plans.length === 0 ? (
          <p className="mb-empty">No membership plans are available right now.</p>
        ) : (
          <div className="mb-plans">
            {plans.map((plan) => (
              <article key={plan.id} className={`mb-plan${selectedPlan?.id === plan.id ? ' is-selected' : ''}`}>
                <p className="mb-plan__name">{plan.name}</p>
                <p className="mb-plan__price">{money(plan.price)}</p>
                <p className="mb-plan__meta">{plan.duration_days} days</p>
                {plan.description && <p className="mb-plan__desc">{plan.description}</p>}
                <button
                  type="button"
                  className="mb-btn mb-btn--solid"
                  disabled={!canBuy}
                  onClick={() => {
                    setSelectedPlan(plan);
                    setFormError(null);
                    setNotice('');
                  }}
                >
                  Buy this plan
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Purchase form */}
      {selectedPlan && (
        <section className="mb-card mb-purchase">
          <h2 className="mb-card__title">Buy {selectedPlan.name}</h2>
          <p className="mb-muted">
            Amount: <strong className="mb-strong">{money(selectedPlan.price)}</strong>
          </p>

          <div className="mb-pay">
            <p className="mb-label">Send money to this bKash number</p>
            <p className="mb-pay__number">{bkashNumber}</p>
            <button type="button" className="mb-btn mb-btn--outline" onClick={copyNumber}>
              {copied ? 'Copied' : 'Copy number'}
            </button>
            <ol className="mb-steps">
              <li>Open bKash and choose Send Money.</li>
              <li>Send exactly {money(selectedPlan.price)} to the number above.</li>
              <li>In the reference, write your full name.</li>
              <li>Enter your bKash number and the transaction ID below.</li>
            </ol>
          </div>

          <form className="mb-form" onSubmit={submitRequest} aria-label="Purchase form">
            <FormField id="mb-sender" label="Your bKash number (the one you sent from)" error={null}>
              <input
                id="mb-sender"
                className="mb-input"
                inputMode="numeric"
                maxLength={11}
                placeholder="01XXXXXXXXX"
                value={form.sender}
                onChange={(e) => setForm((f) => ({ ...f, sender: e.target.value }))}
                required
              />
            </FormField>

            <FormField
              id="mb-trx"
              label="bKash transaction ID"
              hint="Found in your bKash confirmation SMS or transaction history."
              error={null}
            >
              <input
                id="mb-trx"
                className="mb-input"
                maxLength={30}
                value={form.transactionId}
                onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
                required
              />
            </FormField>

            {formError && (
              <Alert type="error" title="Could not send">
                {formError.message}
              </Alert>
            )}

            <div className="mb-actions">
              <button type="submit" className="mb-btn mb-btn--solid" disabled={submitting}>
                {submitting ? 'Sending…' : 'Submit payment details'}
              </button>
              <button
                type="button"
                className="mb-btn mb-btn--outline"
                onClick={() => {
                  setSelectedPlan(null);
                  setFormError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* My requests */}
      <section className="mb-card">
        <h2 className="mb-card__title">My payment requests</h2>
        {requests.length === 0 ? (
          <p className="mb-empty">You have not sent any payment details yet.</p>
        ) : (
          <div className="mb-requests">
            {requests.map((r) => (
              <div key={r.id} className="mb-req">
                <div className="mb-req__body">
                  <p className="mb-req__name">{r.membership_plans?.name || 'Plan'}</p>
                  <p className="mb-req__meta">
                    {money(r.amount)} · Transaction {r.transaction_id} · {formatDateTime(r.created_at)}
                  </p>
                  {r.status === 'rejected' && r.reject_reason && (
                    <p className="mb-req__reason">Reason: {r.reject_reason}</p>
                  )}
                </div>
                <span className={`mb-tag mb-tag--${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}