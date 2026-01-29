// import_from_mysql.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const { Client } = require('@opensearch-project/opensearch');

const client = new Client({ node: process.env.OPENSEARCH_NODE || 'http://localhost:9200' });
const BATCH = 1000; // bulk batch size

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASS || '',
    database: process.env.MYSQL_DB || 'datapb2b',
    multipleStatements: true
  });

  // count rows
  const [countRes] = await conn.query('SELECT COUNT(*) as c FROM leads');
  const total = countRes[0].c;
  console.log('total rows in MySQL leads:', total);

  // stream by offset (for simplicity)
  let offset = 0;
  while (offset < total) {
    const [rows] = await conn.query('SELECT * FROM leads ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?', [BATCH, offset]);
    if (!rows.length) break;

    const body = [];
    for (const r of rows) {
      body.push({ index: { _index: 'leads', _id: r.id } });
      // ensure dates are formatted
      body.push({
        ...r,
        created_at: r.created_at ? r.created_at.toISOString().slice(0, 19).replace('T', ' ') : null
      });
    }

    const bulkResp = await client.bulk({ refresh: false, body });
    if (bulkResp.body.errors) {
      console.error('Bulk errors', bulkResp.body.items.filter(i => i.index && i.index.error));
      throw new Error('bulk import errors');
    }
    console.log(`imported rows ${offset}..${offset + rows.length - 1}`);
    offset += rows.length;
  }

  await client.indices.refresh({ index: 'leads' });
  console.log('Import complete');
  await conn.end();
})();
