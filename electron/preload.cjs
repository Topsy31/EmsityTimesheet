const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('api', {
  // Load data from JSON file
  loadData: () => ipcRenderer.invoke('load-data'),

  // Save data to JSON file
  saveData: (data) => ipcRenderer.invoke('save-data', data),

  // Get list of Excel files for import from default folder
  getExcelFiles: () => ipcRenderer.invoke('get-excel-files'),

  // Open folder picker and get Excel files
  selectImportFolder: () => ipcRenderer.invoke('select-import-folder'),

  // Read Excel file content from full path
  readExcelFile: (filePath) => ipcRenderer.invoke('read-excel-file', filePath),

  // Export to CSV
  exportCSV: (filename, content) => ipcRenderer.invoke('export-csv', { filename, content }),

  // Export to PDF
  exportPDF: (filename, content) => ipcRenderer.invoke('export-pdf', { filename, content }),

  // Quick Add window controls
  closeQuickAdd: () => ipcRenderer.invoke('close-quick-add'),
  openMainWindow: () => ipcRenderer.invoke('open-main-window'),
  notifyMainWindow: () => ipcRenderer.invoke('notify-main-window'),

  // Listen for refresh events from main process
  onRefreshData: (callback) => ipcRenderer.on('refresh-data', callback),

  // Startup settings
  getStartAtLogin: () => ipcRenderer.invoke('get-start-at-login'),
  setStartAtLogin: (enabled) => ipcRenderer.invoke('set-start-at-login', enabled)
});
