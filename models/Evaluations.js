module.exports = (sequelize, DataTypes) => {
    const Evaluations = sequelize.define('Evaluations', {
        id: {
            type: DataTypes.INTEGER,
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            autoIncrement: true
        },
        student_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        title: {
            type: DataTypes.ENUM('Mengenai Perilaku Anak', 'Hasil Evaluasi Belajar Anak'),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'evaluations',
    });

    Evaluations.associate = (models) => {
        Evaluations.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
    };

    return Evaluations;
};
