import React, { useEffect, useState } from "react";
import Header from "./GDTHeader";
import s from "../../css/Dashboard.module.css";
import "../../css/CustomModal.css";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase"; // Import Firebase
import { collection, getDocs } from "firebase/firestore";
import StaffChart from "./DashboardCharts/StaffChart";
import NumberOfViolations from "./DashboardCharts/NumberOfViolations";

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
        <a onClick={() => navigate("/GDTDashBoard")} style={{ cursor: "pointer" }}>
          Dashboard
        </a>
      </div>

      <main>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", padding: "20px" }}>
          <GridItem title="Number of Violation LineChart" style={{ flex: 1 }}>
            <NumberOfViolations />
          </GridItem>
          <GridItem title="Staff Response Chart" style={{ flex: 1 }}>
            <StaffChart />
          </GridItem>
        </div>
      </main>
    </div>
  );
};

export default GDTDashboard;

function GridItem({ title, children, style }) {
  return (
    <div style={{ backgroundColor: "#FFFFFF", padding: "20px", borderRadius: "8px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", ...style }}>
      <h3 style={{ marginBottom: "15px", textAlign: "center" }}>{title}</h3>
      {children}
    </div>
  );
}