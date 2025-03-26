module.exports = (sequelize, DataTypes) => {
    const AssessmentType = sequelize.define('AssessmentType', {
        id: {
            type: DataTypes.INTEGER,
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            autoIncrement: true
        },
        grade_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        assessment_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    }, {
        tableName: 'assessment_types',
    });

    AssessmentType.associate = (models) => {
        AssessmentType.belongsTo(models.Grade, { foreignKey: 'grade_id', as: 'grade' });
        AssessmentType.belongsTo(models.Assessment, { foreignKey: 'assessment_id', as: 'assessment' });
        AssessmentType.hasMany(models.StudentAssessment, { foreignKey: 'type_id', as: 'student_assessment' });
    };

    return AssessmentType;
};
