/**
 * Electron Main Process for Emsity Timesheet
 */

const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Data storage location
const DATA_PATH = 'E:\\Emsity OneDrive\\OneDrive - emsity.com\\Emsity\\Accounts\\Working Records';
const DATA_FILE = path.join(DATA_PATH, 'timesheet-data.json');

let mainWindow = null;
let quickAddWindow = null;
let tray = null;

// Check if started with --hidden flag (for startup)
const startHidden = process.argv.includes('--hidden');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Emsity Timesheet',
    icon: path.join(__dirname, '..', 'icon.png'),
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

  // Show when ready (unless started hidden)
  mainWindow.once('ready-to-show', () => {
    if (!startHidden) {
      mainWindow.show();
    }
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createQuickAddWindow() {
  if (quickAddWindow) {
    quickAddWindow.focus();
    return;
  }

  quickAddWindow = new BrowserWindow({
    width: 400,
    height: 460,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: 'Quick Add Entry',
    icon: path.join(__dirname, '..', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: '#A8C5E2',
  });

  quickAddWindow.loadFile(path.join(__dirname, '..', 'quick-add.html'));

  quickAddWindow.on('closed', () => {
    quickAddWindow = null;
  });

  quickAddWindow.on('blur', () => {
    // Optional: close when losing focus
    // quickAddWindow.close();
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Quick Add (Ctrl+Shift+T)',
      click: () => createQuickAddWindow()
    },
    {
      label: 'Open Timesheet',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Emsity Timesheet');
  tray.setContextMenu(contextMenu);

  // Double-click to open main window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();

  // Register global shortcut for Quick Add
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    createQuickAddWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Don't quit on macOS
  if (process.platform === 'darwin') {
    return;
  }
  // On Windows, keep running in tray
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

// Get list of Excel files for import from default path
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

// Open folder picker dialog and return Excel files
ipcMain.handle('select-import-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select folder containing Excel timesheets'
    });

    if (result.canceled || !result.filePaths.length) {
      return { canceled: true };
    }

    const folderPath = result.filePaths[0];
    const files = fs.readdirSync(folderPath);
    const excelFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

    return {
      canceled: false,
      folderPath,
      files: excelFiles
    };
  } catch (error) {
    console.error('Error selecting import folder:', error);
    throw error;
  }
});

// Read Excel file from specified path
ipcMain.handle('read-excel-file', async (event, filePath) => {
  try {
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

// Quick Add specific handlers
ipcMain.handle('close-quick-add', () => {
  if (quickAddWindow) {
    quickAddWindow.close();
  }
});

ipcMain.handle('open-main-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
  if (quickAddWindow) {
    quickAddWindow.close();
  }
});

ipcMain.handle('notify-main-window', () => {
  // Tell main window to refresh data
  if (mainWindow) {
    mainWindow.webContents.send('refresh-data');
  }
});

// Startup settings
ipcMain.handle('get-start-at-login', () => {
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
});

ipcMain.handle('set-start-at-login', (event, enabled) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    args: ['--hidden']
  });
  return { success: true };
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
