
import React, { useState } from 'react';
import { TransactionType, Holder, TransactionStatus, UserRole } from '../types';

interface TransactionFormProps {
  currentUser: Holder;
  holders: Holder[];
  onAddTransaction: (
    type: TransactionType,
    amount: number,
    holderId: string,
    description: string,
    category: string,
    status: TransactionStatus,
    targetHolderId?: string
  ) => void;
  onClose: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ currentUser, holders, onAddTransaction, onClose }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  // If admin/accountant, they can select who; otherwise it defaults to current user
  const canSelectHolder = currentUser.role === 'admin' || currentUser.role === 'accountant';
  const [holderId, setHolderId] = useState(canSelectHolder ? holders[0]?.id : currentUser.id);
  const [targetHolderId, setTargetHolderId] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !holderId || !description) return;
    
    // Auto-validate if Admin or Accountant creates it
    const status = (currentUser.role === 'admin' || currentUser.role === 'accountant') 
      ? TransactionStatus.VALIDATED 
      : TransactionStatus.PENDING;

    onAddTransaction(
      type,
      parseFloat(amount),
      holderId,
      description,
      category || 'General',
      status,
      type === TransactionType.TRANSFER ? targetHolderId : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Nueva Transacción</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Type Selection */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {Object.values(TransactionType).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  type === t 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto ($)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="0.00"
              required
              min="0"
              step="0.01"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {type === TransactionType.INCOME ? 'Recibe (Custodio)' : 'Paga (Custodio)'}
            </label>
            {canSelectHolder ? (
              <select
                value={holderId}
                onChange={(e) => setHolderId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                {holders.map(h => (
                  <option key={h.id} value={h.id}>{h.name} (${h.balance.toLocaleString()})</option>
                ))}
              </select>
            ) : (
               <input 
                type="text" 
                value={currentUser.name} 
                disabled 
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg"
               />
            )}
          </div>

          {type === TransactionType.TRANSFER && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hacia (Destino)</label>
              <select
                value={targetHolderId}
                onChange={(e) => setTargetHolderId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">Seleccionar destino...</option>
                {holders.filter(h => h.id !== holderId).map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ej. Pago de gasolina, Venta del día"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ej. Transporte, Alimentos, Oficina"
              list="categories"
            />
            <datalist id="categories">
              <option value="Transporte" />
              <option value="Alimentos" />
              <option value="Oficina" />
              <option value="Servicios" />
              <option value="Ventas" />
            </datalist>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
