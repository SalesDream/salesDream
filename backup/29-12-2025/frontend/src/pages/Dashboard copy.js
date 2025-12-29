import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api";
import { useAuthToken } from "../useAuth";

// AG Grid v32 theming & modules
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  themeQuartz,  // you can swap to themeBalham / themeAlpine / themeMaterial
} from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise"; // (Enterprise only)

// (Enterprise only) register enterprise module features such as sidebar, filters, etc.
ModuleRegistry.registerModules([AllEnterpriseModule]);

export default function Dashboard() {
  // Guard: redirect if not logged in
  const token = useAuthToken();
  if (!token) return <Navigate to="/login" replace />;

  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState("");

  // Columns (compact widths)
  const columnDefs = useMemo(
    () => [
      { field: "id", headerName: "Id", width: 70, pinned: "left" },
      { field: "contact_name", headerName: "Contact", minWidth: 120 },
      { field: "name", headerName: "Name", minWidth: 120 },
      { field: "phone", headerName: "Phone", minWidth: 120 },
      { field: "median_income_census_area", headerName: "Median Income (area)", minWidth: 140 },
      { field: "address", headerName: "Address", minWidth: 160 },
      { field: "city", headerName: "City", minWidth: 100 },
      { field: "state", headerName: "State", width: 80 },
      { field: "zip", headerName: "Zip", width: 90 },
      { field: "sic", headerName: "SIC", width: 90 },
      { field: "fax", headerName: "Fax", minWidth: 110 },
      { field: "toll_free_phone", headerName: "Toll Free", minWidth: 120 },
      { field: "county", headerName: "County", minWidth: 110 },
      { field: "company", headerName: "Company", minWidth: 140 },
      { field: "job_title", headerName: "Job Title", minWidth: 130 },
      { field: "employees", headerName: "Employees", width: 110 },
      { field: "email", headerName: "Email", minWidth: 180 },
      { field: "website", headerName: "Website", minWidth: 160 },
      { field: "domain", headerName: "Domain", minWidth: 140 },
      { field: "linkedin_url", headerName: "LinkedIn", minWidth: 180 },
      { field: "facebook", headerName: "Facebook", minWidth: 160 },
      { field: "twitter", headerName: "Twitter", minWidth: 160 },
      { field: "sales_volume", headerName: "Sales Volume", width: 120 },
      { field: "min_revenue", headerName: "Min Revenue", width: 120 },
      { field: "max_revenue", headerName: "Max Revenue", width: 120 },
      { field: "created_at", headerName: "Created", minWidth: 150 },
    ],
    []
  );

  // Defaults applied to every column
  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      suppressHeaderMenuButton: true,
    }),
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/api/data/leads?limit=1000");
        if (mounted) setRowData(data);
      } catch (e) {
        console.error(e); // 401 is handled by interceptor -> redirects to /login
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-semibold">Dashboard</h1>

        {/* Quick filter (tiny) */}
        <input
          className="border rounded px-2 py-1 text-xs"
          placeholder="Quick filter…"
          value={quickFilter}
          onChange={(e) => setQuickFilter(e.target.value)}
        />
      </div>

      {/* Apply v32 theme via the `theme` prop */}
      <div
        style={{
          height: 560,
          width: "100%",
          // Optional compact tweaks via CSS vars
          "--ag-font-size": "11px",
          "--ag-grid-size": "2px",
          "--ag-list-item-height": "22px",
          "--ag-row-height": "28px",
          "--ag-header-height": "30px",
          "--ag-wrapper-border-radius": "6px",
        }}
      >
        <AgGridReact
          theme={themeQuartz}              // ⬅️ This is the key line (v32 theming)
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination
          paginationPageSize={25}
          animateRows
          enableCellTextSelection
          suppressDragLeaveHidesColumns
          quickFilterText={quickFilter}
          sideBar                                  // (Enterprise) shows side tool panel
        />
      </div>

      {loading && <div className="mt-2 text-xs text-gray-500">Loading…</div>}
      {!loading && rowData.length === 0 && (
        <div className="mt-2 text-xs text-gray-500">No data found.</div>
      )}
    </div>
  );
}
