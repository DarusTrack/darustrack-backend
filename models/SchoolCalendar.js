module.exports = (sequelize, DataTypes) => {
    const SchoolCalendar = sequelize.define('SchoolCalendar', {
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
        event_start: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        event_end: {
            type: DataTypes.DATEONLY
        }
    }, {
        tableName: 'school_calendar',
    });

    return SchoolCalendar;
};
