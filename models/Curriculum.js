module.exports = (sequelize, DataTypes) => {
    const Curriculum = sequelize.define('Curriculum', {
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
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'curriculums',
    });
    
    return Curriculum;
}