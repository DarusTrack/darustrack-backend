module.exports = (sequelize, DataTypes) => {
    const Grade = sequelize.define('Grade', {
        id: {
            type: DataTypes.INTEGER,
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            autoIncrement: true
        },
        class_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        subject_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'grades',
    });

    Grade.associate = (models) => {
        Grade.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
        Grade.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
        Grade.hasMany(models.AssessmentType, { foreignKey: 'grade_id', as: 'assessment_type' });
    };

    return Grade;
};
