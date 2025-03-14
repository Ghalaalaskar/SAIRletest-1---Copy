import Header from "./GDTHeader";
import s from "../../css/Dashboard.module.css";
import "../../css/CustomModal.css";
import { useNavigate } from "react-router-dom";
import StaffChart from "./DashboardCharts/StaffChart";
import NumberOfViolations from "./DashboardCharts/NumberOfViolations";
import NumberofCrashes from "./DashboardCharts/NumberofCrash";

const GDTDashboard = () => {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: "#FAFAFA", height: "100vh", width: "100%" }}>
      <Header active="gdtdashboard" />
      <div className="breadcrumb">
        <a onClick={() => navigate("/gdthome")} style={{ cursor: "pointer" }}>
          Home
        </a>
        <span> / </span>
        <a
          onClick={() => navigate("/GDTDashBoard")}
          style={{ cursor: "pointer" }}
        >
          Dashboard
        </a>
      </div>

      <main>
        <div style={{ display: "flex", gap: "20px", padding: "20px" }}>
          {/* Left Column: Violations & Crashes */}
          <div
            style={{
              flex: 2,
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <GridItem title="Number of Violations Chart">
              <NumberOfViolations />
            </GridItem>
            <GridItem title="Number of Crashes Chart">
              <NumberofCrashes />
            </GridItem>
          </div>

          {/* Right Column: Staff Response Chart */}
          <div style={{ flex: 2 }}>
            <GridItem title="Staff Response Chart">
              <StaffChart />
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
      }}
    >
      <h3 style={{ marginBottom: "15px", textAlign: "center" }}>{title}</h3>
      {children}
    </div>
  );
}
