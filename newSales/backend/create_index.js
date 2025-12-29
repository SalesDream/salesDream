// create_index.js
const { Client } = require('@opensearch-project/opensearch');

const client = new Client({ node: 'http://localhost:9200' });

(async () => {
  const index = 'leads';
  // delete if exists (dev only)
  try { await client.indices.delete({ index }); } catch(e){}

  const mapping = {
    mappings: {
      properties: {
        id: { type: 'integer' },
        contact_name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
        name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
        phone: { type: 'keyword' },
        median_income_census_area: { type: 'integer' },
        address: { type: 'text' },
        city: { type: 'keyword' },
        state: { type: 'keyword' },
        zip: { type: 'keyword' },
        sic: { type: 'keyword' },
        fax: { type: 'keyword' },
        toll_free_phone: { type: 'keyword' },
        county: { type: 'keyword' },
        company: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
        job_title: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
        employees: { type: 'integer' },
        email: { type: 'keyword' },
        website: { type: 'keyword' },
        domain: { type: 'keyword' },
        linkedin_url: { type: 'keyword' },
        facebook: { type: 'keyword' },
        twitter: { type: 'keyword' },
        sales_volume: { type: 'integer' },
        min_revenue: { type: 'long' },
        max_revenue: { type: 'long' },
        created_at: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss||strict_date_optional_time||epoch_millis' }
      }
    }
  };

  const resp = await client.indices.create({ index, body: mapping });
  console.log('created', resp.body);
})();
