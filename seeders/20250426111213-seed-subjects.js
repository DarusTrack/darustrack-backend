'use strict';

const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 5);

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('subjects', [
      {
        id: nanoid(),
        name: 'Matematika',
        description: 'Pelajaran tentang berhitung, aljabar, geometri, dan statistika.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: nanoid(),
        name: 'Bahasa Indonesia',
        description: 'Pelajaran tentang bahasa Indonesia, sastra, dan keterampilan berbahasa.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: nanoid(),
        name: 'IPA',
        description: 'Ilmu Pengetahuan Alam: fisika, biologi, kimia dasar.',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('subjects', null, {});
  }
};
