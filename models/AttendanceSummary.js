const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const AttendanceSummary = sequelize.define('AttendanceSummary', {
        id: { 
            type: DataTypes.STRING(5), 
            primaryKey: true, 
            allowNull: false,
            defaultValue: () => nanoid() 
        },
        class_id: { type: DataTypes.STRING(5), allowNull: false },
        total_students: { type: DataTypes.INTEGER, allowNull: false },
        total_days: { type: DataTypes.INTEGER, allowNull: false },
        present_percentage: { type: DataTypes.FLOAT, allowNull: false }
    }, {
        tableName: 'attendance_summaries'
    });

    AttendanceSummary.associate = (models) => {
        AttendanceSummary.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
    };

    return AttendanceSummary;
};
