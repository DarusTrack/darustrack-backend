import http from 'k6/http';

export default function () {
  const url = 'https://darustrack-backend-production.up.railway.app/auth/login';
  const payload = JSON.stringify({
    email: 'admin@gmail.com',
    password: 'password123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(url, payload, params);
  console.log(`Status: ${response.status}, Response Time: ${response.timings.duration}ms`);
}