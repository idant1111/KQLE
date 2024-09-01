function convertKqlToSql(inputQuery) {
    console.log('Original input query:', inputQuery);

    // Remove comments, placeholder text, and trim
    let cleanedQuery = inputQuery
        .replace(/--.*$/gm, '')  // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//gm, '')  // Remove multi-line comments
        .replace(/^.*?Write your KQL query here.*?\n/m, '')  // Remove placeholder text
        .trim();

    console.log('Cleaned query:', cleanedQuery);

    if (!cleanedQuery) {
        throw new Error('Empty query after cleaning');
    }

    let sqlQuery = '';

    if (cleanedQuery.toLowerCase().startsWith('select')) {
        // The query is already in SQL format
        sqlQuery = cleanedQuery;
    } else {
        // Assume it's a KQL query and convert it
        sqlQuery = convertKqlToSqlInternal(cleanedQuery);
    }

    // Final cleanup: remove any double quotes around table names
    sqlQuery = sqlQuery.replace(/"([^"]+)"/g, '$1');

    console.log('Final SQL query:', sqlQuery);
    return sqlQuery.trim();
}

function convertKqlToSqlInternal(kqlQuery) {
    const commands = kqlQuery.split('|').map(cmd => cmd.trim());
    console.log('Parsed commands:', commands);

    let sqlQuery = '';
    let tableName = '';
    let whereClauses = [];
    let limitClause = '';

    commands.forEach((command, index) => {
        console.log(`Processing command ${index}:`, command);
        
        if (index === 0) {
            tableName = command;
            sqlQuery = `SELECT * FROM ${tableName}`;
        } else {
            const lowerCmd = command.toLowerCase();
            
            if (lowerCmd.startsWith('where')) {
                whereClauses.push(convertKqlWhereToSql(command.slice(5).trim()));
            } else if (lowerCmd.startsWith('project')) {
                sqlQuery = sqlQuery.replace('SELECT *', `SELECT ${command.slice(7).trim()}`);
            } else if (lowerCmd.startsWith('summarize')) {
                sqlQuery = convertKqlSummarizeToSql(sqlQuery, command.slice(9).trim());
            } else if (lowerCmd.startsWith('limit')) {
                limitClause = ` LIMIT ${command.split(/\s+/)[1]}`;
            }
            // Add other KQL command conversions as needed
        }
    });

    // Combine all WHERE clauses
    if (whereClauses.length > 0) {
        sqlQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Add LIMIT clause if present
    sqlQuery += limitClause;

    return sqlQuery;
}

function convertKqlWhereToSql(whereClause) {
    return whereClause
        .replace(/([^=!<>])=/g, '$1 =')
        .replace(/==/g, '=')
        .replace(/!=/g, '<>')
        .replace(/contains/gi, 'LIKE')
        .replace(/LIKE\s*"([^"]*)"/, "LIKE '%$1%'")
        .replace(/LIKE\s*'([^']*)'/, "LIKE '%$1%'");
}

function convertKqlSummarizeToSql(sqlQuery, summarizeClause) {
    const parts = summarizeClause.split(/\s+by\s+/i);
    const groupBy = parts[1] ? parts[1].split(',').map(col => col.trim()) : [];

    if (groupBy.length > 0) {
        let newSqlQuery = sqlQuery.replace('SELECT *', `SELECT ${groupBy.join(', ')}`);
        newSqlQuery += ` GROUP BY ${groupBy.join(', ')}`;
        return newSqlQuery;
    }

    return sqlQuery;
}

module.exports = { convertKqlToSql };


// new file:


// function convertKqlToSqlite(kqlQuery) {
//     const commands = kqlQuery.split('|').map(cmd => cmd.trim());
//     console.log('Parsed commands:', commands);

//     let sqliteQuery = '';
//     let tableName = '';
//     let selectClauses = ['*'];
//     let whereClauses = [];
//     let groupByClauses = [];
//     let orderByClauses = [];
//     let limitClause = '';

//     commands.forEach((command, index) => {
//         console.log(`Processing command ${index}:`, command);
        
//         if (index === 0) {
//             tableName = command;
//         } else {
//             const lowerCmd = command.toLowerCase();
            
//             if (lowerCmd.startsWith('where')) {
//                 whereClauses.push(convertKqlWhereToSqlite(command.slice(5).trim()));
//             } else if (lowerCmd.startsWith('project')) {
//                 selectClauses = command.slice(7).split(',').map(col => col.trim());
//             } else if (lowerCmd.startsWith('summarize')) {
//                 const summarizeParts = command.slice(9).trim().split(/\s+by\s+/i);
//                 const aggregations = summarizeParts[0].split(',').map(agg => agg.trim());
                
//                 aggregations.forEach(agg => {
//                     const match = agg.match(/(\w+)\s*=\s*(\w+)\((.*?)\)/);
//                     if (match) {
//                         const [, alias, funcName, args] = match;
//                         if (funcName.toLowerCase() === 'make_bag') {
//                             selectClauses.push(`json_group_object(${args}) as ${alias}`);
//                         } else {
//                             selectClauses.push(`${funcName}(${args}) as ${alias}`);
//                         }
//                     }
//                 });

//                 if (summarizeParts[1]) {
//                     groupByClauses = summarizeParts[1].split(',').map(col => col.trim());
//                     selectClauses.push(...groupByClauses);
//                 }
//             } else if (lowerCmd.startsWith('order by')) {
//                 orderByClauses = command.slice(8).split(',').map(col => col.trim());
//             } else if (lowerCmd.startsWith('limit')) {
//                 limitClause = ` LIMIT ${command.split(/\s+/)[1]}`;
//             }
//         }
//     });

//     sqliteQuery = `SELECT ${selectClauses.join(', ')} FROM ${tableName}`;

//     if (whereClauses.length > 0) {
//         sqliteQuery += ` WHERE ${whereClauses.join(' AND ')}`;
//     }

//     if (groupByClauses.length > 0) {
//         sqliteQuery += ` GROUP BY ${groupByClauses.join(', ')}`;
//     }

//     if (orderByClauses.length > 0) {
//         sqliteQuery += ` ORDER BY ${orderByClauses.join(', ')}`;
//     }

//     sqliteQuery += limitClause;

//     console.log('Final SQLite query:', sqliteQuery);
//     return sqliteQuery.trim();
// }

// function convertKqlWhereToSqlite(whereClause) {
//     return whereClause
//         .replace(/([^=!<>])=/g, '$1 =')
//         .replace(/==/g, '=')
//         .replace(/!=/g, '<>')
//         .replace(/contains/gi, 'LIKE')
//         .replace(/LIKE\s*"([^"]*)"/, "LIKE '%$1%'")
//         .replace(/LIKE\s*'([^']*)'/, "LIKE '%$1%'");
// }