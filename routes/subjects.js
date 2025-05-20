const express = require('express');
const router = express.Router();
const Validator = require('fastest-validator');
const { Subject } = require('../models');
const v = new Validator();
const roleValidation = require("../middlewares/roleValidation");
const accessValidation = require('../middlewares/accessValidation');

// Middleware async handler
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ✅ GET: Daftar semua mata pelajaran
router.get("/", accessValidation, asyncHandler(async (req, res) => {
  const subjects = await Subject.findAll({
    attributes: ['id', 'name'],
    order: [['name', 'ASC']]
  });
  res.json(subjects);
}));

// ✅ GET: Detail mata pelajaran berdasarkan ID
router.get('/:id', accessValidation, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const subject = await Subject.findByPk(id, {
    attributes: ['id', 'name', 'description']
  });

  if (!subject) {
    return res.status(404).json({ message: 'Subject tidak ditemukan' });
  }

  res.json(subject);
}));

// ✅ POST: Tambah mata pelajaran baru (admin only)
router.post('/', accessValidation, roleValidation(['admin']), asyncHandler(async (req, res) => {
  const schema = {
    name: 'string',
    description: 'string'
  };

  const validate = v.validate(req.body, schema);
  if (validate.length) return res.status(400).json(validate);

  const existingSubject = await Subject.findOne({
    where: { name: req.body.name },
    limit: 1
  });

  if (existingSubject) {
    return res.status(409).json({ message: `Subject dengan nama '${req.body.name}' sudah ada.` });
  }

  const subject = await Subject.create(req.body);
  res.status(201).json({ message: 'Subject created', id: subject.id });
}));

// ✅ PUT: Update mata pelajaran berdasarkan ID
router.put('/:id', accessValidation, roleValidation(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const subject = await Subject.findByPk(id);
  if (!subject) {
    return res.status(404).json({ message: 'Subject tidak ditemukan' });
  }

  const schema = {
    name: 'string|optional',
    description: 'string|optional'
  };

  const validate = v.validate(req.body, schema);
  if (validate.length) return res.status(400).json(validate);

  // Cek nama jika diubah
  if (req.body.name && req.body.name !== subject.name) {
    const existingSubject = await Subject.findOne({
      where: { name: req.body.name },
      limit: 1
    });

    if (existingSubject && existingSubject.id !== subject.id) {
      return res.status(409).json({ message: `Nama subject '${req.body.name}' sudah digunakan.` });
    }
  }

  await subject.update(req.body);
  res.json({ message: 'Subject updated', subject });
}));

// ✅ DELETE: Hapus mata pelajaran berdasarkan ID (admin only)
router.delete('/:id', accessValidation, roleValidation(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const subject = await Subject.findByPk(id);
  if (!subject) {
    return res.status(404).json({ message: 'Subject tidak ditemukan' });
  }

  await subject.destroy();
  res.json({ message: 'Subject deleted successfully' });
}));

module.exports = router;