const fs = require('fs');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();

// Function to read a CSV file and return the data
function readCSVFile(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                console.log('CSV file read successfully:', filePath);  // Debug line
                resolve(results);
            })
            .on('error', (error) => {
                console.error('Error reading CSV file:', error);  // Debug line
                reject(error);
            });
    });
}

// Function to import CSV data into a SQLite database
function importCSVToSQLite(csvData, db, tableName) {
    return new Promise((resolve, reject) => {
        const columns = Object.keys(csvData[0]);

        db.serialize(() => {
            const createTableSQL = `CREATE TABLE "${tableName}" (${columns.map(col => `"${col}" TEXT`).join(', ')})`;
            console.log('Creating table with SQL:', createTableSQL);  // Debug line
            db.run(createTableSQL, (err) => {
                if (err) {
                    console.error('Error creating table:', err);  // Debug line
                    reject(err);
                    return;
                }

                const insertSQL = `INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
                console.log('Preparing to insert data with SQL:', insertSQL);  // Debug line
                const stmt = db.prepare(insertSQL);

                for (const row of csvData) {
                    stmt.run(columns.map(col => row[col]));
                }

                stmt.finalize((err) => {
                    if (err) {
                        console.error('Error inserting data:', err);  // Debug line
                        reject(err);
                        return;
                    }
                    console.log(`Data inserted successfully into table "${tableName}".`);  // Debug line
                    resolve();
                });
            });
        });
    });
}

function convertKqlToSql(kqlQuery) {
    const commands = kqlQuery.split('|').map(cmd => cmd.trim());
    let sqlQuery = '';
    let tableName = '';

    commands.forEach((command, index) => {
        if (index === 0) {
            tableName = command; // First part should be the table name
            sqlQuery = `SELECT * FROM "${tableName}"`; 
        } else if (command.match(/^limit\b/i)) {
            sqlQuery += ' ' + command.replace(/limit\b/i, 'LIMIT');
        } else if (command.match(/^where\b/i)) {
            sqlQuery += ' ' + command.replace(/where\b/i, 'WHERE');
        } else if (command.match(/^summarize\b/i)) {
            sqlQuery += ' ' + command.replace(/summarize\b/i, 'GROUP BY');
        } else if (command.match(/^order by\b/i)) {
            sqlQuery += ' ' + command.replace(/order by\b/i, 'ORDER BY');
        } else if (command.match(/^join\b/i)) {
            sqlQuery += ' ' + command.replace(/\bjoin\b/i, 'JOIN').replace(/\bon\b/i, 'ON');
        }
    });

    return sqlQuery.trim();
}

// Function to execute SQL queries on the SQLite database
function executeSQL(db, query) {
    // Convert the KQL query to SQL
    const sqlQuery = convertKqlToSql(query);

    console.log('Executing SQL query:', sqlQuery);  // Debug line to print the SQL query
    return new Promise((resolve, reject) => {
        db.all(sqlQuery, [], (err, rows) => {
            if (err) {
                console.error('Error executing query:', err);  // Debug line
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

// Exporting the functions
module.exports = { readCSVFile, importCSVToSQLite, executeSQL };
