import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Shield, Lock, CheckCircle2, XCircle, Save, AlertCircle, Plus, X, Mail, Key, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { User, UserRole } from '../types';

const MODULES = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'quotations', name: 'Quotations' },
  { id: 'customers', name: 'Customers' },
  { id: 'products', name: 'Products' },
  { id: 'oef', name: 'OEF Forms' },
  { id: 'settings', name: 'Settings' },
];

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'data_entry', label: 'Data Entry' },
  { value: 'oef_manager', label: 'OEF Manager' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'user', label: 'Standard User' },
];

interface SettingsProps {
  currentUser?: User | null;
}

export default function Settings({ currentUser }: SettingsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    mobile: '',
    role: 'user' as UserRole,
    permissions: [] as string[]
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser(newUser);
      setShowCreateModal(false);
      setNewUser({ email: '', password: '', first_name: '', last_name: '', mobile: '', role: 'user', permissions: [] });
      loadUsers();
      alert('User created successfully');
    } catch (error) {
      alert('Failed to create user');
    }
  };

  const handlePermissionToggle = (userId: number, moduleId: string) => {
    setUsers(prev => prev.map(user => {
      if (user.id !== userId) return user;
      const currentPermissions = user.permissions || [];
      const newPermissions = currentPermissions.includes(moduleId)
        ? currentPermissions.filter(id => id !== moduleId)
        : [...currentPermissions, moduleId];
      return { ...user, permissions: newPermissions };
    }));
  };

  const handleNewUserPermissionToggle = (moduleId: string) => {
    setNewUser(prev => {
      const currentPermissions = prev.permissions;
      const newPermissions = currentPermissions.includes(moduleId)
        ? currentPermissions.filter(id => id !== moduleId)
        : [...currentPermissions, moduleId];
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleRoleChange = (userId: number, role: UserRole) => {
    setUsers(prev => prev.map(user => {
      if (user.id !== userId) return user;
      return { ...user, role };
    }));
  };

  const saveUser = async (user: User) => {
    setSaving(user.id);
    try {
      await api.updateUser(user.id, {
        role: user.role,
        permissions: user.permissions
      });
      alert('User updated successfully');
    } catch (error) {
      alert('Failed to update user');
    } finally {
      setSaving(null);
    }
  };

  const deleteUser = async (id: number) => {
    if (!id) return;
    
    if (currentUser && id === currentUser.id) {
      alert('You cannot delete your own account.');
      return;
    }

    const userToDelete = users.find(u => u.id === id);
    if (userToDelete?.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        alert('Cannot delete the last administrator.');
        return;
      }
    }

    const confirmed = window.confirm('Are you sure you want to delete this user? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await api.deleteUser(id);
      await loadUsers();
      alert('User deleted successfully');
    } catch (error: any) {
      console.error('Delete user failed:', error);
      alert(error.message || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-500">Manage user roles and module access permissions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            <Plus size={18} />
            Create New User
          </button>
          <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <Shield size={18} />
            Admin Control Panel
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {users.map((user) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {user.first_name || user.last_name 
                      ? `${user.first_name || ''} ${user.last_name || ''}`.trim() 
                      : user.email}
                  </h3>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <p className="text-xs text-slate-500">{user.email}</p>
                    {user.mobile && <p className="text-[10px] text-slate-400 font-medium">Mob: {user.mobile}</p>}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {ROLES.find(r => r.value === user.role)?.label}
                    </span>
                    {user.is_verified ? (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Verified
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle size={12} /> Pending Verification
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</label>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                    disabled={user.role === 'admin' && users.filter(u => u.role === 'admin').length === 1}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => saveUser(user)}
                  disabled={saving === user.id}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving === user.id ? 'Saving...' : (
                    <>
                      <Save size={16} /> Save Changes
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteUser(user.id);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                  title="Delete User"
                >
                  <Trash2 size={20} className="pointer-events-none" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Module Access</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {MODULES.map((module) => {
                  const isAllowed = user.permissions?.includes(module.id);
                  return (
                    <button
                      key={module.id}
                      onClick={() => handlePermissionToggle(user.id, module.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${
                        isAllowed
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {isAllowed ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                      <span className="text-xs font-bold">{module.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Plus size={24} />
                  Create New User
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                    <input
                      type="text"
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                    <input
                      type="text"
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                    <input
                      type="text"
                      value={newUser.mobile}
                      onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input
                        type="email"
                        required
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="user@company.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Initial Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input
                        type="password"
                        required
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign Permissions</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {MODULES.map((module) => {
                      const isAllowed = newUser.permissions.includes(module.id);
                      return (
                        <button
                          key={module.id}
                          type="button"
                          onClick={() => handleNewUserPermissionToggle(module.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            isAllowed
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {isAllowed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                          <span className="text-sm font-bold">{module.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="text-amber-600 shrink-0" size={20} />
        <div className="text-sm text-amber-800">
          <p className="font-bold">Security Note</p>
          <p>Changes to user permissions take effect upon their next login or page refresh. Administrators always have full access to all modules.</p>
        </div>
      </div>
    </div>
  );
}
