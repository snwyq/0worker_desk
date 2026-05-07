const Database = require('better-sqlite3');
const db = new Database('d:/sitecode/0worker_desk/weibo.db');
const rows = db.prepare('SELECT * FROM publishing_strategies').all();
console.log(JSON.stringify(rows, null, 2));
db.close();
