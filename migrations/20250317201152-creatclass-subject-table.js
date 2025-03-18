'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
      await queryInterface.createTable('class_subjects', {
          class_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                  model: 'classes',
                  key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE'
          },
          subject_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                  model: 'subjects',
                  key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE'
          }
      });
  },

  down: async (queryInterface, Sequelize) => {
      await queryInterface.dropTable('class_subjects');
  }
};
