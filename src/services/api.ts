import { Quotation, CompanyProfile, DashboardStats, User, Product, Customer, OEF } from '../types';

export const api = {
  async getStats(): Promise<DashboardStats> {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getQuotations(): Promise<Quotation[]> {
    const res = await fetch('/api/quotations');
    if (!res.ok) throw new Error('Failed to fetch quotations');
    return res.json();
  },

  async getQuotation(id: number): Promise<Quotation> {
    const res = await fetch(`/api/quotations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch quotation');
    return res.json();
  },

  async createQuotation(quotation: Partial<Quotation>): Promise<{ id: number }> {
    const res = await fetch('/api/quotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quotation),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to create quotation' }));
      throw new Error(error.error || 'Failed to create quotation');
    }
    return res.json();
  },

  async deleteQuotation(id: number): Promise<void> {
    const res = await fetch(`/api/quotations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete quotation');
  },

  async getCompany(): Promise<CompanyProfile> {
    const res = await fetch('/api/company');
    if (!res.ok) throw new Error('Failed to fetch company profile');
    return res.json();
  },

  async updateCompany(profile: CompanyProfile): Promise<void> {
    const res = await fetch('/api/company', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error('Failed to update company profile');
  },

  async aiGenerate(type: string, prompt: string): Promise<string> {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, prompt }),
    });
    if (!res.ok) throw new Error('AI generation failed');
    const data = await res.json();
    return data.text;
  },

  async getProducts(): Promise<Product[]> {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  async createProduct(product: Product): Promise<void> {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error('Failed to create product');
  },

  async deleteProduct(id: number): Promise<void> {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete product');
  },

  async getCustomers(): Promise<Customer[]> {
    const res = await fetch('/api/customers');
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  },

  async createCustomer(customer: Customer): Promise<{ id: number }> {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to create customer' }));
      throw new Error(error.error || 'Failed to create customer');
    }
    return res.json();
  },

  async deleteCustomer(id: number): Promise<void> {
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete customer');
  },

  async getOEFS(): Promise<OEF[]> {
    const res = await fetch('/api/oefs');
    if (!res.ok) throw new Error('Failed to fetch OEFs');
    return res.json();
  },

  async createOEF(oef: Partial<OEF>): Promise<void> {
    const res = await fetch('/api/oefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(oef),
    });
    if (!res.ok) throw new Error('Failed to create OEF');
  },

  async parseProductPDF(base64: string): Promise<Product[]> {
    const res = await fetch('/api/ai/parse-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: base64 }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to parse PDF' }));
      throw new Error(error.error || 'Failed to parse PDF');
    }
    return res.json();
  },

  async login(email: string, password: string): Promise<{ success: boolean, requiresOtp?: boolean, user?: User, token?: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  async sendOtp(email: string, type: 'login' | 'reset' = 'login'): Promise<{ success: boolean, debugOtp?: string }> {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type }),
    });
    if (!res.ok) throw new Error('Failed to send OTP');
    return res.json();
  },

  async resetPassword(data: { email: string, otp: string, newPassword: string }): Promise<void> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to reset password' }));
      throw new Error(error.error || 'Failed to reset password');
    }
  },

  async verifyOtp(email: string, otp: string): Promise<{ user: User, token: string }> {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) throw new Error('OTP verification failed');
    return res.json();
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async createUser(data: Partial<User> & { password?: string }): Promise<{ id: number }> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
  },

  async updateUser(id: number, data: Partial<User>): Promise<void> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update user');
  },

  async deleteUser(id: number): Promise<void> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to delete user' }));
      throw new Error(error.error || 'Failed to delete user');
    }
  }
};
