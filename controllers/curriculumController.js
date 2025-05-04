const { Curriculum } = require('../models');
const Validator = require('fastest-validator');
const v = new Validator();

// GET - Ambil data kurikulum (hanya satu entri yang tersedia)
exports.getCurriculum = async (req, res) => {
  try {
    const curriculum = await Curriculum.findOne({
      attributes: ['name', 'description']
    });
    res.json(curriculum || {});
  } catch (error) {
    res.status(500).json({ message: 'Error fetching curriculum', error });
  }
};

// PUT - Perbarui kurikulum
exports.updateCurriculum = async (req, res) => {
  const { id } = req.params;

  try {
    const curriculum = await Curriculum.findByPk(id);
    if (!curriculum) {
      return res.status(404).json({ message: 'Curriculum not found' });
    }

    const schema = {
      name: 'string|optional',
      description: 'string|optional'
    };

    const validation = v.validate(req.body, schema);
    if (validation.length) {
      return res.status(400).json(validation);
    }

    await curriculum.update(req.body);
    res.json(curriculum);
  } catch (error) {
    res.status(500).json({ message: 'Error updating curriculum', error });
  }
};
