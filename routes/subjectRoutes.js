const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');

// ✅ GET: Daftar mata pelajaran
router.get("/", accessValidation, subjectController.getAllSubjects);

// Get capaian pembelajaran berdasarkan mata pelajaran
router.get('/:id', accessValidation, subjectController.getDetailSubject);
  
// Tambah mata pelajaran baru
router.post('/', accessValidation, roleValidation(['admin']), subjectController.addSubject);

// ✅ Update mata pelajaran
router.put('/:id', accessValidation, roleValidation(['admin']), subjectController.updateSubject);

// Hapus mata pelajaran
router.delete('/:id', accessValidation, roleValidation(['admin']), subjectController.deleteSubject);

module.exports = router;
