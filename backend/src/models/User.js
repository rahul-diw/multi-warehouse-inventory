const db = require('../config/db');

class User {
    static async create(userData) {
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, role, warehouse_id) VALUES (?, ?, ?, ?, ?)',
            [userData.name, userData.email, userData.password, userData.role, userData.warehouse_id]
        );
        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT id, name, email, role, warehouse_id FROM users WHERE id = ?', [id]);
        return rows[0];
    }
}

module.exports = User;