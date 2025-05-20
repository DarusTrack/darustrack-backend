const axios = require("axios");

// Konfigurasi
const BASE_URL = "https://darustrack-backend-production.up.railway.app";
const REQUEST_COUNT = 5;
const EMAIL = "admin@gmail.com";
const PASSWORD = "password123";

// Simpan hasil
const results = [];

async function testEndpoint(name, method, url, data = null, headers = {}) {
  let totalTime = 0;

  for (let i = 1; i <= REQUEST_COUNT; i++) {
    const start = Date.now();
    try {
      const config = {
        method,
        url: BASE_URL + url,
        data,
        headers,
      };

      const response = await axios(config);
      const duration = Date.now() - start;
      console.log(`${method.toUpperCase()} ${url} | Request ${i}: ${duration} ms (Status: ${response.status})`);
      totalTime += duration;
    } catch (error) {
      const duration = Date.now() - start;
      console.log(`${method.toUpperCase()} ${url} | Request ${i}: ${duration} ms (Error: ${error.response?.status || error.message})`);
      totalTime += duration;
    }
  }

  const average = totalTime / REQUEST_COUNT;
  results.push({ Endpoint: url, Method: method.toUpperCase(), Average: `${average.toFixed(2)} ms` });
}

// Jalankan semua pengujian
async function runTests() {
  // Login untuk mendapatkan token
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email: EMAIL, password: PASSWORD });
  const token = loginRes.data.accessToken;

  await testEndpoint("Login", "post", "/auth/login", { email: EMAIL, password: PASSWORD });
  await testEndpoint("Refresh Token", "post", "/auth/refresh-token", null, {
    Cookie: loginRes.headers["set-cookie"].join("; "),
  });
  await testEndpoint("Get Profile", "get", "/auth/profile", null, {
    Authorization: `Bearer ${token}`,
  });
  await testEndpoint("Update Profile", "put", "/auth/profile", {
    name: "Admin Test",
    email: EMAIL,
    password: PASSWORD,
  }, {
    Authorization: `Bearer ${token}`,
  });
  await testEndpoint("Logout", "post", "/auth/logout");

  // Cetak hasil dalam tabel
  console.log("\n📊 Hasil Rata-rata Waktu Respons:\n");
  console.table(results);
}

runTests();
