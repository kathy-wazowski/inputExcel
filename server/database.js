const sqlite3 = require('sqlite3').verbose();

// This will create a new file named 'database.db' in the 'server' directory
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // We are creating a flexible table with a single 'data' column that will store
    // the JSON representation of each row. This is simpler than creating columns
    // for every possible header in the Excel files.
    db.run(`CREATE TABLE IF NOT EXISTS excel_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      row_data TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating table', err.message);
      } else {
        console.log('Table "excel_data" is ready.');
      }
    });
  }
});

module.exports = db;
