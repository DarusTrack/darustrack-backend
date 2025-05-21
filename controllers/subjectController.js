const Validator = require('fastest-validator');
const { Subject } = require('../models');
const v = new Validator();

class SubjectController {
  static async getAllSubjects(req, res) {
    try {
      const subjects = await Subject.findAll({
        attributes: ['id', 'name'],
        order: [['name', 'ASC']]
      });
      res.json(subjects);
    } catch (error) {
      next(error);
    }
  }

  static async getSubjectById(req, res) {
    try {
      const { id } = req.params;
      const subject = await Subject.findByPk(id, {
        attributes: ['id', 'name', 'description']
      });

      if (!subject) {
        return res.status(404).json({ message: 'Subject tidak ditemukan' });
      }
      res.json(subject);
    } catch (error) {
      next(error);
    }
  }

  static async createSubject(req, res) {
    try {
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
        return res.status(409).json({ 
          message: `Subject dengan nama '${req.body.name}' sudah ada.` 
        });
      }

      const subject = await Subject.create(req.body);
      res.status(201).json({ 
        message: 'Subject created', 
        id: subject.id 
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSubject(req, res) {
    try {
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

      if (req.body.name && req.body.name !== subject.name) {
        const existingSubject = await Subject.findOne({
          where: { name: req.body.name },
          limit: 1
        });

        if (existingSubject && existingSubject.id !== subject.id) {
          return res.status(409).json({ 
            message: `Nama subject '${req.body.name}' sudah digunakan.` 
          });
        }
      }

      await subject.update(req.body);
      res.json({ 
        message: 'Subject updated', 
        subject 
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSubject(req, res) {
    try {
      const { id } = req.params;
      const subject = await Subject.findByPk(id);
      
      if (!subject) {
        return res.status(404).json({ message: 'Subject tidak ditemukan' });
      }

      await subject.destroy();
      res.json({ message: 'Subject deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SubjectController;