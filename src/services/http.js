// Sends grouped calls to the FitTrack server (POST /api).
export async function fittrackApi({ data }) {
  const res = await fetch('/api', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();
}
