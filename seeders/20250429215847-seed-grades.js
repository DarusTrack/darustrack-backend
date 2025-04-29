'use strict';

const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 5);

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // Ambil data relasional
    const [kelas] = await queryInterface.sequelize.query(
      `SELECT id FROM classes WHERE name = '6E' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const [subject] = await queryInterface.sequelize.query(
      `SELECT id FROM subjects WHERE name = 'Bahasa Arab' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const [semester] = await queryInterface.sequelize.query(
      `SELECT id FROM semesters WHERE name = 'Ganjil' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const categoryId = nanoid();
    const detailId = nanoid();

    // 1. Insert Grade Category
    await queryInterface.bulkInsert('grade_categories', [
      {
        id: categoryId,
        class_id: kelas.id,
        subject_id: subject.id,
        semester_id: semester.id,
        name: 'Asesmen Sumatif Harian',
        createdAt: now,
        updatedAt: now
      }
    ]);

    // 2. Insert Grade Detail
    await queryInterface.bulkInsert('grade_details', [
      {
        id: detailId,
        grade_category_id: categoryId,
        name: 'TP 1',
        date: '2025-04-25',
        createdAt: now,
        updatedAt: now
      }
    ]);

    // 3. Insert Student Grades
    const studentClasses = await queryInterface.sequelize.query(
      `SELECT id FROM student_classes WHERE class_id = '${kelas.id}'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const grades = studentClasses.map(sc => ({
      id: nanoid(),
      student_class_id: sc.id,
      grade_detail_id: detailId,
      score: Math.floor(Math.random() * 41) + 60, // random nilai antara 60-100
      createdAt: now,
      updatedAt: now
    }));

    await queryInterface.bulkInsert('student_grades', grades);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('student_grades', null, {});
    await queryInterface.bulkDelete('grade_details', null, {});
    await queryInterface.bulkDelete('grade_categories', null, {});
  }
};
