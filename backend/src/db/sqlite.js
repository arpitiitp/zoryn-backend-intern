const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'finance.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database at', DB_PATH);
    }
});

// Helper wrapper for async queries
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                console.log('Error running sql ' + sql);
                console.log(err);
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, result) => {
            if (err) {
                console.log('Error running sql: ' + sql);
                console.log(err);
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.log('Error running sql: ' + sql);
                console.log(err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

module.exports = {
    db,
    run,
    get,
    all
};
