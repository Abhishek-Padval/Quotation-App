export interface CompanyProfile {
  id: string;
  name: string;
  tagline?: string;
  address: string;
  phone: string;
  mobile?: string;
  email: string;
  gst_number: string;
  msme_reg?: string;
  established_year?: string;
  company_type?: string;
  headquarters?: string;
  authorized_partner_since?: string;
  service_locations?: string;
  authorized_signatory: string;
  logo_url?: string;
}

export interface QuotationItem {
  id?: string;
  description: string;
  basic_price: number;
  quantity: number;
  gst_percent: number;
}

export interface TechnicalSpecs {
  ups_unit?: {
    make_model?: string;
    type?: string;
    capacity?: string;
    input_voltage?: string;
    input_frequency?: string;
    output_voltage?: string;
    output_frequency?: string;
    efficiency?: string;
    transfer_time?: string;
    waveform?: string;
    communication?: string;
    display?: string;
    standards?: string;
    dimensions?: string;
    weight?: string;
  };
  battery?: {
    make?: string;
    type?: string;
    voltage_capacity?: string;
    batteries_per_ups?: string;
    configuration?: string;
    design_life?: string;
    operating_temp?: string;
    backup_time?: string;
  };
}

export interface Quotation {
  id?: string;
  ref_number: string;
  client_name: string;
  client_address: string;
  kind_attention: string;
  subject: string;
  intro_paragraph: string;
  date: string;
  validity_days: number;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired';
  total_basic: number;
  total_gst: number;
  grand_total: number;
  items: QuotationItem[];
  terms: string[];
  
  // New fields for detailed format
  location?: string;
  requirement_summary?: string;
  proposed_solution?: string;
  key_benefit?: string;
  delivery_timeline?: string;
  warranty_period?: string;
  
  understanding?: {
    client_site?: string;
    equipment_to_protect?: string;
    backup_time?: string;
    input_power?: string;
    output_requirement?: string;
    site_survey?: string;
    special_requirement?: string;
  };
  
  technical_specs?: TechnicalSpecs;
  
  amc_options?: {
    comprehensive?: {
      visits?: string;
      cost?: number;
    };
    non_comprehensive?: {
      visits?: string;
      cost?: number;
    };
  };
  
  created_at?: string;
}

export interface DashboardStats {
  totalQuotations: number;
  pendingValidity: number;
  expiredQuotations: number;
  totalValue: number;
}

export type UserRole = 'admin' | 'data_entry' | 'oef_manager' | 'viewer' | 'user';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  mobile?: string;
  role: UserRole;
  is_verified: boolean;
  permissions?: string[]; // e.g., ['dashboard', 'quotations', 'customers', 'products', 'oef', 'settings']
}

export interface Product {
  id?: string;
  name: string;
  description: string;
  base_price?: number;
  category?: string;
  version_model?: string;
  key_features?: string;
}

export interface Customer {
  id?: string;
  name: string;
  address: string;
  billing_address?: string;
  shipping_address?: string;
  gst_number: string;
  contact_person: string;
  phone: string;
  email: string;
}

export interface OEFItem {
  sr_no: number;
  description: string;
  model: string;
  quantity: number;
  unit_price: number;
  total: number;
  remarks: string;
}

export interface OEF {
  id?: string;
  oef_no: string;
  date: string;
  marketing_executive: string;
  contact: string;
  email: string;
  customer_id: string;
  customer_name?: string;
  customer_address?: string;
  contact_person?: string;
  items: OEFItem[];
  total_amount: number;
  created_at?: string;
}
