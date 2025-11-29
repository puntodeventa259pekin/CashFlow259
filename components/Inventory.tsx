
import React, { useState } from 'react';
import { InventoryItem, InventoryMovement, InventoryUnit, InventorySection, Holder } from '../types';

interface InventoryProps {
  items: InventoryItem[];
  movements: InventoryMovement[];
  units: InventoryUnit[];
  sections: InventorySection[];
  currentUser: Holder;
  onAddItem: (name: string, quantity: number, cost: number, unit: string, section: string, description: string) => void;
  onEditItem: (id: string, name: string, averageCost: number, description: string) => void;
  onUpdateStock: (itemId: string, type: 'IN' | 'OUT', quantity: number, unitCost: number, reason: string) => void;
  onAddUnit: (name: string, abbreviation: string) => void;
  onDeleteUnit: (id: string) => void;
  onAddSection: (name: string) => void;
  onDeleteSection: (id: string) => void;
}

type SortKey = 'name' | 'quantity' | 'section';
type SortDirection = 'asc' | 'desc';

export const Inventory: React.FC<InventoryProps> = ({ 
  items, 
  movements, 
  units,
  sections,
  currentUser,
  onAddItem, 
  onEditItem,
  onUpdateStock,
  onAddUnit,
  onDeleteUnit,
  onAddSection,
  onDeleteSection
}) => {
  const [activeTab, setActiveTab] = useState<'stock' | 'history' | 'encoders'>('stock');
  const [isAdding, setIsAdding] = useState(false);
  
  // Edit State
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Search & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState('ALL'); // New Filter State
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // History Filter State
  const [historyDateStart, setHistoryDateStart] = useState('');
  const [historyDateEnd, setHistoryDateEnd] = useState('');

  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemUnit, setNewItemUnit] = useState(units[0]?.abbreviation || 'u');
  const [newItemSection, setNewItemSection] = useState(sections[0]?.name || 'General');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemCost, setNewItemCost] = useState('');

  // Movement Modal
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  const [movementQty, setMovementQty] = useState('');
  const [movementCost, setMovementCost] = useState(''); // Only for IN
  const [movementReason, setMovementReason] = useState('');

  // Encoder States
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAbbr, setNewUnitAbbr] = useState('');
  const [newSectionName, setNewSectionName] = useState('');

  const canEditEncoders = currentUser.role === 'admin' || currentUser.role === 'accountant';
  const canSeeCost = currentUser.role === 'admin' || currentUser.role === 'accountant';

  // --- CSV Helper ---
  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName && newItemQty && newItemSection) {
      onAddItem(
          newItemName, 
          parseFloat(newItemQty), 
          parseFloat(newItemCost || '0'), 
          newItemUnit, 
          newItemSection,
          newItemDescription
      );
      setNewItemName('');
      setNewItemQty('');
      setNewItemCost('');
      setNewItemDescription('');
      setNewItemUnit(units[0]?.abbreviation || 'u');
      setNewItemSection(sections[0]?.name || 'General');
      setIsAdding(false);
    }
  };

  const startEditItem = (item: InventoryItem) => {
      setEditingItem(item);
      setEditName(item.name);
      setEditCost(item.averageCost.toString());
      setEditDescription(item.description || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingItem && editName) {
          onEditItem(editingItem.id, editName, parseFloat(editCost || '0'), editDescription);
          setEditingItem(null);
      }
  };

  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem && movementQty) {
      const qty = parseFloat(movementQty);
      
      // Validation: Prevent negative stock
      if (movementType === 'OUT') {
        if (qty > selectedItem.quantity) {
          alert(`Error: Stock insuficiente. El stock actual es ${selectedItem.quantity} ${selectedItem.unit}.`);
          return;
        }
      }

      onUpdateStock(
          selectedItem.id, 
          movementType, 
          qty, 
          parseFloat(movementCost || '0'),
          movementReason
      );
      setSelectedItem(null);
      setMovementQty('');
      setMovementCost('');
      setMovementReason('');
    }
  };

  const handleSubmitUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if(newUnitName && newUnitAbbr) {
      onAddUnit(newUnitName, newUnitAbbr);
      setNewUnitName('');
      setNewUnitAbbr('');
    }
  };

  const handleSubmitSection = (e: React.FormEvent) => {
    e.preventDefault();
    if(newSectionName) {
      onAddSection(newSectionName);
      setNewSectionName('');
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Filter Items
  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    
    // Text Filter
    const matchesText = !searchTerm || (
      item.name.toLowerCase().includes(term) ||
      item.section.toLowerCase().includes(term)
    );

    // Section Filter
    const matchesSection = filterSection === 'ALL' || item.section === filterSection;

    return matchesText && matchesSection;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    let valueA: string | number = '';
    let valueB: string | number = '';

    if (sortKey === 'name') {
      valueA = a.name.toLowerCase();
      valueB = b.name.toLowerCase();
    } else if (sortKey === 'quantity') {
      valueA = a.quantity;
      valueB = b.quantity;
    } else if (sortKey === 'section') {
      valueA = a.section.toLowerCase();
      valueB = b.section.toLowerCase();
    }

    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Filter History Movements
  const filteredMovements = movements.filter(mov => {
    const movDate = mov.date.split('T')[0];
    if (historyDateStart && movDate < historyDateStart) return false;
    if (historyDateEnd && movDate > historyDateEnd) return false;
    return true;
  });

  const handleExportStock = () => {
    const headers = ['ID', 'Producto', 'Sección', 'Costo Promedio', 'Stock Actual', 'Unidad'];
    const rows = sortedItems.map(item => [
        item.id,
        item.name,
        item.section,
        item.averageCost.toFixed(2),
        item.quantity,
        item.unit
    ]);
    downloadCSV(`inventario_stock_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  };

  const handleExportHistory = () => {
    const headers = ['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Costo Unit.', 'Razón'];
    const rows = [...filteredMovements].reverse().map(mov => [
        new Date(mov.date).toLocaleString(),
        mov.itemName,
        mov.type === 'IN' ? 'Entrada' : 'Salida',
        mov.quantity,
        mov.unitCost ? mov.unitCost.toFixed(2) : '0.00',
        mov.reason
    ]);
    downloadCSV(`inventario_historial_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  };

  const SortIcon = ({ active, direction }: { active: boolean; direction: SortDirection }) => {
    if (!active) return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-300 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
    return direction === 'asc' 
      ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
      : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
           <button 
             onClick={() => setActiveTab('stock')}
             className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'stock' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Stock Actual
           </button>
           <button 
             onClick={() => setActiveTab('history')}
             className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Historial
           </button>
           {canEditEncoders && (
             <button 
               onClick={() => setActiveTab('encoders')}
               className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'encoders' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Codificadores
             </button>
           )}
        </div>
        
        {activeTab === 'stock' && (
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-48 w-full">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
             </div>
             
             {/* Section Filter */}
             <select
               value={filterSection}
               onChange={(e) => setFilterSection(e.target.value)}
               className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white w-full md:max-w-[150px]"
             >
               <option value="ALL">Secciones</option>
               {sections.map(s => (
                 <option key={s.id} value={s.name}>{s.name}</option>
               ))}
             </select>

             <div className="flex gap-2">
                <button
                onClick={handleExportStock}
                className="flex-1 md:flex-none bg-white border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 whitespace-nowrap flex justify-center items-center"
                title="Exportar a CSV"
                >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                </button>

                <button
                onClick={() => setIsAdding(true)}
                className="flex-1 md:flex-none bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 whitespace-nowrap"
                >
                + Nuevo
                </button>
             </div>
          </div>
        )}
        
        {activeTab === 'history' && (
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 shadow-sm w-full md:w-auto">
                  <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Desde:</span>
                  <input 
                      type="date" 
                      className="text-sm text-slate-700 outline-none py-1.5 w-full bg-transparent"
                      value={historyDateStart}
                      onChange={(e) => setHistoryDateStart(e.target.value)}
                  />
              </div>

              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 shadow-sm w-full md:w-auto">
                  <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Hasta:</span>
                  <input 
                      type="date" 
                      className="text-sm text-slate-700 outline-none py-1.5 w-full bg-transparent"
                      value={historyDateEnd}
                      onChange={(e) => setHistoryDateEnd(e.target.value)}
                  />
              </div>

              <button
               onClick={handleExportHistory}
               className="w-full md:w-auto bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 whitespace-nowrap flex items-center justify-center gap-2"
               title="Exportar Historial"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
               </svg>
               Exportar Historial
             </button>
          </div>
        )}
      </div>

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-fade-in">
             <h3 className="text-lg font-bold text-slate-800 mb-4">Editar Producto</h3>
             <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                   <input
                     type="text"
                     value={editName}
                     onChange={(e) => setEditName(e.target.value)}
                     className="w-full border border-slate-300 rounded-lg px-3 py-2"
                     required
                   />
                </div>
                <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
                   <input
                     type="text"
                     value={editDescription}
                     onChange={(e) => setEditDescription(e.target.value)}
                     className="w-full border border-slate-300 rounded-lg px-3 py-2"
                   />
                </div>
                <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1">Costo Promedio ($)</label>
                   <input
                     type="number"
                     value={editCost}
                     onChange={(e) => setEditCost(e.target.value)}
                     className="w-full border border-slate-300 rounded-lg px-3 py-2"
                     min="0"
                     step="0.01"
                     required
                   />
                </div>
                <div className="flex gap-2 pt-2">
                   <button
                     type="button"
                     onClick={() => setEditingItem(null)}
                     className="flex-1 px-3 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                   >
                     Cancelar
                   </button>
                   <button
                     type="submit"
                     className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                   >
                     Actualizar
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* ADD ITEM FORM */}
      {isAdding && activeTab === 'stock' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
          <h3 className="text-md font-semibold mb-4">Agregar Producto al Inventario</h3>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del Producto</label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="Ej. Cemento, Varilla"
                required
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Sección</label>
              <select
                value={newItemSection}
                onChange={(e) => setNewItemSection(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                {sections.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Stock Inicial</label>
              <input
                type="number"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="0"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Costo Unit. ($)</label>
              <input
                type="number"
                value={newItemCost}
                onChange={(e) => setNewItemCost(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Unidad</label>
              <select
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                {units.map(u => (
                  <option key={u.id} value={u.abbreviation}>{u.name} ({u.abbreviation})</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-6">
              <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
              <input
                type="text"
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="Detalles del producto"
              />
            </div>
            <div className="flex gap-2 lg:col-span-6 justify-end mt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Guardar Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STOCK VIEW */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200 select-none">
                <tr>
                  <th className="p-4 cursor-pointer hover:bg-slate-100 whitespace-nowrap" onClick={() => handleSort('name')}>
                    Producto <SortIcon active={sortKey === 'name'} direction={sortDirection} />
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-100 whitespace-nowrap" onClick={() => handleSort('section')}>
                    Sección <SortIcon active={sortKey === 'section'} direction={sortDirection} />
                  </th>
                  {canSeeCost && <th className="p-4 text-right whitespace-nowrap">Costo Prom.</th>}
                  <th className="p-4 text-center cursor-pointer hover:bg-slate-100 whitespace-nowrap" onClick={() => handleSort('quantity')}>
                    Stock Actual <SortIcon active={sortKey === 'quantity'} direction={sortDirection} />
                  </th>
                  <th className="p-4 text-center whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.length === 0 && (
                    <tr>
                        <td colSpan={canSeeCost ? 5 : 4} className="p-8 text-center text-slate-400">
                          {searchTerm || filterSection !== 'ALL' ? 'No se encontraron productos.' : 'No hay productos registrados.'}
                        </td>
                    </tr>
                )}
                {sortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-4 relative">
                        <div className="group relative inline-block">
                            <div className="flex items-center gap-2 cursor-help">
                              <span className="font-medium text-slate-800 border-b border-dotted border-slate-300">{item.name}</span>
                              {canEditEncoders && (
                                  <button onClick={(e) => { e.stopPropagation(); startEditItem(item); }} className="text-slate-300 hover:text-blue-600" title="Editar Nombre/Costo">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                              )}
                            </div>
                            
                            {/* Tooltip Card - Quick View */}
                            <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform translate-y-2 group-hover:translate-y-0 text-left pointer-events-none md:pointer-events-auto">
                                <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-bold text-slate-900 text-sm">{item.name}</h5>
                                    {item.quantity <= (item.minStock || 0) && (
                                         <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold whitespace-nowrap ml-2">Bajo Stock</span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mb-4 leading-relaxed line-clamp-4">
                                    {item.description || "Sin descripción detallada."}
                                </p>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs border-t border-slate-100 pt-3">
                                     <div>
                                        <span className="text-slate-400 block mb-0.5">Stock Disponible</span>
                                        <span className="font-bold text-slate-700 text-sm">{item.quantity} <span className="text-xs font-normal text-slate-500">{item.unit}</span></span>
                                     </div>
                                     {canSeeCost && (
                                        <div>
                                            <span className="text-slate-400 block mb-0.5">Valor Total</span>
                                            <span className="font-bold text-slate-700 text-sm">${(item.quantity * item.averageCost).toLocaleString()}</span>
                                        </div>
                                     )}
                                     <div>
                                        <span className="text-slate-400 block mb-0.5">Ubicación</span>
                                        <span className="font-medium text-slate-700">{item.section}</span>
                                     </div>
                                     <div>
                                        <span className="text-slate-400 block mb-0.5">Mínimo Requerido</span>
                                        <span className="font-medium text-slate-700">{item.minStock || 0} {item.unit}</span>
                                     </div>
                                </div>
                                {/* Arrow */}
                                <div className="absolute -top-1 left-6 w-2 h-2 bg-white border-t border-l border-slate-200 transform rotate-45"></div>
                            </div>
                        </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded border border-slate-200">{item.section}</span>
                    </td>
                    {canSeeCost && (
                        <td className="p-4 text-right font-medium text-slate-600">
                            ${item.averageCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                    )}
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full font-bold whitespace-nowrap ${
                        item.quantity <= (item.minStock || 5) ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="p-4 flex justify-center gap-2">
                      <button
                        onClick={() => {
                            setSelectedItem(item);
                            setMovementType('IN');
                        }}
                        className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-xs font-medium whitespace-nowrap"
                        title="Registrar Entrada"
                      >
                        + Ent
                      </button>
                      <button
                        onClick={() => {
                            setSelectedItem(item);
                            setMovementType('OUT');
                        }}
                        className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 text-xs font-medium whitespace-nowrap"
                        title="Registrar Salida"
                      >
                        - Sal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORY VIEW */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-4 whitespace-nowrap">Fecha</th>
                  <th className="p-4 whitespace-nowrap">Producto</th>
                  <th className="p-4 whitespace-nowrap">Tipo</th>
                  <th className="p-4 text-right whitespace-nowrap">Cantidad</th>
                  <th className="p-4 text-right whitespace-nowrap">Costo Unit.</th>
                  <th className="p-4 min-w-[150px]">Razón / Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">No hay movimientos registrados en este rango.</td>
                    </tr>
                )}
                {[...filteredMovements].reverse().map(mov => (
                  <tr key={mov.id} className="hover:bg-slate-50">
                      <td className="p-4 text-xs whitespace-nowrap">{new Date(mov.date).toLocaleString()}</td>
                      <td className="p-4 font-medium text-slate-800 whitespace-nowrap">{mov.itemName}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                            mov.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {mov.type === 'IN' ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold whitespace-nowrap">
                        {mov.quantity}
                      </td>
                      <td className="p-4 text-right text-xs text-slate-500 whitespace-nowrap">
                        {mov.unitCost ? `$${mov.unitCost.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4 text-slate-500 italic">
                        {mov.reason}
                      </td>
                  </tr>
                ))}
              </tbody>
             </table>
           </div>
        </div>
      )}

      {/* ENCODERS VIEW (SETTINGS) */}
      {activeTab === 'encoders' && canEditEncoders && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* UNITS SECTION */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                 </svg>
                 Unidades de Medida
              </h3>
              
              <form onSubmit={handleSubmitUnit} className="flex gap-2 mb-6">
                 <input 
                   type="text" 
                   placeholder="Nombre (e.g. Kilogramos)" 
                   className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                   value={newUnitName}
                   onChange={(e) => setNewUnitName(e.target.value)}
                   required
                 />
                 <input 
                   type="text" 
                   placeholder="Abbr (e.g. kg)" 
                   className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                   value={newUnitAbbr}
                   onChange={(e) => setNewUnitAbbr(e.target.value)}
                   required
                 />
                 <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                   +
                 </button>
              </form>

              <div className="space-y-2">
                 {units.map(u => (
                   <div key={u.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                      <div>
                        <span className="font-medium text-slate-700 text-sm">{u.name}</span>
                        <span className="ml-2 text-xs text-slate-400">({u.abbreviation})</span>
                      </div>
                      <button 
                        onClick={() => onDeleteUnit(u.id)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
                      </button>
                   </div>
                 ))}
              </div>
           </div>

           {/* SECTIONS SECTION */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                 </svg>
                 Secciones / Ubicaciones
              </h3>
              
              <form onSubmit={handleSubmitSection} className="flex gap-2 mb-6">
                 <input 
                   type="text" 
                   placeholder="Nombre (e.g. Bodega Principal)" 
                   className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                   value={newSectionName}
                   onChange={(e) => setNewSectionName(e.target.value)}
                   required
                 />
                 <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                   +
                 </button>
              </form>

              <div className="space-y-2">
                 {sections.map(s => (
                   <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                      <span className="font-medium text-slate-700 text-sm">{s.name}</span>
                      <button 
                        onClick={() => onDeleteSection(s.id)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
                      </button>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Movement Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Ajuste de Stock
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Producto: <span className="font-bold text-slate-800">{selectedItem.name}</span>
            </p>
            
            <form onSubmit={handleMovementSubmit}>
                {/* Switcher for Movement Type */}
                <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                   <button
                     type="button"
                     onClick={() => setMovementType('IN')}
                     className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${movementType === 'IN' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     Entrada (+ Stock)
                   </button>
                   <button
                     type="button"
                     onClick={() => setMovementType('OUT')}
                     className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${movementType === 'OUT' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     Salida (- Stock)
                   </button>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad ({selectedItem.unit})</label>
                    <input
                        type="number"
                        value={movementQty}
                        onChange={(e) => setMovementQty(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        autoFocus
                        required
                        min="0.01"
                        step="0.01"
                    />
                </div>
                
                {movementType === 'IN' ? (
                     <div className="mb-4">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Costo Unitario de Entrada ($)</label>
                        <input
                            type="number"
                            value={movementCost}
                            onChange={(e) => setMovementCost(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            required
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Este costo recalculará el Promedio Ponderado.</p>
                     </div>
                ) : (
                     <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Costo de Salida (Automático)</label>
                        <p className="text-lg font-bold text-slate-700">
                           ${selectedItem.averageCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Las salidas se registran al Costo Promedio actual.</p>
                     </div>
                )}

                <div className="mb-6">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Razón / Nota</label>
                    <input
                        type="text"
                        value={movementReason}
                        onChange={(e) => setMovementReason(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder={movementType === 'IN' ? 'Ej. Compra de proveedor' : 'Ej. Venta, Uso interno'}
                        required
                    />
                </div>

                <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => {
                        setSelectedItem(null);
                        setMovementQty('');
                        setMovementReason('');
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className={`flex-1 px-4 py-2 text-white rounded-lg font-medium ${
                        movementType === 'IN' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                    Confirmar {movementType === 'IN' ? 'Entrada' : 'Salida'}
                </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};