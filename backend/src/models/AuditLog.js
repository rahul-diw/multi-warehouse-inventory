const db = require('../config/db');

class AuditLog {
    static async log(userId, action, entityType, entityId, oldValue, newValue, ipAddress) {
        await db.execute(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, action, entityType, entityId, JSON.stringify(oldValue), JSON.stringify(newValue), ipAddress]
        );
    }

    static async getByEntity(entityType, entityId) {
        const [rows] = await db.execute(
            'SELECT * FROM audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
            [entityType, entityId]
        );
        return rows;
    }
}

module.exports = AuditLog;