module.exports = (sequelize, DataTypes) => {
    const AcademicCalendar = sequelize.define('AcademicCalendar', {
        id: {
            type: DataTypes.INTEGER,
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            autoIncrement: true
        },
        event_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        end_date: {
            type: DataTypes.DATEONLY
        }
    }, {
        tableName: 'academic_calendar',
    });

    return AcademicCalendar;
};
