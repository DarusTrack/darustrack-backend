module.exports = (sequelize, DataTypes) => {
    const LearningOutcome = sequelize.define('LearningOutcome', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        subject_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        grade_level: {
            type: DataTypes.ENUM('1', '2', '3', '4', '5', '6'),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
    }, {
        tableName: 'learning_outcomes',
    });

    LearningOutcome.associate = (models) => {
        LearningOutcome.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
    };

    return LearningOutcome;
};
