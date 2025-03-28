module.exports = (sequelize, DataTypes) => {
    const AssessmentType = sequelize.define('AssessmentType', {
        id: {
            type: DataTypes.INTEGER,
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            autoIncrement: true
        },
        assessment_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        date: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'assessment_types',
    });

    AssessmentType.associate = (models) => {
        AssessmentType.belongsTo(models.Assessment, { foreignKey: 'assessment_id', as: 'assessment' });
        AssessmentType.hasMany(models.StudentScore, { foreignKey: 'assessment_type_id', as: 'student_scores' });
    };

    return AssessmentType;
};