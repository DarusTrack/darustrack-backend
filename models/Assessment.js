module.exports = (sequelize, DataTypes) => {
    const Assessment = sequelize.define('Assessment', {
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
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
    }, {
        tableName: 'assessments',
    });

    Assessment.associate = (models) => {
        Assessment.belongsTo(models.Grade, { foreignKey: 'grade_id', as: 'grade' });
        Assessment.hasOne(models.AssessmentType, { foreignKey: 'assessment_id', as: 'assessment_type' });
    };

    return Assessment;
};

