const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire Electron API
contextBridge.exposeInMainWorld('electronAPI', {
    selectCSVFile: () => ipcRenderer.invoke('select-csv-file'),
    processCSVFile: (filePath, kqlQuery) => ipcRenderer.invoke('process-csv-file', filePath, kqlQuery),
});
