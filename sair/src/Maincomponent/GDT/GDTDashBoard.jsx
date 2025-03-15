import Header from "./GDTHeader";
import s from "../../css/Dashboard.module.css";
import "../../css/CustomModal.css";
import { useNavigate } from "react-router-dom";
import StaffChart from "./DashboardCharts/StaffChart";
import NumberOfViolations from "./DashboardCharts/NumberOfViolations";
import NumberofCrashes from "./DashboardCharts/NumberofCrash";
import TotalDrivers from "./DashboardCharts/TotalDrivers";
import ComplaintsChart from "./DashboardCharts/ComplaintsChart";
import TotalViolation from "./DashboardCharts/TotalViolation";
import TotalCrash from "./DashboardCharts/TotalCrashes";

const GDTDashboard = () => {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: "#FAFAFA", height: "100vh", width: "100%" }}>
      <Header active="gdtdashboard" />
      <div className="breadcrumb" style={{ padding: "10px 20px" }}>
        <a onClick={() => navigate("/gdthome")} style={{ cursor: "pointer" }}>
          Home
        </a>
        <span> / </span>
        <a onClick={() => navigate("/GDTDashBoard")} style={{ cursor: "pointer" }}>
          Dashboard
        </a>
      </div>

      <main style={{ padding: "20px", width: "100%" }}>
        {/* Top Section: Total Stats */}
        <div style={{ display: "flex", gap: "20px", width: "100%" }}>
          {[{ title: "Total Drivers", component: <TotalDrivers /> },
            { title: "Total Violation", component: <TotalViolation /> },
            { title: "Total Crash", component: <TotalCrash /> }].map((item, index) => (
            <GridItem key={index} title={item.title}>
              {item.component}
            </GridItem>
          ))}
        </div>

        {/* Bottom Section: Charts */}
        <div style={{ display: "flex", gap: "20px", marginTop: "20px", width: "100%" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
            <GridItem title="Number of Violations">
              <NumberOfViolations />
            </GridItem>
            <GridItem title="Number of Crashes">
              <NumberofCrashes />
            </GridItem>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
            <GridItem title="Staff Response Chart">
              <StaffChart />
            </GridItem>
            <GridItem title="Complaints Overview">
              <ComplaintsChart />
            </GridItem>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GDTDashboard;

function GridItem({ title, children }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        flex: 1,
        minWidth: "300px",
      }}
    >
      <h3 style={{ marginBottom: "15px", textAlign: "center", color: "#059855" }}>{title}</h3>
      {children}
    </div>
  );
}