module.exports = (sequelize, DataTypes) => {
    const Subject = sequelize.define('Subject', {
        id: {
            type: DataTypes.INTEGER,
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: 'subjects',
    });

    Subject.associate = (models) => {
        Subject.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
        Subject.hasMany(models.Achievement, { 
            foreignKey: 'subject_id',
            as: 'achievements'
        });        
    };

    return Subject;
};
