'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('grade_summaries', {
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
      average_score:{
        type: Sequelize.FLOAT,
        allowNull: true
      },
      total_students: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      category_sangat_baik: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      category_baik: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      category_cukup: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      category_kurang: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
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
    await queryInterface.dropTable('grade_summaries');
  }
};