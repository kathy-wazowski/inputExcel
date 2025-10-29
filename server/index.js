const express = require('express');
const cors = require('cors');
const { db, clearDatabase } = require('./database'); // Import the database connection

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

// Endpoint to clear the database
app.post('/clear-data', (req, res) => {
  console.log('Received request to clear database.'); // Added for debugging
  clearDatabase((err) => {
    if (err) {
      console.error('Error clearing database:', err.message);
      return res.status(500).json({ message: 'Failed to clear database.' });
    }
    res.status(200).json({ message: 'Database cleared successfully.' });
  });
});

// Endpoint for searching
app.get('/search', (req, res) => {
  const { term } = req.query;

  if (!term) {
    return res.status(400).json({ message: 'Search term is required.' });
  }

  db.all('SELECT row_data FROM excel_data', [], (err, rows) => {
    if (err) {
      console.error('Error querying database:', err.message);
      return res.status(500).json({ message: 'Failed to retrieve data for searching.' });
    }

    const allData = rows.map(row => JSON.parse(row.row_data));
    
    const lowercasedTerm = term.toLowerCase();

    const filteredData = allData.filter(row => {
      const ref = row.ref ? String(row.ref).toLowerCase() : '';
      const ref2 = row.ref2 ? String(row.ref2).toLowerCase() : '';
      const ref3 = row.ref3 ? String(row.ref3).toLowerCase() : '';
      return ref.includes(lowercasedTerm) || ref2.includes(lowercasedTerm) || ref3.includes(lowercasedTerm);
    });

    res.status(200).json({
      message: 'Search completed.',
      data: filteredData,
    });
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
    