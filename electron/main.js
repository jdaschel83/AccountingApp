const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let serverPort;

app.setName('Business Hub');

function getBackendPath() {
  const resourcesPath = path.join(process.resourcesPath, 'backend');
  if (fs.existsSync(path.join(resourcesPath, 'dist', 'index.js'))) {
    return resourcesPath;
  }
  return path.join(__dirname, '..', 'backend');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Business Hub',
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${serverPort}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startBackend() {
  const isPackaged = app.isPackaged;
  let dbDir;

  if (isPackaged) {
    dbDir = app.getPath('userData');
  } else {
    dbDir = path.join(__dirname, '..', 'data', 'dev');
  }

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  process.env.DB_PATH = path.join(dbDir, 'accounting.db');

  const backendPath = getBackendPath();
  const distIndex = path.join(backendPath, 'dist', 'index.js');
  const srcIndex = path.join(backendPath, 'src', 'index.ts');

  let backend;
  if (fs.existsSync(distIndex)) {
    backend = require(distIndex);
  } else {
    require('ts-node').register({
      transpileOnly: true,
      project: path.join(backendPath, 'tsconfig.json'),
    });
    backend = require(srcIndex);
  }

  serverPort = await backend.startServer(0);
  console.log(`Server started on port ${serverPort}`);
  return backend;
}

async function checkAndMigrate(backend) {
  let pending;
  try {
    pending = backend.getPendingMigrationsCount();
  } catch (err) {
    console.error('Could not check migration status:', err);
    return true; // proceed anyway
  }

  if (pending === 0) return true;

  // Prompt user
  const { response } = await dialog.showMessageBox({
    type: 'info',
    title: 'Database Update Required',
    message: `Your database needs to be updated (${pending} new migration${pending > 1 ? 's' : ''}).`,
    detail: 'A backup of your current database will be created before updating. Choose where to save it.',
    buttons: ['Choose Backup Location…', 'Quit'],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 1) {
    app.quit();
    return false;
  }

  // Pick backup location
  const dateStr = new Date().toISOString().split('T')[0];
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Save Database Backup',
    defaultPath: path.join(app.getPath('desktop'), `accounting-backup-${dateStr}.db`),
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    buttonLabel: 'Save Backup & Update',
  });

  if (canceled || !filePath) {
    await dialog.showMessageBox({
      type: 'warning',
      title: 'Update Cancelled',
      message: 'No backup location chosen. Update cancelled.',
      detail: 'The database was not modified. Launch the app again to retry.',
    });
    app.quit();
    return false;
  }

  // Copy backup
  try {
    fs.copyFileSync(process.env.DB_PATH, filePath);
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Backup Failed',
      message: 'Could not create database backup.',
      detail: `Error: ${err.message}\n\nThe database was not modified.`,
    });
    app.quit();
    return false;
  }

  // Run migrations
  try {
    backend.runMigrations();
  } catch (err) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Migration Failed',
      message: 'Database update failed.',
      detail: `Your database was not changed.\nYour backup is safe at:\n${filePath}\n\nError: ${err.message}`,
    });
    app.quit();
    return false;
  }

  await dialog.showMessageBox({
    type: 'info',
    title: 'Database Updated',
    message: 'Database updated successfully.',
    detail: `Backup saved to:\n${filePath}`,
    buttons: ['Open Business Hub'],
  });

  return true;
}

app.whenReady().then(async () => {
  try {
    const backend = await startBackend();
    const ok = await checkAndMigrate(backend);
    if (ok) createWindow();
  } catch (err) {
    console.error('Failed to start:', err);
    await dialog.showMessageBox({
      type: 'error',
      title: 'Startup Error',
      message: 'Business Hub failed to start.',
      detail: err.message,
    });
    app.quit();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
