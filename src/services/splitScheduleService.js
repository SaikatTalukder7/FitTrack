import { callApi, invalid } from './apiClient.js';

// Every day of every split's weekly plan.
export const listSplitDays = () => callApi('splitDays.list');

// Saves the full weekly plan in one step. Expects 7 days, with exactly one rest day.
export async function saveSplitSchedule(splitId, days) {
  if (!splitId) return invalid('Choose a workout split first.');
  if (!Array.isArray(days) || days.length !== 7) return invalid('A weekly plan needs 7 days.');
  return callApi('splitDays.save', { splitId, days });
}
