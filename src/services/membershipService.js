// Membership plans and customer memberships.
import { callApi, invalid } from './apiClient.js';

export const listPlans = ({ includeInactive = false } = {}) => callApi('plans.list', { includeInactive });
export const savePlan = (plan) => callApi('plans.save', { plan });
export const deletePlan = (id) => callApi('plans.delete', { id });
export const listMemberships = ({ customerId, status } = {}) => callApi('memberships.list', { customerId, status });

// Returns the new membership ID. The server cancels the customer's previous active membership first.
export async function assignMembership({ customerId, planId, startDate }) {
  if (!customerId || !planId) return invalid('A customer and a plan are required.');
  return callApi('memberships.assign', { customerId, planId, startDate });
}
export const updateMembershipStatus = (id, status) => callApi('memberships.updateStatus', { id, status });
// Returns data = null when the customer has no active membership. That is not an error.
export const getMyMembership = (customerId) => callApi('memberships.mine', { customerId });
