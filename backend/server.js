const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');      
const path = require('path');           
const fs = require('fs');               

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ============ IMAGE UPLOAD CONFIGURATION ============
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images allowed'), false);
    }
};

const upload = multer({ storage, fileFilter });

// Create uploads folder if not exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Serve static images
app.use('/uploads', express.static('uploads'));
// ============ END IMAGE UPLOAD CONFIGURATION ============

// Database connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

app.use((req, res, next) => {
    req.db = db;
    next();
});

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role, warehouse_id } = req.body;
        
        // Check if user exists
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role, warehouse_id) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role || 'viewer', warehouse_id || null]
        );
        
        res.json({ success: true, message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Get user
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ WAREHOUSE ROUTES ============

// Get all warehouses
app.get('/api/warehouses', async (req, res) => {
    try {
        const [warehouses] = await db.query('SELECT * FROM warehouses WHERE status = "active"');
        res.json(warehouses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add warehouse
app.post('/api/warehouses', async (req, res) => {
    try {
        const { name, location } = req.body;
        const [result] = await db.query(
            'INSERT INTO warehouses (name, location) VALUES (?, ?)',
            [name, location]
        );
        res.json({ success: true, id: result.insertId, message: 'Warehouse created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ PRODUCT ROUTES ============

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT p.*, 
                   COALESCE(SUM(s.quantity), 0) as total_stock
            FROM products p
            LEFT JOIN stock s ON p.id = s.product_id
            GROUP BY p.id
        `);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add product with image and QR code
app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const { sku, name, description, category, min_stock_level, unit_price, official_url } = req.body;
        const image_url = req.file ? `/uploads/${req.file.filename}` : null;
        
        console.log('Creating product:', { sku, name, official_url }); // Debug log
        
        // Generate QR Code with URL
        const QRCode = require('qrcode');
        const targetUrl = official_url || `https://www.google.com/search?q=${encodeURIComponent(name)}`;
        const qrCodeDataUrl = await QRCode.toDataURL(targetUrl);
        
        // Use req.db for query
        const [result] = await req.db.query(
            `INSERT INTO products (sku, name, description, category, min_stock_level, unit_price, image_url, official_url, qr_code) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [sku, name, description, category, min_stock_level || 10, unit_price, image_url, official_url || null, qrCodeDataUrl]
        );
        
        res.json({ success: true, id: result.insertId, message: 'Product created with QR code' });
    } catch (error) {
        console.error('Product create error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete product with its stock entries
app.delete('/api/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Check if product exists
        const [product] = await req.db.query('SELECT id FROM products WHERE id = ?', [productId]);
        if (product.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // First delete stock entries for this product
        await req.db.query('DELETE FROM stock WHERE product_id = ?', [productId]);
        
        // Delete stock transfers related to this product
        await req.db.query('DELETE FROM stock_transfers WHERE product_id = ?', [productId]);
        
        // Now delete the product
        await req.db.query('DELETE FROM products WHERE id = ?', [productId]);
        
        res.json({ success: true, message: 'Product and related stock deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ STOCK ROUTES ============

// Get stock by warehouse
app.get('/api/stock/:warehouseId', async (req, res) => {
    try {
        const [stock] = await db.query(`
            SELECT s.*, p.name, p.sku, p.unit_price
            FROM stock s
            JOIN products p ON s.product_id = p.id
            WHERE s.warehouse_id = ?
        `, [req.params.warehouseId]);
        res.json(stock);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Transfer stock with AUDIT LOG
app.post('/api/stock/transfer', async (req, res) => {
    const { product_id, from_warehouse_id, to_warehouse_id, quantity, requested_by } = req.body;
    
    try {
        // Check if enough stock
        const [stock] = await req.db.query(
            'SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?',
            [product_id, from_warehouse_id]
        );
        
        if (stock.length === 0 || stock[0].quantity < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }
        
        // Deduct from source
        await req.db.query(
            'UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?',
            [quantity, product_id, from_warehouse_id]
        );
        
        // Add to destination
        await req.db.query(
            'INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
            [product_id, to_warehouse_id, quantity, quantity]
        );
        
        // Create transfer record
        const [result] = await req.db.query(
            'INSERT INTO stock_transfers (product_id, from_warehouse_id, to_warehouse_id, quantity, requested_by, status) VALUES (?, ?, ?, ?, ?, ?)',
            [product_id, from_warehouse_id, to_warehouse_id, quantity, requested_by, 'completed']
        );
        
        // ADD AUDIT LOG (NEW)
        await req.db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                requested_by, 
                'STOCK_TRANSFER', 
                'stock_transfer', 
                result.insertId,
                JSON.stringify({ from_warehouse_id, quantity }),
                JSON.stringify({ to_warehouse_id, quantity }),
                req.ip || 'unknown'
            ]
        );
        
        res.json({ success: true, message: 'Stock transferred successfully', transfer_id: result.insertId });
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Low stock alert
app.get('/api/stock/low-stock', async (req, res) => {
    try {
        const [lowStock] = await db.query(`
            SELECT p.name, p.sku, s.quantity, p.min_stock_level, w.name as warehouse_name
            FROM stock s
            JOIN products p ON s.product_id = p.id
            JOIN warehouses w ON s.warehouse_id = w.id
            WHERE s.quantity <= p.min_stock_level
        `);
        res.json(lowStock);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test route
app.get('/api/test', async (req, res) => {
    try {
        const [result] = await db.query('SELECT 1 + 1 AS solution');
        res.json({ success: true, message: 'Database connected!', result: result[0].solution });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/', (req, res) => {
    res.json({ 
        message: 'Multi-Warehouse Inventory API',
        endpoints: {
            auth: '/api/auth/register, /api/auth/login',
            warehouses: '/api/warehouses',
            products: '/api/products',
            stock: '/api/stock/:warehouseId, /api/stock/transfer, /api/stock/low-stock'
        }
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    try {
        await db.query('SELECT 1');
        console.log('✅ MySQL connected');
    } catch (error) {
        console.log('❌ MySQL error:', error.message);
    }
});

// ============ STOCK ROUTES ============

// Add stock to warehouse (NEW ROUTE)
app.post('/api/stock/add', async (req, res) => {
    try {
        const { product_id, warehouse_id, quantity } = req.body;
        
        // Validate input
        if (!product_id || !warehouse_id || !quantity) {
            return res.status(400).json({ error: 'product_id, warehouse_id, and quantity are required' });
        }
        
        // Check if product exists
        const [product] = await req.db.query('SELECT id FROM products WHERE id = ?', [product_id]);
        if (product.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Check if warehouse exists
        const [warehouse] = await req.db.query('SELECT id FROM warehouses WHERE id = ?', [warehouse_id]);
        if (warehouse.length === 0) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }
        
        // Add or update stock
        const [result] = await req.db.query(
            'INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
            [product_id, warehouse_id, quantity, quantity]
        );
        
        res.json({ 
            success: true, 
            message: `Added ${quantity} units of product ${product_id} to warehouse ${warehouse_id}`,
            affected_rows: result.affectedRows
        });
    } catch (error) {
        console.error('Stock add error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get stock by warehouse (already existing)
app.get('/api/stock/:warehouseId', async (req, res) => {
    try {
        const [stock] = await req.db.query(`
            SELECT s.*, p.name, p.sku, p.unit_price
            FROM stock s
            JOIN products p ON s.product_id = p.id
            WHERE s.warehouse_id = ?
        `, [req.params.warehouseId]);
        res.json(stock);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Transfer stock (already existing - keep as is)
app.post('/api/stock/transfer', async (req, res) => {
    // ... your existing transfer code ...
});

// Low stock alert (already existing - keep as is)
app.get('/api/stock/low-stock', async (req, res) => {
    // ... your existing low stock code ...
});

// Get audit logs (transfer history)
app.get('/api/audit/transfers', async (req, res) => {
    try {
        const [logs] = await req.db.query(`
            SELECT al.*, 
                   u.name as user_name,
                   p.name as product_name,
                   w1.name as from_warehouse_name,
                   w2.name as to_warehouse_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN stock_transfers st ON al.entity_id = st.id
            LEFT JOIN products p ON st.product_id = p.id
            LEFT JOIN warehouses w1 ON st.from_warehouse_id = w1.id
            LEFT JOIN warehouses w2 ON st.to_warehouse_id = w2.id
            WHERE al.action = 'STOCK_TRANSFER'
            ORDER BY al.created_at DESC
            LIMIT 50
        `);
        res.json(logs);
    } catch (error) {
        console.error('Audit fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});