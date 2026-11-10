// Workout splits, routines, sessions, and set logs. Input objects use the same field names as before.
import { callApi, invalid } from './apiClient.js';
import { DEFAULT_REST_HOURS } from '../utils/constants.js';

// ---------- Workout splits ----------
export const listSplits = () => callApi('splits.list');
export const saveSplit = (split) => callApi('splits.save', { split });
export async function deleteSplit(splitId) {
  if (!splitId) return invalid('Choose a workout split first.');
  return callApi('splits.delete', { splitId });
}
export const listSplitExercises = (splitId) => callApi('splits.exercises', { splitId });
export async function setSplitExercises(splitId, items) {
  if (!splitId) return invalid('Choose a workout split first.');
  if (!Array.isArray(items)) return invalid('Split exercises must be a list.');
  return callApi('splits.setExercises', { splitId, items });
}

// ---------- Routines ----------
// Returns data = null when the customer has no active routine. That is not an error.
export const getActiveRoutine = (customerId) => callApi('routines.active', { customerId });
export const listCustomerRoutines = () => callApi('routines.listAll');
export const createRoutine = (input) => callApi('routines.create', { input });
export async function deleteRoutine(routineId) {
  if (!routineId) return invalid('Choose a routine first.');
  return callApi('routines.delete', { routineId });
}
export async function assignRoutine({ customerId, splitId, name }) {
  if (!customerId || !splitId) return invalid('A customer and a workout split are required.');
  return callApi('routines.assign', { customerId, splitId, name: name ?? null });
}
export async function generateRoutine(customerId, { regenerate = false } = {}) {
  if (!customerId) return invalid('A customer is required.');
  return callApi('routines.generate', { customerId, regenerate });
}
export const regenerateRoutine = (customerId) => generateRoutine(customerId, { regenerate: true });
export async function restoreOriginalRoutine(routineId) {
  if (!routineId) return invalid('An active routine is required.');
  return callApi('routines.restore', { routineId });
}
export const updateRoutineExercise = (id, changes) => callApi('routineExercises.update', { id, changes });
export const addRoutineExercise = (input) => callApi('routineExercises.add', { input });
export const removeRoutineExercise = (id) => callApi('routineExercises.remove', { id });

// ---------- Sessions and set logs ----------
export const createSession = (input) => callApi('sessions.create', { input });
export const endSession = (sessionId) => callApi('sessions.end', { sessionId });
export const logSet = (input) => callApi('logs.create', { input });
export const updateWorkoutLog = (logId, changes) => callApi('logs.update', { logId, changes });
export async function listSessionLogs(sessionId) {
  if (!sessionId) return invalid('A workout session is required.');
  return callApi('logs.forSession', { sessionId });
}
// Pass customerId to list one customer's sessions. Omit it (admins only) to list all.
export const listSessions = (customerId, { limit = 20 } = {}) => callApi('sessions.list', { customerId, limit });
export const getRecoveryStatus = (customerId, { restHours = DEFAULT_REST_HOURS } = {}) =>
  callApi('recovery.status', { customerId, restHours });
