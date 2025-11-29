import React from 'react';
import { Transaction, Holder, Debt, DebtType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  holders: Holder[];
  debts: Debt[];
}

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b'];

export const Dashboard: React.FC<DashboardProps> = ({ transactions, holders, debts }) => {
  // Calculations
  const totalCash = holders.reduce((acc, h) => acc + h.balance, 0);
  const totalReceivable = debts
    .filter(d => d.type === DebtType.RECEIVABLE && !d.isPaid)
    .reduce((acc, d) => acc + d.amount, 0);
  const totalPayable = debts
    .filter(d => d.type === DebtType.PAYABLE && !d.isPaid)
    .reduce((acc, d) => acc + d.amount, 0);

  const chartData = [
    { name: 'Efectivo Disponible', value: totalCash },
    { name: 'Por Cobrar', value: totalReceivable },
    { name: 'Por Pagar', value: totalPayable },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Cards */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Efectivo Total</p>
          <h3 className="text-3xl font-bold text-slate-800 mt-2">${totalCash.toLocaleString()}</h3>
          <div className="mt-2 text-xs text-green-600 flex items-center">
            <span className="bg-green-100 px-2 py-1 rounded-full">Liquidez inmediata</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Cuentas por Cobrar (Anticipos)</p>
          <h3 className="text-3xl font-bold text-blue-600 mt-2">${totalReceivable.toLocaleString()}</h3>
          <div className="mt-2 text-xs text-blue-600 flex items-center">
             <span className="bg-blue-100 px-2 py-1 rounded-full">{debts.filter(d => d.type === DebtType.RECEIVABLE && !d.isPaid).length} pendientes</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Cuentas por Pagar</p>
          <h3 className="text-3xl font-bold text-red-600 mt-2">${totalPayable.toLocaleString()}</h3>
           <div className="mt-2 text-xs text-red-600 flex items-center">
             <span className="bg-red-100 px-2 py-1 rounded-full">{debts.filter(d => d.type === DebtType.PAYABLE && !d.isPaid).length} pendientes</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
         {/* Chart Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[300px]">
           <h3 className="text-lg font-semibold text-slate-800 mb-4">Distribución Financiera</h3>
           <div className="h-[250px] w-full flex flex-col items-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={chartData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   fill="#8884d8"
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
               </PieChart>
             </ResponsiveContainer>
             <div className="flex flex-wrap justify-center gap-4 text-sm mt-4">
                {chartData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span>{entry.name}</span>
                  </div>
                ))}
             </div>
           </div>
        </div>
      </div>

      {/* Cash Breakdown by Holder */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Saldos de Efectivo por Custodio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {holders.map((holder) => (
            <div key={holder.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                    {holder.username.substring(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{holder.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{holder.role}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Saldo Actual</p>
                <span className={`text-lg font-bold ${holder.balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  ${holder.balance.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};