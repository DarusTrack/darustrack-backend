'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('attendance_summaries', {
      id: {
        type: Sequelize.STRING(5),
        // defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      class_id: {
        type: Sequelize.STRING(5),
        allowNull: false,
        references: {
          model: 'classes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      total_students: { type: Sequelize.INTEGER, allowNull: false },
      total_days: { type: Sequelize.INTEGER, allowNull: false },
      present_percentage: { type: Sequelize.FLOAT, allowNull: false },
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
    await queryInterface.dropTable('attendance_summaries');
  }
};