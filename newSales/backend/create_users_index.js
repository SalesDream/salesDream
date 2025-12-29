// create_users_index.js
const { Client } = require('@opensearch-project/opensearch');

const client = new Client({ node: process.env.OPENSEARCH_NODE || 'http://localhost:9200' });

async function run() {
  const index = 'users';
  try {
    // delete existing index (dev only)
    await client.indices.delete({ index });
  } catch (e) {
    // ignore if not exists
  }

  const body = {
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0
    },
    mappings: {
      properties: {
        id: { type: 'integer' },
        name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
        email: { type: 'keyword' },
        password: { type: 'keyword' },        // store bcrypt hash
        password_hash: { type: 'keyword' },   // legacy column
        google_id: { type: 'keyword' },
        role: { type: 'keyword' },
        created_at: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss||strict_date_optional_time||epoch_millis' }
      }
    }
  };

  const resp = await client.indices.create({ index, body });
  console.log('created index', resp.body);
}

run().catch(e => { console.error(e); process.exit(1); });
