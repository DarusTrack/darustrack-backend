const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const Student = sequelize.define('Student', {
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
        nisn: {
            type: DataTypes.STRING,
            allowNull: false
        },
        birth_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        class_id: {
            type: DataTypes.STRING(5),
            allowNull: false
        },
        parent_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'students',
    });

    Student.associate = (models) => {
        Student.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
        Student.belongsTo(models.User, { foreignKey: 'parent_id', as: 'parent' });
        Student.hasMany(models.Attendance, { foreignKey: 'student_id', as: 'attendance' });
        Student.hasMany(models.StudentEvaluation, { foreignKey: 'student_id', as: 'student_evaluation' });
        Student.hasMany(models.StudentScore, { foreignKey: 'student_id', as: 'student_scores' });
        // Student.hasMany(models.Evaluation, { foreignKey: 'student_id', as: 'evaluations' });
    };

    return Student;
};
