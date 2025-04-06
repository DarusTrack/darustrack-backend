const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const StudentEvaluation = sequelize.define('StudentEvaluation', {
        id: { 
            type: DataTypes.STRING(5), 
            primaryKey: true, 
            allowNull: false,
            defaultValue: () => nanoid() 
        },
        evaluation_id: { 
            type: DataTypes.STRING(5), 
            allowNull: false 
        },
        student_id: { 
            type: DataTypes.STRING(5), 
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
        StudentEvaluation.belongsTo(models.Evaluation, { foreignKey: 'evaluation_id', as: 'evaluation' });
        StudentEvaluation.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
    };

    return StudentEvaluation;
};
