module.exports = (sequelize, DataTypes) => {
    const Evaluation = sequelize.define('Evaluation', {
        id: {
            type: DataTypes.INTEGER,
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            autoIncrement: true
        },
        class_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: 'evaluations',
    });

    Evaluation.associate = (models) => {
        Evaluation.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
        Evaluation.hasMany(models.StudentEvaluation, { foreignKey: 'evaluation_id', as: 'student_evaluation' });
    };

    return Evaluation;
};
