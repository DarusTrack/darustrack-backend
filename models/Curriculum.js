module.exports = (sequelize, DataTypes) => {
    const Curriculum = sequelize.define('Curriculum', {
        id: {
            type: DataTypes.INTEGER,
            // defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    }, {
        tableName: 'curriculums',
    });

    // Tambahkan data pertama setelah sync
    Curriculum.afterSync(async () => {
        const count = await Curriculum.count();
        if (count === 0) {
        await Curriculum.create({
            id: 1,
            name: 'Kurikulum Merdeka',
            description: 'Kurikulum yang mendukung kebebasan belajar.'
        });
        }
    });
    
    return Curriculum;
}