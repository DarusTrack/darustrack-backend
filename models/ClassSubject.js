module.exports = (sequelize, DataTypes) => {
    const ClassSubject = sequelize.define('ClassSubject', {
        class_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'classes',
                key: 'id'
            }
        },
        subject_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'subjects',
                key: 'id'
            }
        }
    }, {
        tableName: 'class_subjects'
    });

    return ClassSubject;
};
