import { check, group } from 'k6';
import http from 'k6/http';

const BASE_URL = 'https://darustrack-backend-production.up.railway.app';
const AUTH_EMAIL = 'admin@gmail.com'; // Ganti dengan email valid
const AUTH_PASSWORD = 'password123';   // Ganti dengan password valid

export function setup() {
  const loginRes = http.post(`${BASE_URL}/auth/login`, {
    email: AUTH_EMAIL,
    password: AUTH_PASSWORD,
  });
  return { token: loginRes.json('accessToken') };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  group('API Stress Test', () => {
    // Uji endpoint yang berat
    check(http.get(`${BASE_URL}/students`, { headers }), {
      'Students OK': (r) => r.status === 200 || r.status === 429, // Handle rate limit
    });

    check(http.get(`${BASE_URL}/teachers`, { headers }), {
      'Teachers OK': (r) => r.status === 200,
    });

    // Concurrent POST/PUT
    const userPayload = JSON.stringify({
      name: "Stress User",
      email: `stress${__VU}@test.com`,
      role: "student",
    });
    check(http.post(`${BASE_URL}/users`, userPayload, { headers }), {
      'Create User OK': (r) => [201, 409].includes(r.status), // Handle duplicate
    });
  });
}

// Konfigurasi Stress Test
export const options = {
  stages: [
    { duration: '1m', target: 200 },  // Langsung ke 200 pengguna
    { duration: '5m', target: 200 },
    { duration: '1m', target: 500 },  // Lonjakan ke 500 pengguna
    { duration: '5m', target: 500 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'],     // Error rate < 10% (toleransi tinggi)
    http_req_duration: ['p(99)<5000'], // 99% request < 5 detik
  },
};