import { callApi, invalid } from './apiClient.js';

const BKASH_NUMBER_PATTERN = /^01[0-9]{9}$/;
const TRANSACTION_PATTERN = /^[A-Za-z0-9]{6,30}$/;

// The bKash number customers send money to. Editable by admins.
export const getBkashNumber = () => callApi('settings.getBkash');

export async function setBkashNumber(value) {
  const trimmed = String(value ?? '').trim();
  if (!BKASH_NUMBER_PATTERN.test(trimmed)) return invalid('Enter a valid bKash number (11 digits, starting with 01).');
  return callApi('settings.setBkash', { value: trimmed });
}

// Customer: send a purchase request with the bKash details they paid with.
export async function submitPurchaseRequest({ planId, senderNumber, transactionId }) {
  if (!planId) return invalid('Choose a plan first.');
  if (!BKASH_NUMBER_PATTERN.test(senderNumber ?? '')) return invalid('Enter a valid bKash number (11 digits, starting with 01).');
  if (!TRANSACTION_PATTERN.test(transactionId ?? '')) return invalid('Enter a valid bKash transaction ID (letters and numbers only).');
  return callApi('purchase.submit', { planId, senderNumber, transactionId });
}

export const listMyPurchaseRequests = (customerId) => callApi('purchase.mine', { customerId });
// Admin: all requests, or only one status (pending, approved, rejected).
export const listAllPurchaseRequests = ({ status } = {}) => callApi('purchase.listAll', { status });

// Admin: confirm a request after checking the bKash payment. Creates the membership and payment record.
export async function approvePurchaseRequest(requestId, note = '') {
  if (!requestId) return invalid('Choose a request first.');
  return callApi('purchase.approve', { requestId, note });
}

// Admin: reject a request with a reason the customer can read.
export async function rejectPurchaseRequest(requestId, reason) {
  if (!requestId) return invalid('Choose a request first.');
  if (!String(reason ?? '').trim()) return invalid('Give a reason for rejecting this request.');
  return callApi('purchase.reject', { requestId, reason });
}

// Moves finished memberships to expired and starts scheduled ones when their date comes.
export const refreshMembershipStatuses = () => callApi('memberships.refresh');
