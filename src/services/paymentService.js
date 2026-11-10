// Payment records. Admins record and update payments; customers read only their own.
import { callApi } from './apiClient.js';

export const listPayments = ({ customerId, status } = {}) => callApi('payments.list', { customerId, status });
export const recordPayment = (input) => callApi('payments.record', { input });
export const updatePaymentStatus = (id, status, { paidAt } = {}) => callApi('payments.updateStatus', { id, status, paidAt });
export const listMyPayments = (customerId) => callApi('payments.mine', { customerId });
// Returns { items, total } for all pending and overdue payments, oldest due date first.
export const getOutstandingDues = () => callApi('payments.outstanding');
