import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Necesario para importar módulos nativos como sqlite3 en un entorno ESM
const require = createRequire(import.meta.url);
const sqlite3 = require('sqlite3').verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURACIÓN DE RUTA ESPECÍFICA ---
const TARGET_DIR = 'C:\\Users\\GameZone\\Downloads\\cashflow259\\sql';
const DB_PATH = path.join(TARGET_DIR, 'cashflow_local.db');

// Asegurar que el directorio existe
if (!fs.existsSync(TARGET_DIR)) {
  try {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`Directorio creado: ${TARGET_DIR}`);
  } catch (err) {
    console.error('Error creando directorio:', err);
  }
}

// Inicializar SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error abriendo base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite en:', DB_PATH);
    initDb();
  }
});

function initDb() {
  // Creamos una tabla simple key-value para guardar el estado completo de la app (JSON)
  db.run(`CREATE TABLE IF NOT EXISTS app_store (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Insertar fila inicial si no existe
  db.run(`INSERT OR IGNORE INTO app_store (id, data) VALUES (1, '{}')`);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // IMPORTANTE: Usamos .cjs para asegurar compatibilidad con require() en el preload
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false 
    },
  });

  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // --- IPC HANDLERS (Comunicación Front-Back) ---

  // Guardar datos
  ipcMain.handle('db-save', async (event, appState) => {
    return new Promise((resolve, reject) => {
      const json = JSON.stringify(appState);
      db.run(
        `UPDATE app_store SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
        [json],
        function (err) {
          if (err) {
            console.error('Error guardando:', err);
            reject(err.message);
          } else {
            console.log('Datos guardados en SQLite');
            resolve(true);
          }
        }
      );
    });
  });

  // Cargar datos
  ipcMain.handle('db-load', async () => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT data FROM app_store WHERE id = 1`, (err, row) => {
        if (err) {
          console.error('Error cargando:', err);
          reject(err.message);
        } else {
          try {
            const data = row && row.data ? JSON.parse(row.data) : null;
            if (data && Object.keys(data).length === 0) resolve(null);
            else resolve(data);
          } catch (e) {
            reject('Error parseando JSON de DB');
          }
        }
      });
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db.close();
    app.quit();
  }
});