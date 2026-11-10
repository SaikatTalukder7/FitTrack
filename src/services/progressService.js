import { callApi } from './apiClient.js';

export const addMeasurement = (input) => callApi('measurements.add', { input });
export const listMeasurements = (customerId, { fromDate, toDate } = {}) =>
  callApi('measurements.list', { customerId, fromDate, toDate });
export const getExercisePerformance = (customerId, { exerciseId, limit = 100 } = {}) =>
  callApi('progress.performance', { customerId, exerciseId, limit });
export const getProgressSeries = (customerId, metric = 'body_weight_kg') =>
  callApi('progress.series', { customerId, metric });
