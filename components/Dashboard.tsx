import React, { useState } from 'react';
import { Transaction, Holder, Debt, TransactionType, DebtType } from '../types';
import { analyzeFinances } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  holders: Holder[];
  debts: Debt[];
}

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b'];

export const Dashboard: React.FC<DashboardProps> = ({ transactions, holders, debts }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Calculations
  const totalCash = holders.reduce((acc, h) => acc + h.balance, 0);
  const totalReceivable = debts
    .filter(d => d.type === DebtType.RECEIVABLE && !d.isPaid)
    .reduce((acc, d) => acc + d.amount, 0);
  const totalPayable = debts
    .filter(d => d.type === DebtType.PAYABLE && !d.isPaid)
    .reduce((acc, d) => acc + d.amount, 0);

  const handleAnalyze = async () => {
    setLoadingAi(true);
    const result = await analyzeFinances(transactions, holders, debts);
    setAnalysis(result);
    setLoadingAi(false);
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Chart Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[300px]">
           <h3 className="text-lg font-semibold text-slate-800 mb-4">Distribución Financiera</h3>
           <ResponsiveContainer width="100%" height={250}>
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
           <div className="flex justify-center gap-4 text-sm mt-2">
              {chartData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span>{entry.name}</span>
                </div>
              ))}
           </div>
        </div>

        {/* AI Analysis Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0 1 1 0 002 0zm-1 4a1 1 0 00-1 1v3a1 1 0 002 0v-3a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Asistente Inteligente
            </h3>
            <button
              onClick={handleAnalyze}
              disabled={loadingAi}
              className={`text-sm px-4 py-2 rounded-lg text-white font-medium transition-colors ${loadingAi ? 'bg-purple-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {loadingAi ? 'Analizando...' : 'Analizar Flujo'}
            </button>
          </div>
          
          <div className="flex-1 bg-slate-50 rounded-lg p-4 overflow-y-auto max-h-[300px]">
            {analysis ? (
              <div className="prose prose-sm text-slate-700 whitespace-pre-line">
                {analysis}
              </div>
            ) : (
              <div className="text-center text-slate-400 mt-10">
                <p>Presiona "Analizar Flujo" para obtener insights sobre tus finanzas impulsados por Gemini.</p>
              </div>
            )}
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

      {/* Persistence Indicator */}
      <div className="flex justify-center mt-4">
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Autoguardado local activo (Memoria persistente)</span>
        </div>
      </div>
    </div>
  );
};