module.exports = (sequelize, DataTypes) => {
    const Evaluation = sequelize.define('Evaluation', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        student_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        teacher_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        title: {
            type: DataTypes.ENUM( 'Mengenai Perilaku Siswa', 'Hasil Evaluasi Belajar Siswa'),
            allowNull: false,
        },
        comment: {
            type: DataTypes.TEXT
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        tableName: 'evaluations',
    });

    Evaluation.associate = (models) => {
        Evaluation.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
        Evaluation.belongsTo(models.User, { foreignKey: 'teacher_id', as: 'teacher' });
    };

    return Evaluation;
};
