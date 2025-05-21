const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const roleValidation = require('../middlewares/roleValidation');

// ✅ GET: Daftar mata pelajaran
router.get("/", subjectController.getAllSubjects);

// Get capaian pembelajaran berdasarkan mata pelajaran
router.get('/:id', subjectController.getDetailSubject);
  
// Tambah mata pelajaran baru
router.post('/', roleValidation(['admin']), subjectController.addSubject);

// ✅ Update mata pelajaran
router.put('/:id', roleValidation(['admin']), subjectController.updateSubject);

// Hapus mata pelajaran
router.delete('/:id', roleValidation(['admin']), subjectController.deleteSubject);

module.exports = router;
