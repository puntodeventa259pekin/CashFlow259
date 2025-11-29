
import React, { useState } from 'react';
import { Holder, UserRole, UserPermissions } from '../types';

interface HolderListProps {
  currentUser: Holder;
  holders: Holder[];
  onAddHolder: (name: string, username: string, role: UserRole, permissions: UserPermissions, password?: string) => void;
  onEditHolder: (id: string, name: string, username: string, role: UserRole, permissions: UserPermissions, password?: string) => void;
}

export const HolderList: React.FC<HolderListProps> = ({ currentUser, holders, onAddHolder, onEditHolder }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [permissions, setPermissions] = useState<UserPermissions>({
    inventory: false,
    debts: false,
    transactions: true
  });

  const isAdmin = currentUser.role === 'admin';

  const resetForm = () => {
    setName('');
    setUsername('');
    setPassword('');
    setRole('employee');
    setPermissions({ inventory: false, debts: false, transactions: true });
    setIsAdding(false);
    setEditingId(null);
  };

  const startEdit = (holder: Holder) => {
    setEditingId(holder.id);
    setName(holder.name);
    setUsername(holder.username);
    setRole(holder.role);
    setPermissions(holder.permissions || { inventory: false, debts: false, transactions: true });
    setPassword(''); // Don't show existing password
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && username.trim()) {
      if (editingId) {
        onEditHolder(editingId, name, username, role, permissions, password || undefined);
      } else {
        onAddHolder(name, username, role, permissions, password || undefined);
      }
      resetForm();
    }
  };

  const handlePermissionChange = (key: keyof UserPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Gestión de Usuarios y Custodios</h2>
        {isAdmin && !isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            + Nuevo Usuario
          </button>
        )}
      </div>

      {(isAdding || editingId) && isAdmin && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
          <h3 className="text-md font-semibold mb-4">{editingId ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Juan Pérez"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Usuario (Login)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="juanp"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Contraseña</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder={editingId ? "Dejar vacío para no cambiar" : "Por defecto: 123"}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Rol</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="employee">Empleado (Restringido)</option>
                  <option value="partner">Socio (Restringido)</option>
                  <option value="accountant">Contador (Validador)</option>
                  <option value="admin">Administrador (Total)</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <span className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Permisos de Acceso</span>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.inventory}
                    onChange={() => handlePermissionChange('inventory')}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Ver Inventario</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.debts}
                    onChange={() => handlePermissionChange('debts')}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Ver Ctas / Anticipos</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.transactions}
                    onChange={() => handlePermissionChange('transactions')}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Ver Historial Transacciones</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingId ? 'Actualizar Usuario' : 'Guardar Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {holders.map((holder) => (
          <div key={holder.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between group relative">
            {isAdmin && (
              <button 
                onClick={() => startEdit(holder)}
                className="absolute top-4 right-4 text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Editar Usuario"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            )}
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-slate-800">{holder.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                  holder.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  holder.role === 'accountant' ? 'bg-amber-100 text-amber-700' :
                  holder.role === 'partner' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {holder.role === 'accountant' ? 'Contador' : holder.role}
                </span>
              </div>
              <p className="text-slate-500 text-sm flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {holder.username}
              </p>
              
              {/* Permission Tags */}
              <div className="mt-3 flex flex-wrap gap-1">
                 {holder.permissions?.inventory && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Inv</span>}
                 {holder.permissions?.debts && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Ctas</span>}
                 {holder.permissions?.transactions && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Hist</span>}
              </div>
            </div>
            <div className="mt-4 border-t border-slate-50 pt-3">
              <p className="text-xs text-slate-400">Efectivo en mano</p>
              <span className={`text-2xl font-bold ${holder.balance < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                ${holder.balance.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
