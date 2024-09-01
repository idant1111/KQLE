// main.cjs

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { readCSVFile, importCSVToSQLite } = require('./csv-handler');
const { convertKqlToSql } = require('./kql-to-sql');

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
ipcMain.handle('execute-query', async (event, query) => {
    if (!db) {
        throw new Error('No database available. Please select CSV files first.');
    }

    console.log('Original query:', query);

    // Remove any default text or comments
    query = query.replace(/^--.*$/gm, '').trim();

    if (!query) {
        console.error('Empty query after cleaning');
        throw new Error('Empty query');
    }

    try {
        const sqlQuery = convertKqlToSql(query);
        console.log('SQL query to be executed:', sqlQuery);

        return new Promise((resolve, reject) => {
            db.all(sqlQuery, [], (err, rows) => {
                if (err) {
                    console.error('Error executing SQL query:', err);
                    reject(err);
                } else {
                    console.log('Query executed successfully, returned', rows.length, 'rows');
                    resolve(rows);
                }
            });
        });
    } catch (error) {
        console.error('Error during query execution:', error);
        throw error;
    }
});

module.exports = { createWindow };