import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = { /* ... (tetap sama) ... */ };

export default function () {
  // 1. Login
  const loginRes = http.post(
    'https://darustrack-backend-production.up.railway.app/auth/login',
    JSON.stringify({ email: 'admin@gmail.com', password: 'password123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  // Cek login dan ambil token
  check(loginRes, { 'login status is 200': (r) => r.status === 200 });
  if (loginRes.status !== 200) return;

  // Pastikan struktur response token benar (sesuai backend)
  let token;
  try {
    const responseBody = loginRes.json();
    token = responseBody.accessToken; // Sesuaikan dengan struktur response
  } catch (e) {
    console.log('Token error:', e);
    return;
  }

  // 2. Request ke endpoint protected
  const apiRes = http.get(
    'https://darustrack-backend-production.up.railway.app/curriculums',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  // Perbaiki check data:
  check(apiRes, {
    'API status is 200': (r) => r.status === 200,
    'Response has data': (r) => {
      const data = r.json();
      // Cek apakah ada properti yang diharapkan (objek)
      return data.name && data.description; // Sesuaikan dengan response
      
      // Jika endpoint harus mengembalikan array:
      // return Array.isArray(data) && data.length > 0;
    },
  });

  sleep(1); // Bisa dikurangi menjadi 0.5-1 untuk beban lebih realistis
}