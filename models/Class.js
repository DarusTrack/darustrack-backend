module.exports = (sequelize, DataTypes) => {
    const Class = sequelize.define('Class', {
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
        grade_level: {
            type: DataTypes.ENUM('1', '2', '3', '4', '5', '6'),
            allowNull: false
        },
        teacher_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'classes',
    });

    Class.associate = (models) => {
        Class.belongsTo(models.User, { foreignKey: 'teacher_id', as: 'teacher' });
        Class.hasMany(models.Student, { foreignKey: 'class_id', as: 'students' });
    };

    return Class;
};
