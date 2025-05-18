import { check, group, sleep } from 'k6';
import http from 'k6/http';

const BASE_URL = 'https://darustrack-backend-production.up.railway.app';
const AUTH_EMAIL = 'user@example.com'; // Ganti dengan email valid
const AUTH_PASSWORD = 'password123';   // Ganti dengan password valid

// Ambil token auth terlebih dahulu (setup awal)
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

  // Test endpoint secara paralel dengan grup
  group('API Load Test', () => {
    // Endpoint tanpa cache
    check(http.get(`${BASE_URL}/academic-years`, { headers }), {
      'Academic Years OK': (r) => r.status === 200,
    });

    check(http.get(`${BASE_URL}/semesters`, { headers }), {
      'Semesters OK': (r) => r.status === 200,
    });

    // Endpoint dengan cache 2 menit
    check(http.get(`${BASE_URL}/classes`, { headers }), {
      'Classes (Cached) OK': (r) => r.status === 200,
    });

    // Endpoint dengan write operation (POST)
    const curriculumPayload = JSON.stringify({
      name: "Test Curriculum",
      year: 2023,
    });
    check(http.post(`${BASE_URL}/curriculums`, curriculumPayload, { headers }), {
      'Create Curriculum OK': (r) => r.status === 201,
    });

    // Delay antara request
    sleep(1);
  });
}

// Konfigurasi Load Test
export const options = {
  stages: [
    { duration: '2m', target: 50 },  // Ramp-up ke 50 pengguna
    { duration: '5m', target: 50 },  // Pertahankan 50 pengguna
    { duration: '2m', target: 100 }, // Naikkan ke 100 pengguna
    { duration: '5m', target: 100 }, // Pertahankan 100 pengguna
    { duration: '2m', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
    http_req_duration: ['p(95)<2000'], // 95% request < 2 detik
  },
};