'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('school_calendar', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      event_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      event_start: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      event_end: {
        type: Sequelize.DATEONLY
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
    await queryInterface.dropTable('school_calendar');
  }
};