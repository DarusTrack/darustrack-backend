const { nanoid } = require('nanoid');

module.exports = (sequelize, DataTypes) => {
    const StudentScore = sequelize.define('StudentScore', {
        id: { 
            type: DataTypes.STRING(5), 
            primaryKey: true, 
            allowNull: false, 
            defaultValue: () => nanoid(5) 
        },
        student_id: { type: DataTypes.STRING(5), allowNull: false },
        class_id: { type: DataTypes.STRING(5), allowNull: false },
        subject_id: { type: DataTypes.STRING(5), allowNull: false },
        assessment_type_id: { type: DataTypes.STRING(5), allowNull: false },
        score: { type: DataTypes.FLOAT, allowNull: true },
    }, {
        tableName: 'student_scores'
    });

    StudentScore.associate = (models) => {
        StudentScore.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
        StudentScore.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
        StudentScore.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
        StudentScore.belongsTo(models.AssessmentType, { foreignKey: 'assessment_type_id', as: 'assessment_type' });
    };

    return StudentScore;
};
