const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection (using environment variables from Vercel)
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false }
});

// Make db available in routes
app.use((req, res, next) => {
    req.db = db;
    next();
});

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role, warehouse_id } = req.body;
        
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
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
        
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
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

app.get('/api/warehouses', async (req, res) => {
    try {
        const [warehouses] = await db.query('SELECT * FROM warehouses WHERE status = "active"');
        res.json(warehouses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ PRODUCT ROUTES ============

app.get('/api/products', async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT p.*, COALESCE(SUM(s.quantity), 0) as total_stock
            FROM products p
            LEFT JOIN stock s ON p.id = s.product_id
            GROUP BY p.id
        `);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ STOCK ROUTES ============

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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({ message: 'WarehouseFlow API is running!' });
});



// Export for Vercel
module.exports = app;