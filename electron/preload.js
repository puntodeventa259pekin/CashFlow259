import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveData: (data) => ipcRenderer.invoke('db-save', data),
  loadData: () => ipcRenderer.invoke('db-load'),
});