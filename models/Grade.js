module.exports = (sequelize, DataTypes) => {
    const Grade = sequelize.define('Grade', {
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
        subject_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('Quiz', 'Tugas', 'UTS', 'UAS'),
            allowNull: false
        },
        score: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false
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
        tableName: 'grades',
    });

    Grade.associate = (models) => {
        Grade.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
        Grade.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
    };

    return Grade;
};
