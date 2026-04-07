import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || 'quotations.db';

// Ensure directory exists if dbPath is in a subfolder
const dbDir = path.dirname(dbPath);
if (dbDir !== '.' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS company_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT,
    tagline TEXT,
    address TEXT,
    phone TEXT,
    mobile TEXT,
    email TEXT,
    gst_number TEXT,
    msme_reg TEXT,
    established_year TEXT,
    company_type TEXT,
    headquarters TEXT,
    authorized_partner_since TEXT,
    service_locations TEXT,
    authorized_signatory TEXT,
    logo_url TEXT
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_number TEXT UNIQUE,
    client_name TEXT NOT NULL,
    client_address TEXT,
    kind_attention TEXT,
    subject TEXT,
    intro_paragraph TEXT,
    date TEXT,
    validity_days INTEGER DEFAULT 30,
    status TEXT DEFAULT 'pending',
    total_basic REAL DEFAULT 0,
    total_gst REAL DEFAULT 0,
    grand_total REAL DEFAULT 0,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quotation_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
    description TEXT,
    basic_price REAL,
    quantity INTEGER,
    gst_percent REAL DEFAULT 18
  );

  CREATE TABLE IF NOT EXISTS quotation_terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
    term_text TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    mobile TEXT,
    role TEXT DEFAULT 'user',
    permissions TEXT DEFAULT '[]',
    otp TEXT,
    is_verified BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    base_price REAL,
    category TEXT,
    version_model TEXT,
    key_features TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, version_model)
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    billing_address TEXT,
    shipping_address TEXT,
    gst_number TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS oefs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oef_no TEXT UNIQUE,
    date TEXT,
    marketing_executive TEXT,
    contact TEXT,
    email TEXT,
    customer_id INTEGER REFERENCES customers(id),
    items TEXT,
    total_amount REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
