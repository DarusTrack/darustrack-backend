module.exports = {
  up: async (queryInterface, Sequelize) => {
      await queryInterface.createTable('student_evaluations', {
          id: { 
            type: Sequelize.INTEGER, 
            autoIncrement: true, 
            primaryKey: true 
          },
          evaluation_id: { 
            type: Sequelize.INTEGER, 
            allowNull: false, 
            references: { 
              model: 'evaluations', 
              key: 'id' 
            }, 
            onDelete: 'CASCADE' 
          },
          student_id: { 
            type: Sequelize.INTEGER, 
            allowNull: false, 
            references: { 
              model: 'students', 
              key: 'id' 
            }, 
              onDelete: 'CASCADE' 
          },
          description: { 
            type: Sequelize.TEXT, 
            allowNull: true 
          }, // Null saat pertama kali dibuat
          createdAt: Sequelize.DATE,
          updatedAt: Sequelize.DATE
      });
  },
  down: async (queryInterface, Sequelize) => {
      await queryInterface.dropTable('student_evaluations');
  }
};

