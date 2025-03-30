'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('learning_outcomes', {
      id: {
        type: Sequelize.STRING(5),
        primaryKey: true,
        allowNull: false
      },
      subject_id: {
        type: Sequelize.STRING(5),
        allowNull: false,
        references: {
          model: 'subjects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      grade_level: {
        type: Sequelize.ENUM('1', '2', '3', '4', '5', '6'),
        allowNull: false
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('learning_outcomes');
  }
};