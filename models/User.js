const bcrypt = require('bcryptjs');
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 5);

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.STRING(5),
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
            defaultValue: () => nanoid()
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        nip: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true, 
            validate: {
                isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('orang_tua', 'kepala_sekolah', 'wali_kelas', 'admin'),
            allowNull: false
        }
    }, {
        tableName: 'users',
    });

    // Hash password sebelum menyimpan ke database
    User.beforeCreate(async (user) => {
        user.password = await bcrypt.hash(user.password, 10);
    });

    User.associate = (models) => {
        User.hasMany(models.Student, { foreignKey: 'parent_id', as: 'students' });
        User.hasOne(models.Class, { foreignKey: 'teacher_id', as: 'class' }); // ✅ Wali kelas untuk satu kelas
    };

    return User;
};
