import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
export let errorCount = new Counter('errors');
export let loginDuration = new Trend('login_duration');
export let classesDuration = new Trend('classes_duration');

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
    http_req_duration: ['p(95)<800'],
    errors: ['rate<0.01'],
    login_duration: ['p(95)<1000'],
    classes_duration: ['p(95)<800'],
  },
};

// Setup login 1x dan share token
export function setup() {
  const loginStart = Date.now();

  const loginRes = http.post(
    'https://darustrack-backend-production.up.railway.app/auth/login',
    JSON.stringify({ email: 'admin@gmail.com', password: 'password123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const loginTime = Date.now() - loginStart;
  loginDuration.add(loginTime);

  if (loginRes.status !== 200) {
    console.error(`❌ Login failed with status ${loginRes.status}`);
    console.error(`Response body: ${loginRes.body}`);
    fail('Login failed, aborting test.');
  }

  const token = loginRes.json('accessToken');
  if (!token) {
    console.error(`❌ Token missing in login response: ${loginRes.body}`);
    fail('Token not found in login response.');
  }

  return { token };
}

// Test utama
export default function (data) {
  const token = data.token;

  const res = http.get('https://darustrack-backend-production.up.railway.app/classes', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  classesDuration.add(res.timings.duration);

  const isSuccessful = check(res, {
    '✅ Classes status is 200': (r) => r.status === 200,
    '✅ Response is array': (r) => Array.isArray(r.json()),
  });

  if (!isSuccessful) {
    errorCount.add(1);
    console.error(`❌ Request failed: status=${res.status}, body=${res.body}`);
  }

  sleep(1);
}