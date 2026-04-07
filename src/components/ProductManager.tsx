import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Package, Search, Upload, FileUp, Zap } from 'lucide-react';
import { api } from '../services/api';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState<Product>({ 
    name: '', 
    description: '', 
    category: '',
    version_model: '',
    key_features: ''
  });
  const [aiParsing, setAiParsing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const data = await api.getProducts();
    setProducts(data);
  };

  const handleAdd = async () => {
    if (!newProduct.name) return;
    await api.createProduct(newProduct);
    setNewProduct({ 
      name: '', 
      description: '', 
      category: '',
      version_model: '',
      key_features: ''
    });
    setShowAdd(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this product?')) {
      await api.deleteProduct(id);
      fetchProducts();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiParsing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const extracted = await api.parseProductPDF(base64);
        for (const p of extracted) {
          await api.createProduct(p);
        }
        fetchProducts();
        alert(`Successfully extracted ${extracted.length} products!`);
      } catch (err) {
        alert('Failed to parse PDF');
      } finally {
        setAiParsing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Product Catalog</h2>
          <p className="text-slate-500">Manage your inventory and pricing</p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-all cursor-pointer">
            <FileUp size={20} />
            Import from PDF
            <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(p => (
          <motion.div 
            layout
            key={p.id}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                <Package size={24} />
              </div>
              <button 
                onClick={() => handleDelete(p.id!)}
                className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <h4 className="font-bold text-lg mb-1">{p.name}</h4>
            {p.version_model && (
              <p className="text-indigo-600 text-xs font-semibold mb-2">{p.version_model}</p>
            )}
            <p className="text-slate-500 text-sm line-clamp-2 mb-2">{p.description}</p>
            {p.key_features && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Key Features</p>
                <p className="text-xs text-slate-600 line-clamp-2 italic">{p.key_features}</p>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{p.category || 'General'}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <h3 className="text-2xl font-bold">Add New Product</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product Name</label>
                    <input 
                      type="text"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                    <input 
                      type="text"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Version / Model</label>
                    <input 
                      type="text"
                      value={newProduct.version_model}
                      onChange={(e) => setNewProduct({ ...newProduct, version_model: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. Single Phase"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Base Price</label>
                    <input 
                      type="number"
                      value={newProduct.base_price || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, base_price: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Key Features</label>
                  <textarea 
                    rows={2}
                    value={newProduct.key_features}
                    onChange={(e) => setNewProduct({ ...newProduct, key_features: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="e.g. Double conversion, LCD display..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                  <textarea 
                    rows={2}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
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
                  Save Product
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {aiParsing && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-indigo-100 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-bold text-indigo-600">Processing PDF...</p>
              <p className="text-xs text-slate-400">Extracting product data automatically</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
