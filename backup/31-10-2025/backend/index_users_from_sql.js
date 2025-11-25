// backend/index_users_from_sql.js
const fs = require('fs');
const path = require('path');
const { Client } = require('@opensearch-project/opensearch');

const SQL_PATH = process.env.USERS_SQL_PATH || path.join(__dirname, 'database', 'users (1).sql');
const client = new Client({ node: process.env.OPENSEARCH_NODE || 'http://localhost:9200' });
const INDEX = process.env.OPENSEARCH_INDEX_USERS || 'users';

function parseTuple(tupleStr) {
  const parts = [];
  let cur = '';
  let inQuote = false;

  for (let i = 0; i < tupleStr.length; i++) {
    const ch = tupleStr[i];
    if (ch === "'") {
      if (inQuote && tupleStr[i + 1] === "'") {
        cur += "'";
        i++;
        continue;
      }
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && ch === ',') {
      parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.length) parts.push(cur.trim());
  return parts.map(p => {
    if (!p) return '';
    if (p === 'NULL') return null;
    return p;
  });
}

async function run() {
  const resolvedPath = path.resolve(SQL_PATH);
  if (!fs.existsSync(resolvedPath)) {
    console.error('SQL file not found:', resolvedPath);
    process.exit(1);
  }
  const content = fs.readFileSync(resolvedPath, 'utf8');

  // find INSERT INTO `users` statements with multi tuples
  const insertRegex = /INSERT\s+INTO\s+[`"]?users[`"]?\s*\([^\)]*\)\s*VALUES\s*((?:\([^\)]+\)\s*,?\s*)+);/ig;
  let m;
  const inserts = [];
  while ((m = insertRegex.exec(content)) !== null) inserts.push(m[1]);

  if (!inserts.length) {
    console.error('No INSERT INTO users statement found in SQL file.');
    process.exit(1);
  }

  const tuples = [];
  const tupleRegex = /\(([^)]+)\)/g;
  for (const ins of inserts) {
    let mm;
    while ((mm = tupleRegex.exec(ins)) !== null) tuples.push(mm[1]);
  }

  if (!tuples.length) {
    console.error('No tuples found for users in SQL.');
    process.exit(1);
  }

  const bulk = [];
  for (const t of tuples) {
    const cols = parseTuple(t);
    // order from SQL: (id, name, email, password_hash, password, google_id, created_at, role)
    const [idStr, name, email, password_hash, password, google_id, created_at, role] = cols;
    const id = idStr ? Number(idStr) : undefined;
    const doc = {
      id,
      name: name || '',
      email: email || '',
      password: password || null,
      password_hash: password_hash || null,
      google_id: google_id || null,
      created_at: created_at || null,
      role: role || 'user'
    };
    bulk.push({ index: { _index: INDEX, _id: id } });
    bulk.push(doc);
  }

  console.log(`Indexing ${bulk.length / 2} users into index "${INDEX}" from SQL: ${resolvedPath}`);
  const res = await client.bulk({ refresh: true, body: bulk });
  if (res.body.errors) {
    console.error('Bulk indexing had errors. Sample errors:');
    for (const it of res.body.items) {
      if (it.index && it.index.error) console.error(it.index.error);
    }
    process.exit(1);
  }

  console.log('Indexed users OK. Sample:');
  const sample = await client.search({ index: INDEX, body: { query: { match_all: {} }, size: 10 } });
  console.log(sample.body.hits.hits.map(h => h._source));
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
