const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.STRING(5),
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      nip: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true, 
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('orang_tua', 'kepala_sekolah', 'wali_kelas', 'admin'),
        allowNull: false
      },
      resetPasswordToken: {
        type: Sequelize.STRING,
        allowNull: true
      },
      resetPasswordExpires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
    });

    // Hash password sebelum insert
    const hashedPassword = await bcrypt.hash('password123', 10);

    await queryInterface.bulkInsert('users', [
      {
        id: 'U0001',
        name: 'Admin',
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'U0002',
        name: 'Kepala Sekolah',
        email: 'kepalasekolah@gmail.com',
        password: hashedPassword,
        role: 'kepala_sekolah',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'U0003',
        name: 'Wali Kelas',
        email: 'walikelas1a@gmail.com',
        password: hashedPassword,
        role: 'wali_kelas',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'U0004',
        name: 'Orang Tua',
        email: 'orangtua@gmail.com',
        password: hashedPassword,
        role: 'orang_tua',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};