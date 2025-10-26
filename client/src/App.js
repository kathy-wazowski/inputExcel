import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

function App() {
  // State for the file upload preview
  const [uploadData, setUploadData] = useState([]);
  const [uploadHeaders, setUploadHeaders] = useState([]);
  
  // State for the database content preview
  const [dbData, setDbData] = useState([]);
  const [dbHeaders, setDbHeaders] = useState([]);

  const [message, setMessage] = useState('Please select a file or preview the database.');

  // --- FILE UPLOAD LOGIC ---
  const handleFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setDbData([]); // Clear DB preview when a new file is chosen
    setMessage('Processing...');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          setMessage('The Excel file is empty.');
          return;
        }
        setUploadData(jsonData);
        setUploadHeaders(Object.keys(jsonData[0]));
        setMessage(`Loaded ${jsonData.length} rows. Ready to save.`);
      } catch (error) {
        setMessage('Error reading the file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveToDb = async () => {
    if (uploadData.length === 0) return;
    setMessage('Saving data...');

    // Define the list of properties you want to keep
    const allowedKeys = [
      'date', 'sales', 'exhibition', 'client', 'region', 'product-type', 
      'company', 'ref', 'ref2', 'ref3', 'lz', 'size', 'qty', 'facing', 
      'current', 'price', 'packing', 'incoterm', 'remark', 'status', 
      'drop-reason'
    ];

    // Filter the data to only include the allowed keys
    const filteredData = uploadData.map(row => {
      const newRow = {};
      allowedKeys.forEach(key => {
        if (row[key] !== undefined) { // Check if the key exists
          newRow[key] = row[key];
        }
      });
      return newRow;
    });

    try {
      const response = await fetch('http://localhost:3001/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: filteredData }), // Send the filtered data
      });
      const result = await response.json();
      if (response.ok) {
        setMessage(result.message);
        setUploadData([]); // Clear preview on success
      } else {
        setMessage(`Error: ${result.message}`);
      }
    } catch (error) {
      setMessage('An error occurred while saving.');
    }
  };

  // --- DATABASE INTERACTION LOGIC ---
  const fetchDbData = async () => {
    setMessage('Fetching data from database...');
    try {
      const response = await fetch('http://localhost:3001/get-data');
      const result = await response.json();
      if (response.ok) {
        if (result.data.length === 0) {
          setMessage('Database is empty.');
          return null;
        }
        setMessage(`Successfully fetched ${result.data.length} rows.`);
        return result.data;
      } else {
        setMessage(`Error: ${result.message}`);
        return null;
      }
    } catch (error) {
      setMessage('An error occurred while fetching data.');
      return null;
    }
  };

  const handlePreviewDb = async () => {
    setUploadData([]); // Clear file preview
    const data = await fetchDbData();
    if (data) {
      setDbData(data);
      setDbHeaders(Object.keys(data[0]));
    }
  };

  const handleDownloadDb = async () => {
    const data = await fetchDbData();
    if (data && data.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'DatabaseData');
      XLSX.writeFile(workbook, 'database_export.xlsx');
      setMessage('Database downloaded successfully.');
    }
  };

  // Determine which table to show
  const isShowingUploadPreview = uploadData.length > 0;
  const isShowingDbPreview = dbData.length > 0;
  const headers = isShowingUploadPreview ? uploadHeaders : dbHeaders;
  const data = isShowingUploadPreview ? uploadData : dbData;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Excel Database Manager</h1>
        <div className="main-controls">
          <button onClick={handlePreviewDb}>预览数据库 (Preview)</button>
          <button onClick={handleDownloadDb}>下载数据库 (Download)</button>
        </div>
        <p>Or, upload a new file:</p>
        <input type="file" accept=".xlsx, .xls" onChange={handleFile} />
        {message && <p className="message">{message}</p>}
      </header>
      <main>
        {isShowingUploadPreview && (
          <div className="table-container">
            <button onClick={handleSaveToDb} className="save-button">
              添加至数据库 (Add to Database)
            </button>
          </div>
        )}
        {isShowingDbPreview && <h2 className="table-title">Database Content</h2>}
        {(isShowingUploadPreview || isShowingDbPreview) && (
          <table>
            <thead>
              <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {headers.map(h => <td key={h}>{row[h]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}

export default App;
