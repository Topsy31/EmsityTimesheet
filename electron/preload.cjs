const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('api', {
  // Load data from JSON file
  loadData: () => ipcRenderer.invoke('load-data'),

  // Save data to JSON file
  saveData: (data) => ipcRenderer.invoke('save-data', data),

  // Get list of Excel files for import
  getExcelFiles: () => ipcRenderer.invoke('get-excel-files'),

  // Read Excel file content
  readExcelFile: (filename) => ipcRenderer.invoke('read-excel-file', filename),

  // Export to CSV
  exportCSV: (filename, content) => ipcRenderer.invoke('export-csv', { filename, content }),

  // Export to PDF
  exportPDF: (filename, content) => ipcRenderer.invoke('export-pdf', { filename, content })
});
