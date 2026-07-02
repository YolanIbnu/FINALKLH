const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '..', 'SURAT MASUK BUKU BESAR DISPOSISI 2026 PER 1 JULI 2026.xlsx');

try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { defval: null });
  
  // We want to process ALL rows, starting with an overriding no_agenda of 1033
  let rowsToInsert = [];
  for (const row of data) {
    // skip empty rows or headers
    if (!row['__EMPTY_2'] || !row['__EMPTY_3']) continue;
    if (String(row['__EMPTY_2']).toUpperCase() === 'NOMOR SURAT') continue;
    rowsToInsert.push(row);
  }

  console.log(`Found ${rowsToInsert.length} valid rows to insert.`);

  if (rowsToInsert.length === 0) {
    console.log("No data to insert.");
    process.exit(0);
  }

  // Indonesian months mapper
  const monthMap = {
    'januari': '01', 'jan': '01',
    'februari': '02', 'feb': '02',
    'maret': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'mei': '05',
    'juni': '06', 'jun': '06',
    'juli': '07', 'jul': '07',
    'agustus': '08', 'agu': '08',
    'september': '09', 'sep': '09',
    'oktober': '10', 'okt': '10',
    'november': '11', 'nov': '11',
    'desember': '12', 'des': '12'
  };

  function parseDate(val) {
    if (!val) return null;
    
    // If it's an excel serial date
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    
    // If it's text like "31 Maret 2026"
    const str = String(val).toLowerCase().trim();
    const parts = str.split(' ');
    if (parts.length === 3) {
      let [d, m, y] = parts;
      d = d.padStart(2, '0');
      m = monthMap[m] || '01';
      return `${y}-${m}-${d}`;
    }
    
    // Fallback today
    return '2026-04-01'; 
  }

  const uuid = '2b0ac330-f39a-45a7-813f-459d903d11a5';
  
  // Create output directory for full chunks
  const outDir = path.join(__dirname, '..', 'sql_imports_full');
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir);

  const CHUNK_SIZE = 20;
  
  let globalAgendaCounter = 1033;
  let index = 0; // for created_at increment

  for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
    const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
    
    const chunkNumber = String((i / CHUNK_SIZE) + 1).padStart(3, '0');
    
    let sql = `-- Import Seluruh Data Surat Masuk Chunk ${chunkNumber} (Baris ${i + 1} - ${Math.min(i + CHUNK_SIZE, rowsToInsert.length)})\n`;
    sql += `BEGIN;\n\n`;

    for (const row of chunk) {
      const noSurat = String(row['__EMPTY_2']).replace(/'/g, "''");
      const asal = String(row['__EMPTY_3']).replace(/'/g, "''");
      const perihal = String(row['__EMPTY_4'] || '-').replace(/'/g, "''");
      const tujuan = String(row['__EMPTY_7'] || '').toLowerCase();
      
      const tglTerima = parseDate(row['__EMPTY']);
      const tglSurat = parseDate(row['__EMPTY_1']);
      
      // Override No Agenda
      const noAgenda = String(globalAgendaCounter);
      globalAgendaCounter++;

      let layanan = 'Non Layanan';
      if (tujuan.includes('warti')) {
        layanan = 'Administrasi Kepegawaian';
      } else if (tujuan.includes('toto')) {
        layanan = 'Pengelolaan Jabatan Fungsional';
      } else if (tujuan.includes('yosi')) {
        layanan = 'Perencanaan dan Pengembangan SDM';
      } else if (tujuan.includes('adi')) {
        layanan = 'Organisasi dan Tata Laksana';
      }
      
      const createdAt = new Date();
      createdAt.setSeconds(createdAt.getSeconds() + index);
      const createdAtStr = createdAt.toISOString();
      index++;

      sql += `INSERT INTO public.reports (no_agenda, no_surat, hal, status, layanan, dari, tanggal_surat, tanggal_agenda, created_by, current_holder, link_documents, agenda_sestama, kelompok_asal_surat, derajat, sifat, sub_layanan, created_at) \n`;
      sql += `VALUES (\n`;
      sql += `  '${noAgenda}',\n`;
      sql += `  '${noSurat}',\n`;
      sql += `  '${perihal}',\n`;
      sql += `  'draft',\n`;
      sql += `  '${layanan}',\n`;
      sql += `  '${asal}',\n`;
      sql += `  ${tglSurat ? `'${tglSurat}'` : 'CURRENT_DATE'},\n`;
      sql += `  ${tglTerima ? `'${tglTerima}'` : 'CURRENT_DATE'},\n`;
      sql += `  '${uuid}',\n`;
      sql += `  '${uuid}',\n`;
      sql += `  '-',\n`;
      sql += `  '-',\n`;
      sql += `  '-',\n`;
      sql += `  ARRAY['Biasa'],\n`;
      sql += `  ARRAY['Biasa'],\n`;
      sql += `  '',\n`;
      sql += `  '${createdAtStr}'\n`;
      sql += `);\n\n`;
    }
    
    sql += `COMMIT;\n`;

    const chunkPath = path.join(outDir, `insert_part_${chunkNumber}.sql`);
    fs.writeFileSync(chunkPath, sql);
  }

  console.log(`Successfully generated ${Math.ceil(rowsToInsert.length / CHUNK_SIZE)} SQL files in the sql_imports_full directory!`);
  
} catch (error) {
  console.error('Error:', error);
}
