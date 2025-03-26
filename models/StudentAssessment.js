module.exports = (sequelize, DataTypes) => {
    const StudentAssessment = sequelize.define('StudentAssessment', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        student_id: { type: DataTypes.INTEGER, allowNull: false },
        type_id: { type: DataTypes.INTEGER, allowNull: false },
        score: { type: DataTypes.FLOAT, allowNull: true }
    }, {
        tableName: 'student_assessments'
    });

    StudentAssessment.associate = (models) => {
        StudentAssessment.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
        StudentAssessment.belongsTo(models.AssessmentType, { foreignKey: 'type_id', as: 'assessment_type' });
    };

    return StudentAssessment;
};