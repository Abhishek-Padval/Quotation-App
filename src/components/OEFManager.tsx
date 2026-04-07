import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, FileText, Save, X, Download, Upload, User, MapPin, Package, Settings, Search } from 'lucide-react';
import { api } from '../services/api';
import { OEF, OEFItem, Customer } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import * as XLSX from 'xlsx';

export default function OEFManager() {
  const [oefs, setOefs] = useState<OEF[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [customerType, setCustomerType] = useState<'existing' | 'new'>('existing');
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ name: '', address: '', contact_person: '' });
  const [editingOEF, setEditingOEF] = useState<Partial<OEF> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [oData, cData] = await Promise.all([api.getOEFS(), api.getCustomers()]);
      setOefs(oData);
      setCustomers(cData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleNew = () => {
    setEditingOEF({
      oef_no: `PEPIL/${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}/${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
      marketing_executive: '',
      contact: '',
      email: '',
      items: [{ sr_no: 1, description: '', model: '', quantity: 1, unit_price: 0, total: 0, remarks: '' }],
      total_amount: 0
    });
    setCustomerType('existing');
    setNewCustomer({ name: '', address: '', contact_person: '' });
    setShowEditor(true);
  };

  const addItem = () => {
    if (!editingOEF) return;
    const items = [...(editingOEF.items || [])];
    items.push({
      sr_no: items.length + 1,
      description: '',
      model: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
      remarks: ''
    });
    setEditingOEF({ ...editingOEF, items });
  };

  const removeItem = (index: number) => {
    if (!editingOEF) return;
    const items = editingOEF.items?.filter((_, i) => i !== index).map((item, i) => ({ ...item, sr_no: i + 1 }));
    setEditingOEF({ ...editingOEF, items });
    calculateTotal(items || []);
  };

  const updateItem = (index: number, field: keyof OEFItem, value: any) => {
    if (!editingOEF) return;
    const items = [...(editingOEF.items || [])];
    const item = { ...items[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      item.total = Number(item.quantity) * Number(item.unit_price);
    }
    
    items[index] = item;
    setEditingOEF({ ...editingOEF, items });
    calculateTotal(items);
  };

  const calculateTotal = (items: OEFItem[]) => {
    const total = items.reduce((sum, item) => sum + item.total, 0);
    setEditingOEF(prev => prev ? { ...prev, total_amount: total } : null);
  };

  const handleSave = async () => {
    let finalCustomerId = editingOEF?.customer_id;

    if (customerType === 'new') {
      if (!newCustomer.name) {
        alert('Please enter customer name');
        return;
      }
      const res = await api.createCustomer({
        name: newCustomer.name || '',
        address: newCustomer.address || '',
        contact_person: newCustomer.contact_person || '',
        gst_number: '',
        phone: editingOEF?.contact || '',
        email: editingOEF?.email || ''
      });
      finalCustomerId = res.id;
    }

    if (!finalCustomerId) {
      alert('Please select or create a customer');
      return;
    }

    try {
      await api.createOEF({ ...editingOEF!, customer_id: finalCustomerId });
      setShowEditor(false);
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Error saving OEF');
    }
  };

  const exportToExcel = (oef?: OEF) => {
    const dataToExport = oef ? [oef] : oefs;
    if (dataToExport.length === 0) return;

    const wb = XLSX.utils.book_new();
    
    dataToExport.forEach(o => {
      const header = [
        ['PROLUX ELECTROMECH INDIA PVT LTD'],
        ['ORDER EXECUTION FORM'],
        [],
        ['OEF NO', o.oef_no],
        ['Date', o.date],
        ['Marketing Executive', o.marketing_executive],
        ['Contact', o.contact],
        ['Email', o.email],
        ['Customer', o.customer_name],
        ['Address', o.customer_address],
        ['Contact Person', o.contact_person],
        [],
        ['Sr No', 'Description', 'Model', 'Quantity', 'Unit Price', 'Total', 'Remarks']
      ];

      const rows = o.items.map(item => [
        item.sr_no,
        item.description,
        item.model,
        item.quantity,
        item.unit_price,
        item.total,
        item.remarks
      ]);

      const footer = [
        [],
        ['', '', '', '', 'Total', o.total_amount, '']
      ];

      const ws = XLSX.utils.aoa_to_sheet([...header, ...rows, ...footer]);
      XLSX.utils.book_append_sheet(wb, ws, o.oef_no.replace(/\//g, '-'));
    });

    XLSX.writeFile(wb, `OEF_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      // Basic parsing logic based on the exported format
      const importedOEF: Partial<OEF> = {
        items: [],
        total_amount: 0
      };

      data.forEach((row, idx) => {
        if (row[0] === 'OEF NO') importedOEF.oef_no = row[1];
        if (row[0] === 'Date') importedOEF.date = row[1];
        if (row[0] === 'Marketing Executive') importedOEF.marketing_executive = row[1];
        if (row[0] === 'Contact') importedOEF.contact = row[1];
        if (row[0] === 'Email') importedOEF.email = row[1];
        
        // Items start after 'Sr No' header
        if (typeof row[0] === 'number' && idx > 12) {
          importedOEF.items?.push({
            sr_no: row[0],
            description: row[1] || '',
            model: row[2] || '',
            quantity: Number(row[3]) || 0,
            unit_price: Number(row[4]) || 0,
            total: Number(row[5]) || 0,
            remarks: row[6] || ''
          });
        }
        
        if (row[4] === 'Total') importedOEF.total_amount = Number(row[5]);
      });

      if (importedOEF.oef_no) {
        setEditingOEF(importedOEF);
        setShowEditor(true);
      } else {
        alert('Invalid Excel format. Please use the standard OEF format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredOefs = oefs.filter(o => 
    o.oef_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Order Execution Forms (OEF)</h2>
          <p className="text-slate-500">Track and manage order fulfillment</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={importFromExcel} 
            className="hidden" 
            accept=".xlsx, .xls" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-xl font-semibold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Upload size={20} />
            Import Excel
          </button>
          <button 
            onClick={() => exportToExcel()}
            className="flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-xl font-semibold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={20} />
            Export All
          </button>
          <button 
            onClick={handleNew}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Plus size={20} />
            New OEF
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Search by OEF number or customer name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">OEF Number</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOefs.map(o => (
              <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                      <FileText size={18} />
                    </div>
                    <span className="font-bold text-slate-700">{o.oef_no}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-700 font-medium">{o.customer_name}</span>
                    <span className="text-xs text-slate-400">{o.contact_person}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500 text-sm">
                  {o.date}
                </td>
                <td className="px-6 py-4 text-slate-700 font-bold">
                  {formatCurrency(o.total_amount)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => exportToExcel(o)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Export to Excel"
                    >
                      <Download size={18} />
                    </button>
                    <button className="text-indigo-600 text-sm font-bold hover:underline px-2">
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredOefs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                  {searchTerm ? 'No matching OEF forms found.' : 'No OEF forms found. Create your first one to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showEditor && editingOEF && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-5xl max-h-[95vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Order Execution Form</h3>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-0.5">PEPIL Standard Format</p>
              </div>
              <button onClick={() => setShowEditor(false)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
              {/* Company Header */}
              <div className="text-center border-b border-slate-100 pb-8">
                <h2 className="text-2xl font-black text-indigo-900 tracking-tight">PROLUX ELECTROMECH INDIA PVT LTD</h2>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Order Execution Form</p>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OEF NO</label>
                    <input type="text" value={editingOEF.oef_no} onChange={(e) => setEditingOEF({...editingOEF, oef_no: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                    <input 
                      type="date" 
                      value={editingOEF.date} 
                      onChange={(e) => setEditingOEF({ ...editingOEF, date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marketing Executive</label>
                    <input 
                      type="text" 
                      value={editingOEF.marketing_executive} 
                      onChange={(e) => setEditingOEF({ ...editingOEF, marketing_executive: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
                      placeholder="Enter name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact / Mobile</label>
                    <input 
                      type="text" 
                      value={editingOEF.contact} 
                      onChange={(e) => setEditingOEF({ ...editingOEF, contact: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
                      placeholder="+91 00000 00000"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                    <input 
                      type="email" 
                      value={editingOEF.email} 
                      onChange={(e) => setEditingOEF({ ...editingOEF, email: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
                      placeholder="executive@prolux.com"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Section */}
              <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-slate-800 uppercase tracking-wider text-sm">Customer Information</h4>
                  <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                    <button 
                      onClick={() => setCustomerType('existing')}
                      className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", customerType === 'existing' ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}
                    >
                      Existing
                    </button>
                    <button 
                      onClick={() => setCustomerType('new')}
                      className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", customerType === 'new' ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}
                    >
                      New
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Name</label>
                    {customerType === 'existing' ? (
                      <select 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                        value={editingOEF.customer_id || ''}
                        onChange={(e) => setEditingOEF({ ...editingOEF, customer_id: e.target.value })}
                      >
                        <option value="">Select a customer...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <input 
                        type="text"
                        placeholder="Enter company name"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Person</label>
                    <input 
                      type="text"
                      value={customerType === 'existing' ? (customers.find(c => c.id === editingOEF.customer_id)?.contact_person || '') : newCustomer.contact_person}
                      onChange={(e) => customerType === 'new' && setNewCustomer({ ...newCustomer, contact_person: e.target.value })}
                      readOnly={customerType === 'existing'}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                      placeholder="Full name"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Address</label>
                    <textarea 
                      rows={2}
                      value={customerType === 'existing' ? (customers.find(c => c.id === editingOEF.customer_id)?.address || '') : newCustomer.address}
                      onChange={(e) => customerType === 'new' && setNewCustomer({ ...newCustomer, address: e.target.value })}
                      readOnly={customerType === 'existing'}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold resize-none"
                      placeholder="Complete office/site address"
                    />
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <h4 className="font-black text-slate-800 uppercase tracking-wider text-sm">Ordered Material Details</h4>
                  <button 
                    onClick={addItem}
                    className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-widest hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>

                <div className="border border-slate-200 rounded-[2rem] overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16">Sr No</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Description</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Model</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Qty</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-32">Unit Price</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-32">Total</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Remarks</th>
                        <th className="px-4 py-4 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editingOEF.items?.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/50 transition-all">
                          <td className="px-4 py-3 text-center font-bold text-slate-400">{item.sr_no}</td>
                          <td className="px-2 py-3">
                            <input 
                              type="text" 
                              value={item.description} 
                              onChange={(e) => updateItem(idx, 'description', e.target.value)}
                              className="w-full px-3 py-2 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none font-medium text-sm"
                              placeholder="Item name"
                            />
                          </td>
                          <td className="px-2 py-3">
                            <input 
                              type="text" 
                              value={item.model} 
                              onChange={(e) => updateItem(idx, 'model', e.target.value)}
                              className="w-full px-3 py-2 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none font-medium text-sm"
                              placeholder="Model/Rating"
                            />
                          </td>
                          <td className="px-2 py-3">
                            <input 
                              type="number" 
                              value={item.quantity} 
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                              className="w-full px-3 py-2 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none font-bold text-center text-sm"
                            />
                          </td>
                          <td className="px-2 py-3">
                            <input 
                              type="number" 
                              value={item.unit_price} 
                              onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                              className="w-full px-3 py-2 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none font-bold text-right text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-700 text-sm">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="px-2 py-3">
                            <input 
                              type="text" 
                              value={item.remarks} 
                              onChange={(e) => updateItem(idx, 'remarks', e.target.value)}
                              className="w-full px-3 py-2 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none text-xs text-slate-500"
                              placeholder="Notes"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button 
                              onClick={() => removeItem(idx)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/80 font-black">
                        <td colSpan={5} className="px-6 py-4 text-right text-slate-500 uppercase tracking-widest text-[10px]">Grand Total</td>
                        <td className="px-4 py-4 text-right text-indigo-600 text-lg">{formatCurrency(editingOEF.total_amount || 0)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50">
              <button onClick={() => setShowEditor(false)} className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 hover:bg-white rounded-2xl transition-all uppercase tracking-widest text-xs">Cancel</button>
              <button onClick={handleSave} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                <Save size={18} />
                Save Order Execution Form
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
