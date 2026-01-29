const fs = require("fs");
const path = require("path");

const JOBS_FILE = path.join(__dirname, "../../exports/jobs.json");

/**
 * Read jobs.json safely
 */
function readJobs() {
  if (!fs.existsSync(JOBS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(JOBS_FILE, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Persist jobs.json
 */
function writeJobs(jobs) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

/**
 * Update a job atomically
 */
function updateJob(jobId, patch) {
  const jobs = readJobs();
  jobs[jobId] = { ...(jobs[jobId] || {}), ...patch };
  writeJobs(jobs);
}

/**
 * Get single job
 */
function getJob(jobId) {
  const jobs = readJobs();
  return jobs[jobId];
}

module.exports = { updateJob, getJob };
