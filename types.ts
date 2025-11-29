export enum TransactionType {
  INCOME = 'INGRESO',
  EXPENSE = 'EGRESO',
  TRANSFER = 'TRASPASO',
}

export enum DebtType {
  RECEIVABLE = 'POR_COBRAR', 
  PAYABLE = 'POR_PAGAR',     
}

export enum TransactionStatus {
  PENDING = 'PENDIENTE',
  VALIDATED = 'VALIDADO',
  REJECTED = 'RECHAZADO',
}

export type UserRole = 'admin' | 'accountant' | 'employee' | 'partner';

export type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error';

export interface UserPermissions {
  inventory: boolean;
  debts: boolean;
  transactions: boolean;
}

export interface Holder {
  id: string;
  name: string;
  username: string;
  password?: string;
  balance: number;
  role: UserRole;
  permissions?: UserPermissions;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  holderId: string;
  targetHolderId?: string;
  description: string;
  category: string;
  status: TransactionStatus;
  createdBy: string;
}

export interface Debt {
  id: string;
  entityName: string;
  amount: number;
  type: DebtType;
  description: string;
  issueDate: string;
  dueDate?: string;
  isPaid: boolean;
  status: TransactionStatus;
  paymentDate?: string;
  paymentHolderId?: string;
  paymentTransactionId?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  averageCost: number;
  unit: string;
  section: string;
  minStock?: number;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  unitCost?: number;
  date: string;
  reason: string;
}

export interface InventoryUnit {
  id: string;
  name: string;
  abbreviation: string;
}

export interface InventorySection {
  id: string;
  name: string;
}

export interface LogEntry {
  id: string;
  date: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export interface AppState {
  holders: Holder[];
  transactions: Transaction[];
  debts: Debt[];
  inventory: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  logs: LogEntry[];
  units: InventoryUnit[];
  sections: InventorySection[];
}

// Global declaration for Electron Bridge
declare global {
  interface Window {
    electronAPI: {
      saveData: (data: AppState) => Promise<boolean>;
      loadData: () => Promise<AppState | null>;
      exportBackup: () => Promise<boolean>;
      importBackup: () => Promise<boolean>;
    };
  }
}