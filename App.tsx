import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { TransactionForm } from './components/TransactionForm';
import { HolderList } from './components/HolderList';
import { DebtList } from './components/DebtList';
import { Inventory } from './components/Inventory';
import { Login } from './components/Login';
import { Holder, Transaction, Debt, TransactionType, DebtType, TransactionStatus, UserRole, InventoryItem, UserPermissions, InventoryMovement, InventoryUnit, InventorySection, LogEntry, SyncStatus, AppState } from './types';
import { initGoogleDrive, handleAuthClick, findDbFile, loadFromDrive, saveToDrive } from './services/driveService';

// --- DATABASE CONFIGURATION ---
const DB_KEY = 'CASHFLOW_PRO_DB_V1';
const SESSION_KEY = 'CASHFLOW_PRO_SESSION_V1';

// Initial Mock Data with passwords and roles
const INITIAL_HOLDERS: Holder[] = [
  { 
    id: '1', 
    name: 'Admin General', 
    username: 'admin', 
    password: '123', 
    balance: 5000, 
    role: 'admin',
    permissions: { inventory: true, debts: true, transactions: true }
  },
  { 
    id: '2', 
    name: 'Juan (Ventas)', 
    username: 'juan', 
    password: '123', 
    balance: 1200, 
    role: 'employee',
    permissions: { inventory: false, debts: false, transactions: true }
  },
  { 
    id: '3', 
    name: 'Maria (Contadora)', 
    username: 'maria', 
    password: '123', 
    balance: 0, 
    role: 'accountant',
    permissions: { inventory: true, debts: true, transactions: true }
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't1', date: new Date().toISOString(), amount: 1000, type: TransactionType.INCOME, holderId: '1', description: 'Capital inicial', category: 'Capital', status: TransactionStatus.VALIDATED, createdBy: '1' },
];

const INITIAL_INVENTORY: InventoryItem[] = [
    { id: '1', name: 'Laptop Dell Inspiron', description: 'Intel Core i5, 8GB RAM, 256GB SSD. Equipo para personal administrativo.', quantity: 5, averageCost: 450.00, unit: 'unidades', section: 'Oficina', minStock: 2 },
    { id: '2', name: 'Mouse Inalámbrico', description: 'Mouse óptico genérico, batería AA incluida.', quantity: 12, averageCost: 15.50, unit: 'unidades', section: 'Accesorios', minStock: 5 },
];

const INITIAL_UNITS: InventoryUnit[] = [
  { id: '1', name: 'Unidades', abbreviation: 'u' },
  { id: '2', name: 'Kilogramos', abbreviation: 'kg' },
  { id: '3', name: 'Litros', abbreviation: 'l' },
  { id: '4', name: 'Metros', abbreviation: 'm' },
  { id: '5', name: 'Cajas', abbreviation: 'caja' },
];

const INITIAL_SECTIONS: InventorySection[] = [
  { id: '1', name: 'General' },
  { id: '2', name: 'Bodega Principal' },
  { id: '3', name: 'Oficina' },
  { id: '4', name: 'Accesorios' },
];

enum View {
  DASHBOARD = 'dashboard',
  TRANSACTIONS = 'transactions',
  HOLDERS = 'holders',
  DEBTS = 'debts',
  INVENTORY = 'inventory',
  JOURNAL = 'journal'
}

// --- PERSISTENCE HELPERS ---
const loadDatabase = () => {
  try {
    const serializedDb = localStorage.getItem(DB_KEY);
    if (serializedDb === null) return null;
    return JSON.parse(serializedDb);
  } catch (err) {
    console.error("Error loading database:", err);
    return null;
  }
};

const loadSession = () => {
  try {
    const serializedSession = localStorage.getItem(SESSION_KEY);
    if (serializedSession === null) return null;
    return JSON.parse(serializedSession);
  } catch (err) {
    return null;
  }
};

const App: React.FC = () => {
  // Load saved data or fallback to initial data (Lazy Initialization)
  const savedData = loadDatabase();
  const savedSession = loadSession();

  const [currentUser, setCurrentUser] = useState<Holder | null>(savedSession || null);
  
  const [holders, setHolders] = useState<Holder[]>(savedData?.holders || INITIAL_HOLDERS);
  const [transactions, setTransactions] = useState<Transaction[]>(savedData?.transactions || INITIAL_TRANSACTIONS);
  const [debts, setDebts] = useState<Debt[]>(savedData?.debts || []);
  const [inventory, setInventory] = useState<InventoryItem[]>(savedData?.inventory || INITIAL_INVENTORY);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>(savedData?.inventoryMovements || []);
  const [logs, setLogs] = useState<LogEntry[]>(savedData?.logs || []);
  const [units, setUnits] = useState<InventoryUnit[]>(savedData?.units || INITIAL_UNITS);
  const [sections, setSections] = useState<InventorySection[]>(savedData?.sections || INITIAL_SECTIONS);
  
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Transaction Filters
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<string>('ALL');
  const [dateFilterStart, setDateFilterStart] = useState('');
  const [dateFilterEnd, setDateFilterEnd] = useState('');

  // --- GOOGLE DRIVE STATE ---
  const [isDriveReady, setIsDriveReady] = useState(false);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Drive API
  useEffect(() => {
    initGoogleDrive(() => {
      setIsDriveReady(true);
      setSyncStatus('idle');
    });
  }, []);

  const handleDriveConnect = () => {
    handleAuthClick(async () => {
      setSyncStatus('syncing');
      try {
        const fileId = await findDbFile();
        if (fileId) {
          setDriveFileId(fileId);
          const driveData = await loadFromDrive(fileId);
          if (driveData) {
            // Overwrite local state with Drive data
            setHolders(driveData.holders);
            setTransactions(driveData.transactions);
            setDebts(driveData.debts);
            setInventory(driveData.inventory);
            setInventoryMovements(driveData.inventoryMovements);
            setLogs(driveData.logs);
            setUnits(driveData.units || INITIAL_UNITS);
            setSections(driveData.sections || INITIAL_SECTIONS);
            alert("Datos cargados exitosamente desde Google Drive.");
          }
        } else {
          // File doesn't exist, we will create it on next save
          alert("Conectado. Se creará un archivo nuevo en tu Drive al guardar.");
        }
        setSyncStatus('saved');
      } catch (error) {
        console.error("Drive Error:", error);
        setSyncStatus('error');
        alert("Error al conectar con Drive. Verifica la consola.");
      }
    });
  };

  // --- PERSISTENCE EFFECTS ---
  
  // 1. Auto-save Database (LocalStorage + Drive)
  useEffect(() => {
    const dataToSave: AppState = {
      holders,
      transactions,
      debts,
      inventory,
      inventoryMovements,
      logs,
      units,
      sections
    };
    
    // Save to LocalStorage immediately
    localStorage.setItem(DB_KEY, JSON.stringify(dataToSave));

    // Debounce Save to Drive
    if (driveFileId || (isDriveReady && syncStatus === 'saved')) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      setSyncStatus('syncing');
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const newFileId = await saveToDrive(dataToSave, driveFileId);
          if (!driveFileId) setDriveFileId(newFileId);
          setSyncStatus('saved');
        } catch (err) {
          setSyncStatus('error');
        }
      }, 2000); // Wait 2 seconds of inactivity
    }

  }, [holders, transactions, debts, inventory, inventoryMovements, logs, units, sections, driveFileId, isDriveReady]);

  // 2. Auto-save Session on user change
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser]);

  // Optional: Auto-collapse on small screens
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  // --- LOGGING SYSTEM ---
  const addLog = (action: string, details: string) => {
    if (!currentUser) return;
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random().toString(),
      date: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      details
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleFactoryReset = () => {
    if (confirm("¿Estás seguro? Esto borrará TODOS los datos registrados y restaurará la aplicación al estado inicial. Esta acción no se puede deshacer.")) {
      localStorage.removeItem(DB_KEY);
      localStorage.removeItem(SESSION_KEY);
      window.location.reload();
    }
  };

  // Helper to update holder balance
  const updateBalance = (holderId: string, amount: number) => {
    setHolders(prev => prev.map(h => 
      h.id === holderId ? { ...h, balance: h.balance + amount } : h
    ));
  };

  const handleLogin = (user: Holder) => {
    // If we have saved data, we must find the latest version of this user from 'holders' state
    const dbUser = holders.find(h => h.id === user.id) || user;
    
    setCurrentUser(dbUser);
    setCurrentView(View.DASHBOARD);
    setLogs(prev => [{
      id: Date.now().toString(),
      date: new Date().toISOString(),
      userId: dbUser.id,
      userName: dbUser.name,
      action: 'LOGIN',
      details: 'Inicio de sesión'
    }, ...prev]);
  };

  const handleLogout = () => {
    addLog('LOGOUT', 'Cierre de sesión');
    setCurrentUser(null);
  };

  const handleAddTransaction = (
    type: TransactionType,
    amount: number,
    holderId: string,
    description: string,
    category: string,
    status: TransactionStatus,
    targetHolderId?: string
  ) => {
    const newTx: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      amount,
      type,
      holderId,
      targetHolderId,
      description,
      category,
      status,
      createdBy: currentUser?.id || ''
    };

    setTransactions(prev => [...prev, newTx]);
    addLog('CREATE_TRANSACTION', `Tipo: ${type}, Monto: ${amount}, Estado: ${status}`);

    if (status === TransactionStatus.VALIDATED) {
        if (type === TransactionType.INCOME) {
            updateBalance(holderId, amount);
        } else if (type === TransactionType.EXPENSE) {
            updateBalance(holderId, -amount);
        } else if (type === TransactionType.TRANSFER && targetHolderId) {
            updateBalance(holderId, -amount);
            updateBalance(targetHolderId, amount);
        }
    }
    return newTx.id;
  };

  const handleUpdateTransactionStatus = (txId: string, newStatus: TransactionStatus) => {
      const tx = transactions.find(t => t.id === txId);
      if (!tx) return;

      // Logic to reverse balance if we are moving OUT of Validated
      if (tx.status === TransactionStatus.VALIDATED && newStatus !== TransactionStatus.VALIDATED) {
          // Revert balance
          if (tx.type === TransactionType.INCOME) updateBalance(tx.holderId, -tx.amount);
          if (tx.type === TransactionType.EXPENSE) updateBalance(tx.holderId, tx.amount);
          if (tx.type === TransactionType.TRANSFER && tx.targetHolderId) {
              updateBalance(tx.holderId, tx.amount);
              updateBalance(tx.targetHolderId, -tx.amount);
          }
      }

      // Logic to apply balance if we are moving INTO Validated
      if (tx.status !== TransactionStatus.VALIDATED && newStatus === TransactionStatus.VALIDATED) {
           if (tx.type === TransactionType.INCOME) updateBalance(tx.holderId, tx.amount);
           if (tx.type === TransactionType.EXPENSE) updateBalance(tx.holderId, -tx.amount);
           if (tx.type === TransactionType.TRANSFER && tx.targetHolderId) {
               updateBalance(tx.holderId, -tx.amount);
               updateBalance(tx.targetHolderId, tx.amount);
           }
      }

      setTransactions(prev => prev.map(t => 
        t.id === txId ? { ...t, status: newStatus } : t
      ));
      addLog('UPDATE_STATUS', `Transacción ${tx.description} cambiada de ${tx.status} a ${newStatus}`);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Fecha', 'Tipo', 'Estado', 'Monto', 'Custodio Origen', 'Custodio Destino', 'Descripción', 'Categoría'];
    
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(tx => {
        const date = new Date(tx.date).toLocaleDateString();
        const holderName = holders.find(h => h.id === tx.holderId)?.name || 'Desconocido';
        const targetName = tx.targetHolderId ? holders.find(h => h.id === tx.targetHolderId)?.name || '' : '';
        const safeDesc = `"${tx.description.replace(/"/g, '""')}"`; // Escape quotes
        
        return [
          tx.id,
          date,
          tx.type,
          tx.status,
          tx.amount,
          `"${holderName}"`,
          `"${targetName}"`,
          safeDesc,
          tx.category
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transacciones_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog('EXPORT_CSV', 'Se exportó el historial de transacciones.');
  };

  const handleAddHolder = (name: string, username: string, role: UserRole, permissions: UserPermissions, password?: string) => {
    const newHolder: Holder = {
      id: Date.now().toString(),
      name,
      username,
      password: password || '123',
      role,
      permissions,
      balance: 0
    };
    setHolders(prev => [...prev, newHolder]);
    addLog('ADD_USER', `Creó usuario: ${username} (${role})`);
  };

  const handleEditHolder = (id: string, name: string, username: string, role: UserRole, permissions: UserPermissions, password?: string) => {
    setHolders(prev => prev.map(h => {
      if (h.id === id) {
        return {
          ...h,
          name,
          username,
          role,
          permissions,
          password: password ? password : h.password
        };
      }
      return h;
    }));
    addLog('EDIT_USER', `Editó usuario: ${username}`);
  };

  const handleAddDebt = (entityName: string, amount: number, type: DebtType, description: string, issueDate: string, dueDate: string) => {
    const isAutoValidated = currentUser?.role === 'admin' || currentUser?.role === 'accountant';
    
    const newDebt: Debt = {
      id: Date.now().toString(),
      entityName,
      amount,
      type,
      description,
      issueDate,
      dueDate,
      isPaid: false,
      status: isAutoValidated ? TransactionStatus.VALIDATED : TransactionStatus.PENDING
    };
    setDebts(prev => [...prev, newDebt]);
    addLog('ADD_DEBT', `Creó cuenta: ${entityName} - $${amount}`);
  };

  const handleEditDebt = (id: string, entityName: string, amount: number, description: string, issueDate: string, dueDate: string) => {
    setDebts(prev => prev.map(d => 
      d.id === id ? { ...d, entityName, amount, description, issueDate, dueDate } : d
    ));
    addLog('EDIT_DEBT', `Editó cuenta ID: ${id}`);
  };

  const handleDeleteDebt = (id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
    addLog('DELETE_DEBT', `Eliminó cuenta ID: ${id}`);
  };

  const handleValidateDebt = (id: string) => {
    setDebts(prev => prev.map(d => 
      d.id === id ? { ...d, status: TransactionStatus.VALIDATED } : d
    ));
    addLog('VALIDATE_DEBT', `Validó cuenta ID: ${id}`);
  };

  const handleRejectDebt = (id: string) => {
      setDebts(prev => prev.map(d => 
          d.id === id ? { ...d, status: TransactionStatus.REJECTED } : d
      ));
      addLog('REJECT_DEBT', `Rechazó cuenta ID: ${id}`);
  };

  const handlePayDebt = (debt: Debt, holderId: string) => {
    const type = debt.type === DebtType.RECEIVABLE ? TransactionType.INCOME : TransactionType.EXPENSE;
    const description = `Liquidación de ${debt.type === DebtType.RECEIVABLE ? 'CxC' : 'CxP'}: ${debt.entityName} - ${debt.description}`;
    const status = TransactionStatus.PENDING; 
    
    // Create transaction first
    const txId = handleAddTransaction(type, debt.amount, holderId, description, 'Deudas y Anticipos', status);
    
    // Update debt to paid and link transaction
    setDebts(prev => prev.map(d => d.id === debt.id ? { 
        ...d, 
        isPaid: true,
        paymentDate: new Date().toISOString(),
        paymentHolderId: holderId,
        paymentTransactionId: txId
    } : d));
    
    addLog('PAY_DEBT', `Liquidó cuenta: ${debt.entityName}`);
  };

  // Inventory Handlers
  const handleAddInventoryItem = (name: string, quantity: number, cost: number, unit: string, section: string, description: string) => {
      const newItem: InventoryItem = {
          id: Date.now().toString(),
          name,
          description,
          quantity,
          averageCost: cost,
          unit,
          section,
          minStock: 0
      };
      setInventory(prev => [...prev, newItem]);
      addLog('INV_ADD_ITEM', `Nuevo producto: ${name} (Costo: ${cost})`);
      
      // Initial stock movement
      if (quantity > 0) {
          const initialMovement: InventoryMovement = {
              id: Date.now().toString() + '_init',
              itemId: newItem.id,
              itemName: name,
              type: 'IN',
              quantity: quantity,
              unitCost: cost,
              date: new Date().toISOString(),
              reason: 'Stock Inicial'
          };
          setInventoryMovements(prev => [...prev, initialMovement]);
      }
  };

  const handleUpdateStock = (itemId: string, type: 'IN' | 'OUT', quantity: number, unitCost: number, reason: string) => {
      let itemName = '';
      let movementUnitCost = unitCost;

      setInventory(prev => prev.map(item => {
          if (item.id === itemId) {
              itemName = item.name;
              
              let newAvgCost = item.averageCost;
              const newQty = type === 'IN' ? item.quantity + quantity : item.quantity - quantity;
              const finalQty = Math.max(0, newQty);

              // Update Average Cost only on INPUT
              if (type === 'IN') {
                  const currentTotalValue = item.quantity * item.averageCost;
                  const newTotalValue = currentTotalValue + (quantity * unitCost);
                  if (finalQty > 0) {
                      newAvgCost = newTotalValue / finalQty;
                  } else {
                      newAvgCost = unitCost;
                  }
              } else {
                  // For OUT movements, the movement cost is the current Average Cost
                  movementUnitCost = item.averageCost;
              }

              return { 
                  ...item, 
                  quantity: finalQty,
                  averageCost: newAvgCost 
              };
          }
          return item;
      }));

      // Record Movement
      const newMovement: InventoryMovement = {
          id: Date.now().toString(),
          itemId,
          itemName: itemName,
          type,
          quantity,
          unitCost: movementUnitCost, // Use the correct cost based on type
          date: new Date().toISOString(),
          reason
      };
      setInventoryMovements(prev => [...prev, newMovement]);
      addLog('INV_MOVEMENT', `${type} ${quantity} de ${itemName}. Razón: ${reason}`);
  };

  const handleEditInventoryItem = (id: string, name: string, averageCost: number, description: string) => {
      setInventory(prev => prev.map(item => 
          item.id === id ? { ...item, name, averageCost, description } : item
      ));
      addLog('INV_EDIT_ITEM', `Editó producto ID: ${id} - Nombre: ${name}, Costo: ${averageCost}`);
  };

  // Inventory Settings Handlers
  const handleAddUnit = (name: string, abbreviation: string) => {
    setUnits(prev => [...prev, { id: Date.now().toString(), name, abbreviation }]);
  };
  const handleDeleteUnit = (id: string) => {
    setUnits(prev => prev.filter(u => u.id !== id));
  };
  const handleAddSection = (name: string) => {
    setSections(prev => [...prev, { id: Date.now().toString(), name }]);
  };
  const handleDeleteSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
  };

  // --- Logic based on Role & Permissions ---
  const isAdminOrAccountant = currentUser?.role === 'admin' || currentUser?.role === 'accountant';
  const isAdmin = currentUser?.role === 'admin';
  
  // Visibility Flags
  const canViewInventory = isAdminOrAccountant || currentUser?.permissions?.inventory;
  const canViewDebts = isAdminOrAccountant || currentUser?.permissions?.debts;
  const canViewTransactions = isAdminOrAccountant || currentUser?.permissions?.transactions;
  const canViewHolders = isAdminOrAccountant; 

  // Data Filtering
  const visibleTransactions = isAdminOrAccountant
    ? transactions
    : transactions.filter(tx => tx.holderId === currentUser?.id || tx.targetHolderId === currentUser?.id);

  // Search & Filter
  const filteredTransactions = visibleTransactions.filter(tx => {
    // Text Filter
    if (transactionSearch) {
        const term = transactionSearch.toLowerCase();
        const matchText = (
          tx.description.toLowerCase().includes(term) ||
          tx.category.toLowerCase().includes(term) ||
          tx.amount.toString().includes(term)
        );
        if (!matchText) return false;
    }
    // Status Filter
    if (transactionStatusFilter !== 'ALL' && tx.status !== transactionStatusFilter) {
        return false;
    }
    
    // Date Filters
    const txDate = tx.date.split('T')[0];
    if (dateFilterStart && txDate < dateFilterStart) {
        return false;
    }
    if (dateFilterEnd && txDate > dateFilterEnd) {
        return false;
    }

    return true;
  });

  const visibleHolders = isAdminOrAccountant
    ? holders
    : holders.filter(h => h.id === currentUser?.id); 

  const visibleDebts = canViewDebts
    ? debts
    : [];

  if (!currentUser) {
    return <Login holders={holders} onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-800 relative">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`bg-white border-r border-slate-200 flex-shrink-0 flex flex-col fixed h-full z-30 transition-all duration-300 ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-20 md:translate-x-0'}`}>
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-8 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-full p-1 shadow-sm z-50 hover:shadow-md transition-all hidden md:block"
          title={isSidebarOpen ? "Ocultar barra" : "Mostrar barra"}
        >
           {isSidebarOpen ? (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
             </svg>
           ) : (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
             </svg>
           )}
        </button>

        <div className={`p-6 flex items-center ${isSidebarOpen ? 'justify-start gap-2' : 'justify-center'} border-b border-slate-100 transition-all`}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">C</div>
          <span className={`font-bold text-xl tracking-tight overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0 hidden'}`}>CashFlow</span>
        </div>
        
        <div className="px-4 py-4 mb-2 border-b border-slate-50">
           <div className={`flex items-center ${isSidebarOpen ? 'justify-start gap-3' : 'justify-center'} transition-all`}>
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold uppercase flex-shrink-0">
                {currentUser.username.substring(0, 2)}
              </div>
              <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0 hidden'}`}>
                <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-500 capitalize">{currentUser.role === 'accountant' ? 'Contador' : currentUser.role}</p>
              </div>
           </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          <NavItem 
            active={currentView === View.DASHBOARD} 
            onClick={() => setCurrentView(View.DASHBOARD)} 
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />}
            label="Dashboard"
            isExpanded={isSidebarOpen}
          />
          {canViewTransactions && (
            <NavItem 
              active={currentView === View.TRANSACTIONS} 
              onClick={() => setCurrentView(View.TRANSACTIONS)} 
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />}
              label="Transacción"
              isExpanded={isSidebarOpen}
            />
          )}
          
          {canViewHolders && (
            <NavItem 
              active={currentView === View.HOLDERS} 
              onClick={() => setCurrentView(View.HOLDERS)} 
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />}
              label="Usuarios" 
              isExpanded={isSidebarOpen}
            />
          )}

          {canViewDebts && (
             <NavItem 
              active={currentView === View.DEBTS} 
              onClick={() => setCurrentView(View.DEBTS)} 
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
              label="Ctas" 
              isExpanded={isSidebarOpen}
            />
          )}
          
          {canViewInventory && (
             <NavItem 
              active={currentView === View.INVENTORY} 
              onClick={() => setCurrentView(View.INVENTORY)} 
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />}
              label="Inventario" 
              isExpanded={isSidebarOpen}
            />
          )}

          {isAdmin && (
             <NavItem 
              active={currentView === View.JOURNAL} 
              onClick={() => setCurrentView(View.JOURNAL)} 
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />}
              label="Diario" 
              isExpanded={isSidebarOpen}
            />
          )}

          <div className="pt-8 mt-auto pb-20 md:pb-0">
            {/* Drive Sync Status Indicator */}
            {isSidebarOpen && (
              <div className="px-2 mb-4">
                 <div className={`text-xs p-2 rounded flex items-center gap-2 ${
                   syncStatus === 'saved' ? 'text-green-600 bg-green-50' : 
                   syncStatus === 'syncing' ? 'text-blue-600 bg-blue-50' :
                   syncStatus === 'error' ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-50'
                 }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      syncStatus === 'saved' ? 'bg-green-500' :
                      syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' :
                      syncStatus === 'error' ? 'bg-red-500' : 'bg-slate-300'
                    }`}></div>
                    <span className="truncate">
                      {syncStatus === 'saved' ? 'Drive Sincronizado' : 
                       syncStatus === 'syncing' ? 'Guardando en Drive...' :
                       syncStatus === 'error' ? 'Error Sync Drive' : 'Drive Inactivo'}
                    </span>
                 </div>
                 {isDriveReady && !driveFileId && (
                   <button 
                     onClick={handleDriveConnect} 
                     className="mt-2 w-full text-xs bg-indigo-100 text-indigo-700 py-1 rounded hover:bg-indigo-200 transition-colors"
                   >
                     Conectar Drive
                   </button>
                 )}
              </div>
            )}

            <button 
              onClick={handleLogout}
              className={`w-full flex items-center p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors ${isSidebarOpen ? 'flex-row gap-3 px-4 justify-start' : 'flex-col justify-center px-2'}`}
              title={!isSidebarOpen ? "Cerrar Sesión" : ""}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className={`font-medium transition-all duration-200 whitespace-nowrap ${isSidebarOpen ? 'text-sm opacity-100' : 'text-[10px] mt-1 opacity-100'}`}>Cerrar Sesión</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'} p-4 md:p-8 overflow-y-auto h-screen transition-all duration-300`}>
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 md:gap-0">
          <div className="flex items-center gap-4">
             {/* Hamburger Menu for Mobile */}
             <button
               onClick={() => setIsSidebarOpen(true)}
               className="md:hidden text-slate-500 hover:text-indigo-600 focus:outline-none"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
               </svg>
             </button>
             
             <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                  {currentView === View.DASHBOARD && 'Resumen Financiero'}
                  {currentView === View.TRANSACTIONS && 'Transacción'}
                  {currentView === View.HOLDERS && 'Gestión de Usuarios'}
                  {currentView === View.DEBTS && 'Cuentas y Anticipos'}
                  {currentView === View.INVENTORY && 'Control de Inventario'}
                  {currentView === View.JOURNAL && 'Diario de la Aplicación'}
                </h1>
                <p className="text-slate-500 text-sm">
                  {isAdminOrAccountant ? 'Vista Global' : 'Vista Personal'}
                </p>
             </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
             {!driveFileId && isDriveReady && (
               <button 
                onClick={handleDriveConnect}
                className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-3 md:py-2 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                 </svg>
                 Conectar Drive
               </button>
             )}

             <button 
              onClick={() => setIsTransactionModalOpen(true)}
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 md:py-2 rounded-lg font-medium shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Nueva Transacción
            </button>
          </div>
        </header>

        {currentView === View.DASHBOARD && (
          <Dashboard transactions={visibleTransactions} holders={visibleHolders} debts={visibleDebts} />
        )}
        
        {currentView === View.TRANSACTIONS && (
          <div className="space-y-4">
             {/* Search and Filter Bar */}
             <div className="flex flex-col xl:flex-row gap-2">
                 <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-2 flex-1 min-w-[250px]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input 
                      type="text" 
                      placeholder="Buscar por descripción..." 
                      className="w-full p-2 outline-none text-sm text-slate-700 placeholder:text-slate-400"
                      value={transactionSearch}
                      onChange={(e) => setTransactionSearch(e.target.value)}
                    />
                 </div>
                 
                 <div className="flex flex-col md:flex-row gap-2">
                    <select 
                      className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm"
                      value={transactionStatusFilter}
                      onChange={(e) => setTransactionStatusFilter(e.target.value)}
                    >
                      <option value="ALL">Todos los Estados</option>
                      <option value={TransactionStatus.PENDING}>Pendientes</option>
                      <option value={TransactionStatus.VALIDATED}>Validados</option>
                      <option value={TransactionStatus.REJECTED}>Rechazados</option>
                    </select>

                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 shadow-sm">
                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Desde:</span>
                        <input 
                            type="date" 
                            className="text-sm text-slate-700 outline-none py-2 bg-transparent"
                            value={dateFilterStart}
                            onChange={(e) => setDateFilterStart(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 shadow-sm">
                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Hasta:</span>
                        <input 
                            type="date" 
                            className="text-sm text-slate-700 outline-none py-2 bg-transparent"
                            value={dateFilterEnd}
                            onChange={(e) => setDateFilterEnd(e.target.value)}
                        />
                    </div>
                 </div>

                 <button
                   onClick={handleExportCSV}
                   className="bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                   title="Descargar CSV"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                   </svg>
                   Exportar CSV
                 </button>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-4 whitespace-nowrap">Fecha</th>
                        <th className="p-4 whitespace-nowrap">Estado</th>
                        <th className="p-4 whitespace-nowrap">Tipo</th>
                        <th className="p-4 min-w-[200px]">Descripción</th>
                        <th className="p-4 whitespace-nowrap">Custodio</th>
                        <th className="p-4 text-right whitespace-nowrap">Monto</th>
                        <th className="p-4 text-center whitespace-nowrap">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...filteredTransactions].reverse().map(tx => {
                        // Logic to determine if user can validate/reject this specific transaction
                        // Admin/Accountant can manage all. 
                        // Target of a Transfer can manage that specific transfer.
                        const isTransferTarget = tx.type === TransactionType.TRANSFER && tx.targetHolderId === currentUser.id;
                        const canManage = isAdminOrAccountant || isTransferTarget;

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50">
                            <td className="p-4 text-xs whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</td>
                            <td className="p-4">
                              {isAdminOrAccountant ? (
                                <select 
                                    value={tx.status}
                                    onChange={(e) => handleUpdateTransactionStatus(tx.id, e.target.value as TransactionStatus)}
                                    className={`px-2 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${
                                        tx.status === TransactionStatus.VALIDATED 
                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                        : tx.status === TransactionStatus.REJECTED 
                                        ? 'bg-red-50 text-red-700 border-red-200'
                                        : 'bg-orange-50 text-orange-700 border-orange-200'
                                    }`}
                                >
                                    <option value={TransactionStatus.PENDING}>PENDIENTE</option>
                                    <option value={TransactionStatus.VALIDATED}>VALIDADO</option>
                                    <option value={TransactionStatus.REJECTED}>RECHAZADO</option>
                                </select>
                              ) : (
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${
                                    tx.status === TransactionStatus.VALIDATED 
                                      ? 'bg-green-50 text-green-700 border-green-200' 
                                      : tx.status === TransactionStatus.REJECTED 
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-orange-50 text-orange-700 border-orange-200'
                                  }`}>
                                    {tx.status}
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                                tx.type === TransactionType.INCOME ? 'bg-green-100 text-green-700' :
                                tx.type === TransactionType.EXPENSE ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="font-medium text-slate-800">{tx.description}</div>
                              <div className="text-xs text-slate-400">{tx.category}</div>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              {holders.find(h => h.id === tx.holderId)?.name}
                              {tx.type === TransactionType.TRANSFER && (
                                <span className="text-slate-400"> → {holders.find(h => h.id === tx.targetHolderId)?.name}</span>
                              )}
                            </td>
                            <td className={`p-4 text-right font-bold whitespace-nowrap ${
                              tx.type === TransactionType.INCOME ? 'text-green-600' :
                              tx.type === TransactionType.EXPENSE ? 'text-red-600' :
                              'text-slate-600'
                            }`}>
                              ${tx.amount.toLocaleString()}
                            </td>
                            <td className="p-4 text-center">
                              {/* If standard user (recipient) needs to validate */}
                              {tx.status === TransactionStatus.PENDING && !isAdminOrAccountant && canManage && (
                                <div className="flex justify-center gap-1">
                                    <button 
                                      onClick={() => handleUpdateTransactionStatus(tx.id, TransactionStatus.REJECTED)}
                                      className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded hover:bg-red-100 transition-colors"
                                      title="Denegar"
                                    >
                                      Rechazar
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateTransactionStatus(tx.id, TransactionStatus.VALIDATED)}
                                      className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded hover:bg-indigo-100 transition-colors"
                                      title="Validar"
                                    >
                                      Validar
                                    </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}

        {currentView === View.HOLDERS && canViewHolders && (
          <HolderList 
            currentUser={currentUser} 
            holders={visibleHolders} 
            onAddHolder={handleAddHolder} 
            onEditHolder={handleEditHolder} 
          />
        )}

        {currentView === View.DEBTS && canViewDebts && (
          <DebtList 
            debts={visibleDebts} 
            holders={visibleHolders}
            transactions={transactions}
            currentUser={currentUser}
            onAddDebt={handleAddDebt} 
            onEditDebt={handleEditDebt}
            onDeleteDebt={handleDeleteDebt}
            onValidateDebt={handleValidateDebt}
            onRejectDebt={handleRejectDebt}
            onPayDebt={handlePayDebt} 
          />
        )}

        {currentView === View.INVENTORY && canViewInventory && (
          <Inventory 
            items={inventory}
            movements={inventoryMovements}
            units={units}
            sections={sections}
            currentUser={currentUser}
            onAddItem={handleAddInventoryItem}
            onEditItem={handleEditInventoryItem}
            onUpdateStock={handleUpdateStock}
            onAddUnit={handleAddUnit}
            onDeleteUnit={handleDeleteUnit}
            onAddSection={handleAddSection}
            onDeleteSection={handleDeleteSection}
          />
        )}

        {currentView === View.JOURNAL && isAdmin && (
            <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800">Registro de Actividad</h3>
                    <div className="flex gap-2">
                      <button 
                          onClick={handleFactoryReset}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                          Reiniciar Todo (Factory Reset)
                      </button>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                           <tr>
                              <th className="p-4 whitespace-nowrap">Fecha / Hora</th>
                              <th className="p-4 whitespace-nowrap">Usuario</th>
                              <th className="p-4 whitespace-nowrap">Acción</th>
                              <th className="p-4 min-w-[300px]">Detalle</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {logs.length === 0 && (
                               <tr>
                                   <td colSpan={4} className="p-8 text-center text-slate-400">El diario está vacío o fue inicializado.</td>
                               </tr>
                           )}
                           {logs.map(log => (
                               <tr key={log.id} className="hover:bg-slate-50">
                                   <td className="p-4 whitespace-nowrap text-xs">{new Date(log.date).toLocaleString()}</td>
                                   <td className="p-4 font-medium text-indigo-600 whitespace-nowrap">{log.userName}</td>
                                   <td className="p-4">
                                       <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold border border-slate-200 whitespace-nowrap">
                                           {log.action}
                                       </span>
                                   </td>
                                   <td className="p-4 text-slate-500">{log.details}</td>
                               </tr>
                           ))}
                        </tbody>
                     </table>
                   </div>
                </div>
            </div>
        )}

      </main>

      {/* Modal */}
      {isTransactionModalOpen && (
        <TransactionForm 
          currentUser={currentUser}
          holders={holders} 
          onAddTransaction={handleAddTransaction} 
          onClose={() => setIsTransactionModalOpen(false)} 
        />
      )}
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; isExpanded: boolean }> = ({ active, onClick, icon, label, isExpanded }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center p-2 rounded-lg transition-colors ${
      active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    } ${isExpanded ? 'flex-row gap-3 px-4 justify-start' : 'flex-col justify-center px-2'}`}
    title={!isExpanded ? label : ''}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icon}
    </svg>
    <span className={`whitespace-nowrap transition-all duration-200 ${isExpanded ? 'text-sm opacity-100' : 'text-[10px] mt-1 opacity-100'}`}>{label}</span>
  </button>
);

export default App;