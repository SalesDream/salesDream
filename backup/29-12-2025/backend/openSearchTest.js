const { Client } = require("@opensearch-project/opensearch");

const client = new Client({ node: "http://139.144.56.127:9200" });
const INDEX = "alaska_joined_data_v2";
const BATCH_SIZE = 100; // number of records per batch

async function printAllRecords() {
  try {
    // Initialize scroll
    let response = await client.search({
      index: INDEX,
      scroll: "1m",           // scroll context valid for 1 minute
      size: BATCH_SIZE,
      body: { query: { match_all: {} } },
    });

    let scrollId = response.body._scroll_id;
    let hits = response.body.hits.hits;
    let total = response.body.hits.total.value;
    console.log(`Total records: ${total}`);

    let count = 0;

    while (hits.length) {
      // Print current batch
      for (const hit of hits) {
        console.log(JSON.stringify(hit._source));
        count++;
      }

      console.log(`✅ Printed ${count}/${total} records so far`);

      // Get next batch
      response = await client.scroll({
        scroll_id: scrollId,
        scroll: "1m",
      });

      scrollId = response.body._scroll_id;
      hits = response.body.hits.hits;
    }

    console.log("🎉 Done printing all records");

    // Clear scroll context
    await client.clearScroll({ scroll_id: scrollId });

  } catch (err) {
    console.error("❌ Error:", err);
  }
}

printAllRecords();
