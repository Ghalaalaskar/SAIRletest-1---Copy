import React, { useEffect, useState, useRef } from "react";
import Header from "./GDTHeader";
import d from "../../css/Dashboard.module.css";
import "../../css/CustomModal.css";
import { useNavigate } from "react-router-dom";
import StaffChart from "./DashboardCharts/StaffChart";
import NumberOfViolations from "./DashboardCharts/NumberOfViolations";
import NumberofCrashes from "./DashboardCharts/NumberofCrash";
import TotalDrivers from "./DashboardCharts/TotalDrivers";
import RecklessViolation from "./DashboardCharts/RecklessViolation";
import TotalViolation from "./DashboardCharts/TotalViolation";
import TotalCrash from "./DashboardCharts/TotalCrashes";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";

const GDTDashboard = () => {
  const navigate = useNavigate();
  const [violationFilterType, setViolationFilterType] = useState("All");
  const [complaintFilterType, setComplaintFilterType] = useState("All");
  const [isTypeOpen, setIsTypeOpen] = useState({ violations: false, complaints: false });
  const [companyOptions, setCompanyOptions] = useState(["All"]);
  const [data, setData] = useState([]);
  const typeDropdownRef = useRef(null);
  const violationDropdownRef = useRef(null);
  const complaintDropdownRef = useRef(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  const capitalizeFirstLetter = (string) => {
    if (!string) return "";
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const toggleTypeDropdown = (type) => {
    setIsTypeOpen((prev) => ({
      ...prev,
      [type]: !prev[type],
      ...(type === "violations" ? { complaints: false } : { violations: false }),
    }));
  };

  // Separate handlers for each filter
  const handleViolationOptionClick = (option) => {
    setViolationFilterType(option);
    setIsTypeOpen({ violations: false, complaints: false });
  };

  const handleComplaintOptionClick = (option) => {
    setComplaintFilterType(option);
    setIsTypeOpen({ violations: false, complaints: false });
  };

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
        const q = query(
          collection(db, "Driver"),
          where("DriverID", "in", batch)
        );
        const driverSnapshot = await getDocs(q);

        driverSnapshot.forEach((doc) => {
          const { DriverID, CompanyName } = doc.data();
          if (DriverID && CompanyName) {
            driverMap.set(DriverID, CompanyName);
          }
        });
      }

      const employerSnapshot = await getDocs(collection(db, "Employer"));
      const employerMap = new Map();

      employerSnapshot.forEach((doc) => {
        const { CompanyName, ShortCompanyName } = doc.data();
        if (CompanyName && ShortCompanyName) {
          employerMap.set(CompanyName, ShortCompanyName);
        }
      });

      const companyMap = new Map();
      violationSnapshot.forEach((doc) => {
        const { driverID } = doc.data();
        const companyName = driverMap.get(driverID);
        const shortName = employerMap.get(companyName) || companyName;
        if (shortName) {
          companyMap.set(shortName, (companyMap.get(shortName) || 0) + 1);
        }
      });

      const shortCompanyNames = Array.from(employerMap.values()).sort();
      setCompanyOptions(["All", ...shortCompanyNames]);

      const chartData = Array.from(companyMap, ([shortCompanyName, value]) => ({
        name: shortCompanyName,
        value,
      }));

      setData(chartData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        violationDropdownRef.current &&
        !violationDropdownRef.current.contains(event.target) &&
        complaintDropdownRef.current &&
        !complaintDropdownRef.current.contains(event.target)
      ) {
        setIsTypeOpen({ violations: false, complaints: false });
      }
    };
  
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  

  return (
    <div style={{ backgroundColor: "#FAFAFA", height: "100vh", width: "100%" }}>
      <Header active="gdtdashboard" />
      <div className="breadcrumb" style={{ padding: "10px 20px" }}>
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
      <main style={{ padding: "20px", width: "100%" }}>
        <div style={{ display: "flex", gap: "20px", width: "100%" }}>
          {[
            { title: "Total Drivers", component: <TotalDrivers /> },
            { title: "Total Violation", component: <TotalViolation /> },
            { title: "Total Crash", component: <TotalCrash /> },
          ].map((item, index) => (
            <GridItem key={index} title={item.title}>
              {item.component}
            </GridItem>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: "20px",
            width: "100%",
          }}
        ></div>
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: "20px",
            width: "100%",
          }}
        >
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: "bold" }}>
                Violation Statistics
              </div>
              <div
                className="searchContainer"
                ref={violationDropdownRef}
                style={{ position: "relative" }}
              >
                <div
                  className="selectWrapper"
                  style={{
                    border: "2px solid #4CAF50",
                    borderRadius: "5px",
                    padding: "5px",
                    fontWeight: "normal",
                  }}
                >
                  <div
                    className={`customSelect ${isTypeOpen.violations ? "open" : ""}`}
                    onClick={() => toggleTypeDropdown("violations")}
                    style={{
                      cursor: "pointer",
                      padding: "5px 10px",
                      position: "relative",
                      width: "200px",
                      textAlign: "left",
                    }}
                  >
                    {violationFilterType === "All" ? (
                      <span>Filter by Company</span>
                    ) : (
                      violationFilterType
                    )}
                    <span
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        border: "solid #4CAF50",
                        borderWidth: "0 2px 2px 0",
                        display: "inline-block",
                        padding: "3px",
                        transform: isTypeOpen.violations
                          ? "translateY(-50%) rotate(-135deg)"
                          : "translateY(-50%) rotate(45deg)",
                      }}
                    />
                  </div>
                  {isTypeOpen.violations && (
                    <div
                      className="dropdownMenu"
                      style={{
                        position: "absolute",
                        zIndex: 1000,
                        backgroundColor: "#fff",
                        border: "1px solid #ddd",
                        top: "100%",
                        left: "0",
                        right: "0",
                        textAlign: "left",
                        borderRadius: "5px",
                        fontWeight: "normal",
                      }}
                    >
                      {companyOptions.map((option) => (
                        <div
                          key={option}
                          className="dropdownOption"
                          onClick={() => handleViolationOptionClick(option)}
                          style={{
                            padding: "10px",
                            cursor: "pointer",
                            transition: "background-color 0.3s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#f0f0f0")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          {capitalizeFirstLetter(option)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: "bold" }}>
                Complaints and Crash Statistics
              </div>
              <div
                className="searchContainer"
                ref={complaintDropdownRef}
                style={{ position: "relative" }}
              >
                <div
                  className="selectWrapper"
                  style={{
                    border: "2px solid #4CAF50",
                    borderRadius: "5px",
                    padding: "5px",
                    fontWeight: "normal",
                  }}
                >
                  <div
                    className={`customSelect ${isTypeOpen.complaints ? "open" : ""}`}
                    onClick={() => toggleTypeDropdown("complaints")}
                    style={{
                      cursor: "pointer",
                      padding: "5px 10px",
                      position: "relative",
                      width: "200px",
                      textAlign: "left",
                    }}
                  >
                    {complaintFilterType === "All" ? (
                      <span>Filter by Company</span>
                    ) : (
                      complaintFilterType
                    )}
                    <span
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        border: "solid #4CAF50",
                        borderWidth: "0 2px 2px 0",
                        display: "inline-block",
                        padding: "3px",
                        transform: isTypeOpen.complaints
                          ? "translateY(-50%) rotate(-135deg)"
                          : "translateY(-50%) rotate(45deg)",
                      }}
                    />
                  </div>
                  {isTypeOpen.complaints && (
                    <div
                      className="dropdownMenu"
                      style={{
                        position: "absolute",
                        zIndex: 1000,
                        backgroundColor: "#fff",
                        border: "1px solid #ddd",
                        top: "100%",
                        left: "0",
                        right: "0",
                        textAlign: "left",
                        borderRadius: "5px",
                        fontWeight: "normal",
                      }}
                    >
                      {companyOptions.map((option) => (
                        <div
                          key={option}
                          className="dropdownOption"
                          onClick={() => handleComplaintOptionClick(option)}
                          style={{
                            padding: "10px",
                            cursor: "pointer",
                            transition: "background-color 0.3s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#f0f0f0")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          {capitalizeFirstLetter(option)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom Section: Charts */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: "20px",
            width: "100%",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <GridItem title="Number of Violations">
              <NumberOfViolations />
            </GridItem>
          
            <GridItem title="Reckless Violations">
              <RecklessViolation />
            </GridItem>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <GridItem title="Staff Response Chart">
              <StaffChart />
            </GridItem>
            <GridItem title="Number of Crashes">
              <NumberofCrashes />
            </GridItem>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GDTDashboard;

const GridItem = ({ title, children }) => (
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
    <h3 style={{ marginBottom: "15px", textAlign: "center", color: "#059855" }}>
      {title}
    </h3>
    {children}
  </div>
);