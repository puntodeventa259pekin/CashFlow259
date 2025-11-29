
import React, { useState } from 'react';
import { Debt, DebtType, Holder, TransactionStatus, UserRole, Transaction } from '../types';

interface DebtListProps {
  debts: Debt[];
  holders: Holder[];
  transactions: Transaction[]; // Added transactions prop to lookup payment status
  currentUser: Holder;
  onAddDebt: (entityName: string, amount: number, type: DebtType, description: string, issueDate: string, dueDate: string) => void;
  onEditDebt: (id: string, entityName: string, amount: number, description: string, issueDate: string, dueDate: string) => void;
  onDeleteDebt: (id: string) => void;
  onValidateDebt: (id: string) => void;
  onRejectDebt: (id: string) => void;
  onPayDebt: (debt: Debt, holderId: string) => void;
}

export const DebtList: React.FC<DebtListProps> = ({ 
  debts, 
  holders, 
  transactions,
  currentUser,
  onAddDebt, 
  onEditDebt,
  onDeleteDebt,
  onValidateDebt,
  onRejectDebt,
  onPayDebt 
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [isAdding, setIsAdding] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  
  // Payment Modal State
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [selectedHolderId, setSelectedHolderId] = useState('');

  // Form States
  const [entityName, setEntityName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<DebtType>(DebtType.RECEIVABLE);
  const [description, setDescription] = useState('');
  
  // History Filter State
  const [historyDateStart, setHistoryDateStart] = useState('');
  const [historyDateEnd, setHistoryDateEnd] = useState('');

  // Dates
  const today = new Date().toISOString().split('T')[0];
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState('');

  const canValidate = currentUser.role === 'admin' || currentUser.role === 'accountant';

  const resetForm = () => {
    setEntityName('');
    setAmount('');
    setDescription('');
    setIssueDate(today);
    setDueDate('');
    setType(DebtType.RECEIVABLE);
    setEditingDebt(null);
    setIsAdding(false);
  };

  const startEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setEntityName(debt.entityName);
    setAmount(debt.amount.toString());
    setType(debt.type);
    setDescription(debt.description);
    setIssueDate(debt.issueDate);
    setDueDate(debt.dueDate || '');
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entityName && amount && issueDate) {
      if (editingDebt) {
        onEditDebt(editingDebt.id, entityName, parseFloat(amount), description, issueDate, dueDate);
      } else {
        onAddDebt(entityName, parseFloat(amount), type, description, issueDate, dueDate);
      }
      resetForm();
    }
  };

  const handleConfirmPayment = () => {
    if (payingDebt && selectedHolderId) {
      onPayDebt(payingDebt, selectedHolderId);
      setPayingDebt(null);
      setSelectedHolderId('');
    }
  };

  // Filter Data
  const activeDebts = debts.filter(d => !d.isPaid);
  const historyDebts = debts.filter(d => d.isPaid);

  const filteredHistoryDebts = historyDebts.filter(d => {
    if (!d.paymentDate) return false;
    const pDate = d.paymentDate.split('T')[0];
    if (historyDateStart && pDate < historyDateStart) return false;
    if (historyDateEnd && pDate > historyDateEnd) return false;
    return true;
  });

  const receivables = activeDebts.filter(d => d.type === DebtType.RECEIVABLE);
  const payables = activeDebts.filter(d => d.type === DebtType.PAYABLE);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-lg">
           <button 
             onClick={() => setActiveTab('pending')}
             className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Pendientes
           </button>
           <button 
             onClick={() => setActiveTab('history')}
             className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Historial Liquidaciones
           </button>
        </div>

        {activeTab === 'pending' && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 whitespace-nowrap"
          >
            + Nueva Cuenta
          </button>
        )}
      </div>

      {isAdding && activeTab === 'pending' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 animate-fade-in">
          <h3 className="text-md font-semibold mb-4">{editingDebt ? 'Editar Cuenta / Anticipo' : 'Registrar Deuda o Anticipo'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DebtType)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                disabled={!!editingDebt} // Cannot change type on edit
              >
                <option value={DebtType.RECEIVABLE}>Por Cobrar (Anticipo/Préstamo)</option>
                <option value={DebtType.PAYABLE}>Por Pagar (Deuda)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Persona/Entidad</label>
              <input
                type="text"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="Nombre del empleado o proveedor"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Monto ($)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha Emisión</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha Vencimiento</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="Concepto..."
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2 mt-2">
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
                {editingDebt ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PENDING VIEW */}
      {activeTab === 'pending' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Receivables Column */}
          <div>
            <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Por Cobrar / Anticipos
            </h3>
            <div className="space-y-3">
              {receivables.length === 0 && <p className="text-slate-400 text-sm">No hay registros pendientes.</p>}
              {receivables.map(d => (
                <DebtCard 
                  key={d.id} 
                  debt={d}
                  canValidate={canValidate}
                  onStartPay={(debt) => {
                    setPayingDebt(debt);
                    setSelectedHolderId(holders[0]?.id || '');
                  }} 
                  onValidate={() => onValidateDebt(d.id)}
                  onReject={() => onRejectDebt(d.id)}
                  onDelete={() => onDeleteDebt(d.id)}
                  onEdit={() => startEdit(d)}
                  colorClass="border-l-4 border-l-blue-500" 
                  actionLabel="Cobrar / Liquidar"
                />
              ))}
            </div>
          </div>

          {/* Payables Column */}
          <div>
            <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Por Pagar
            </h3>
            <div className="space-y-3">
              {payables.length === 0 && <p className="text-slate-400 text-sm">No hay registros pendientes.</p>}
              {payables.map(d => (
                <DebtCard 
                  key={d.id} 
                  debt={d} 
                  canValidate={canValidate}
                  onStartPay={(debt) => {
                    setPayingDebt(debt);
                    setSelectedHolderId(holders[0]?.id || '');
                  }} 
                  onValidate={() => onValidateDebt(d.id)}
                  onReject={() => onRejectDebt(d.id)}
                  onDelete={() => onDeleteDebt(d.id)}
                  onEdit={() => startEdit(d)}
                  colorClass="border-l-4 border-l-red-500" 
                  actionLabel="Pagar / Liquidar"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HISTORY VIEW */}
      {activeTab === 'history' && (
          <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-2 justify-end">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 shadow-sm">
                      <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Desde:</span>
                      <input 
                          type="date" 
                          className="text-sm text-slate-700 outline-none py-1.5"
                          value={historyDateStart}
                          onChange={(e) => setHistoryDateStart(e.target.value)}
                      />
                  </div>

                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 shadow-sm">
                      <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Hasta:</span>
                      <input 
                          type="date" 
                          className="text-sm text-slate-700 outline-none py-1.5"
                          value={historyDateEnd}
                          onChange={(e) => setHistoryDateEnd(e.target.value)}
                      />
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-4">Fecha Pago</th>
                        <th className="p-4">Entidad / Concepto</th>
                        <th className="p-4">Tipo</th>
                        <th className="p-4">Custodio</th>
                        <th className="p-4 text-right">Monto</th>
                        <th className="p-4 text-center">Estado Pago</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredHistoryDebts.length === 0 && (
                          <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-400">No hay cuentas liquidadas en este rango.</td>
                          </tr>
                      )}
                      {[...filteredHistoryDebts].reverse().map(debt => {
                          const holder = holders.find(h => h.id === debt.paymentHolderId);
                          const tx = transactions.find(t => t.id === debt.paymentTransactionId);
                          const paymentDate = debt.paymentDate ? new Date(debt.paymentDate).toLocaleDateString() : '-';
                          
                          return (
                              <tr key={debt.id} className="hover:bg-slate-50">
                                  <td className="p-4">{paymentDate}</td>
                                  <td className="p-4">
                                      <div className="font-medium text-slate-800">{debt.entityName}</div>
                                      <div className="text-xs text-slate-500">{debt.description}</div>
                                  </td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                          debt.type === DebtType.RECEIVABLE ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                      }`}>
                                          {debt.type === DebtType.RECEIVABLE ? 'Cobrado' : 'Pagado'}
                                      </span>
                                  </td>
                                  <td className="p-4">
                                      {holder ? holder.name : 'Desconocido'}
                                  </td>
                                  <td className="p-4 text-right font-bold text-slate-700">
                                      ${debt.amount.toLocaleString()}
                                  </td>
                                  <td className="p-4 text-center">
                                      {tx ? (
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                            tx.status === TransactionStatus.VALIDATED 
                                              ? 'bg-green-50 text-green-700 border-green-200' 
                                              : tx.status === TransactionStatus.REJECTED 
                                              ? 'bg-red-50 text-red-700 border-red-200'
                                              : 'bg-orange-50 text-orange-700 border-orange-200'
                                          }`}>
                                            {tx.status}
                                        </span>
                                      ) : (
                                          <span className="text-xs text-slate-400">N/A</span>
                                      )}
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
                </table>
              </div>
          </div>
      )}

      {/* Payment Modal */}
      {payingDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Liquidar Cuenta</h3>
            <p className="text-sm text-slate-500 mb-4">
              {payingDebt.type === DebtType.RECEIVABLE 
                ? `Ingresar pago de: ${payingDebt.entityName}` 
                : `Realizar pago a: ${payingDebt.entityName}`}
            </p>
            
            <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-100">
               <div className="flex justify-between text-sm mb-1">
                 <span>Monto:</span>
                 <span className="font-bold">${payingDebt.amount.toLocaleString()}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span>Concepto:</span>
                 <span>{payingDebt.description}</span>
               </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {payingDebt.type === DebtType.RECEIVABLE ? '¿Quién recibe el dinero?' : '¿Quién realiza el pago?'}
              </label>
              <select
                value={selectedHolderId}
                onChange={(e) => setSelectedHolderId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                {holders.map(h => (
                  <option key={h.id} value={h.id}>{h.name} (Saldo: ${h.balance})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPayingDebt(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayment}
                className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                Confirmar Liquidación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DebtCardProps {
  debt: Debt; 
  onStartPay: (debt: Debt) => void;
  onValidate: () => void;
  onReject: () => void;
  onDelete: () => void;
  onEdit: () => void;
  canValidate: boolean;
  colorClass: string; 
  actionLabel: string;
}

const DebtCard: React.FC<DebtCardProps> = ({ 
  debt, onStartPay, onValidate, onReject, onDelete, onEdit, canValidate, colorClass, actionLabel 
}) => {
  const isPending = debt.status === TransactionStatus.PENDING;
  const isRejected = debt.status === TransactionStatus.REJECTED;
  const isValidated = debt.status === TransactionStatus.VALIDATED;

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start ${colorClass}`}>
      <div className="flex-1 w-full">
        <div className="flex justify-between items-center mb-1">
           <h4 className="font-bold text-slate-800">{debt.entityName}</h4>
           <div className="flex items-center gap-2">
              {isPending && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Pendiente</span>}
              {isValidated && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Validado</span>}
              {isRejected && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Rechazado</span>}
              
              <span className="text-xs text-slate-400">{new Date(debt.issueDate).toLocaleDateString()}</span>
           </div>
        </div>
        <p className="text-xs text-slate-500 mb-2">{debt.description}</p>
        
        <div className="flex items-center gap-4 text-xs">
          <p className="font-semibold text-sm text-slate-800">${debt.amount.toLocaleString()}</p>
          {debt.dueDate && (
            <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
              Vence: {new Date(debt.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="mt-4 md:mt-0 md:ml-4 flex items-center justify-end w-full md:w-auto gap-2">
          {/* Action Buttons */}
          
          {/* Editing: Only if Pending or Rejected. Validated items are locked unless paid. */}
          {!isValidated && (
              <button 
                onClick={onEdit}
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
                title="Editar"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
          )}

          {/* Deleting: Admin/Accountant can delete anytime (even validated). Users only Pending/Rejected. */}
          {(!isValidated || canValidate) && (
              <button 
                onClick={onDelete}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                title="Eliminar"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
          )}

          {/* Validation Actions: Only Pending items for Accountants */}
          {isPending && canValidate && (
             <div className="flex gap-1">
                 <button 
                  onClick={onReject}
                  className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-100 font-medium"
                  title="Denegar"
                 >
                   Rechazar
                 </button>
                 <button 
                  onClick={onValidate}
                  className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-100 font-medium"
                  title="Validar"
                 >
                   Validar
                 </button>
             </div>
          )}

          {/* Payment: Only Validated items */}
          {isValidated && (
             <button
              onClick={() => onStartPay(debt)}
              className="text-xs bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-medium shadow-sm"
            >
              {actionLabel}
            </button>
          )}
      </div>
    </div>
  );
};
