const express = require('express');
const router = express.Router();
const SubjectController = require('../controllers/subjectController');
const roleValidation = require("../middlewares/roleValidation");

// Error handling middleware wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET: Daftar semua mata pelajaran
router.get("/", asyncHandler(SubjectController.getAllSubjects));

// GET: Detail mata pelajaran berdasarkan ID
router.get('/:id', asyncHandler(SubjectController.getSubjectById));

// POST: Tambah mata pelajaran baru (admin only)
router.post('/', 
  roleValidation(['admin']), 
  asyncHandler(SubjectController.createSubject)
);

// PUT: Update mata pelajaran berdasarkan ID (admin only)
router.put('/:id', 
  roleValidation(['admin']), 
  asyncHandler(SubjectController.updateSubject)
);

// DELETE: Hapus mata pelajaran berdasarkan ID (admin only)
router.delete('/:id', 
  roleValidation(['admin']), 
  asyncHandler(SubjectController.deleteSubject)
);

module.exports = router;