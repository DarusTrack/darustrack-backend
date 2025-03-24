var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Curriculum } = require('../models');
const accessValidation = require('../middlewares/accessValidation');
const roleValidation = require('../middlewares/roleValidation');
const v = new Validator();

// Get data kurikulum (hanya satu yang tersedia)
router.get('/', async (req, res) => {
    try {
        const curriculum = await Curriculum.findOne();
        res.json(curriculum || {});
    } catch (error) {
        res.status(500).json({ message: 'Error fetching curriculum', error });
    }
});

router.post('/', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const schema = {
        name: 'string',
        description: 'string',
    }

    const validate = v.validate (req.body, schema);

    if(validate.length) {
        return res
        .status(400)
        .json(validate);
    }

    const curriculums = await Curriculum.create(req.body);

    res.json(curriculums);
});

router.put('/:id', accessValidation, roleValidation(["admin"]), async (req, res) => {
    const id = req.params.id;
    
    let curriculums = await Curriculum.findByPk(id);

    if (!curriculums) {
        return res.status(404).json({ message: 'Curriculum not found' });
    }
    
    const schema = {
        name: 'string|optional',
        description: 'string|optional'
    };

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res.status(400).json(validate);
    }

    await curriculums.update(req.body);
    res.json(curriculums);
});

module.exports = router;