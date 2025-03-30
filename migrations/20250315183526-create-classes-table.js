'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('classes', {
      id: {
        type: Sequelize.STRING(5),
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      grade_level: {
        type: Sequelize.ENUM('1', '2', '3', '4','5', '6'),
        allowNull: false
      },
      teacher_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
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
    await queryInterface.dropTable('classes');
  }
};
