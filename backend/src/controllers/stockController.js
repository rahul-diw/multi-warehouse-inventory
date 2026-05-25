const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');

exports.transferStock = async (req, res) => {
    const { product_id, from_warehouse_id, to_warehouse_id, quantity } = req.body;
    const userId = req.user.id;
    
    try {
        // Check if enough stock available
        const [stock] = await req.db.execute(
            'SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?',
            [product_id, from_warehouse_id]
        );
        
        if (stock[0].quantity < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }
        
        // Deduct from source warehouse
        await req.db.execute(
            'UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?',
            [quantity, product_id, from_warehouse_id]
        );
        
        // Add to destination warehouse
        await req.db.execute(
            'INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
            [product_id, to_warehouse_id, quantity, quantity]
        );
        
        // Create transfer record
        const [result] = await req.db.execute(
            'INSERT INTO stock_transfers (product_id, from_warehouse_id, to_warehouse_id, quantity, requested_by, status) VALUES (?, ?, ?, ?, ?, ?)',
            [product_id, from_warehouse_id, to_warehouse_id, quantity, userId, 'completed']
        );
        
        // Log audit
        await AuditLog.log(
            userId,
            'STOCK_TRANSFER',
            'stock',
            result.insertId,
            { from_warehouse_id, quantity },
            { to_warehouse_id, quantity },
            req.ip
        );
        
        // Check for low stock and send alert
        await checkLowStockAndAlert(req.db, product_id, to_warehouse_id);
        
        res.json({ message: 'Stock transferred successfully', transfer_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Transfer failed' });
    }
};

async function checkLowStockAndAlert(db, productId, warehouseId) {
    const [product] = await db.execute(
        'SELECT p.name, s.quantity, p.min_stock_level FROM products p JOIN stock s ON p.id = s.product_id WHERE p.id = ? AND s.warehouse_id = ?',
        [productId, warehouseId]
    );
    
    if (product[0] && product[0].quantity <= product[0].min_stock_level) {
        console.log(`⚠️ LOW STOCK ALERT: ${product[0].name} has only ${product[0].quantity} units in warehouse ${warehouseId}`);
        // Here you'll integrate WhatsApp API
    }
}