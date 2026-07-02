const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'SURAT MASUK BUKU BESAR DISPOSISI 2026 PER 1 JULI 2026.xlsx');

try {
  // Read the workbook
  const workbook = xlsx.readFile(filePath);
  
  // Get the first sheet name
  const sheetName = workbook.SheetNames[0];
  console.log('Sheet Name:', sheetName);
  
  // Get the worksheet
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON (array of objects)
  const data = xlsx.utils.sheet_to_json(worksheet, { defval: null });
  
  console.log('\n--- Column Headers / Structure ---');
  if (data.length > 0) {
    console.log(Object.keys(data[0]));
  }
  
  console.log('\n--- Sample Data (First 2 rows) ---');
  console.log(JSON.stringify(data.slice(0, 2), null, 2));

  console.log('\n--- Searching for No Agenda 682 ---');
  // Find row around No Agenda 682
  // We don't know the exact column name, it might be 'NO AGENDA' or 'NO URUT'
  const targetRowIndex = data.findIndex(row => {
    return Object.values(row).some(val => String(val) === '682' || String(val) === '682.0');
  });

  if (targetRowIndex !== -1) {
    console.log(`Found around index ${targetRowIndex}:`);
    console.log(JSON.stringify(data.slice(Math.max(0, targetRowIndex - 1), targetRowIndex + 2), null, 2));
  } else {
    console.log('Could not find exact "682" in any column. Showing row 680-683 by index just in case:');
    if (data.length > 680) {
       console.log(JSON.stringify(data.slice(680, 683), null, 2));
    } else {
       console.log(`Data length is only ${data.length}`);
    }
  }
  
} catch (error) {
  console.error('Error reading excel file:', error);
}
