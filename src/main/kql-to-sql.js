function convertKqlToSql(kqlQuery) {
    // Split the KQL query into individual commands based on the pipe operator
    const commands = kqlQuery.split('|').map(cmd => cmd.trim());

    let sqlQuery = '';
    let currentTable = ''; // To track the current table being worked on

    commands.forEach((command, index) => {
        if (command.match(/^select\b/i)) {
            sqlQuery += command
                .replace(/select\b/i, 'SELECT')
                .replace(/\bfrom\b/i, 'FROM');
            currentTable = command.match(/\bfrom\s+([^\s]+)/i)[1];
        } else if (command.match(/^where\b/i)) {
            sqlQuery += ' ' + command.replace(/where\b/i, 'WHERE');
        } else if (command.match(/^join\b/i)) {
            sqlQuery += ' ' + command
                .replace(/\bjoin\b/i, 'JOIN')
                .replace(/\bon\b/i, 'ON');
        } else if (command.match(/^summarize\b/i)) {
            sqlQuery += ' ' + command
                .replace(/\bsummarize\b/i, 'GROUP BY')
                .replace(/\bby\b/i, '');
        } else if (command.match(/^order by\b/i)) {
            sqlQuery += ' ' + command.replace(/order by\b/i, 'ORDER BY');
        } else if (command.match(/^take\b/i)) {
            sqlQuery += ' ' + command.replace(/take\b/i, 'LIMIT');
        } else if (command.match(/^extend\b/i)) {
            // Handle the extend operation by adding new fields to SELECT
            sqlQuery = sqlQuery.replace('SELECT', 'SELECT '); // Ensure there's space
            const extendPart = command.replace(/\bextend\b/i, '').trim();
            sqlQuery = sqlQuery.replace(/SELECT(.*)FROM/i, `SELECT $1, ${extendPart} FROM`);
        } else if (command.match(/^project\b/i)) {
            if (index === 0) {
                sqlQuery += command.replace(/\bproject\b/i, 'SELECT');
                currentTable = command.match(/\bfrom\s+([^\s]+)/i)[1];
            } else {
                sqlQuery += ', ' + command.replace(/\bproject\b/i, '');
            }
        } else if (command.match(/^project-away\b/i)) {
            // Implementing project-away by removing columns from SELECT
            const columnsToRemove = command.replace(/\bproject-away\b/i, '').trim().split(/\s*,\s*/);
            columnsToRemove.forEach(col => {
                sqlQuery = sqlQuery.replace(new RegExp(`\\b${col}\\b,?`, 'gi'), '');
            });
        } else if (command.match(/^top\b/i)) {
            const topMatch = command.match(/\btop\b\s+(\d+)\s+by\s+([^\s]+)/i);
            if (topMatch) {
                const topCount = topMatch[1];
                const topColumn = topMatch[2];
                sqlQuery += ` ORDER BY ${topColumn} DESC LIMIT ${topCount}`;
            }
        }
    });

    // Ensure the final SQL query ends correctly
    if (sqlQuery.trim().endsWith(',')) {
        sqlQuery = sqlQuery.trim().slice(0, -1);
    }

    // Handle the scenario where "GROUP BY" is followed by "ORDER BY"
    sqlQuery = sqlQuery.replace(/\bGROUP BY\b\s*([^\s]+)\s*\bORDER BY\b/i, 'GROUP BY $1 ORDER BY');

    return sqlQuery.trim();
}

module.exports = { convertKqlToSql };
