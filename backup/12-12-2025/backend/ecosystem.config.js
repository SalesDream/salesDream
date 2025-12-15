module.exports = {
  apps: [
    {
      name: "my-node-app",
      cwd: "/home/ubuntu/salesNew/backend",
      script: "npm",
      args: "start",            // or the path to your compiled server file, e.g. dist/index.js
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        # // can't use # in js file; use placeholders:
        // DB_HOST: "localhost",
        OPENSEARCH_URL: "http://127.0.0.1:9200",
      }
    }
  ]
};
