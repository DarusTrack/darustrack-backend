var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const { Curriculum } = require('../models');
const v = new Validator();

router.get('/', async (req, res) => {
    const curriculums = await Curriculum.findAll();
    return res.json(curriculums);
});

router.get('/:id', async (req,res) => {
    const id = req.params.id;
    const curriculums = await Curriculum.findByPk(id);
    return res.json(curriculums || {});
});

router.post('/', async (req, res) => {
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

router.put('/:id', async (req, res) => {
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

router.delete('/:id', async (req,res) => {
    const id = req.params.id;
    const curriculums = await Curriculum.findByPk(id);

    if(!curriculums) {
        return res.json({message: 'Curriculum not found'});
    }

    await curriculums.destroy();

    res.json({
        message: 'Curriculum is deleted'
    });
});

module.exports = router;