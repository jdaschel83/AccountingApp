const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let serverPort;

app.setName('Business Hub');

// Resolve backend path - works in both dev and packaged mode
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
  // Dev mode: use ./data/ in project dir. Production: use system userData.
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
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    createWindow();
  } catch (err) {
    console.error('Failed to start:', err);
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
