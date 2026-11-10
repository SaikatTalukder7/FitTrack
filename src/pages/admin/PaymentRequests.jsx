import { useCallback, useEffect, useState } from 'react';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import FormField from '../../components/forms/FormField.jsx';
import * as purchaseService from '../../services/purchaseService.js';
import './AdminPage.css';
import './PaymentRequests.css';

const FILTERS = [
  { key: 'pending', label: 'Waiting' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const STATUS_LABEL = { pending: 'Waiting', approved: 'Approved', rejected: 'Rejected' };

const money = (value) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const dateTime = (value) => (value ? new Date(value).toLocaleString() : '—');

export default function AdminPaymentRequests() {
  const [filter, setFilter] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [bkashNumber, setBkashNumber] = useState('');
  const [numberDraft, setNumberDraft] = useState('');
  const [savingNumber, setSavingNumber] = useState(false);

  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const result = await purchaseService.listAllPurchaseRequests({
      status: filter === 'all' ? undefined : filter,
    });
    setError(result.error?.message || '');
    setRequests(result.data || []);
    setLoading(false);
  }, [filter]);

  const loadSettings = useCallback(async () => {
    const result = await purchaseService.getBkashNumber();
    if (result.error) {
      setError(result.error.message);
      return;
    }
    const value = result.data?.value || '';
    setBkashNumber(value);
    setNumberDraft(value);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function saveNumber(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSavingNumber(true);
    const result = await purchaseService.setBkashNumber(numberDraft);
    setSavingNumber(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setBkashNumber(numberDraft.trim());
    setNotice('Payment number saved. Customers will see it on their Membership page.');
  }

  async function confirmRequest(request) {
    const name = request.profiles?.full_name || 'this customer';
    if (
      !window.confirm(
        `Confirm ${name}'s payment of ${money(request.amount)}?\n\nCheck the transaction ID ${request.transaction_id} in your bKash app first. This will activate the membership.`
      )
    )
      return;

    setBusyId(request.id);
    setError('');
    setNotice('');
    const result = await purchaseService.approvePurchaseRequest(request.id, '');
    setBusyId('');
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setNotice(`Membership activated for ${name}.`);
    await loadRequests();
  }

  async function submitReject(request) {
    setBusyId(request.id);
    setError('');
    setNotice('');
    const result = await purchaseService.rejectPurchaseRequest(request.id, rejectReason);
    setBusyId('');
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setRejectingId(null);
    setRejectReason('');
    setNotice('Request rejected. The customer can see the reason.');
    await loadRequests();
  }

  const numberChanged = numberDraft.trim() !== bkashNumber;

  return (
    <div className="ap-page">
      <div className="ap-head">
        <div>
          <h1 className="ap-title">Payment requests</h1>
          <p className="ap-sub">Check each bKash payment, then confirm to activate the membership, or reject it.</p>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Could not complete action">
          {error}
        </Alert>
      )}
      {notice && <Alert type="success">{notice}</Alert>}

      {/* bKash number setting */}
      <section className="ap-card">
        <h2 className="ap-card__title">Payment number</h2>
        <form className="pr-setting" onSubmit={saveNumber}>
          <FormField id="bkash-number" label="bKash number customers send money to" error={null}>
            <input
              id="bkash-number"
              className="ap-input"
              inputMode="numeric"
              maxLength={11}
              placeholder="01XXXXXXXXX"
              value={numberDraft}
              onChange={(e) => setNumberDraft(e.target.value)}
            />
          </FormField>
          <div>
            <button
              type="submit"
              className="ap-btn ap-btn--solid"
              disabled={savingNumber || !numberChanged}
            >
              {savingNumber ? 'Saving…' : 'Save number'}
            </button>
          </div>
        </form>
        <p className="pr-current">
          {bkashNumber ? `Current number: ${bkashNumber}` : 'No number set yet. Customers cannot buy until you set one.'}
        </p>
      </section>

      {/* Filter */}
      <div className="pr-filters" role="tablist" aria-label="Filter requests">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={`pr-filter${filter === f.key ? ' is-active' : ''}`}
            onClick={() => {
              setFilter(f.key);
              setRejectingId(null);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Requests */}
      <section className="ap-card">
        {loading ? (
          <Spinner label="Loading payment requests" />
        ) : requests.length === 0 ? (
          <p className="ap-empty">No requests in this list.</p>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Sent from</th>
                  <th>Transaction ID</th>
                  <th>Reference</th>
                  <th>Sent on</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <RequestRows
                    key={r.id}
                    request={r}
                    busy={busyId === r.id}
                    rejecting={rejectingId === r.id}
                    rejectReason={rejectReason}
                    onConfirm={() => confirmRequest(r)}
                    onStartReject={() => {
                      setRejectingId(r.id);
                      setRejectReason('');
                    }}
                    onCancelReject={() => setRejectingId(null)}
                    onReasonChange={setRejectReason}
                    onSubmitReject={() => submitReject(r)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function RequestRows({
  request: r,
  busy,
  rejecting,
  rejectReason,
  onConfirm,
  onStartReject,
  onCancelReject,
  onReasonChange,
  onSubmitReject,
}) {
  return (
    <>
      <tr>
        <td className="pr-strong">{r.profiles?.full_name || 'Customer'}</td>
        <td>{r.membership_plans?.name || '—'}</td>
        <td>{money(r.amount)}</td>
        <td className="pr-mono">{r.sender_number}</td>
        <td className="pr-mono">{r.transaction_id}</td>
        <td className="pr-mono">{r.reference}</td>
        <td>{dateTime(r.created_at)}</td>
        <td>
          <span className={`pr-tag pr-tag--${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
          {r.status === 'rejected' && r.reject_reason && <p className="pr-reason">{r.reject_reason}</p>}
        </td>
        <td>
          {r.status === 'pending' ? (
            <div className="pr-actions">
              <button type="button" className="pr-btn" disabled={busy} onClick={onConfirm}>
                {busy ? 'Working…' : 'Confirm'}
              </button>
              <button type="button" className="pr-danger" disabled={busy} onClick={onStartReject}>
                Reject
              </button>
            </div>
          ) : (
            <span className="pr-muted">{dateTime(r.reviewed_at)}</span>
          )}
        </td>
      </tr>

      {rejecting && (
        <tr className="pr-reject-row">
          <td colSpan={9}>
            <div className="pr-reject">
              <label className="pr-reject__label" htmlFor={`reason-${r.id}`}>
                Reason for rejecting (the customer will see this)
              </label>
              <textarea
                id={`reason-${r.id}`}
                maxLength={500}
                value={rejectReason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="For example: transaction ID not found in bKash, or amount is less than the plan price."
              />
              <div className="pr-actions">
                <button
                  type="button"
                  className="pr-danger pr-danger--solid"
                  disabled={busy || !rejectReason.trim()}
                  onClick={onSubmitReject}
                >
                  {busy ? 'Rejecting…' : 'Confirm rejection'}
                </button>
                <button type="button" className="pr-btn pr-btn--outline" onClick={onCancelReject}>
                  Cancel
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}