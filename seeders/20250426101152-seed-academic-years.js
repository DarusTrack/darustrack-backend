'use strict';

const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 5);

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    // Step 1: Generate ID
    const academicYearId = 'AY01';
    const semesterGanjilId = nanoid();
    const semesterGenapId = nanoid();

    // Step 2: Insert Academic Year
    await queryInterface.bulkInsert('academic_years', [
      {
        id: academicYearId,
        year: '2024/2025',
        is_active: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    // Step 3: Insert Semesters
    await queryInterface.bulkInsert('semesters', [
      {
        id: semesterGanjilId,
        name: 'Ganjil',
        academic_year_id: academicYearId,
        is_active: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: semesterGenapId,
        name: 'Genap',
        academic_year_id: academicYearId,
        is_active: false,
        createdAt: now,
        updatedAt: now
      }
    ]);

    // Step 4: Insert Classes (contoh: satu kelas di masing-masing semester)
    await queryInterface.bulkInsert('classes', [
      {
        id: nanoid(),
        name: '6D',
        teacher_id: 'U0003',
        academic_year_id: academicYearId,
        createdAt: now,
        updatedAt: now
      },
      {
        id: nanoid(),
        name: '6E',
        teacher_id: 'U0004',
        academic_year_id: academicYearId,
        createdAt: now,
        updatedAt: now
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    // Hapus dari tabel yang tergantung (classes -> semesters -> academic_years)
    await queryInterface.bulkDelete('classes', null, {});
    await queryInterface.bulkDelete('semesters', { academic_year_id: 'AY01' }, {});
    await queryInterface.bulkDelete('academic_years', { id: 'AY01' }, {});
  }
};
