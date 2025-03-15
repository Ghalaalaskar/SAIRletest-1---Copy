import React, { useEffect, useState, useRef } from "react";
import Header from "./GDTHeader";
import d from "../../css/Dashboard.module.css";
import "../../css/CustomModal.css";
import { useNavigate } from "react-router-dom";
import StaffChart from "./DashboardCharts/StaffChart";
import NumberOfViolations from "./DashboardCharts/NumberOfViolations";
import NumberofCrashes from "./DashboardCharts/NumberofCrash";
import TotalDrivers from "./DashboardCharts/TotalDrivers";
import ComplaintsChart from "./DashboardCharts/ComplaintsChart";
import TotalViolation from "./DashboardCharts/TotalViolation";
import TotalCrash from "./DashboardCharts/TotalCrashes";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
const GDTDashboard = () => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState("All");
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [companyOptions, setCompanyOptions] = useState(["All"]);
  const [data, setData] = useState([]);
  const typeDropdownRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const violationSnapshot = await getDocs(collection(db, "Violation"));
      const driverIDs = new Set();

      violationSnapshot.forEach((doc) => {
        const { driverID } = doc.data();
        if (driverID) driverIDs.add(driverID);
      });

      if (driverIDs.size === 0) {
        setData([]);
        return;
      }

      const driverIDList = [...driverIDs];
      const driverMap = new Map();

      for (let i = 0; i < driverIDList.length; i += 10) {
        const batch = driverIDList.slice(i, i + 10);
        const q = query(collection(db, "Driver"), where("DriverID", "in", batch));
        const driverSnapshot = await getDocs(q);

        driverSnapshot.forEach((doc) => {
          const { DriverID, CompanyName } = doc.data();
          if (DriverID && CompanyName) {
            driverMap.set(DriverID, CompanyName);
          }
        });
      }

      const companyMap = new Map();
      violationSnapshot.forEach((doc) => {
        const { driverID } = doc.data();
        const companyName = driverMap.get(driverID);
        if (companyName) {
          companyMap.set(companyName, (companyMap.get(companyName) || 0) + 1);
        }
      });

      const employerSnapshot = await getDocs(collection(db, "Employer"));
      const employerMap = new Map();

      employerSnapshot.forEach((doc) => {
        const { CompanyName, ShortCompanyName } = doc.data();
        if (CompanyName && ShortCompanyName) {
          employerMap.set(CompanyName, ShortCompanyName);
        }
      });

      const shortCompanyNames = Array.from(employerMap.values()).sort();
      setCompanyOptions(["All", ...shortCompanyNames]);

      const chartData = Array.from(companyMap, ([companyName, value]) => ({
        name: employerMap.get(companyName) || companyName,
        value,
      }));

      setData(chartData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
        setIsTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ backgroundColor: "#FAFAFA", height: "100vh", width: "100%" }}>
      <Header active="gdtdashboard" />
      <div className="breadcrumb" style={{ padding: "10px 20px" }}>
        <a onClick={() => navigate("/gdthome")} style={{ cursor: "pointer" }}>Home</a>
        <span> / </span>
        <a onClick={() => navigate("/GDTDashBoard")} style={{ cursor: "pointer" }}>Dashboard</a>
      </div>
      <main style={{ padding: "20px", width: "100%" }}>
        <div style={{ display: "flex", gap: "20px", width: "100%" }}>
          {[{ title: "Total Drivers", component: <TotalDrivers /> }, { title: "Total Violation", component: <TotalViolation /> }, { title: "Total Crash", component: <TotalCrash /> }].map((item, index) => (
            <GridItem key={index} title={item.title}>{item.component}</GridItem>
          ))}
        </div>
        <div style={{ display: "flex", gap: "20px", marginTop: "20px", width: "100%" }}>
     
        </div>
          {/* Labels in the Same Row */}
          <div style={{ display: "flex", gap: "20px", marginTop: "20px", width: "100%" }}>
          <div
            style={{
              backgroundColor: "#FFFFFF",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              flex: 1,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            Violation and Crash Statistics
          </div>
          <div  ref={typeDropdownRef}>
            <select  onChange={(e) => setFilterType(e.target.value)}>
              {companyOptions.map((option, index) => (
                <option key={index} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div
            style={{
              backgroundColor: "#FFFFFF",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              flex: 1,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            Complaints and Crash Statistics
          </div>
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

const GridItem = ({ title, children }) => (
  <div style={{ backgroundColor: "#FFFFFF", padding: "20px", borderRadius: "8px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", flex: 1, minWidth: "300px" }}>
    <h3 style={{ marginBottom: "15px", textAlign: "center", color: "#059855" }}>{title}</h3>
    {children}
  </div>
);