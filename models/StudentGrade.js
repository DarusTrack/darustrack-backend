const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const StudentGrade = sequelize.define('StudentGrade', {
        id: { 
            type: DataTypes.STRING(5), 
            primaryKey: true, 
            allowNull: false, 
            defaultValue: () => nanoid() 
        },
        student_id: { type: DataTypes.STRING(5), allowNull: false },
        grade_detail_id: { type: DataTypes.STRING(5), allowNull: false },
        score: { type: DataTypes.FLOAT, allowNull: true },
    }, {
        tableName: 'student_grades'
    });

    StudentGrade.associate = (models) => {
        StudentGrade.belongsTo(models.Student, { foreignKey: 'student_id', as: 'students' });
        StudentGrade.belongsTo(models.GradeDetail, { foreignKey: 'grade_detail_id', as: 'grade_detail' });
    };

    return StudentGrade;
};
