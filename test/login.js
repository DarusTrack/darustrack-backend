import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// Custom metrics
export let errorCount = new Counter('errors');
export let loginDuration = new Trend('login_duration');

// Ambil mode dari environment (default: load)
const mode = __ENV.MODE || 'load';

// Konfigurasi skenario dinamis berdasarkan mode
let scenarioConfig = {};

if (mode === 'load') {
  scenarioConfig = {
    vus: 10,
    duration: '1m',
  };
} else if (mode === 'stress') {
  scenarioConfig = {
    stages: [
      { duration: '1m', target: 10 },
      { duration: '1m', target: 50 },
      { duration: '1m', target: 100 },
      { duration: '1m', target: 200 },
      { duration: '1m', target: 0 },
    ],
  };
} else if (mode === 'spike') {
  scenarioConfig = {
    stages: [
      { duration: '10s', target: 10 },
      { duration: '10s', target: 200 },
      { duration: '20s', target: 200 },
      { duration: '10s', target: 0 },
    ],
  };
} else if (mode === 'soak') {
  scenarioConfig = {
    vus: 20,
    duration: '10m',
  };
}

// Threshold dan konfigurasi akhir
export let options = {
  ...scenarioConfig,
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    errors: ['rate<0.01']
  },
};

export default function () {
  const start = Date.now();

  const res = http.post(
    'https://darustrack-backend-production.up.railway.app/auth/login',
    JSON.stringify({ email: 'admin@gmail.com', password: 'password123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  loginDuration.add(Date.now() - start);

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'contains token': (r) => !!r.json('accessToken'),
  });

  if (!ok) {
    errorCount.add(1);
    console.error(`Login failed: status=${res.status}, body=${res.body}`);
  }

  sleep(1);
}