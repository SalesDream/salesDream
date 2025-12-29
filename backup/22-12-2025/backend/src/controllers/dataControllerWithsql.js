const pool = require("../config/db");

/**
 * Returns all 26 columns from the `leads` table:
 * id, contact_name, name, phone, median_income_census_area, address, city, state, zip,
 * sic, fax, toll_free_phone, county, company, job_title, employees, email, website, domain,
 * linkedin_url, facebook, twitter, sales_volume, min_revenue, max_revenue, created_at
 */
// exports.getLeads = async (req, res) => {
//   try {
//     const limit = Math.min(parseInt(req.query.limit || "1000", 10), 5000);
//     const [rows] = await pool.query(`
//       SELECT id, contact_name, name, phone, median_income_census_area, address, city, state, zip,
//              sic, fax, toll_free_phone, county, company, job_title, employees, email, website, domain,
//              linkedin_url, facebook, twitter, sales_volume, min_revenue, max_revenue, created_at
//       FROM leads
//       ORDER BY created_at DESC, id DESC
//       LIMIT ?
//     `, [limit]);
//     res.json(rows);
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: "Server error" });
//   }
// };


// exports.getLeads = async (req, res) => {
//   try {
//     const limit = Math.min(parseInt(req.query.limit || "1000", 10), 5000);

//     const ALLOWED_LIKE = [
//       "state_code","city","industry","zip_code","company_name","website","domain",
//       "company_location_locality","company_location_region","company_location_country",
//       "normalized_email","phone_contact",
//       "linkedin_url","facebook_url","twitter_url",
//       "contact_full_name","job_title"
//     ];

//     const where = [];
//     const params = [];

//     // LIKE filters
//     for (const key of ALLOWED_LIKE) {
//       const v = req.query[key];
//       if (v && String(v).trim() !== "") {
//         where.push(`\`${key}\` LIKE ?`);
//         params.push(`%${String(v).trim()}%`);
//       }
//     }

//     // employees >= num_employees
//     if (req.query.employees && !Number.isNaN(Number(req.query.employees))) {
//       where.push("num_employees >= ?");
//       params.push(Number(req.query.employees));
//     }

//     // revenue range
//     if (req.query.min_revenue && !Number.isNaN(Number(req.query.min_revenue))) {
//       where.push("total_revenue_corp_wide >= ?");
//       params.push(Number(req.query.min_revenue));
//     }
//     if (req.query.max_revenue && !Number.isNaN(Number(req.query.max_revenue))) {
//       where.push("total_revenue_corp_wide <= ?");
//       params.push(Number(req.query.max_revenue));
//     }

//     const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

//     const sql = `
//       SELECT
//         id,
//         state_code,
//         normalized_phone,
//         normalized_email,
//         company_name,
//         address,
//         address2,
//         city,
//         zip_code,
//         zip4,
//         zip9,
//         county,
//         latitude,
//         longitude,
//         sic_code,
//         naics_1,
//         naics_2,
//         naics_3,
//         naics_4,
//         industry,
//         website,
//         fax_number,
//         toll_free_phone,
//         num_employees,
//         total_employees_corp_wide,
//         sales_volume,
//         total_revenue_corp_wide,
//         median_income_census_area,
//         mean_housing_census_area,
//         company_founded,
//         public_company,
//         headquarters_branch,
//         franchise_flag,
//         individual_firm_code,
//         sic8_1,
//         sic8_1_2,
//         sic8_1_4,
//         sic8_1_6,
//         minority_owned,
//         small_business,
//         large_business,
//         home_business,
//         credit_score,
//         ad_size,
//         female_owned_operated,
//         city_population,
//         residential_business_code,
//         company_linkedin_url,
//         company_facebook_url,
//         company_twitter_url,
//         company_location_name,
//         company_location_locality,
//         company_location_metro,
//         company_location_region,
//         company_location_geo,
//         company_location_street_address,
//         company_location_address_line_2,
//         company_location_postal_code,
//         company_location_country,
//         company_location_continent,
//         business_record_type,
//         contact_full_name,
//         contact_first_name,
//         contact_middle_initial,
//         contact_middle_name,
//         contact_last_name,
//         contact_gender,
//         job_title,
//         sub_role,
//         skills,
//         birth_year,
//         birth_date,
//         linkedin_url,
//         linkedin_username,
//         facebook_url,
//         facebook_username,
//         twitter_url,
//         twitter_username,
//         github_url,
//         github_username,
//         contact_location,
//         contact_locality,
//         contact_metro,
//         contact_region,
//         contact_location_country,
//         contact_location_continent,
//         contact_street_address,
//         contact_address_line_2,
//         contact_postal_code,
//         contact_location_geo,
//         last_updated_person,
//         job_start_date,
//         job_summary,
//         linkedin_connections,
//         inferred_salary,
//         years_experience,
//         contact_summary,
//         contact_countries,
//         contact_interests,
//         title_code_1,
//         title_code_2,
//         title_full,
//         ethnic_code,
//         ethnic_group,
//         language_code,
//         religion_code,
//         phone_contact,
//         created_at,
//         updated_at
//       FROM sales
//       ${whereSql}
//       ORDER BY created_at DESC, id DESC
//       LIMIT ?
//     `;

//     params.push(limit);

//     const [rows] = await pool.query(sql, params);
//     console.log(rows);
//     res.json(rows);
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: "Server error" });
//   }
// };


// exports.getLeads = async (req, res) => {
//   try {
//     // -------- helpers --------
//     const limit = Math.min(parseInt(req.query.limit || "1000", 10), 5000);
//     const where = [];
//     const params = [];

//     const like = (key, column = key) => {
//       const v = req.query[key];
//       if (v !== undefined && String(v).trim() !== "") {
//         where.push(`\`${column}\` LIKE ?`);
//         params.push(`%${String(v).trim()}%`);
//       }
//     };

//     const asList = (v) => {
//       if (!v) return [];
//       if (Array.isArray(v)) {
//         return v
//           .flatMap((x) => String(x).split(","))
//           .map((s) => s.trim())
//           .filter(Boolean);
//       }
//       return String(v)
//         .split(",")
//         .map((s) => s.trim())
//         .filter(Boolean);
//     };

//     const addIn = (key, column = key) => {
//       const list = asList(req.query[key]);
//       if (!list.length) return;
//       where.push(`\`${column}\` IN (${list.map(() => "?").join(",")})`);
//       params.push(...list);
//     };

//     const addMin = (key, column) => {
//       const v = req.query[key];
//       if (v !== undefined && v !== "" && !Number.isNaN(Number(v))) {
//         where.push(`\`${column}\` >= ?`);
//         params.push(Number(v));
//       }
//     };

//     const addMax = (key, column) => {
//       const v = req.query[key];
//       if (v !== undefined && v !== "" && !Number.isNaN(Number(v))) {
//         where.push(`\`${column}\` <= ?`);
//         params.push(Number(v));
//       }
//     };

//     const tri = (key, column = key) => {
//       const v = String(req.query[key] || "").toUpperCase();
//       if (v === "Y" || v === "N") {
//         where.push(`UPPER(\`${column}\`) = ?`);
//         params.push(v);
//       }
//     };

//     const presence = (key, column) => {
//       const v = req.query[key];
//       if (v === "has") {
//         where.push(`(\`${column}\` IS NOT NULL AND \`${column}\` <> '')`);
//       } else if (v === "missing") {
//         where.push(`(\`${column}\` IS NULL OR \`${column}\` = '')`);
//       }
//     };

//     // -------- LIKE filters (partial match) --------
//     like("company_name");
//     like("city");
//     like("zip_code");
//     like("website");
//     like("contact_full_name");
//     like("normalized_email", "normalized_email");
//     like("phone_contact", "phone_contact");
//     like("industry"); // also support partial match for industry text

//     // -------- IN (...) filters from comma / repeated params --------
//     addIn("state_code", "state_code");
//     addIn("company_location_country", "company_location_country");
//     addIn("job_title", "job_title");
//     addIn("contact_gender", "contact_gender");

//     // -------- skills tokens (AND each token with LIKE) --------
//     const skillsTokens = asList(req.query.skills);
//     if (skillsTokens.length) {
//       for (const tok of skillsTokens) {
//         where.push("`skills` LIKE ?");
//         params.push(`%${tok}%`);
//       }
//     }

//     // -------- Tri-state toggles --------
//     tri("public_company", "public_company");
//     tri("franchise_flag", "franchise_flag");

//     // -------- Presence toggles --------
//     presence("has_company_linkedin", "company_linkedin_url");
//     presence("has_contact_linkedin", "linkedin_url");

//     // -------- Numeric ranges --------
//     // employees (support exact min via employees OR min/max via employees_min/max)
//     if (req.query.employees && !Number.isNaN(Number(req.query.employees))) {
//       where.push("`num_employees` >= ?");
//       params.push(Number(req.query.employees));
//     }
//     addMin("employees_min", "num_employees");
//     addMax("employees_max", "num_employees");

//     // revenue (new names + legacy for compatibility)
//     addMin("revenue_min", "total_revenue_corp_wide");
//     addMax("revenue_max", "total_revenue_corp_wide");
//     addMin("min_revenue", "total_revenue_corp_wide");
//     addMax("max_revenue", "total_revenue_corp_wide");

//     // years of experience
//     addMin("years_min", "years_experience");
//     addMax("years_max", "years_experience");

//     // -------- Date range --------
//     if (req.query.job_start_from) {
//       where.push("DATE(`job_start_date`) >= ?");
//       params.push(String(req.query.job_start_from));
//     }
//     if (req.query.job_start_to) {
//       where.push("DATE(`job_start_date`) <= ?");
//       params.push(String(req.query.job_start_to));
//     }

//     // -------- Final SQL --------
//     const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

//     const sql = `
//       SELECT
//         id,
//         state_code,
//         normalized_phone,
//         normalized_email,
//         company_name,
//         address,
//         address2,
//         city,
//         zip_code,
//         zip4,
//         zip9,
//         county,
//         latitude,
//         longitude,
//         sic_code,
//         naics_1,
//         naics_2,
//         naics_3,
//         naics_4,
//         industry,
//         website,
//         fax_number,
//         toll_free_phone,
//         num_employees,
//         total_employees_corp_wide,
//         sales_volume,
//         total_revenue_corp_wide,
//         median_income_census_area,
//         mean_housing_census_area,
//         company_founded,
//         public_company,
//         headquarters_branch,
//         franchise_flag,
//         individual_firm_code,
//         sic8_1,
//         sic8_1_2,
//         sic8_1_4,
//         sic8_1_6,
//         minority_owned,
//         small_business,
//         large_business,
//         home_business,
//         credit_score,
//         ad_size,
//         female_owned_operated,
//         city_population,
//         residential_business_code,
//         company_linkedin_url,
//         company_facebook_url,
//         company_twitter_url,
//         company_location_name,
//         company_location_locality,
//         company_location_metro,
//         company_location_region,
//         company_location_geo,
//         company_location_street_address,
//         company_location_address_line_2,
//         company_location_postal_code,
//         company_location_country,
//         company_location_continent,
//         business_record_type,
//         contact_full_name,
//         contact_first_name,
//         contact_middle_initial,
//         contact_middle_name,
//         contact_last_name,
//         contact_gender,
//         job_title,
//         sub_role,
//         skills,
//         birth_year,
//         birth_date,
//         linkedin_url,
//         linkedin_username,
//         facebook_url,
//         facebook_username,
//         twitter_url,
//         twitter_username,
//         github_url,
//         github_username,
//         contact_location,
//         contact_locality,
//         contact_metro,
//         contact_region,
//         contact_location_country,
//         contact_location_continent,
//         contact_street_address,
//         contact_address_line_2,
//         contact_postal_code,
//         contact_location_geo,
//         last_updated_person,
//         job_start_date,
//         job_summary,
//         linkedin_connections,
//         inferred_salary,
//         years_experience,
//         contact_summary,
//         contact_countries,
//         contact_interests,
//         title_code_1,
//         title_code_2,
//         title_full,
//         ethnic_code,
//         ethnic_group,
//         language_code,
//         religion_code,
//         phone_contact,
//         created_at,
//         updated_at
//       FROM sales
//       ${whereSql}
//       ORDER BY created_at DESC, id DESC
//       LIMIT ?
//     `;

//     params.push(limit);

//     const [rows] = await pool.query(sql, params);
//     res.json(rows);
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// controllers/dataController.js (or wherever you defined it)
exports.getLeads = async (req, res) => {
  try {
    const where = [];
    const params = [];

    const like = (key, column = key) => {
      const v = req.query[key];
      if (v !== undefined && String(v).trim() !== "") {
        where.push(`\`${column}\` LIKE ?`);
        params.push(`%${String(v).trim()}%`);
      }
    };
    const asList = (v) => {
      if (!v) return [];
      if (Array.isArray(v)) return v.flatMap(x => String(x).split(",")).map(s => s.trim()).filter(Boolean);
      return String(v).split(",").map(s => s.trim()).filter(Boolean);
    };
    const addIn = (key, column = key) => {
      const list = asList(req.query[key]);
      if (!list.length) return;
      where.push(`\`${column}\` IN (${list.map(()=>"?").join(",")})`);
      params.push(...list);
    };
    const addMin = (key, column) => {
      const v = req.query[key];
      if (v !== undefined && v !== "" && !Number.isNaN(Number(v))) {
        where.push(`\`${column}\` >= ?`);
        params.push(Number(v));
      }
    };
    const addMax = (key, column) => {
      const v = req.query[key];
      if (v !== undefined && v !== "" && !Number.isNaN(Number(v))) {
        where.push(`\`${column}\` <= ?`);
        params.push(Number(v));
      }
    };

    // ---- LIKE filters mapped to leads columns ----
    like("company_name", "company");
    like("contact_full_name", "contact_name");
    like("city", "city");
    like("zip_code", "zip");       // accept frontend param zip_code -> leads.zip
    like("zip", "zip");
    like("website", "website");
    like("domain", "domain");
    like("industry", "job_title"); // (no industry in leads; optional: map to job_title text search)

    // ---- IN(...) filters ----
    addIn("state_code", "state");
    addIn("state", "state");
    addIn("job_title", "job_title");

    // ---- Ranges ----
    addMin("employees_min", "employees");
    addMax("employees_max", "employees");

    // revenue (both naming styles supported)
    addMin("revenue_min", "min_revenue");
    addMax("revenue_max", "max_revenue");
    addMin("min_revenue", "min_revenue");
    addMax("max_revenue", "max_revenue");

    // Build SQL
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        id,
        contact_name,
        name,
        phone,
        median_income_census_area,
        address,
        city,
        state,
        zip,
        sic,
        fax,
        toll_free_phone,
        county,
        company,
        job_title,
        employees,
        email,
        website,
        domain,
        linkedin_url,
        facebook,
        twitter,
        sales_volume,
        min_revenue,
        max_revenue,
        created_at
      FROM leads
      ${whereSql}
      ORDER BY created_at DESC, id DESC
    `; // ← NO LIMIT

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};
