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
  const [showUploadInput, setShowUploadInput] = useState(false);

  // State for search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchData, setSearchData] = useState([]);
  const [searchHeaders, setSearchHeaders] = useState([]);

  const [message, setMessage] = useState('Please select a file or preview the database.');

  // --- FILE UPLOAD LOGIC ---
  const handleFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setDbData([]); // Clear DB preview when a new file is chosen
    setSearchData([]); // Clear search results
    setMessage('Processing...');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          setMessage('The Excel file is empty.');
          return;
        }

        // Normalize keys (trim whitespace, convert to lowercase)
        const normalizedJsonData = jsonData.map(row => {
          const newRow = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = key.trim().toLowerCase();
            newRow[normalizedKey] = row[key];
          });
          return newRow;
        });

        // Format dates
        const formattedData = normalizedJsonData.map(row => {
          if (row.date instanceof Date) {
            row.date = row.date.toISOString().split('T')[0];
          }
          return row;
        });

        setUploadData(formattedData);
        setUploadHeaders(Object.keys(formattedData[0]));
        setMessage(`Loaded ${formattedData.length} rows. Ready to save.`);
      } catch (error) {
        setMessage('Error reading the file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveToDb = async () => {
    if (uploadData.length === 0) return;

    const requiredKeys = ['product-type', 'price', 'currency'];
    const missingKeys = requiredKeys.filter(key => !uploadHeaders.includes(key));

    if (missingKeys.length > 0) {
      alert(`The following required columns are missing in your Excel file: ${missingKeys.join(', ')}.\nPlease add them and try again.`);
      return;
    }

    setMessage('Saving data...');

    // Define the list of properties you want to keep
    const allowedKeys = [
      'date', 'sales', 'exhibition', 'client-no', 'region', 'product-type', 
      'company', 'ref', 'ref2', 'ref3', 'lz-no', 'size', 'qty', 'facing', 
      'currency', 'price', 'packing', 'incoterm', 'remark', 'status', 
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
        setShowUploadInput(false); // Hide the upload input
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
    setSearchData([]); // Clear search results
    setShowUploadInput(false); // Hide the upload input
    const data = await fetchDbData();
    if (data) {
      const formattedData = data.map(row => {
        if (row.date && typeof row.date === 'number') {
          const date = new Date((row.date - 25569) * 86400 * 1000);
          row.date = date.toISOString().split('T')[0];
        }
        return row;
      });

      // Create a unique set of all headers from all rows
      const allHeaders = new Set();
      formattedData.forEach(row => {
        Object.keys(row).forEach(key => {
          allHeaders.add(key);
        });
      });
      setDbData(formattedData);
      setDbHeaders(sortHeaders(allHeaders));
    }
  };

  const handleDownloadDb = async () => {
    const data = await fetchDbData();
    if (data && data.length > 0) {
      // Create a unique set of all headers from all rows
      const allHeaders = new Set();
      data.forEach(row => {
        Object.keys(row).forEach(key => {
          allHeaders.add(key);
        });
      });
      const sortedHeaders = sortHeaders(allHeaders);

      const worksheet = XLSX.utils.json_to_sheet(data, { header: sortedHeaders });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'DatabaseData');
      XLSX.writeFile(workbook, 'database_export.xlsx');
      setMessage('Database downloaded successfully.');
    }
  };

  const handleClearDb = async () => {
    const confirmClear = window.confirm(
      'Are you sure you want to permanently delete all data from the database?'
    );

    if (confirmClear) {
      setMessage('Clearing the database...');
      try {
        const response = await fetch('http://localhost:3001/clear-data', {
          method: 'POST',
        });
        const result = await response.json();
        if (response.ok) {
          setMessage(result.message);
          setDbData([]); // Clear the preview
        } else {
          setMessage(`Error: ${result.message}`);
        }
      } catch (error) {
        setMessage('An error occurred while clearing the database.');
      }
    }
  };

  const handleSearch = async () => {
    setDbData([]); // Clear the database content table
    setUploadData([]); // Clear the upload preview
    setShowUploadInput(false); // Hide the upload input
    if (!searchTerm.trim()) {
      setSearchData([]);
      return;
    }
    setMessage('Searching...');
    try {
      const response = await fetch(`http://localhost:3001/search?term=${searchTerm}`);
      const result = await response.json();
      if (response.ok) {
        if (result.data.length === 0) {
          setMessage('No matching records found.');
          setSearchData([]);
        } else {
          setMessage(`Found ${result.data.length} matching records.`);
          const formattedData = result.data.map(row => {
            if (row.date && typeof row.date === 'number') {
              const date = new Date((row.date - 25569) * 86400 * 1000);
              row.date = date.toISOString().split('T')[0];
            }
            return row;
          });
          setSearchData(formattedData);
          if (formattedData.length > 0) {
            const allHeaders = new Set();
            formattedData.forEach(row => {
              Object.keys(row).forEach(key => allHeaders.add(key));
            });
            setSearchHeaders(sortHeaders(allHeaders));
          }
        }
      } else {
        setMessage(`Error: ${result.message}`);
      }
    } catch (error) {
      setMessage('An error occurred while searching.');
    }
  };

  const handleUploadClick = () => {
    setDbData([]); // Clear DB preview
    setSearchData([]); // Clear search results
    setMessage(''); // Clear the message
    setShowUploadInput(true);
  };

  const sortHeaders = (headers) => {
    const headersArray = Array.from(headers);
    const preferredOrder = [
      'ref', 'ref2', 'ref3', 'product-type', 'price', 'currency', 'qty', 'size', 
      'lz-no', 'facing', 'packing', 'incoterm', 'region', 'company', 'client-no', 
      'exhibition', 'sales', 'date', 'status'
    ];

    const sortedHeaders = headersArray.sort((a, b) => {
      if (a === 'remark') return 1;
      if (b === 'remark') return -1;

      const aIndex = preferredOrder.indexOf(a);
      const bIndex = preferredOrder.indexOf(b);

      if (aIndex > -1 && bIndex > -1) {
        return aIndex - bIndex;
      }
      if (aIndex > -1) {
        return -1;
      }
      if (bIndex > -1) {
        return 1;
      }
      return a.localeCompare(b);
    });

    return sortedHeaders;
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
        <div className="search-container">
          <input 
            type="text" 
            placeholder="Search by ref, ref2, or ref3..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
        <div className="main-controls">
          <button onClick={handlePreviewDb}>预览数据库 (Preview)</button>
          <button onClick={handleDownloadDb}>下载数据库 (Download)</button>
          <button onClick={handleUploadClick}>上传文件 (Upload)</button>
          <button onClick={handleClearDb} className="danger-button">清空数据库 (Clear)</button>
        </div>
        {showUploadInput && (
          <input type="file" accept=".xlsx, .xls" onChange={handleFile} style={{ marginTop: '10px' }} />
        )}
        {message && <p className="message">{message}</p>}
      </header>
      <main>
        {searchData.length > 0 && (
          <div className="table-container">
            <h2 className="table-title">Search Results</h2>
            <table>
              <thead>
                <tr>{searchHeaders.map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {searchData.map((row, i) => (
                  <tr key={i}>
                    {searchHeaders.map(h => <td key={h}>{row[h]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isShowingUploadPreview && (
          <div className="table-container">
            <button onClick={handleSaveToDb} className="save-button">
              添加至数据库 (Add to Database)
            </button>
          </div>
        )}
        {isShowingDbPreview && <h2 className="table-title">Database Content</h2>}
        {(isShowingUploadPreview || isShowingDbPreview) && (
          <div className="table-container">
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
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
