'use strict';

const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 5);

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('students', [
      {
        id: nanoid(),
        name: 'Atthar',
        nisn: '3438478',
        birth_date: '2013-05-12',
        parent_id: 'U0004',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('students', null, {});
  }
};
