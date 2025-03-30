const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const Evaluation = sequelize.define('Evaluation', {
        id: {
            type: DataTypes.STRING(5),
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
            defaultValue: () => nanoid()
        },
        class_id: {
            type: DataTypes.STRING(5),
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
