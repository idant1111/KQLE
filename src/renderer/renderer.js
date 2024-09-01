const { ipcRenderer } = require('electron');
import * as monaco from 'monaco-editor';
import { convertKqlToSql } from '../main/kql-to-sql';  

let selectedFiles = [];
let editor;

function initializeEditor() {
    editor = monaco.editor.create(document.getElementById('editor'), {
        value: '-- Write your KQL query here\n',
        language: 'sql',
        theme: 'vs-dark',
    });

    window.addEventListener('resize', () => {
        editor.layout();
    });
}

initializeEditor();

document.getElementById('select-file').addEventListener('click', async () => {
    const files = await ipcRenderer.invoke('select-csv-files');
    if (files) {
        selectedFiles = files;
        console.log('Selected files:', files);  // Debug line
        displaySelectedFiles(files);
    } else {
        console.log('No files selected.');  // Debug line
    }
});

document.getElementById('run-query').addEventListener('click', async () => {
    if (selectedFiles.length === 0) {
        displayErrorMessage('No files selected. Please select CSV files first.');
        return;
    }

    let kqlQuery = editor.getValue();
    let sqlQuery;

    try {
        sqlQuery = convertKqlToSql(kqlQuery); // Convert KQL to SQL
        console.log('Converted SQL Query:', sqlQuery);  // Debug line
    } catch (error) {
        displayErrorMessage(`Error converting KQL to SQL: ${error.message}`);
        return;
    }

    try {
        const result = await ipcRenderer.invoke('execute-query', sqlQuery);
        if (result.error) {
            displayErrorMessage(`Error: ${result.error}`);
        } else {
            displayResultAsTable(result);
        }
    } catch (error) {
        displayErrorMessage(`Error executing query: ${error.message}`);
    }
});

document.getElementById('reset-editor').addEventListener('click', () => {
    resetEditor();
});

function resetEditor() {
    // Clear the Monaco Editor content
    editor.setValue('-- Write your KQL query here\n');

    // Clear the output
    document.getElementById('output').innerText = 'Output will be shown here...';

    // Clear the footer tags
    document.getElementById('footer').innerHTML = '';

    // Clear selected files
    selectedFiles = [];
}

function displayErrorMessage(errorMessage) {
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = `<div style="color: red;">${errorMessage}</div>`;
}

function displaySelectedFiles(files) {
    const footer = document.getElementById('footer');
    footer.innerHTML = '';  // Clear previous content

    files.forEach(file => {
        const tag = document.createElement('div');
        tag.className = 'file-tag';
        tag.textContent = `${file.tableName} (KQL: ${file.tableName})`;
        footer.appendChild(tag);
    });
}

function displayResultAsTable(data) {
    if (data.length === 0) {
        document.getElementById('output').innerText = 'No data available.';
        return;
    }

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    Object.keys(data[0]).forEach(key => {
        const th = document.createElement('th');
        th.style.border = '1px solid #ddd';
        th.style.padding = '8px';
        th.style.textAlign = 'left';
        th.style.backgroundColor = '#f2f2f2';
        th.textContent = key;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.style.border = '1px solid #ddd';
            td.style.padding = '8px';
            td.textContent = value;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = '';  // Clear any existing content
    outputDiv.appendChild(table);
}
