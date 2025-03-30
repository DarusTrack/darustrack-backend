const { nanoid } = require('nanoid');

module.exports = (sequelize, DataTypes) => {
    const Subject = sequelize.define('Subject', {
        id: {
            type: DataTypes.STRING(5),
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
            defaultValue: () => nanoid(5)
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
    }, {
        tableName: 'subjects',
    });

    Subject.associate = (models) => {
        Subject.hasMany(models.LearningOutcome, { foreignKey: 'subject_id' });
        Subject.hasMany(models.Schedule, { foreignKey: 'subject_id', as: 'schedule' });
        Subject.hasMany(models.Grade, { foreignKey: 'subject_id', as: 'grades' });
    };

    return Subject;
};
