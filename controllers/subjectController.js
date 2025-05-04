const { Subject } = require('../models');
const Validator = require('fastest-validator');
const v = new Validator();

// GET - Semua mata pelajaran
exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']]
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving subjects", error });
  }
};

// GET - Detail satu mata pelajaran
exports.getSubjectById = async (req, res) => {
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

// POST - Tambah mata pelajaran baru
exports.createSubject = async (req, res) => {
  const schema = {
    name: 'string',
    description: 'string'
  };

  const validate = v.validate(req.body, schema);
  if (validate.length) {
    return res.status(400).json(validate);
  }

  try {
    const existingSubject = await Subject.findOne({ where: { name: req.body.name } });
    if (existingSubject) {
      return res.status(409).json({ message: `Subject dengan nama '${req.body.name}' sudah ada.` });
    }

    const subject = await Subject.create(req.body);
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambahkan mata pelajaran', error: error.message });
  }
};

// PUT - Update mata pelajaran
exports.updateSubject = async (req, res) => {
  const id = req.params.id;

  const schema = {
    name: 'string|optional',
    description: 'string|optional'
  };

  const validate = v.validate(req.body, schema);
  if (validate.length) {
    return res.status(400).json(validate);
  }

  try {
    let subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (req.body.name && req.body.name !== subject.name) {
      const existingSubject = await Subject.findOne({ where: { name: req.body.name } });
      if (existingSubject && existingSubject.id !== parseInt(id)) {
        return res.status(409).json({ message: `Nama subject '${req.body.name}' sudah digunakan.` });
      }
    }

    subject = await subject.update(req.body);
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: "Gagal update subject", error: error.message });
  }
};

// DELETE - Hapus mata pelajaran
exports.deleteSubject = async (req, res) => {
  const id = req.params.id;

  try {
    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    await subject.destroy();
    res.json({ message: 'Subject is deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus subject', error });
  }
};
