const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const Semester = sequelize.define('Semester', {
        id: {
            type: DataTypes.STRING(5),
            primaryKey: true,
            defaultValue: () => nanoid()
        },
        name: {
            type: DataTypes.ENUM('Ganjil', 'Genap'),
            allowNull: false
        },
        academic_year_id: {
            type: DataTypes.STRING(5), // contoh: "2024/2025"
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        start_date: {
            type: DataTypes.DATE
        },
        end_date: {
            type: DataTypes.DATE
        }
    }, {
        tableName: 'semesters',
    });

    Semester.associate = (models) => {
        Semester.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id'});
        Semester.hasMany(models.Class, { foreignKey: 'semester_id' });
    };

    return Semester;
};
