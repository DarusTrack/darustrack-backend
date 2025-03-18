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
        learning_goals: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'subjects',
    });

    Subject.associate = (models) => {
        Subject.hasMany(models.Grade, { foreignKey: 'subject_id', as: 'grades' });
        Subject.hasMany(models.Schedule, { foreignKey: 'subject_id', as: 'schedules' });
        Subject.belongsToMany(models.Class, {
            through: 'ClassSubject',
            foreignKey: 'subject_id',
            as: 'classes'
        });
    };

    return Subject;
};
