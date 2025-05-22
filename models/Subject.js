const argon2 = require('argon2');
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 5);

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.STRING(5),
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
      validate: { isEmail: true }
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
    hooks: {
      beforeCreate: async (user) => {
        user.password = await argon2.hash(user.password);
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await argon2.hash(user.password);
        }
      }
    }
  });

  User.prototype.comparePassword = async function(candidatePassword) {
    try {
      return await argon2.verify(this.password, candidatePassword);
    } catch {
      return false;
    }
  };

  User.associate = (models) => {
    User.hasMany(models.Student, { foreignKey: 'parent_id', as: 'student' });
    User.hasOne(models.Class, { foreignKey: 'teacher_id', as: 'class' });
    User.hasMany(models.PasswordReset, { foreignKey: 'user_id' });
  };

  return User;
};
