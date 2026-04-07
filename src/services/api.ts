import { Quotation, CompanyProfile, DashboardStats, User, Product, Customer, OEF, UserRole } from '../types';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { db, auth } from '../firebase';

export const api = {
  async getStats(): Promise<DashboardStats> {
    const qSnap = await getDocs(collection(db, 'quotations'));
    const quotations = qSnap.docs.map(d => d.data() as Quotation);
    
    const now = new Date();
    const totalValue = quotations.reduce((sum, q) => sum + (q.grand_total || 0), 0);
    const pendingValidity = quotations.filter(q => q.status === 'pending').length;
    const expiredQuotations = quotations.filter(q => {
      const date = new Date(q.date);
      const expiry = new Date(date.getTime() + (q.validity_days || 30) * 24 * 60 * 60 * 1000);
      return expiry < now && q.status !== 'accepted';
    }).length;

    return {
      totalQuotations: quotations.length,
      pendingValidity,
      expiredQuotations,
      totalValue
    };
  },

  async getQuotations(): Promise<Quotation[]> {
    const q = query(collection(db, 'quotations'), orderBy('date', 'desc'));
    const qSnap = await getDocs(q);
    return qSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  },

  async getQuotation(id: string): Promise<Quotation> {
    const dSnap = await getDoc(doc(db, 'quotations', id));
    if (!dSnap.exists()) throw new Error('Quotation not found');
    return { id: dSnap.id, ...dSnap.data() } as any;
  },

  async createQuotation(quotation: Partial<Quotation>): Promise<{ id: string }> {
    const docRef = await addDoc(collection(db, 'quotations'), {
      ...quotation,
      created_at: serverTimestamp()
    });
    return { id: docRef.id };
  },

  async deleteQuotation(id: string): Promise<void> {
    await deleteDoc(doc(db, 'quotations', id));
  },

  async getCompany(): Promise<CompanyProfile> {
    const dSnap = await getDoc(doc(db, 'company_profile', '1'));
    if (!dSnap.exists()) throw new Error('Company profile not found');
    return dSnap.data() as CompanyProfile;
  },

  async updateCompany(profile: CompanyProfile): Promise<void> {
    await setDoc(doc(db, 'company_profile', '1'), profile);
  },

  async aiGenerate(type: string, prompt: string): Promise<string> {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, prompt }),
    });
    if (!res.ok) throw new Error('Generation failed');
    const data = await res.json();
    return data.text;
  },

  async getProducts(): Promise<Product[]> {
    const qSnap = await getDocs(collection(db, 'products'));
    return qSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  },

  async createProduct(product: Product): Promise<void> {
    await addDoc(collection(db, 'products'), {
      ...product,
      created_at: serverTimestamp()
    });
  },

  async deleteProduct(id: string): Promise<void> {
    await deleteDoc(doc(db, 'products', id));
  },

  async getCustomers(): Promise<Customer[]> {
    const qSnap = await getDocs(collection(db, 'customers'));
    return qSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  },

  async createCustomer(customer: Customer): Promise<{ id: string }> {
    const docRef = await addDoc(collection(db, 'customers'), {
      ...customer,
      created_at: serverTimestamp()
    });
    return { id: docRef.id };
  },

  async deleteCustomer(id: string): Promise<void> {
    await deleteDoc(doc(db, 'customers', id));
  },

  async getOEFS(): Promise<OEF[]> {
    const qSnap = await getDocs(collection(db, 'oefs'));
    return qSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  },

  async createOEF(oef: Partial<OEF>): Promise<void> {
    await addDoc(collection(db, 'oefs'), {
      ...oef,
      created_at: serverTimestamp()
    });
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

  async login(email: string, password: string): Promise<{ success: boolean, user?: User }> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uSnap = await getDoc(doc(db, 'users', cred.user.uid));
    if (!uSnap.exists()) throw new Error('User profile not found');
    return { success: true, user: { id: cred.user.uid, ...uSnap.data() } as any };
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  async getUsers(): Promise<User[]> {
    const qSnap = await getDocs(collection(db, 'users'));
    return qSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  },

  async createUser(data: Partial<User> & { password?: string }): Promise<{ id: string }> {
    if (!data.email || !data.password) throw new Error('Email and password required');
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const { password, ...profile } = data;
    await setDoc(doc(db, 'users', cred.user.uid), {
      ...profile,
      id: cred.user.uid,
      is_verified: true,
      created_at: serverTimestamp()
    });
    return { id: cred.user.uid };
  },

  async updateUser(id: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(db, 'users', id), data as any);
  },

  async deleteUser(id: string): Promise<void> {
    // Note: This only deletes the Firestore profile, not the Auth user.
    // In a real app, you'd use a Cloud Function for this.
    await deleteDoc(doc(db, 'users', id));
  }
};
