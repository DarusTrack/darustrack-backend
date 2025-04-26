const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const Evaluation = sequelize.define('Evaluation', {
        id: {
            type: DataTypes.STRING(5),
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
            defaultValue: () => nanoid()
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        }   
    }, {
        tableName: 'evaluations',
    });

    Evaluation.associate = (models) => {
        Evaluation.hasMany(models.StudentEvaluation, { foreignKey: 'evaluation_id', as: 'student_evaluation' });
    };

    return Evaluation;
};
