module.exports = (sequelize, DataTypes) => {
    const Evaluation = sequelize.define('Evaluation', {
        id: {
            type: DataTypes.INTEGER,
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: 'evaluations',
    });

    Evaluation.associate = (models) => {
        // Evaluation.belongsTo(models.Class, { foreignKey: 'class_id' });
        Evaluation.hasMany(models.StudentEvaluation, { foreignKey: 'evaluation_id' });
    };

    return Evaluation;
};
