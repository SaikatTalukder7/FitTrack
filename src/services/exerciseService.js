// Exercise library. Reads for every signed-in user; changes for admins only (checked on the server).
import { callApi } from './apiClient.js';

export const listExercises = ({ muscleGroup, search, includeInactive = false } = {}) =>
  callApi('exercises.list', { muscleGroup, search, includeInactive });
export const getExercise = (id) => callApi('exercises.get', { id });
export const createExercise = (input) => callApi('exercises.create', { input });
export const updateExercise = (id, changes) => callApi('exercises.update', { id, changes });
export const deleteExercise = (id) => callApi('exercises.delete', { id });
