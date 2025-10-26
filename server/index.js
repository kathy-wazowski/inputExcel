const express = require('express');
const cors = require('cors');
const db = require('./database'); // Import the database connection

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Middleware to parse JSON bodies, with a generous size limit

// Endpoint to receive data from the frontend
app.post('/save-data', (req, res) => {
  const { data } = req.body;

  if (!data || !Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ message: 'Invalid or empty data provided.' });
  }

  const stmt = db.prepare('INSERT INTO excel_data (row_data) VALUES (?)');

  let completed = 0;
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    data.forEach(row => {
      // Store each row as a JSON string
      stmt.run(JSON.stringify(row), function(err) {
        if (err) {
          console.error('Error inserting row:', err.message);
          // If there's an error, we'll eventually roll back.
        } else {
          completed++;
        }
      });
    });
    db.run('COMMIT', (err) => {
      if (err) {
        console.error('Transaction commit error:', err.message);
        return res.status(500).json({ message: 'Failed to save data.' });
      }
      
      stmt.finalize();
      console.log(`Successfully inserted ${completed} rows.`);
      res.status(200).json({ message: `Successfully saved ${completed} rows to the database.` });
        });
      });
    });
    
    // Endpoint to retrieve all data from the database
    app.get('/get-data', (req, res) => {
      db.all('SELECT row_data FROM excel_data ORDER BY id', [], (err, rows) => {
        if (err) {
          console.error('Error querying database:', err.message);
          return res.status(500).json({ message: 'Failed to retrieve data.' });
        }
        
        // The 'row_data' is stored as a JSON string, so we need to parse it.
        const data = rows.map(row => JSON.parse(row.row_data));
        
        res.status(200).json({
          message: 'Data retrieved successfully.',
          data: data,
        });
      });
    });
    
    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });
    