var express = require('express');
var router = express.Router();
const { Student, Attendance, Schedule, Subject, Class, Evaluation, User } = require('../models');
// const roleValidation = require("../middlewares/roleValidation");
const { accessValidation } = require('../middlewares/accessValidation');
const isParentValidation = require('../middlewares/isParentValidation');

router.get('/evaluations', accessValidation, isParentValidation, async (req, res) => {
  try {
      const children = req.children;

      if (!children.length) {
          return res.status(404).json({ message: "Tidak ada siswa yang terdaftar untuk akun ini." });
      }

      const studentIds = children.map(child => child.id);

      const evaluations = await Evaluation.findAll({
          where: { student_id: studentIds },
          attributes: ['id', 'student_id', 'title']
      });

      if (!evaluations.length) {
          return res.status(404).json({ message: "Tidak ada evaluasi ditemukan untuk anak-anak Anda." });
      }

      res.json({ evaluations });
  } catch (error) {
      console.error("Error fetching evaluations:", error);
      res.status(500).json({ error: error.message });
  }
});

module.exports = router;
