'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('student_scores', {
      id: {
        type: Sequelize.INTEGER,
        // defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        autoIncrement: true
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      assessment_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'assessment_types',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      score: {
        type: Sequelize.FLOAT,
        allowNull: true
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
    await queryInterface.dropTable('student_scores');
  }
};