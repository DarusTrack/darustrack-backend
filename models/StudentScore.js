module.exports = (sequelize, DataTypes) => {
    const StudentScore = sequelize.define('StudentScore', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        student_id: { type: DataTypes.INTEGER, allowNull: false },
        assessment_type_id: { type: DataTypes.INTEGER, allowNull: false },
        score: { type: DataTypes.FLOAT, allowNull: true }
    }, {
        tableName: 'student_scores'
    });

    StudentScore.associate = (models) => {
        StudentScore.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
        StudentScore.belongsTo(models.AssessmentType, { foreignKey: 'assessment_type_id', as: 'assessment_type' });
    };

    return StudentScore;
};