const { nanoid } = require('nanoid');

module.exports = (sequelize, DataTypes) => {
    const GradeSummary = sequelize.define('GradeSummary', {
        id: { type: DataTypes.STRING(5), primaryKey: true, allowNull: false, defaultValue: () => nanoid(5) },
        class_id: { type: DataTypes.STRING(5), allowNull: false },
        subject_id: { type: DataTypes.STRING(5), allowNull: false },
        average_score: { type: DataTypes.FLOAT, allowNull: true },
        total_students: { type: DataTypes.INTEGER, allowNull: false },
        category_sangat_baik: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        category_baik: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        category_cukup: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        category_kurang: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
    }, {
        tableName: 'grade_summaries'
    });

    GradeSummary.associate = (models) => {
        GradeSummary.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
        GradeSummary.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
    };

    return GradeSummary;
};