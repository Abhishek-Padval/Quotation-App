import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || 'quotations.db';
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
    metadata TEXT, -- JSON string for extra fields
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quotation_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER,
    description TEXT,
    basic_price REAL,
    quantity INTEGER,
    gst_percent REAL DEFAULT 18,
    FOREIGN KEY (quotation_id) REFERENCES quotations (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quotation_terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER,
    term_text TEXT,
    FOREIGN KEY (quotation_id) REFERENCES quotations (id) ON DELETE CASCADE
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
    is_verified INTEGER DEFAULT 0,
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
`);

// Ensure columns exist if table was already created without them
try { db.exec("ALTER TABLE products ADD COLUMN version_model TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN key_features TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN first_name TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN last_name TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN mobile TEXT;"); } catch (e) {}

// Company Profile Migrations
try { db.exec("ALTER TABLE company_profile ADD COLUMN tagline TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE company_profile ADD COLUMN msme_reg TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE company_profile ADD COLUMN established_year TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE company_profile ADD COLUMN company_type TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE company_profile ADD COLUMN headquarters TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE company_profile ADD COLUMN authorized_partner_since TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE company_profile ADD COLUMN service_locations TEXT;"); } catch (e) {}

// Quotations Migrations
try { db.exec("ALTER TABLE quotations ADD COLUMN metadata TEXT;"); } catch (e) {}

const productsToSeed = [
  { category: 'UPS Systems', name: 'Online UPS', version_model: 'Single Phase (1kVA–10kVA)', key_features: 'Double conversion, LCD display, Battery backup, Overload protection', description: 'High-performance single phase online UPS' },
  { category: 'UPS Systems', name: 'Online UPS', version_model: 'Three Phase (10kVA–200kVA)', key_features: 'IGBT based, DSP control, Parallel redundancy, SNMP compatible', description: 'Industrial grade three phase online UPS' },
  { category: 'UPS Systems', name: 'Modular UPS', version_model: '50kVA–500kVA', key_features: 'Scalable design, Hot-swappable modules, High efficiency 96%+', description: 'Scalable modular UPS system' },
  { category: 'UPS Systems', name: 'Industrial UPS', version_model: '100kVA–1100kVA', key_features: 'Heavy-duty, Long backup support, Generator compatible', description: 'Heavy-duty industrial UPS' },
  { category: 'Servo Voltage Stabilizer', name: 'Air Cooled Servo Stabilizer', version_model: '1kVA–100kVA', key_features: 'Copper winding, Digital controller, Voltage correction ±1%', description: 'Precision air cooled stabilizer' },
  { category: 'Servo Voltage Stabilizer', name: 'Oil Cooled Servo Stabilizer', version_model: '10kVA–3000kVA', key_features: 'Outdoor type, High overload capacity, Durable tank design', description: 'High-capacity oil cooled stabilizer' },
  { category: 'Transformers', name: 'Isolation Transformer', version_model: '1kVA–500kVA', key_features: 'Galvanic isolation, Noise reduction, Copper wound', description: 'Standard isolation transformer' },
  { category: 'Transformers', name: 'Ultra Isolation Transformer', version_model: '5kVA–2000kVA', key_features: 'Spike suppression, Medical-grade option, Shielded winding', description: 'High-shielding ultra isolation transformer' },
  { category: 'Transformers', name: 'Constant Voltage Transformer (CVT)', version_model: '0.5kVA–15kVA', key_features: 'Voltage regulation ±1%, EMI suppression', description: 'Reliable CVT for sensitive equipment' },
  { category: 'Harmonic Solutions', name: 'Active Harmonic Filter (AHF)', version_model: '30A–300A', key_features: 'Reduces THDi <5%, Real-time harmonic correction', description: 'Active harmonic mitigation' },
  { category: 'Harmonic Solutions', name: 'Passive Harmonic Filter', version_model: 'Custom Rated', key_features: 'Cost effective, Fixed harmonic reduction', description: 'Economical passive filter' },
  { category: 'Inverters', name: 'Industrial Inverter', version_model: '5kVA–100kVA', key_features: 'Pure sinewave, High efficiency, Battery management', description: 'Pure sinewave industrial inverter' },
  { category: 'Transfer Systems', name: 'Automatic Transfer Switch (ATS)', version_model: '63A–3200A', key_features: 'Auto source switching, Generator compatible', description: 'Reliable automatic transfer switch' },
  { category: 'Lighting Solutions', name: 'Industrial LED Lighting', version_model: 'High Bay Model', key_features: '100–200 lm/W, IP65, Long lifespan 50,000 hrs', description: 'High-efficiency industrial LED' },
  { category: 'Lighting Solutions', name: 'Commercial LED Lighting', version_model: 'Panel / Downlight', key_features: 'Energy saving, Low heat emission', description: 'Modern commercial LED lighting' },
  { category: 'Lighting Solutions', name: 'Clean Room LED', version_model: 'IP65 / IP66', key_features: 'Dustproof, Uniform light output', description: 'Specialized clean room lighting' },
  { category: 'Lighting Solutions', name: 'Flameproof LED', version_model: 'Zone 1 / Zone 2', key_features: 'Explosion-proof, Hazardous area certified', description: 'Certified flameproof lighting' },
  { category: 'Lighting Solutions', name: 'Solar LED Lighting', version_model: 'All-in-One Model', key_features: 'Solar panel integrated, Battery backup', description: 'Sustainable solar LED lighting' },
  { category: 'Energy Saving', name: 'Lighting Energy Saving Panel', version_model: 'Digital Controller Type', key_features: '15–25% energy saving, Voltage optimization', description: 'Energy optimization panel' },
  { category: 'Office Solutions', name: 'Modular Office Cabin', version_model: 'Standard Model', key_features: 'Prefabricated, Custom size, Insulated panels', description: 'Flexible modular office' },
  { category: 'Office Solutions', name: 'Portable Site Office', version_model: 'Container Type', key_features: 'Movable structure, Weather resistant', description: 'Durable portable site office' }
];

for (const p of productsToSeed) {
  const exists = db.prepare("SELECT 1 FROM products WHERE name = ? AND version_model = ?").get(p.name, p.version_model);
  if (!exists) {
    db.prepare("INSERT INTO products (category, name, version_model, key_features, description) VALUES (?, ?, ?, ?, ?)").run(p.category, p.name, p.version_model, p.key_features, p.description);
  }
}

db.exec(`
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
    customer_id INTEGER,
    items TEXT, -- JSON string
    total_amount REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (id)
  );

  -- Insert default admin user
  INSERT OR IGNORE INTO users (email, password, role, is_verified, permissions)
  VALUES ('admin@example.com', 'admin123', 'admin', 1, '["dashboard", "quotations", "customers", "products", "oef", "settings"]');

  -- Insert default company profile
  INSERT OR IGNORE INTO company_profile (id, name, address, phone, mobile, email, gst_number, authorized_signatory)
  VALUES (1, 'Prolux Electromech (I) Pvt. Ltd', 'Cts No – 109/17, Flat No. 07, Sushila Apartment, Thorat Colony, Income Tax Office Lane, Prabhat Road, Pune-411004.', '020-25430454 / 020-25437754', '+91-8551018754', 'akash@proluxelectromech.com', 'GST Pending', 'Akash Pathak');
`);

export default db;
