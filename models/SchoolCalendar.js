module.exports = (sequelize, DataTypes) => {
    const SchoolCalendar = sequelize.define('SchoolCalendar', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
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
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        tableName: 'school_calendar',
    });

    return SchoolCalendar;
};
