const { Subject } = require('../models');

// ✅ GET: Daftar mata pelajaran
exports.getAllSubjects = async (req, res) => {
    try {
        const subjects = await Subject.findAll(
            { 
                attributes: ['id','name'],
                order: [['name', 'ASC']]
            });
        return res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving subjects", error });
    }
};

// Get capaian pembelajaran berdasarkan mata pelajaran
exports.getDetailSubject = async (req, res) => {
    try {
        const { id } = req.params;

        const subject = await Subject.findOne({
            where: { id },
            attributes: ['id', 'name', 'description']
        });

        if (!subject) {
            return res.status(404).json({ message: 'Subject tidak ditemukan' });
        }

        res.json(subject);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil detail mata pelajaran', error: error.message });
    }
};
  
// Tambah mata pelajaran baru
exports.addSubject = async (req, res) => {
    const schema = {
        name: 'string',
        description: 'string'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    // Cek apakah subject dengan nama tersebut sudah ada
    const existingSubject = await Subject.findOne({ where: { name: req.body.name } });

    if (existingSubject) {
        return res.status(409).json({ message: `Subject dengan nama '${req.body.name}' sudah ada.` });
    }

    // Jika tidak ada, baru buat subject
    const subject = await Subject.create(req.body);
    res.json(subject);
};

// ✅ Update mata pelajaran
exports.updateSubject = async (req, res) => {
    const id = req.params.id;

    try {
        let subject = await Subject.findByPk(id);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        const schema = {
            name: 'string|optional',
            description: 'string|optional'
        };

        const validate = v.validate(req.body, schema);
        if (validate.length) {
            return res.status(400).json(validate);
        }

        // Cek jika ingin mengubah nama, dan nama baru sudah digunakan subject lain
        if (req.body.name && req.body.name !== subject.name) {
            const existingSubject = await Subject.findOne({
                where: {
                    name: req.body.name
                }
            });

            if (existingSubject && existingSubject.id !== id) {
                return res.status(409).json({ message: `Nama subject '${req.body.name}' sudah digunakan.` });
            }
        }

        subject = await subject.update(req.body);
        return res.json(subject);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Gagal update subject", error: error.message });
    }
};

// Hapus mata pelajaran
exports.deleteSubject = async (req, res) => {
    const id = req.params.id;
    const subject = await Subject.findByPk(id);

    if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
    }

    await subject.destroy();
    res.json({ message: 'Subject is deleted' });
};