import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURACIÓN DE ALMACENAMIENTO ---
// Ruta fija solicitada
const TARGET_DIR = 'C:\\Users\\GameZone\\Downloads\\cashflow259\\sql'; 
const DB_FILE = path.join(TARGET_DIR, 'database.json');

// Asegurar que el directorio existe
if (!fs.existsSync(TARGET_DIR)) {
  try {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`Directorio de base de datos creado en: ${TARGET_DIR}`);
  } catch (err) {
    console.error('Error crítico creando directorio de datos:', err);
  }
}

// Inicializar archivo si no existe
if (!fs.existsSync(DB_FILE)) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
    console.log('Archivo database.json inicializado.');
  } catch (err) {
    console.error('Error inicializando DB:', err);
  }
}

let mainWindow;

function createWindow() {
  // Apuntar explícitamente al archivo .cjs que acabamos de crear
  const preloadPath = path.join(__dirname, 'preload.cjs');
  
  // Verificación de existencia para depuración
  if (!fs.existsSync(preloadPath)) {
      console.error("CRITICAL ERROR: preload.cjs not found at " + preloadPath);
  } else {
      console.log('Cargando preload desde:', preloadPath);
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true, // Debe ser true para contextBridge
      sandbox: false 
    },
  });

  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
  
  if (isDev) {
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:5173').catch(e => console.error(e));
    }, 1000);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // --- API HANDLERS (SISTEMA DE ARCHIVOS) ---

  // Guardado Atómico
  ipcMain.handle('db-save', async (event, appState) => {
    const tempFile = `${DB_FILE}.tmp`;
    try {
      const data = JSON.stringify(appState, null, 2);
      await fsPromises.writeFile(tempFile, data, 'utf-8');
      await fsPromises.rename(tempFile, DB_FILE);
      return true;
    } catch (err) {
      console.error('CRITICAL: Error guardando datos en disco:', err);
      return false;
    }
  });

  // Cargar datos
  ipcMain.handle('db-load', async () => {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = await fsPromises.readFile(DB_FILE, 'utf-8');
        if (!raw || raw.trim() === '') return null;
        try {
            return JSON.parse(raw);
        } catch (parseErr) {
            console.error('Error parseando JSON:', parseErr);
            return null; 
        }
      }
      return null;
    } catch (err) {
      console.error('Error leyendo archivo de datos:', err);
      return null;
    }
  });

  // Exportar Respaldo
  ipcMain.handle('db-export', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Exportar Respaldo de Seguridad',
      defaultPath: `respaldo_cashflow_${new Date().toISOString().slice(0,10).replace(/-/g, '')}.json`,
      filters: [{ name: 'JSON Data', extensions: ['json'] }]
    });

    if (canceled || !filePath) return false;

    try {
      await fsPromises.copyFile(DB_FILE, filePath);
      return true;
    } catch (err) {
      console.error('Error exportando:', err);
      return false;
    }
  });

  // Importar Respaldo
  ipcMain.handle('db-import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Restaurar Respaldo',
      filters: [{ name: 'JSON Data', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) return false;

    try {
      const sourcePath = filePaths[0];
      const raw = await fsPromises.readFile(sourcePath, 'utf-8');
      JSON.parse(raw); // Validar JSON
      await fsPromises.copyFile(sourcePath, DB_FILE);
      mainWindow.webContents.reload();
      return true;
    } catch (err) {
      console.error('Error importando:', err);
      return false;
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});