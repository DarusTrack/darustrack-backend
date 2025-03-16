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
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('Hadir', 'Izin', 'Sakit', 'Alpha'),
            allowNull: false
        }
    }, {
        tableName: 'attendances',
    });

    Attendance.associate = (models) => {
        Attendance.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
    };

    return Attendance;
};
