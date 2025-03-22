module.exports = (sequelize, DataTypes) => {
    const Achievement = sequelize.define('Achievement', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        subject_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'subjects', // Nama tabel yang dirujuk
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'achievements'
    });

    Achievement.associate = (models) => {
        Achievement.belongsTo(models.Subject, { 
            foreignKey: 'subject_id',
            as: 'subject'
        });
    };

    return Achievement;
};
