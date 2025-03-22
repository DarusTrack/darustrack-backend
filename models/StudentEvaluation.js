module.exports = (sequelize, DataTypes) => {
    const StudentEvaluation = sequelize.define('StudentEvaluation', {
        id: { 
            type: DataTypes.INTEGER, 
            autoIncrement: true, 
            primaryKey: true 
        },
        evaluation_id: { 
            type: DataTypes.INTEGER, 
            allowNull: false 
        },
        student_id: { 
            type: DataTypes.INTEGER, 
            allowNull: false 
        },
        description: { 
            type: DataTypes.TEXT, 
            allowNull: true 
        }
    }, {
        tableName: 'student_evaluations'
    });

    StudentEvaluation.associate = models => {
        StudentEvaluation.belongsTo(models.Evaluation, { foreignKey: 'evaluation_id' });
        StudentEvaluation.belongsTo(models.Student, { foreignKey: 'student_id' });
    };

    return StudentEvaluation;
};
