// Gym equipment and exercise compatibility.
import { callApi, invalid } from './apiClient.js';

export const listEquipment = ({ status, search } = {}) => callApi('equipment.list', { status, search });
export const createEquipment = (input) => callApi('equipment.create', { input });
export const updateEquipment = (id, changes) => callApi('equipment.update', { id, changes });
export const setEquipmentStatus = (id, status) => callApi('equipment.setStatus', { id, status });
export const deleteEquipment = (id) => callApi('equipment.delete', { id });
export const listExerciseEquipment = (exerciseId) => callApi('equipment.forExercise', { exerciseId });

export async function setExerciseEquipment(exerciseId, equipmentIds) {
  if (!exerciseId) return invalid('Choose an exercise first.');
  if (!Array.isArray(equipmentIds)) return invalid('Equipment must be a list of IDs.');
  return callApi('equipment.setForExercise', { exerciseId, equipmentIds });
}

export async function getExerciseAlternatives(exerciseId) {
  if (!exerciseId) return invalid('Choose an exercise first.');
  return callApi('equipment.alternatives', { exerciseId });
}
