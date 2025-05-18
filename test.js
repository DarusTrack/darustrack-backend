import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metric
export let errorCount = new Counter('errors');
export let loginDuration = new Trend('login_duration');
export let classesDuration = new Trend('classes_duration');

export let options = {
  vus: 10,
  duration: '50s',
  thresholds: {
    errors: ['rate<0.01'], // Maks 1% error
    http_req_duration: ['p(95)<800'], // 95% request harus <800ms
    login_duration: ['p(95)<1000'], // Login maksimal 1 detik
    classes_duration: ['p(95)<800'], // Endpoint classes juga <800ms
  },
};

export default function () {
  // 1. Login
  const loginRes = http.post(
    'https://darustrack-backend-production.up.railway.app/auth/login',
    JSON.stringify({ email: 'admin@gmail.com', password: 'password123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  loginDuration.add(loginRes.timings.duration);

  const loginCheck = check(loginRes, {
    'Login status is 200': (r) => r.status === 200,
    'Login returns token': (r) => !!r.json('accessToken'),
  });

  if (!loginCheck) {
    errorCount.add(1);
    return; // Skip jika login gagal
  }

  const token = loginRes.json('accessToken');

  // 2. Akses endpoint /classes
  const apiRes = http.get(
    'https://darustrack-backend-production.up.railway.app/classes',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  classesDuration.add(apiRes.timings.duration); 

  const apiCheck = check(apiRes, {
    'Classes status is 200': (r) => r.status === 200,
    'Response has array of data': (r) => {
      const data = r.json();
      return Array.isArray(data); // Tidak harus ada isi, bisa kosong tapi valid
    },
  });

  if (!apiCheck) {
    errorCount.add(1);
  }

  sleep(1); // Simulasi jeda antar user
}
