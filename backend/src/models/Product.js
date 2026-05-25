const db = require('../config/db');

class Product {
    static async create(productData) {
        const [result] = await db.execute(
            'INSERT INTO products (sku, name, description, category, min_stock_level, unit_price) VALUES (?, ?, ?, ?, ?, ?)',
            [productData.sku, productData.name, productData.description, productData.category, productData.min_stock_level, productData.unit_price]
        );
        return result.insertId;
    }

    static async findAll(filters = {}) {
        let query = 'SELECT * FROM products';
        let params = [];
        
        if (filters.category) {
            query += ' WHERE category = ?';
            params.push(filters.category);
        }
        
        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async updateStock(productId, warehouseId, quantityChange) {
        await db.execute(
            'INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
            [productId, warehouseId, quantityChange, quantityChange]
        );
    }

    static async getLowStock(threshold = 10) {
        const [rows] = await db.execute(`
            SELECT p.*, s.quantity, w.name as warehouse_name 
            FROM products p
            JOIN stock s ON p.id = s.product_id
            JOIN warehouses w ON s.warehouse_id = w.id
            WHERE s.quantity <= p.min_stock_level AND s.quantity <= ?
        `, [threshold]);
        return rows;
    }
}

module.exports = Product;