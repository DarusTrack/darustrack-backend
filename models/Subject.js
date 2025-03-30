const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const Subject = sequelize.define('Subject', {
        id: {
            type: DataTypes.STRING(5),
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
            defaultValue: () => nanoid()
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
        Subject.hasMany(models.GradeCategory, { foreignKey: 'subject_id', as: 'grade_category' });
    };

    return Subject;
};
