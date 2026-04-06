import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, User, Phone, Mail, MapPin, Search } from 'lucide-react';
import { api } from '../services/api';
import { Customer } from '../types';

export default function CustomerManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Customer>({
    name: '', address: '', billing_address: '', shipping_address: '',
    gst_number: '', contact_person: '', phone: '', email: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const data = await api.getCustomers();
    setCustomers(data);
  };

  const handleAdd = async () => {
    if (!newCustomer.name) return;
    await api.createCustomer(newCustomer);
    setNewCustomer({
      name: '', address: '', billing_address: '', shipping_address: '',
      gst_number: '', contact_person: '', phone: '', email: ''
    });
    setShowAdd(false);
    fetchCustomers();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this customer?')) {
      await api.deleteCustomer(id);
      fetchCustomers();
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.contact_person.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Customer Directory</h2>
          <p className="text-slate-500">Manage your client relationships</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <Plus size={20} />
          Add Customer
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map(c => (
          <motion.div 
            layout
            key={c.id}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 font-bold text-xl">
                  {c.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-xl">{c.name}</h4>
                  <p className="text-slate-500 text-sm">{c.contact_person}</p>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(c.id!)}
                className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone size={16} className="text-slate-400" />
                {c.phone}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail size={16} className="text-slate-400" />
                {c.email}
              </div>
              <div className="col-span-2 flex items-start gap-2 text-slate-600">
                <MapPin size={16} className="text-slate-400 mt-1" />
                <span className="line-clamp-1">{c.address}</span>
              </div>
              <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">
                GST: {c.gst_number}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <h3 className="text-2xl font-bold">Add New Customer</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                  <input 
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Person</label>
                  <input 
                    type="text"
                    value={newCustomer.contact_person}
                    onChange={(e) => setNewCustomer({ ...newCustomer, contact_person: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                  <input 
                    type="text"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                  <input 
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</label>
                  <textarea 
                    rows={2}
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">GST Number</label>
                  <input 
                    type="text"
                    value={newCustomer.gst_number}
                    onChange={(e) => setNewCustomer({ ...newCustomer, gst_number: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdd}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Save Customer
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
