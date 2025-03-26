module.exports = (sequelize, DataTypes) => {
    const Assessment = sequelize.define('Assessment', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false, unique: true }
    }, {
        tableName: 'assessments',
    });
  
    Assessment.associate = (models) => {
        Assessment.hasMany(models.AssessmentType, { foreignKey: 'assessment_id', as: 'assessment_type' });
    };
  
    return Assessment;
};