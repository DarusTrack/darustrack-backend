const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const Attendance = sequelize.define('Attendance', {
        id: {
            type: DataTypes.STRING(5),
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
            defaultValue: () => nanoid()
        },
        student_id: {
            type: DataTypes.STRING(5),
            allowNull: false
        },
        class_id: {
            type: DataTypes.STRING(5),
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
