'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'class_id', {
      type: Sequelize.STRING(5),
      allowNull: true,
      references: {
        model: 'classes',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'class_id');
  }
};