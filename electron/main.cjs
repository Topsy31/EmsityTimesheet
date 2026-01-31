/**
 * Electron Main Process for Emsity Timesheet
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Data storage location
const DATA_PATH = 'E:\\Emsity OneDrive\\OneDrive - emsity.com\\Emsity\\Accounts\\Working Records';
const DATA_FILE = path.join(DATA_PATH, 'timesheet-data.json');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Emsity Timesheet',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false,
    backgroundColor: '#A8C5E2',
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for file operations

// Load data from JSON file
ipcMain.handle('load-data', async () => {
  try {
    // Ensure directory exists
    if (!fs.existsSync(DATA_PATH)) {
      fs.mkdirSync(DATA_PATH, { recursive: true });
    }

    // Check if data file exists
    if (!fs.existsSync(DATA_FILE)) {
      // Return default data structure
      return {
        clients: [
          {
            id: 'safran',
            name: 'Safran',
            rate: 65,
            vatApplicable: false,
            activities: ['Customer Support', 'Safran Marketing', 'SRM Development']
          },
          {
            id: 'russell',
            name: 'Russell',
            rate: 62.5,
            vatApplicable: true,
            activities: ['Consulting']
          },
          {
            id: 'satarla',
            name: 'Satarla',
            rate: 75,
            vatApplicable: true,
            activities: ['Consulting']
          }
        ],
        entries: [],
        settings: {
          mileageRate: 0.45
        }
      };
    }

    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
});

// Save data to JSON file
ipcMain.handle('save-data', async (event, data) => {
  try {
    // Ensure directory exists
    if (!fs.existsSync(DATA_PATH)) {
      fs.mkdirSync(DATA_PATH, { recursive: true });
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error saving data:', error);
    throw error;
  }
});

// Get list of Excel files for import
ipcMain.handle('get-excel-files', async () => {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return [];
    }

    const files = fs.readdirSync(DATA_PATH);
    return files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
  } catch (error) {
    console.error('Error listing Excel files:', error);
    throw error;
  }
});

// Read Excel file for import
ipcMain.handle('read-excel-file', async (event, filename) => {
  try {
    const filePath = path.join(DATA_PATH, filename);
    const buffer = fs.readFileSync(filePath);
    return buffer;
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
});

// Export to CSV
ipcMain.handle('export-csv', async (event, { filename, content }) => {
  try {
    const filePath = path.join(DATA_PATH, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
});

// Export to PDF
ipcMain.handle('export-pdf', async (event, { filename, content }) => {
  try {
    const filePath = path.join(DATA_PATH, filename);
    fs.writeFileSync(filePath, Buffer.from(content), 'binary');
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
