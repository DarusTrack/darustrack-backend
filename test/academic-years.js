const axios = require("axios");

// Konfigurasi
const BASE_URL = "https://darustrack-backend-production.up.railway.app";
const REQUEST_COUNT = 5;
const EMAIL = "admin@gmail.com";
const PASSWORD = "password123";

// Variabel untuk menyimpan data testing
let token;
let activeAcademicYearId;
let academicYearId;
let classId;
let semesterId;
let studentId = 1; // Asumsi siswa dengan ID 1 sudah ada
const results = [];

async function login() {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: EMAIL,
    password: PASSWORD,
  });
  token = response.data.accessToken;
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function setupTestData(headers) {
  // Buat tahun ajaran aktif
  const year = new Date().getFullYear();
  const academicYearRes = await axios.post(
    `${BASE_URL}/academic-years`,
    { year, is_active: true },
    headers
  );
  activeAcademicYearId = academicYearRes.data.data.id;

  // Buat semester
  const semesterRes = await axios.get(
    `${BASE_URL}/academic-years/${activeAcademicYearId}`,
    headers
  );
  semesterId = semesterRes.data.semester[0].id;

  // Buat tahun ajaran non-aktif untuk testing
  const academicYearRes2 = await axios.post(
    `${BASE_URL}/academic-years`,
    { year: year - 1, is_active: false },
    headers
  );
  academicYearId = academicYearRes2.data.data.id;

  // Buat kelas
  const classRes = await axios.post(
    `${BASE_URL}/academic-years/${academicYearId}/classes`,
    { name: "1A", teacher_id: 1 },
    headers
  );
  classId = classRes.data.id;

  // Tambahkan siswa ke kelas
  await axios.post(
    `${BASE_URL}/academic-years/${academicYearId}/classes/${classId}/students`,
    { studentIds: [studentId] },
    headers
  );
}

async function cleanupTestData(headers) {
  await axios.delete(
    `${BASE_URL}/academic-years/classes/${classId}`,
    headers
  );
  await axios.delete(
    `${BASE_URL}/academic-years/${academicYearId}`,
    headers
  );
}

async function testEndpoint(name, method, url, data = null, headers = {}) {
  let totalTime = 0;

  for (let i = 0; i < REQUEST_COUNT; i++) {
    const start = Date.now();
    try {
      const config = {
        method,
        url: BASE_URL + url,
        data: typeof data === "function" ? data() : data,
        headers,
      };

      await axios(config);
      const duration = Date.now() - start;
      totalTime += duration;
    } catch (error) {
      const duration = Date.now() - start;
      totalTime += duration;
    }
  }

  const average = totalTime / REQUEST_COUNT;
  results.push({
    Endpoint: url,
    Method: method.toUpperCase(),
    "Rata-rata (ms)": average.toFixed(2),
  });
}

async function runTests() {
  try {
    const { headers } = await login();
    await setupTestData(headers);

    // Auth endpoints
    await testEndpoint("Login", "post", "/auth/login", {
      email: EMAIL,
      password: PASSWORD,
    });
    
    await testEndpoint("Get Profile", "get", "/auth/profile", null, headers);

    // Academic Year endpoints
    await testEndpoint(
      "GET Academic Years",
      "get",
      "/academic-years",
      null,
      headers
    );

    await testEndpoint(
      "POST Academic Year",
      "post",
      "/academic-years",
      () => ({
        year: new Date().getFullYear() + Math.floor(Math.random() * 1000),
        is_active: false,
      }),
      headers
    );

    await testEndpoint(
      "PUT Academic Year",
      "put",
      `/academic-years/${academicYearId}`,
      { year: 1999 },
      headers
    );

    // Semester endpoints
    await testEndpoint(
      "PUT Semester",
      "put",
      `/academic-years/semester/${semesterId}`,
      { is_active: true },
      headers
    );

    // Class endpoints
    await testEndpoint(
      "GET Classes",
      "get",
      `/academic-years/${academicYearId}/classes`,
      null,
      headers
    );

    await testEndpoint(
      "POST Class",
      "post",
      `/academic-years/${academicYearId}/classes`,
      { name: "1B", teacher_id: 1 },
      headers
    );

    await testEndpoint(
      "PUT Class",
      "put",
      `/academic-years/classes/${classId}`,
      { name: "1A Updated" },
      headers
    );

    // Student endpoints
    await testEndpoint(
      "GET Students",
      "get",
      `/academic-years/${academicYearId}/classes/${classId}/students`,
      null,
      headers
    );

    await testEndpoint(
      "POST Students",
      "post",
      `/academic-years/${academicYearId}/classes/${classId}/students`,
      { studentIds: [studentId] },
      headers
    );

    await cleanupTestData(headers);
    
    console.table(results);
  } catch (error) {
    console.error("Error during testing:", error.message);
  }
}

runTests();