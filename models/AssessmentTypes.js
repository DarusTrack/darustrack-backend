const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const AssessmentType = sequelize.define('AssessmentType', {
        id: {
            type: DataTypes.STRING(5),
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
            defaultValue: () => nanoid()
        },
        assessment_id: {
            type: DataTypes.STRING(5),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        date: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'assessment_types',
        indexes: [
            {
                unique: true,
                fields: ['assessment_id', 'name'] // Unik dalam satu assessment
            }
        ]
    });

    AssessmentType.associate = (models) => {
        AssessmentType.belongsTo(models.Assessment, { foreignKey: 'assessment_id', as: 'assessment' });
        AssessmentType.hasMany(models.StudentScore, { foreignKey: 'assessment_type_id', as: 'student_scores' });
    };

    return AssessmentType;
};