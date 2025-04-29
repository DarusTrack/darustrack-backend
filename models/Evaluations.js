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
        },
        class_id: {
            type: DataTypes.STRING(5),
            allowNull: false
        },   
        semester_id: {
            type: DataTypes.STRING(5),
            allowNull: false
        }   
    }, {
        tableName: 'evaluations',
    });

    Evaluation.associate = (models) => {
        Evaluation.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
        Evaluation.belongsTo(models.Semester, { foreignKey: 'semester_id', as: 'semester' });
        Evaluation.hasMany(models.StudentEvaluation, { foreignKey: 'evaluation_id', as: 'student_evaluations' });
    };

    Evaluation.addHook('afterCreate', async (evaluation, options) => {
        const { StudentClass } = sequelize.models;
        const studentClasses = await StudentClass.findAll({
            where: { class_id: evaluation.class_id }
        });
    
        const evaluations = studentClasses.map(sc => ({
            evaluation_id: evaluation.id,
            student_class_id: sc.id,
            description: null
        }));
    
        await sequelize.models.StudentEvaluation.bulkCreate(evaluations);
    });
    
    return Evaluation;
};
