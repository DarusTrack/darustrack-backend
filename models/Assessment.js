const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const Assessment = sequelize.define('Assessment', {
        id: {
            type: DataTypes.STRING(5),
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
            defaultValue: () => nanoid()
        },
        grade_id: {
            type: DataTypes.STRING(5),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
    }, {
        tableName: 'assessments',
        indexes: [
            {
                unique: true,
                fields: ['grade_id', 'name'] // Unik dalam satu grade
            }
        ]
    });

    Assessment.associate = (models) => {
        Assessment.belongsTo(models.Grade, { foreignKey: 'grade_id', as: 'grade' });
        Assessment.hasOne(models.AssessmentType, { foreignKey: 'assessment_id', as: 'assessment_type' });
    };

    return Assessment;
};

