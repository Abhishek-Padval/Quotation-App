import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, FileText, Settings, LayoutDashboard, Trash2, Download, 
  Send, CheckCircle, AlertCircle, Zap, ChevronRight, 
  Save, X, Printer, FileSpreadsheet, Mail, Calculator, Clock,
  Users, Package, ClipboardList, BarChart3, LogOut, Eye, Upload, Shield
} from 'lucide-react';
import { api } from './services/api';
import { Quotation, QuotationItem, CompanyProfile, DashboardStats, User, Product, Customer } from './types';
import { cn, formatCurrency } from './lib/utils';
import { generatePDF } from './lib/pdf';
import * as XLSX from 'xlsx';

// Components
import Login from './components/Login';
import ProductManager from './components/ProductManager';
import CustomerManager from './components/CustomerManager';
import OEFManager from './components/OEFManager';
import SettingsModule from './components/Settings';

const DEFAULT_TERMS = [
  "GST Extra 18%",
  "Freight: Extra at actual",
  "Packing: Extra at actual",
  "Delivery: Within 2–3 weeks from PO",
  "Payment Terms: 45 days from invoice (MSME)",
  "Warranty: 2 years on UPS and Batteries",
  "Installation: In client scope",
  "Validity: 30 days from quotation",
  "Exclusion: Civil and electrical work beyond equipment scope"
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'editor' | 'settings' | 'products' | 'customers' | 'oef' | 'reports'>('dashboard');
  const [settingsTab, setSettingsTab] = useState<'company' | 'users'>('company');
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<Partial<Quotation> | null>(null);
  const [customerType, setCustomerType] = useState<'existing' | 'new'>('existing');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions?.includes(permission);
  };

  useEffect(() => {
    if (user) {
      fetchData();
      // Ensure user is on an allowed tab
      const tabs = ['dashboard', 'oef', 'products', 'customers', 'reports', 'settings'];
      if (!hasPermission(activeTab) && activeTab !== 'editor') {
        const firstAllowed = tabs.find(t => hasPermission(t));
        if (firstAllowed) setActiveTab(firstAllowed as any);
      }
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qData, sData, cData, pData, custData] = await Promise.all([
        api.getQuotations(),
        api.getStats(),
        api.getCompany(),
        api.getProducts(),
        api.getCustomers()
      ]);
      setQuotations(qData);
      setStats(sData);
      setCompany(cData);
      setProducts(pData);
      setCustomers(custData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const handleNewQuotation = () => {
    const newRef = `QTN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setEditingQuotation({
      ref_number: newRef,
      date: new Date().toISOString().split('T')[0],
      client_name: '',
      client_address: '',
      kind_attention: '',
      subject: '',
      intro_paragraph: 'With reference to the above subject and our discussions, we are pleased to submit our proposal for the supply of UPS systems for your facility.',
      validity_days: 30,
      items: [{ description: '', basic_price: 0, quantity: 1, gst_percent: 18 }],
      terms: [...DEFAULT_TERMS],
      total_basic: 0,
      total_gst: 0,
      grand_total: 0,
      location: '',
      requirement_summary: '',
      proposed_solution: '',
      key_benefit: '',
      delivery_timeline: '2-3 weeks',
      warranty_period: '2 years',
      understanding: {
        client_site: '',
        equipment_to_protect: '',
        backup_time: '',
        input_power: 'Single Phase, 230V ±15%, 50Hz',
        output_requirement: 'Single Phase, 230V regulated',
        site_survey: 'No',
        special_requirement: ''
      },
      technical_specs: {
        ups_unit: {
          make_model: 'Eaton 9E Series',
          type: 'True Online Double Conversion',
          capacity: '',
          input_voltage: '160V - 280V',
          input_frequency: '50Hz ± 5%',
          output_voltage: '230V ± 2%',
          output_frequency: '50Hz ± 0.5%',
          efficiency: 'Up to 95%',
          transfer_time: 'Zero ms',
          waveform: 'Pure Sine Wave',
          communication: 'USB / RS232',
          display: 'LCD Panel',
          standards: 'IEC 62040-1',
          dimensions: '',
          weight: ''
        },
        battery: {
          make: 'Exide / Quanta',
          type: 'VRLA SMF',
          voltage_capacity: '12V x 26Ah',
          batteries_per_ups: '',
          configuration: '',
          design_life: '3-5 years',
          operating_temp: '0°C to 40°C',
          backup_time: ''
        }
      },
      amc_options: {
        comprehensive: { visits: '4 per year', cost: 0 },
        non_comprehensive: { visits: '4 per year', cost: 0 }
      }
    });
    setCustomerType('existing');
    setActiveTab('editor');
  };

  const handleSaveQuotation = async () => {
    if (!editingQuotation?.client_name) {
      alert('Client Name is mandatory');
      return;
    }
    setLoading(true);
    try {
      if (customerType === 'new') {
        await api.createCustomer({
          name: editingQuotation.client_name || '',
          address: editingQuotation.client_address || '',
          contact_person: editingQuotation.kind_attention || '',
          gst_number: '',
          phone: '',
          email: ''
        });
      }
      await api.createQuotation(editingQuotation);
      await fetchData();
      
      if (confirm('Quotation saved successfully! Would you like to download the PDF now?')) {
        const items = editingQuotation.items || [];
        const total_basic = items.reduce((sum, item) => sum + (item.basic_price * item.quantity), 0);
        const total_gst = items.reduce((sum, item) => sum + (item.basic_price * item.quantity * item.gst_percent / 100), 0);
        const grand_total = total_basic + total_gst;
        
        const q = { ...editingQuotation, total_basic, total_gst, grand_total } as Quotation;
        generatePDF(q, company!, 'save');
      }
      
      setActiveTab('dashboard');
      setEditingQuotation(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this quotation?')) {
      await api.deleteQuotation(id);
      fetchData();
    }
  };

  const handleExportExcel = (q: Quotation) => {
    const ws = XLSX.utils.json_to_sheet(q.items.map(item => ({
      'Description': item.description,
      'Basic Price': item.basic_price,
      'Quantity': item.quantity,
      'Total Basic': item.basic_price * item.quantity,
      'GST %': item.gst_percent,
      'GST Amount': (item.basic_price * item.quantity * item.gst_percent) / 100,
      'Total with GST': (item.basic_price * item.quantity) * (1 + item.gst_percent / 100)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Commercial Offer');
    XLSX.writeFile(wb, `Quotation_${q.ref_number}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col z-50">
        <div className="p-6 border-b border-slate-50">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <FileText size={24} />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Quotation Pro</h1>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar">
          {hasPermission('dashboard') && (
            <NavItem 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')}
              icon={<LayoutDashboard size={20} />}
              label="Dashboard"
            />
          )}
          {hasPermission('quotations') && (
            <NavItem 
              active={activeTab === 'editor'} 
              onClick={handleNewQuotation}
              icon={<Plus size={20} />}
              label="New Quotation"
            />
          )}
          {hasPermission('oef') && (
            <NavItem 
              active={activeTab === 'oef'} 
              onClick={() => setActiveTab('oef')}
              icon={<ClipboardList size={20} />}
              label="OEF Forms"
            />
          )}
          {hasPermission('products') && (
            <NavItem 
              active={activeTab === 'products'} 
              onClick={() => setActiveTab('products')}
              icon={<Package size={20} />}
              label="Products"
            />
          )}
          {hasPermission('customers') && (
            <NavItem 
              active={activeTab === 'customers'} 
              onClick={() => setActiveTab('customers')}
              icon={<Users size={20} />}
              label="Customers"
            />
          )}
          {hasPermission('reports') && (
            <NavItem 
              active={activeTab === 'reports'} 
              onClick={() => setActiveTab('reports')}
              icon={<BarChart3 size={20} />}
              label="Reports"
            />
          )}
          {hasPermission('settings') && (
            <NavItem 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')}
              icon={<Settings size={20} />}
              label="Settings"
            />
          )}
        </nav>

        <div className="p-6 border-t border-slate-100 bg-slate-50/30">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-xs font-bold">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {user.first_name || user.last_name 
                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim() 
                  : user.email.split('@')[0]}
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={() => setUser(null)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 z-40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current View</span>
            <ChevronRight size={14} className="text-slate-300" />
            <h2 className="text-sm font-bold text-slate-900 capitalize">{activeTab.replace('_', ' ')}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900">
                  {user.first_name || user.last_name 
                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() 
                    : user.email}
                </p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user.role}</p>
              </div>
              <button 
                onClick={() => setUser(null)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all group relative"
                title="Logout"
              >
                <LogOut size={20} />
                <span className="absolute top-full right-0 mt-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Sign Out
                </span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-8 flex-1">
          <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-1">Dashboard</h2>
                  <p className="text-slate-500">Overview of your business quotations</p>
                </div>
                <button 
                  onClick={handleNewQuotation}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  <Plus size={20} />
                  Create Quotation
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  label="Total Quotations" 
                  value={stats?.totalQuotations || 0} 
                  icon={<FileText className="text-blue-600" />}
                  color="blue"
                />
                <StatCard 
                  label="Total Value" 
                  value={formatCurrency(stats?.totalValue || 0)} 
                  icon={<Calculator className="text-emerald-600" />}
                  color="emerald"
                />
                <StatCard 
                  label="Pending Validity" 
                  value={stats?.pendingValidity || 0} 
                  icon={<Clock className="text-amber-600" />}
                  color="amber"
                />
                <StatCard 
                  label="Expired" 
                  value={stats?.expiredQuotations || 0} 
                  icon={<AlertCircle className="text-rose-600" />}
                  color="rose"
                />
              </div>

              {/* Quick Actions */}
              {user.role === 'admin' && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Zap size={20} className="text-indigo-600" />
                    Quick Actions
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => {
                        setActiveTab('settings');
                        setSettingsTab('users');
                      }}
                      className="flex items-center gap-2 bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-50 hover:text-indigo-700 transition-all border border-slate-100"
                    >
                      <Users size={18} />
                      Manage Users
                    </button>
                    <button 
                      onClick={() => setActiveTab('products')}
                      className="flex items-center gap-2 bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-50 hover:text-indigo-700 transition-all border border-slate-100"
                    >
                      <Package size={18} />
                      Update Inventory
                    </button>
                    <button 
                      onClick={() => setActiveTab('oef')}
                      className="flex items-center gap-2 bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-50 hover:text-indigo-700 transition-all border border-slate-100"
                    >
                      <ClipboardList size={18} />
                      Review OEFs
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Quotations */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-bottom border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg">Recent Quotations</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-6 py-4">Ref Number</th>
                        <th className="px-6 py-4">Client</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quotations.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 font-medium text-indigo-600">{q.ref_number}</td>
                          <td className="px-6 py-4">{q.client_name}</td>
                          <td className="px-6 py-4 text-slate-500">{q.date}</td>
                          <td className="px-6 py-4 font-semibold">{formatCurrency(q.grand_total)}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                              q.status === 'pending' ? "bg-amber-100 text-amber-700" :
                              q.status === 'sent' ? "bg-blue-100 text-blue-700" :
                              "bg-emerald-100 text-emerald-700"
                            )}>
                              {q.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={async () => {
                                  const fullQ = await api.getQuotation(q.id!);
                                  generatePDF(fullQ, company!);
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Download PDF"
                              >
                                <Download size={18} />
                              </button>
                              <button 
                                onClick={() => handleDelete(q.id!)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'editor' && editingQuotation && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Create Quotation</h2>
                    <p className="text-slate-500">Ref: {editingQuotation.ref_number}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleSaveQuotation}
                    disabled={loading}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                  >
                    <Save size={20} />
                    {loading ? 'Saving...' : 'Save Quotation'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Client Details */}
                  <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <FileText size={20} className="text-indigo-600" />
                      Client Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Type</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              checked={customerType === 'existing'} 
                              onChange={() => setCustomerType('existing')}
                              className="w-4 h-4 text-indigo-600"
                            />
                            <span className="text-sm font-medium">Existing Customer</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              checked={customerType === 'new'} 
                              onChange={() => setCustomerType('new')}
                              className="w-4 h-4 text-indigo-600"
                            />
                            <span className="text-sm font-medium">New Customer</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client Name *</label>
                        {customerType === 'existing' ? (
                          <select 
                            value={editingQuotation.client_name}
                            onChange={(e) => {
                              const selected = customers.find(c => c.name === e.target.value);
                              if (selected) {
                                setEditingQuotation({ 
                                  ...editingQuotation, 
                                  client_name: selected.name,
                                  client_address: selected.address,
                                  kind_attention: selected.contact_person
                                });
                              } else {
                                setEditingQuotation({ ...editingQuotation, client_name: e.target.value });
                              }
                            }}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          >
                            <option value="">Select client...</option>
                            {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        ) : (
                          <input 
                            type="text"
                            value={editingQuotation.client_name}
                            onChange={(e) => setEditingQuotation({ ...editingQuotation, client_name: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="Enter new client name"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kind Attention</label>
                        <input 
                          type="text" 
                          value={editingQuotation.kind_attention}
                          onChange={(e) => setEditingQuotation({ ...editingQuotation, kind_attention: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Contact person name"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client Address</label>
                        <textarea 
                          rows={2}
                          value={editingQuotation.client_address}
                          onChange={(e) => setEditingQuotation({ ...editingQuotation, client_address: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                          placeholder="Full office address"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                          <button 
                            onClick={async () => {
                              setAiLoading(true);
                              const prompt = `Generate a professional business quotation subject line for a client named ${editingQuotation.client_name} regarding the following products: ${editingQuotation.items?.map(i => i.description).join(', ')}`;
                              const result = await api.aiGenerate('Subject Generation', prompt);
                              setEditingQuotation({ ...editingQuotation, subject: result.replace(/^Subject:\s*/i, '') });
                              setAiLoading(false);
                            }}
                            className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                          >
                            <Zap size={14} />
                            Auto Generate
                          </button>
                        </div>
                        <input 
                          type="text" 
                          value={editingQuotation.subject}
                          onChange={(e) => setEditingQuotation({ ...editingQuotation, subject: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Quotation for..."
                        />
                      </div>
                    </div>
                  </section>

                  {/* Proposal Details */}
                  <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <FileText size={20} className="text-indigo-600" />
                      Proposal Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project Location</label>
                        <input 
                          type="text" 
                          value={editingQuotation.location || ''}
                          onChange={(e) => setEditingQuotation({ ...editingQuotation, location: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="e.g. Mumbai, Maharashtra"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Timeline</label>
                        <input 
                          type="text" 
                          value={editingQuotation.delivery_timeline || ''}
                          onChange={(e) => setEditingQuotation({ ...editingQuotation, delivery_timeline: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="e.g. 2-3 weeks"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Warranty Period</label>
                        <input 
                          type="text" 
                          value={editingQuotation.warranty_period || ''}
                          onChange={(e) => setEditingQuotation({ ...editingQuotation, warranty_period: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="e.g. 2 years"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requirement Summary</label>
                        <textarea 
                          rows={2}
                          value={editingQuotation.requirement_summary || ''}
                          onChange={(e) => setEditingQuotation({ ...editingQuotation, requirement_summary: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Proposed Solution</label>
                        <textarea 
                          rows={2}
                          value={editingQuotation.proposed_solution || ''}
                          onChange={(e) => setEditingQuotation({ ...editingQuotation, proposed_solution: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Technical Understanding */}
                  <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Shield size={20} className="text-indigo-600" />
                      Technical Understanding
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client Site</label>
                        <input 
                          type="text" 
                          value={editingQuotation.understanding?.client_site || ''}
                          onChange={(e) => setEditingQuotation({ 
                            ...editingQuotation, 
                            understanding: { ...editingQuotation.understanding!, client_site: e.target.value } 
                          })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment to Protect</label>
                        <input 
                          type="text" 
                          value={editingQuotation.understanding?.equipment_to_protect || ''}
                          onChange={(e) => setEditingQuotation({ 
                            ...editingQuotation, 
                            understanding: { ...editingQuotation.understanding!, equipment_to_protect: e.target.value } 
                          })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Backup Time Required</label>
                        <input 
                          type="text" 
                          value={editingQuotation.understanding?.backup_time || ''}
                          onChange={(e) => setEditingQuotation({ 
                            ...editingQuotation, 
                            understanding: { ...editingQuotation.understanding!, backup_time: e.target.value } 
                          })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Site Survey Done?</label>
                        <select 
                          value={editingQuotation.understanding?.site_survey || 'No'}
                          onChange={(e) => setEditingQuotation({ 
                            ...editingQuotation, 
                            understanding: { ...editingQuotation.understanding!, site_survey: e.target.value } 
                          })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* Technical Specifications */}
                  <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Settings size={20} className="text-indigo-600" />
                      Detailed Technical Specifications
                    </h3>
                    
                    <div className="space-y-8">
                      {/* UPS Unit */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">UPS Unit Specifications</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Make/Model</label>
                            <input 
                              type="text" 
                              value={editingQuotation.technical_specs?.ups_unit.make_model || ''}
                              onChange={(e) => setEditingQuotation({ 
                                ...editingQuotation, 
                                technical_specs: { 
                                  ...editingQuotation.technical_specs!, 
                                  ups_unit: { ...editingQuotation.technical_specs!.ups_unit, make_model: e.target.value } 
                                } 
                              })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Capacity</label>
                            <input 
                              type="text" 
                              value={editingQuotation.technical_specs?.ups_unit.capacity || ''}
                              onChange={(e) => setEditingQuotation({ 
                                ...editingQuotation, 
                                technical_specs: { 
                                  ...editingQuotation.technical_specs!, 
                                  ups_unit: { ...editingQuotation.technical_specs!.ups_unit, capacity: e.target.value } 
                                } 
                              })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Efficiency</label>
                            <input 
                              type="text" 
                              value={editingQuotation.technical_specs?.ups_unit.efficiency || ''}
                              onChange={(e) => setEditingQuotation({ 
                                ...editingQuotation, 
                                technical_specs: { 
                                  ...editingQuotation.technical_specs!, 
                                  ups_unit: { ...editingQuotation.technical_specs!.ups_unit, efficiency: e.target.value } 
                                } 
                              })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Battery */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Battery Bank Specifications</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Battery Make</label>
                            <input 
                              type="text" 
                              value={editingQuotation.technical_specs?.battery.make || ''}
                              onChange={(e) => setEditingQuotation({ 
                                ...editingQuotation, 
                                technical_specs: { 
                                  ...editingQuotation.technical_specs!, 
                                  battery: { ...editingQuotation.technical_specs!.battery, make: e.target.value } 
                                } 
                              })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Voltage/Capacity</label>
                            <input 
                              type="text" 
                              value={editingQuotation.technical_specs?.battery.voltage_capacity || ''}
                              onChange={(e) => setEditingQuotation({ 
                                ...editingQuotation, 
                                technical_specs: { 
                                  ...editingQuotation.technical_specs!, 
                                  battery: { ...editingQuotation.technical_specs!.battery, voltage_capacity: e.target.value } 
                                } 
                              })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Qty per UPS</label>
                            <input 
                              type="text" 
                              value={editingQuotation.technical_specs?.battery.batteries_per_ups || ''}
                              onChange={(e) => setEditingQuotation({ 
                                ...editingQuotation, 
                                technical_specs: { 
                                  ...editingQuotation.technical_specs!, 
                                  battery: { ...editingQuotation.technical_specs!.battery, batteries_per_ups: e.target.value } 
                                } 
                              })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* AMC Options */}
                  <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Clock size={20} className="text-indigo-600" />
                      After Sales Support (AMC Options)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
                        <h4 className="font-bold text-slate-900">Comprehensive AMC</h4>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Annual Cost</label>
                          <input 
                            type="number" 
                            value={editingQuotation.amc_options?.comprehensive.cost || 0}
                            onChange={(e) => setEditingQuotation({ 
                              ...editingQuotation, 
                              amc_options: { 
                                ...editingQuotation.amc_options!, 
                                comprehensive: { ...editingQuotation.amc_options!.comprehensive, cost: Number(e.target.value) } 
                              } 
                            })}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl"
                          />
                        </div>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
                        <h4 className="font-bold text-slate-900">Non-Comprehensive AMC</h4>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Annual Cost</label>
                          <input 
                            type="number" 
                            value={editingQuotation.amc_options?.non_comprehensive.cost || 0}
                            onChange={(e) => setEditingQuotation({ 
                              ...editingQuotation, 
                              amc_options: { 
                                ...editingQuotation.amc_options!, 
                                non_comprehensive: { ...editingQuotation.amc_options!.non_comprehensive, cost: Number(e.target.value) } 
                              } 
                            })}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Product Table */}
                  <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <LayoutDashboard size={20} className="text-indigo-600" />
                        Commercial Offer (Annexure 1)
                      </h3>
                      <button 
                        onClick={() => {
                          const items = [...(editingQuotation.items || [])];
                          items.push({ description: '', basic_price: 0, quantity: 1, gst_percent: 18 });
                          setEditingQuotation({ ...editingQuotation, items });
                        }}
                        className="text-sm font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <Plus size={16} />
                        Add Item
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <tr>
                            <th className="pb-4 pr-4">Description</th>
                            <th className="pb-4 px-4 w-32">Price</th>
                            <th className="pb-4 px-4 w-20">Qty</th>
                            <th className="pb-4 px-4 w-24">GST %</th>
                            <th className="pb-4 pl-4 w-32 text-right">Total</th>
                            <th className="pb-4 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {editingQuotation.items?.map((item, idx) => (
                            <tr key={idx} className="group">
                              <td className="py-4 pr-4">
                                {item.description === 'MANUAL_ENTRY' || !products.some(p => p.name === item.description) && item.description !== '' ? (
                                  <div className="flex gap-2 items-center">
                                    <input 
                                      type="text" 
                                      autoFocus
                                      value={item.description === 'MANUAL_ENTRY' ? '' : item.description}
                                      onChange={(e) => {
                                        const items = [...editingQuotation.items!];
                                        items[idx].description = e.target.value;
                                        setEditingQuotation({ ...editingQuotation, items });
                                      }}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                                      placeholder="Enter product & specifications..."
                                    />
                                    <button 
                                      onClick={() => {
                                        const items = [...editingQuotation.items!];
                                        items[idx].description = '';
                                        setEditingQuotation({ ...editingQuotation, items });
                                      }}
                                      className="text-slate-400 hover:text-indigo-600"
                                      title="Back to list"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <select 
                                    value={item.description}
                                    onChange={(e) => {
                                      const items = [...editingQuotation.items!];
                                      if (e.target.value === 'MANUAL_ENTRY') {
                                        items[idx].description = 'MANUAL_ENTRY';
                                      } else {
                                        const selected = products.find(p => p.name === e.target.value);
                                        if (selected) {
                                          items[idx] = { 
                                            ...items[idx], 
                                            description: selected.name, 
                                            basic_price: selected.base_price || 0
                                          };
                                        } else {
                                          items[idx].description = e.target.value;
                                        }
                                      }
                                      setEditingQuotation({ ...editingQuotation, items });
                                    }}
                                    className="w-full bg-transparent border-none focus:ring-0 outline-none p-0"
                                  >
                                    <option value="">Select product...</option>
                                    {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    <option value="MANUAL_ENTRY" className="font-bold text-indigo-600">+ Other (Manual Entry)</option>
                                  </select>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <input 
                                  type="number"
                                  value={item.basic_price}
                                  onChange={(e) => {
                                    const items = [...editingQuotation.items!];
                                    items[idx].basic_price = Number(e.target.value);
                                    setEditingQuotation({ ...editingQuotation, items });
                                  }}
                                  className="w-full bg-transparent border-none focus:ring-0 outline-none p-0"
                                />
                              </td>
                              <td className="py-4 px-4">
                                <input 
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const items = [...editingQuotation.items!];
                                    items[idx].quantity = Number(e.target.value);
                                    setEditingQuotation({ ...editingQuotation, items });
                                  }}
                                  className="w-full bg-transparent border-none focus:ring-0 outline-none p-0"
                                />
                              </td>
                              <td className="py-4 px-4">
                                <select 
                                  value={item.gst_percent}
                                  onChange={(e) => {
                                    const items = [...editingQuotation.items!];
                                    items[idx].gst_percent = Number(e.target.value);
                                    setEditingQuotation({ ...editingQuotation, items });
                                  }}
                                  className="w-full bg-transparent border-none focus:ring-0 outline-none p-0"
                                >
                                  <option value={0}>0%</option>
                                  <option value={5}>5%</option>
                                  <option value={12}>12%</option>
                                  <option value={18}>18%</option>
                                  <option value={28}>28%</option>
                                </select>
                              </td>
                              <td className="py-4 pl-4 text-right font-semibold">
                                {formatCurrency(item.basic_price * item.quantity * (1 + item.gst_percent / 100))}
                              </td>
                              <td className="py-4 pl-4">
                                <button 
                                  onClick={() => {
                                    const items = editingQuotation.items!.filter((_, i) => i !== idx);
                                    setEditingQuotation({ ...editingQuotation, items });
                                  }}
                                  className="text-slate-300 hover:text-rose-500 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Terms & Conditions */}
                  <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <AlertCircle size={20} className="text-indigo-600" />
                        Terms & Conditions (Annexure 2)
                      </h3>
                      <button 
                        onClick={async () => {
                          setAiLoading(true);
                          const prompt = `Rewrite these business terms and conditions to be more professional and clear: ${editingQuotation.terms?.join('; ')}`;
                          const result = await api.aiGenerate('Terms Improvement', prompt);
                          setEditingQuotation({ ...editingQuotation, terms: result.split('\n').filter(t => t.trim()) });
                          setAiLoading(false);
                        }}
                        className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                      >
                        <Zap size={14} />
                        Smart Refine
                      </button>
                    </div>
                    <div className="space-y-3">
                      {editingQuotation.terms?.map((term, idx) => (
                        <div key={idx} className="flex gap-3 items-start group">
                          <span className="text-slate-400 font-bold mt-2">{idx + 1}.</span>
                          <input 
                            type="text"
                            value={term}
                            onChange={(e) => {
                              const terms = [...editingQuotation.terms!];
                              terms[idx] = e.target.value;
                              setEditingQuotation({ ...editingQuotation, terms });
                            }}
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                          <button 
                            onClick={() => {
                              const terms = editingQuotation.terms!.filter((_, i) => i !== idx);
                              setEditingQuotation({ ...editingQuotation, terms });
                            }}
                            className="mt-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const terms = [...(editingQuotation.terms || [])];
                          terms.push("");
                          setEditingQuotation({ ...editingQuotation, terms });
                        }}
                        className="text-sm font-bold text-indigo-600 flex items-center gap-1 px-4 py-2"
                      >
                        <Plus size={16} />
                        Add Term
                      </button>
                    </div>
                  </section>
                </div>

                {/* Right Column: Summary & Smart Tools */}
                <div className="space-y-8">
                  <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 sticky top-8">
                    <h3 className="text-lg font-bold">Quotation Summary</h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between text-slate-500">
                        <span>Total Basic</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(editingQuotation.items?.reduce((sum, item) => sum + (item.basic_price * item.quantity), 0) || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Total GST</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(editingQuotation.items?.reduce((sum, item) => sum + (item.basic_price * item.quantity * item.gst_percent / 100), 0) || 0)}
                        </span>
                      </div>
                      <div className="h-px bg-slate-100 my-2" />
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-slate-900">Grand Total</span>
                        <span className="text-2xl font-black text-indigo-600">
                          {formatCurrency(editingQuotation.items?.reduce((sum, item) => sum + (item.basic_price * item.quantity * (1 + item.gst_percent / 100)), 0) || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <button 
                        onClick={() => {
                          const items = editingQuotation.items || [];
                          const total_basic = items.reduce((sum, item) => sum + (item.basic_price * item.quantity), 0);
                          const total_gst = items.reduce((sum, item) => sum + (item.basic_price * item.quantity * item.gst_percent / 100), 0);
                          const grand_total = total_basic + total_gst;
                          
                          const q = { ...editingQuotation, total_basic, total_gst, grand_total } as Quotation;
                          generatePDF(q, company!, 'preview');
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
                      >
                        <Eye size={20} />
                        Preview PDF
                      </button>
                      <button 
                        onClick={() => {
                          const items = editingQuotation.items || [];
                          const total_basic = items.reduce((sum, item) => sum + (item.basic_price * item.quantity), 0);
                          const total_gst = items.reduce((sum, item) => sum + (item.basic_price * item.quantity * item.gst_percent / 100), 0);
                          const grand_total = total_basic + total_gst;
                          
                          const q = { ...editingQuotation, total_basic, total_gst, grand_total } as Quotation;
                          generatePDF(q, company!, 'save');
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                      >
                        <Download size={20} />
                        Download PDF
                      </button>
                      <button className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all">
                        <Mail size={20} />
                        Share via Email
                      </button>
                    </div>

                    <div className="pt-6 border-t border-slate-100 space-y-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Smart Assistant</p>
                      <button 
                        onClick={async () => {
                          setAiLoading(true);
                          const prompt = `Write a professional, warm, and formal introduction paragraph for a business quotation to ${editingQuotation.client_name}. Mention we are providing a competitive offer.`;
                          const result = await api.aiGenerate('Intro Generation', prompt);
                          setEditingQuotation({ ...editingQuotation, intro_paragraph: result });
                          setAiLoading(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors"
                      >
                        <Zap size={18} />
                        Rewrite Introduction
                      </button>
                      <button 
                        onClick={async () => {
                          setAiLoading(true);
                          const prompt = `Based on these items: ${editingQuotation.items?.map(i => `${i.quantity}x ${i.description}`).join(', ')}, predict a realistic delivery timeline in weeks. Just give the timeline string.`;
                          const result = await api.aiGenerate('Timeline Prediction', prompt);
                          const terms = [...(editingQuotation.terms || [])];
                          const deliveryIdx = terms.findIndex(t => t.toLowerCase().includes('delivery'));
                          if (deliveryIdx !== -1) {
                            terms[deliveryIdx] = `Delivery: ${result}`;
                          } else {
                            terms.push(`Delivery: ${result}`);
                          }
                          setEditingQuotation({ ...editingQuotation, terms });
                          setAiLoading(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors"
                      >
                        <Clock size={18} />
                        Predict Timeline
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'oef' && <OEFManager />}
          {activeTab === 'products' && <ProductManager />}
          {activeTab === 'customers' && <CustomerManager />}
          {activeTab === 'reports' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <h2 className="text-3xl font-bold tracking-tight">Business Reports</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-lg mb-4">Sales Performance</h3>
                  <div className="h-48 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    Chart Placeholder
                  </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-lg mb-4">Quotation Conversion</h3>
                  <div className="h-48 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    Chart Placeholder
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && company && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <button
                  onClick={() => setSettingsTab('company')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    settingsTab === 'company' ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
                  )}
                >
                  Company Profile
                </button>
                {user.role === 'admin' && (
                  <button
                    onClick={() => setSettingsTab('users')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                      settingsTab === 'users' ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    User Management
                  </button>
                )}
              </div>

              {settingsTab === 'company' ? (
                <div className="max-w-2xl mx-auto space-y-8">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight mb-2">Company Settings</h2>
                    <p className="text-slate-500">Configure your business profile for quotations</p>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Logo</label>
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
                            {company.logo_url ? (
                              <img src={company.logo_url} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                              <div className="text-slate-300 text-xs text-center p-2">No Logo</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setCompany({ ...company, logo_url: reader.result as string });
                                  };
                                  reader.readAsDataURL(file);
                                }
                                e.target.value = ''; // Reset input
                              }}
                              className="hidden" 
                              id="logo-upload"
                            />
                            <label 
                              htmlFor="logo-upload"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-100 cursor-pointer transition-all"
                            >
                              <Upload size={18} />
                              Upload Logo
                            </label>
                            {company.logo_url && (
                              <button 
                                onClick={() => setCompany({ ...company, logo_url: undefined })}
                                className="ml-2 text-xs text-red-500 hover:underline"
                              >
                                Remove
                              </button>
                            )}
                            <p className="text-[10px] text-slate-400 mt-2">Recommended: Square image, PNG or JPG</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                        <input 
                          type="text" 
                          value={company.name}
                          onChange={(e) => setCompany({ ...company, name: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tagline / Partner Info</label>
                        <input 
                          type="text" 
                          value={company.tagline || ''}
                          onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="e.g. Authorized Eaton Partner"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</label>
                        <textarea 
                          rows={3}
                          value={company.address}
                          onChange={(e) => setCompany({ ...company, address: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                          <input 
                            type="text" 
                            value={company.phone}
                            onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile</label>
                          <input 
                            type="text" 
                            value={company.mobile || ''}
                            onChange={(e) => setCompany({ ...company, mobile: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                          <input 
                            type="email" 
                            value={company.email}
                            onChange={(e) => setCompany({ ...company, email: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">GST Number</label>
                          <input 
                            type="text" 
                            value={company.gst_number}
                            onChange={(e) => setCompany({ ...company, gst_number: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Established Year</label>
                          <input 
                            type="text" 
                            value={company.established_year || ''}
                            onChange={(e) => setCompany({ ...company, established_year: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Type</label>
                          <input 
                            type="text" 
                            value={company.company_type || ''}
                            onChange={(e) => setCompany({ ...company, company_type: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">MSME Reg. No.</label>
                          <input 
                            type="text" 
                            value={company.msme_reg || ''}
                            onChange={(e) => setCompany({ ...company, msme_reg: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Headquarters</label>
                          <input 
                            type="text" 
                            value={company.headquarters || ''}
                            onChange={(e) => setCompany({ ...company, headquarters: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Authorized Partner Info</label>
                        <input 
                          type="text" 
                          value={company.authorized_partner_since || ''}
                          onChange={(e) => setCompany({ ...company, authorized_partner_since: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="e.g. Eaton Authorized Channel Partner since 2015"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Locations</label>
                        <input 
                          type="text" 
                          value={company.service_locations || ''}
                          onChange={(e) => setCompany({ ...company, service_locations: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Authorized Signatory</label>
                        <input 
                          type="text" 
                          value={company.authorized_signatory}
                          onChange={(e) => setCompany({ ...company, authorized_signatory: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        setLoading(true);
                        await api.updateCompany(company);
                        setLoading(false);
                        alert('Settings updated successfully!');
                      }}
                      className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                      {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              ) : (
                <SettingsModule currentUser={user} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>

      {/* Loading Overlay */}
      {aiLoading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-indigo-100 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-bold text-indigo-600">Processing...</p>
              <p className="text-xs text-slate-400">Crafting professional content for you</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all",
        active 
          ? "bg-indigo-50 text-indigo-600 shadow-sm" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100",
    emerald: "bg-emerald-50 border-emerald-100",
    amber: "bg-amber-50 border-amber-100",
    rose: "bg-rose-50 border-rose-100",
  };

  return (
    <div className={cn("p-6 rounded-3xl border shadow-sm bg-white", colors[color])}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white rounded-xl shadow-sm">
          {icon}
        </div>
      </div>
      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
