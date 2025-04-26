const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const StudentClass = sequelize.define('StudentClass', {
        id: {
            type: DataTypes.STRING(5),
            primaryKey: true,
            defaultValue: () => nanoid()
        },
        student_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        class_id: {
            type: DataTypes.STRING,
            allowNull: false,
        }
    }, {
        tableName: 'student_classes'
    });
  
    StudentClass.associate = (models) => {
        StudentClass.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' }); // tambah alias student
        StudentClass.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
    
        StudentClass.hasMany(models.GradeCategory, { foreignKey: 'student_class_id' });
        StudentClass.hasMany(models.Evaluation, { foreignKey: 'student_class_id' });
        StudentClass.hasMany(models.Attendance, { foreignKey: 'student_class_id', as: 'attendances' }); // kasih as attendances
    };
    
    return StudentClass;
};
  