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

const clearDatabase = (callback) => {
  console.log('Clearing database...'); // Added for debugging
  db.serialize(() => {
    console.log('Executing DELETE FROM excel_data'); // Added for debugging
    db.run('DELETE FROM excel_data', (err) => {
      if (err) {
        console.error('Error deleting from excel_data:', err.message);
        return callback(err);
      }
      // Reset the autoincrement sequence for the excel_data table
      console.log('Executing DELETE FROM sqlite_sequence'); // Added for debugging
      db.run('DELETE FROM sqlite_sequence WHERE name=\'excel_data\'', (err) => {
        if (err) {
          console.error('Error deleting from sqlite_sequence:', err.message);
          return callback(err);
        }
        console.log('Database cleared and sequence reset.');
        callback(null);
      });
    });
  });
};

module.exports = { db, clearDatabase };