// Attendance. Check-in needs an active membership that covers today (checked on the server).
import { callApi, invalid } from './apiClient.js';
import { ok } from './serviceResult.js';

// The date is set by the server, so client time zones cannot cause a mismatch.
export async function checkIn(customerId) {
  if (!customerId) return invalid('A customer is required.');
  return callApi('attendance.checkIn', { customerId });
}

export const listAttendance = ({ customerId, fromDate, toDate } = {}) =>
  callApi('attendance.list', { customerId, fromDate, toDate });

export async function deleteAttendance(attendanceId) {
  if (!attendanceId) return invalid('Choose an attendance record first.');
  return callApi('attendance.delete', { attendanceId });
}

export async function getAttendanceSummary(customerId, range = {}) {
  const result = await listAttendance({ customerId, ...range });
  if (result.error) return result;
  const rows = result.data ?? [];
  return ok({ total: rows.length, lastCheckIn: rows[0]?.check_date ?? null });
}
