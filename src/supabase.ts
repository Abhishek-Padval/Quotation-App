import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. Database operations will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * DATABASE SCHEMA SETUP (Run this in Supabase SQL Editor)
 * 
 * -- 1. Company Profile
 * CREATE TABLE company_profile (
 *   id INTEGER PRIMARY KEY DEFAULT 1,
 *   name TEXT,
 *   tagline TEXT,
 *   address TEXT,
 *   phone TEXT,
 *   mobile TEXT,
 *   email TEXT,
 *   gst_number TEXT,
 *   msme_reg TEXT,
 *   established_year TEXT,
 *   company_type TEXT,
 *   headquarters TEXT,
 *   authorized_partner_since TEXT,
 *   service_locations TEXT,
 *   authorized_signatory TEXT,
 *   logo_url TEXT,
 *   CONSTRAINT single_row CHECK (id = 1)
 * );
 * 
 * -- 2. Quotations
 * CREATE TABLE quotations (
 *   id SERIAL PRIMARY KEY,
 *   ref_number TEXT UNIQUE,
 *   client_name TEXT NOT NULL,
 *   client_address TEXT,
 *   kind_attention TEXT,
 *   subject TEXT,
 *   intro_paragraph TEXT,
 *   date TEXT,
 *   validity_days INTEGER DEFAULT 30,
 *   status TEXT DEFAULT 'pending',
 *   total_basic REAL DEFAULT 0,
 *   total_gst REAL DEFAULT 0,
 *   grand_total REAL DEFAULT 0,
 *   metadata JSONB,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 3. Quotation Items
 * CREATE TABLE quotation_items (
 *   id SERIAL PRIMARY KEY,
 *   quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
 *   description TEXT,
 *   basic_price REAL,
 *   quantity INTEGER,
 *   gst_percent REAL DEFAULT 18
 * );
 * 
 * -- 4. Quotation Terms
 * CREATE TABLE quotation_terms (
 *   id SERIAL PRIMARY KEY,
 *   quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
 *   term_text TEXT
 * );
 * 
 * -- 5. Users
 * CREATE TABLE users (
 *   id SERIAL PRIMARY KEY,
 *   email TEXT UNIQUE NOT NULL,
 *   password TEXT NOT NULL,
 *   first_name TEXT,
 *   last_name TEXT,
 *   mobile TEXT,
 *   role TEXT DEFAULT 'user',
 *   permissions JSONB DEFAULT '[]',
 *   otp TEXT,
 *   is_verified BOOLEAN DEFAULT FALSE,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 6. Products
 * CREATE TABLE products (
 *   id SERIAL PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   description TEXT,
 *   base_price REAL,
 *   category TEXT,
 *   version_model TEXT,
 *   key_features TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   UNIQUE(name, version_model)
 * );
 * 
 * -- 7. Customers
 * CREATE TABLE customers (
 *   id SERIAL PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   address TEXT,
 *   billing_address TEXT,
 *   shipping_address TEXT,
 *   gst_number TEXT,
 *   contact_person TEXT,
 *   phone TEXT,
 *   email TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 8. OEFs
 * CREATE TABLE oefs (
 *   id SERIAL PRIMARY KEY,
 *   oef_no TEXT UNIQUE,
 *   date TEXT,
 *   marketing_executive TEXT,
 *   contact TEXT,
 *   email TEXT,
 *   customer_id INTEGER REFERENCES customers(id),
 *   items JSONB,
 *   total_amount REAL DEFAULT 0,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */
