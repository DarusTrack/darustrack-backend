module.exports = (sequelize, DataTypes) => {
    const Student = sequelize.define('Student', {
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
        nisn: {
            type: DataTypes.STRING,
            allowNull: false
        },
        birth_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        class_id: {
            type: DataTypes.INTEGER,
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
        Student.hasMany(models.Attendance, { foreignKey: 'student_id', as: 'attendances' });
        Student.hasMany(models.Evaluation, { foreignKey: 'student_id', as: 'evaluations' });
    };

    return Student;
};
