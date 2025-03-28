'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('assessment_types', {
      id: {
        type: Sequelize.INTEGER,
        // defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        autoIncrement: true
      },
      assessment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'assessments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      date: {
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
    await queryInterface.dropTable('assessment_types');
  }
};