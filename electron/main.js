import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURACIÓN DE ALMACENAMIENTO ---
// Ruta fija solicitada: C:\Users\GameZone\Downloads\cashflow259\sql
// Nota: Aunque la carpeta se llama 'sql', guardamos un JSON
const TARGET_DIR = 'C:\\Users\\GameZone\\Downloads\\cashflow259\\sql'; 
const DB_FILE = path.join(TARGET_DIR, 'database.json');

// Asegurar que el directorio existe
if (!fs.existsSync(TARGET_DIR)) {
  try {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`Directorio creado: ${TARGET_DIR}`);
  } catch (err) {
    console.error('Error creando directorio:', err);
  }
}

// Inicializar archivo si no existe
if (!fs.existsSync(DB_FILE)) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({}));
    console.log('Base de datos JSON inicializada.');
  } catch (err) {
    console.error('Error inicializando DB:', err);
  }
}

let mainWindow;

function createWindow() {
  // IMPORTANTE: Usamos .cjs para CommonJS preload
  const preloadPath = path.join(__dirname, 'preload.cjs');
  console.log('Cargando preload desde:', preloadPath);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false 
    },
  });

  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
  
  if (isDev) {
    // Esperar un poco para asegurar que Vite esté listo si se lanza concurrentemente
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:5173').catch(e => console.error(e));
    }, 1000);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // --- API HANDLERS ---

  // Guardar datos (Sobrescribir JSON)
  ipcMain.handle('db-save', async (event, appState) => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(appState, null, 2));
      // console.log('Datos guardados exitosamente.'); // Comentado para evitar spam en consola
      return true;
    } catch (err) {
      console.error('Error guardando datos:', err);
      throw err;
    }
  });

  // Cargar datos
  ipcMain.handle('db-load', async () => {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        if (!raw) return null;
        return JSON.parse(raw);
      }
      return null;
    } catch (err) {
      console.error('Error cargando datos:', err);
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
      fs.copyFileSync(DB_FILE, filePath);
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
      // Leer para validar que es un JSON válido
      const raw = fs.readFileSync(sourcePath, 'utf-8');
      JSON.parse(raw); // Lanzará error si no es válido

      // Sobrescribir la DB actual
      fs.copyFileSync(sourcePath, DB_FILE);
      
      // Recargar la ventana para reflejar cambios
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