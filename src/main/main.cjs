const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();  // Ensure sqlite3 is imported
const { readCSVFile, importCSVToSQLite, executeSQL } = require('./csv-handler');

let db;  // In-memory SQLite database

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.loadFile('../renderer/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Handle CSV file selection and import
ipcMain.handle('select-csv-files', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    });

    if (result.canceled) {
        console.log('File selection was canceled.');
        return null;
    } else {
        db = new sqlite3.Database(':memory:');  // Create a new in-memory database
        console.log('In-memory SQLite database created.');
        const fileData = [];
        for (const filePath of result.filePaths) {
            const csvData = await readCSVFile(filePath);
            const tableName = path.basename(filePath, '.csv').replace(/\s+/g, '_');
            await importCSVToSQLite(csvData, db, tableName);
            fileData.push({ filePath, tableName });
            console.log(`Table "${tableName}" created and data loaded.`);
        }
        return fileData;  // Return file names and table names to display as tags
    }
});

// Handle query execution
ipcMain.handle('execute-query', async (event, sqlQuery) => {
    if (!db) {
        throw new Error('No database available. Please select CSV files first.');
    }

    try {
        const result = await executeSQL(db, sqlQuery);
        return result;
    } catch (error) {
        console.error('Error executing query:', error);
        return { error: 'Failed to execute query' };
    }
});
