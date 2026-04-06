-- SQL for Supabase to set up the Quotation Pro tables

-- 1. Company Profile
CREATE TABLE IF NOT EXISTS company_profile (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
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

-- 2. Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
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
  metadata JSONB, -- Using JSONB for extra fields
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Quotation Items
CREATE TABLE IF NOT EXISTS quotation_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  quotation_id BIGINT REFERENCES quotations(id) ON DELETE CASCADE,
  description TEXT,
  basic_price REAL,
  quantity INTEGER,
  gst_percent REAL DEFAULT 18
);

-- 4. Quotation Terms
CREATE TABLE IF NOT EXISTS quotation_terms (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  quotation_id BIGINT REFERENCES quotations(id) ON DELETE CASCADE,
  term_text TEXT
);

-- 5. Users
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  mobile TEXT,
  role TEXT DEFAULT 'user',
  permissions JSONB DEFAULT '[]'::jsonb,
  otp TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Products
CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  description TEXT,
  base_price REAL,
  category TEXT,
  version_model TEXT,
  key_features TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, version_model)
);

-- 7. Customers
CREATE TABLE IF NOT EXISTS customers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  address TEXT,
  billing_address TEXT,
  shipping_address TEXT,
  gst_number TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. OEFs
CREATE TABLE IF NOT EXISTS oefs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  oef_no TEXT UNIQUE,
  date TEXT,
  marketing_executive TEXT,
  contact TEXT,
  email TEXT,
  customer_id BIGINT REFERENCES customers(id),
  items JSONB, -- Using JSONB
  total_amount REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Data
INSERT INTO company_profile (id, name, address, phone, mobile, email, gst_number, authorized_signatory)
VALUES (1, 'Prolux Electromech (I) Pvt. Ltd', 'Cts No – 109/17, Flat No. 07, Sushila Apartment, Thorat Colony, Income Tax Office Lane, Prabhat Road, Pune-411004.', '020-25430454 / 020-25437754', '+91-8551018754', 'akash@proluxelectromech.com', 'GST Pending', 'Akash Pathak')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (email, password, role, is_verified, permissions)
VALUES ('admin@example.com', 'admin123', 'admin', TRUE, '["dashboard", "quotations", "customers", "products", "oef", "settings"]'::jsonb)
ON CONFLICT (email) DO NOTHING;
