module.exports = (sequelize, DataTypes) => {
    const Subject = sequelize.define('Subject', {
        id: {
            type: DataTypes.INTEGER,
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
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
        Subject.hasMany(models.LearningOutcome, { foreignKey: 'subject_id', as: 'learning_outcome' });
        Subject.hasMany(models.Schedule, { foreignKey: 'subject_id', as: 'schedule' });
        Subject.hasMany(models.Grade, { foreignKey: 'subject_id', as: 'grade' });
    };

    return Subject;
};
