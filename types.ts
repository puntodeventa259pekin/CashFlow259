
export enum TransactionType {
  INCOME = 'INGRESO',
  EXPENSE = 'EGRESO',
  TRANSFER = 'TRASPASO',
}

export enum DebtType {
  RECEIVABLE = 'POR_COBRAR', // Money owed to us (Anticipos fit here)
  PAYABLE = 'POR_PAGAR',     // Money we owe
}

export enum TransactionStatus {
  PENDING = 'PENDIENTE',
  VALIDATED = 'VALIDADO',
  REJECTED = 'RECHAZADO',
}

export type UserRole = 'admin' | 'accountant' | 'employee' | 'partner';

export interface UserPermissions {
  inventory: boolean;
  debts: boolean; // Access to Ctas
  transactions: boolean; // Access to History
}

export interface Holder {
  id: string;
  name: string;
  username: string;
  password?: string; // In a real app, never store plain text. Mock only.
  balance: number;
  role: UserRole;
  permissions?: UserPermissions;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  holderId: string; // The person holding the cash
  targetHolderId?: string; // For transfers
  description: string;
  category: string;
  status: TransactionStatus;
  createdBy: string; // ID of the user who created it
}

export interface Debt {
  id: string;
  entityName: string; // Person/Company owed/owing
  amount: number;
  type: DebtType;
  description: string;
  issueDate: string; // Date the debt was created
  dueDate?: string;  // When it needs to be paid
  isPaid: boolean;
  status: TransactionStatus; // Pending or Validated
  // Payment History Fields
  paymentDate?: string;
  paymentHolderId?: string;
  paymentTransactionId?: string;
}

// Inventory Types
export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  averageCost: number; // Weighted Average Cost
  unit: string; // e.g., 'units', 'kg', 'liters'
  section: string; // Warehouse section or category
  minStock?: number;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string; // Snapshot of name in case item is deleted
  type: 'IN' | 'OUT';
  quantity: number;
  unitCost?: number; // Cost at the time of movement (for IN)
  date: string;
  reason: string;
}

export interface InventoryUnit {
  id: string;
  name: string; // e.g. 'Kilogramos', 'Unidades'
  abbreviation: string; // e.g. 'kg', 'u'
}

export interface InventorySection {
  id: string;
  name: string; // e.g. 'Bodega Principal', 'Estantería A'
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
  logs: LogEntry[];
}