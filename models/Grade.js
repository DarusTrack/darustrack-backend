const { nanoid } = require('nanoid');

module.exports = (sequelize, DataTypes) => {
    const Grade = sequelize.define('Grade', {
        id: {
            type: DataTypes.STRING(5),
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
            defaultValue: () => nanoid(5)
        },
        class_id: {
            type: DataTypes.STRING(5),
            allowNull: false
        },
        subject_id: {
            type: DataTypes.STRING(5),
            allowNull: false
        }
    }, {
        tableName: 'grades',
    });

    Grade.associate = (models) => {
        Grade.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
        Grade.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
        Grade.hasMany(models.Assessment, { foreignKey: 'grade_id', as: 'assessments' });
    };

    return Grade;
};
