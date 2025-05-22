const Validator = require('fastest-validator');
const { User } = require('../models');
const bcrypt = require('bcryptjs');
const v = new Validator();

class UserController {
    // Excluded user attributes
    static excludedAttributes = ["password", "createdAt", "updatedAt", "resetPasswordToken", "resetPasswordExpires"];

    // List users by role
    static async listUsers(req, res, next) {
        try {
            const { role } = req.query;
            const whereClause = role ? { role } : {};

            const users = await User.findAll({
                where: whereClause,
                attributes: { exclude: UserController.excludedAttributes },
                order: [['name', 'ASC']]
            });

            res.json(users);
        } catch (error) {
            next(error);
        }
    }

    // Get user by ID
    static async getUser(req, res, next) {
        try {
            const user = await User.findByPk(req.params.id, {
                attributes: { exclude: UserController.excludedAttributes }
            });

            if (!user) return res.status(404).json({ message: "User not found" });

            res.json(user);
        } catch (error) {
            next(error);
        }
    }

    // Create user
    static async createUser(req, res, next) {
        try {
            const schema = {
                name: 'string',
                nip: 'string|optional',
                email: 'email',
                password: 'string|min:6',
                role: { type: 'enum', values: ['orang_tua', 'kepala_sekolah', 'wali_kelas', 'admin'] }
            };

            const validate = v.validate(req.body, schema);
            if (validate.length) return res.status(400).json(validate);

            const { email, password, nip, ...rest } = req.body;

            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) return res.status(400).json({ message: 'Email already registered' });

            // Pastikan hanya di-hash sekali
            const hashedPassword = await bcrypt.hash(password, 8); // Gunakan cost factor yang sama saat login
            console.log("Password input (raw):", password);
            console.log("Password after hashing:", hashedPassword);

            const user = await User.create({
                ...rest,
                email,
                nip: nip?.trim() || null,
                password: hashedPassword
            });

            res.status(201).json({ message: 'User registered successfully', user });
        } catch (error) {
            next(error);
        }
    }

    // Update user
    static async updateUser(req, res, next) {
        try {
            const user = await User.findByPk(req.params.id);
            if (!user) return res.status(404).json({ message: 'User not found' });

            const schema = {
                name: 'string|optional',
                nip: 'string|optional',
                email: 'email|optional',
                password: 'string|min:6|optional',
                role: { type: 'enum', values: ['orang_tua', 'kepala_sekolah', 'wali_kelas', 'admin'], optional: true },
            };

            const validate = v.validate(req.body, schema);
            if (validate.length) return res.status(400).json(validate);

            const updatePayload = { ...req.body };

            if (updatePayload.password) {
                updatePayload.password = await bcrypt.hash(updatePayload.password, 10);
            }

            if (updatePayload.nip !== undefined && updatePayload.nip.trim() === '') {
                updatePayload.nip = null;
            }

            await user.update(updatePayload);
            res.json(user);
        } catch (error) {
            next(error);
        }
    }

    // Delete user
    static async deleteUser(req, res, next) {
        try {
            const user = await User.findByPk(req.params.id);
            if (!user) return res.status(404).json({ message: 'User not found' });

            await user.destroy();
            res.json({ message: 'User is deleted' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = UserController;