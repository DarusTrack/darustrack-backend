const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const Class = sequelize.define('Class', {
        id: {
            type: DataTypes.STRING(5),
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
            defaultValue: () => nanoid()
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        grade_level: {
            type: DataTypes.ENUM('1', '2', '3', '4', '5', '6'),
            allowNull: false
        },
        teacher_id: {
            type: DataTypes.STRING(5),
            allowNull: false
        }
    }, {
        tableName: 'classes',
    });

    Class.associate = (models) => {
        Class.belongsTo(models.User, { foreignKey: 'teacher_id', as: 'teacher' });
        Class.hasMany(models.Student, { foreignKey: 'class_id', as: 'students' });
        Class.hasMany(models.Schedule, { foreignKey: 'class_id', as: 'schedule' });
        Class.hasMany(models.GradeCategory, { foreignKey: 'class_id', as: 'grade_category' });
        Class.hasMany(models.Attendance, { foreignKey: 'class_id', as: 'attendance' });
    };

    return Class;
};
