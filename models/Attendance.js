module.exports = (sequelize, DataTypes) => {
    const Attendance = sequelize.define('Attendance', {
        id: {
            type: DataTypes.INTEGER,
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            autoIncrement: true
        },
        student_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        class_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('Hadir', 'Izin', 'Sakit', 'Alpha'),
            allowNull: true
        }
    }, {
        tableName: 'attendances',
    });

    Attendance.associate = (models) => {
        Attendance.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
        Attendance.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
    };

    return Attendance;
};
