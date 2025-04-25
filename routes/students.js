const express = require('express');
const router = express.Router();
const { Class, Student, User, Schedule, Subject } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');
const { Op } = require('sequelize');

router.get('/', accessValidation, roleValidation(['admin']), async (req, res) => {
    try {
      const students = await Student.findAll();
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: 'Gagal mengambil data siswa', error });
    }
});

router.post('/', accessValidation, roleValidation(['admin']), async (req, res) => {
    try {
      const { name, nisn, birth_date, parent_id } = req.body;
      const newStudent = await Student.create({ name, nisn, birth_date, parent_id });
      res.status(201).json(newStudent);
    } catch (error) {
      res.status(500).json({ message: 'Gagal menambahkan siswa', error });
    }
});

router.put('/:id', accessValidation, roleValidation(['admin']), async (req, res) => {
    try {
      const { name, nisn, birth_date, parent_id } = req.body;
      await Student.update({ name, nisn, birth_date, parent_id }, { where: { id: req.params.id } });
      res.json({ message: 'Siswa berhasil diperbarui' });
    } catch (error) {
      res.status(500).json({ message: 'Gagal memperbarui siswa', error });
    }
});
  
router.delete('/:id', accessValidation, roleValidation(['admin']), async (req, res) => {
    try {
      await Student.destroy({ where: { id: req.params.id } });
      res.json({ message: 'Siswa berhasil dihapus' });
    } catch (error) {
      res.status(500).json({ message: 'Gagal menghapus siswa', error });
    }
});

module.exports = router;