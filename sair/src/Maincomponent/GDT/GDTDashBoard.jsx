import React, { useEffect, useState, useRef } from "react";
import Header from "./GDTHeader";
import d from "../../css/Dashboard.module.css";
import "../../css/CustomModal.css";
import { useNavigate } from "react-router-dom";
import StaffChart from "./DashboardCharts/StaffChart";
import ViolationCrashGeoChart from "./DashboardCharts/ViolationCrashGeoChart";
import NumberOfViolations from "./DashboardCharts/NumberOfViolations";
import NumberofCrashes from "./DashboardCharts/NumberofCrash";
import TotalDrivers from "./DashboardCharts/TotalDrivers";
import RecklessViolation from "./DashboardCharts/RecklessViolation";
import TotalViolation from "./DashboardCharts/TotalViolation";
import TotalCrash from "./DashboardCharts/TotalCrashes";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../firebase";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";
const GDTDashBoard = () => {
  const navigate = useNavigate();
  const [violationFilterType, setViolationFilterType] = useState("All");
  const [complaintFilterType, setComplaintFilterType] = useState("All");
  const [isTypeOpen, setIsTypeOpen] = useState({
    violations: false,
    complaints: false,
  });
  const [companyOptions, setCompanyOptions] = useState(["All"]);
  const [data, setData] = useState([]);
  const typeDropdownRef = useRef(null);
  const violationDropdownRef = useRef(null);
  const complaintDropdownRef = useRef(null);
  const [thisWeekViolations, setThisWeekViolations] = useState(0);
  const [lastWeekViolations, setLastWeekViolations] = useState(0);
  const [percentageChange, setPercentageChange] = useState(null);
  const [percentageChangeCrash, setPercentageChangeCrash] = useState(null);
  const [lastCrashTime, setLastCrashTime] = useState(null);
  const [responseBy, setResponseBy] = useState(null);

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
      ...(type === "violations"
        ? { complaints: false }
        : { violations: false }),
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
  // Function to calculate the last Sunday date
  const getLastSundayDateTime = () => {
    const today = new Date();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay()); // Sets to the last Sunday
    lastSunday.setHours(0, 0, 0, 0); // Reset time to the start of the day
    return lastSunday.toLocaleString("en-US", {
      weekday: "long", // Full name of the day
      year: "numeric",
      month: "long", // Full name of the month
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true, // 12-hour format
    });
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

  useEffect(() => {
    fetchViolationData();
    fetchCrashData();
  }, []);

  //To calculate the precentage
  const fetchViolationData = async () => {
    try {
      const today = new Date();

      // Start of this week (Sunday at 00:00:00)
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay());
      thisWeekStart.setHours(0, 0, 0, 0);

      // Start of last week (Previous Sunday at 00:00:00)
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(thisWeekStart.getDate() - 7);

      // End of last week (Saturday at 23:59:59)
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setSeconds(-1); // Makes it Saturday 23:59:59

      // Convert JavaScript Date to Unix timestamp (in seconds)
      const thisWeekStartUnix = Math.floor(thisWeekStart.getTime() / 1000);
      const lastWeekStartUnix = Math.floor(lastWeekStart.getTime() / 1000);
      const lastWeekEndUnix = Math.floor(lastWeekEnd.getTime() / 1000);

      // Queries for this week's and last week's violations
      const thisWeekQuery = query(
        collection(db, "Violation"),
        where("time", ">=", thisWeekStartUnix) // Use 'time' field
      );

      const lastWeekQuery = query(
        collection(db, "Violation"),
        where("time", ">=", lastWeekStartUnix), // Use 'time' field
        where("time", "<=", lastWeekEndUnix)
      );

      const thisWeekSnapshot = await getDocs(thisWeekQuery);
      const lastWeekSnapshot = await getDocs(lastWeekQuery);

      const thisWeekCount = thisWeekSnapshot.size;
      const lastWeekCount = lastWeekSnapshot.size;

      setThisWeekViolations(thisWeekCount);
      setLastWeekViolations(lastWeekCount);

      // Calculate percentage change
      if (lastWeekCount > 0) {
        const change = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
        setPercentageChange(change.toFixed(2));
      } else {
        setPercentageChange(thisWeekCount > 0 ? 100 : 0);
      }
    } catch (error) {
      console.error("Error fetching violation data:", error);
    }
  };

  //To calculate the percentage
  const fetchCrashData = async () => {
    try {
      const today = new Date();

      // Start of this week (Sunday at 00:00:00)
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay());
      thisWeekStart.setHours(0, 0, 0, 0);

      // Start of last week (Previous Sunday at 00:00:00)
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(thisWeekStart.getDate() - 7);

      // End of last week (Saturday at 23:59:59)
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setSeconds(-1); // Makes it Saturday 23:59:59

      // Convert JavaScript Date to Unix timestamp (in seconds)
      const thisWeekStartUnix = Math.floor(thisWeekStart.getTime() / 1000);
      const lastWeekStartUnix = Math.floor(lastWeekStart.getTime() / 1000);
      const lastWeekEndUnix = Math.floor(lastWeekEnd.getTime() / 1000);

      // Queries for this week's and last week's violations
      const thisWeekQuery = query(
        collection(db, "Crash"),
        where("time", ">=", thisWeekStartUnix) // Use 'time' field
      );

      const lastWeekQuery = query(
        collection(db, "Crash"),
        where("time", ">=", lastWeekStartUnix), // Use 'time' field
        where("time", "<=", lastWeekEndUnix)
      );

      const thisWeekSnapshot = await getDocs(thisWeekQuery);
      const lastWeekSnapshot = await getDocs(lastWeekQuery);

      const thisWeekCount = thisWeekSnapshot.size;
      const lastWeekCount = lastWeekSnapshot.size;

      setThisWeekViolations(thisWeekCount);
      setLastWeekViolations(lastWeekCount);

      // Calculate percentage change
      if (lastWeekCount > 0) {
        const change = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
        setPercentageChangeCrash(change.toFixed(2));
      } else {
        setPercentageChangeCrash(thisWeekCount > 0 ? 100 : 0);
      }
    } catch (error) {
      console.error("Error fetching Crash data:", error);
    }
  };

  useEffect(() => {
    const fetchLastCrash = async () => {
      try {
        const crashQuery = query(
          collection(db, "Crash"),
          orderBy("time", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(crashQuery);
        querySnapshot.forEach((doc) => {
          console.log("Crash Document:", doc.id, "=>", doc.data());
        });
        if (!querySnapshot.empty) {
          const lastCrash = querySnapshot.docs[0].data();
          setLastCrashTime(new Date(lastCrash.time * 1000).toLocaleString());
          setResponseBy(lastCrash.RespondedBy);
        } else {
          console.log("No crashes detected.");
        }
      } catch (error) {
        console.error("Error fetching last crash:", error);
      }
    };

    fetchLastCrash();
    console.log("Last Crash Time:", lastCrashTime);
    console.log("Response By:", responseBy);
  }, []);
  return (
    <div>
      <Header active="GDTDashBoard" />
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
      <main class="Dashboard" style={{ padding: "20px", width: "100%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
            marginBottom: "20px",
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
    <div style={{ fontWeight: "bold", paddingTop:"15px" }}>
      Started Streaming at: {getLastSundayDateTime()}
    </div>
  </div>
  <div
  style={{
    backgroundColor: "#FFFFFF",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    flex: 1,
    textAlign: "left",
    fontWeight: "bold",
  }}
>
  <div 
    style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between",
      gap: "15px",paddingTop:"15px" 
    }}
  >
    <span>
      Last Crash Detected: <strong>{lastCrashTime || "No data available"}</strong>
    </span>
    <span style={{ color: responseBy ? "black" : "red" }}>
      {responseBy ? (
        <>Response By: <strong>{responseBy}</strong></>
      ) : (
        <>Needs Response</>
      )}
    </span>
  </div>
</div>

</div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {[
            { title: "Total Drivers", component: <TotalDrivers /> },
            {
              title: "Total Violation",
              component: (
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <TotalViolation />
                  {percentageChange !== null && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "0",
                        right: "0",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: percentageChange >= 0 ? "green" : "red",
                        fontWeight: "bold",
                      }}
                    >
                      {percentageChange >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                      {percentageChange}% this week
                    </span>
                  )}
                </div>
              ),
            },
            {
              title: "Total Crash",
              component: (
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <TotalCrash />
                  {percentageChange !== null && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "0",
                        right: "0",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: percentageChange >= 0 ? "green" : "red",
                        fontWeight: "bold",
                      }}
                    >
                      {percentageChangeCrash >= 0 ? (
                        <FaArrowUp />
                      ) : (
                        <FaArrowDown />
                      )}
                      {percentageChangeCrash}% this week
                    </span>
                  )}
                </div>
              ),
            },
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
              backgroundColor: "#05b06d",
              color: "#ffffff",
              padding: "20px",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              borderBottomLeftRadius: "0",
              borderBottomRightRadius: "0",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              flex: 1,
              textAlign: "center",
              fontWeight: "bold",
              marginTop: "20px",
              animation: "fadeIn 1s ease-in-out",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: "bold" }}>Violation Statistics</div>
              <div
                className="searchContainer"
                ref={violationDropdownRef}
                style={{ position: "relative" }}
              >
                <div
                  className="selectWrapper"
                  style={{
                    border: "2px solid #4CAF50",
                    backgroundColor: "#FFFFFF",
                    color: "black",
                    borderRadius: "5px",
                    padding: "5px",
                    fontWeight: "normal",
                  }}
                >
                  <div
                    className={`customSelect ${
                      isTypeOpen.violations ? "open" : ""
                    }`}
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
              backgroundColor: "#05b06d",
              color: "#ffffff",
              padding: "20px",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              borderBottomLeftRadius: "0",
              borderBottomRightRadius: "0",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              flex: 1,
              textAlign: "center",
              fontWeight: "bold",
              marginTop: "20px",
              animation: "fadeIn 1s ease-in-out",
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
                 Statistics
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
                    backgroundColor: "#FFFFFF",
                    color: "black",
                    borderRadius: "5px",
                    padding: "5px",
                    fontWeight: "normal",
                  }}
                >
                  <div
                    className={`customSelect ${
                      isTypeOpen.complaints ? "open" : ""
                    }`}
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
            <GridItem title="Number of Crashes">
              <NumberofCrashes />
            </GridItem>
          </div>
        </div>
        
        
        {/* Staff Charts */}
        <div
          style={{
            backgroundColor: "#05b06d",
            color: "#ffffff",
            padding: "20px",
            borderTopLeftRadius: "8px",
            borderTopRightRadius: "8px",
            borderBottomLeftRadius: "0",
            borderBottomRightRadius: "0",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            flex: 1,
            textAlign: "center",
            fontWeight: "bold",
            marginTop: "20px",
            animation: "fadeIn 1s ease-in-out",
          }}
        >
          <div style={{ fontWeight: "bold" }}>Staff Response Statistics</div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
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
            <GridItem title="Staff Response Chart">
              <StaffChart />
            </GridItem>
          </div>
        </div>
       
        {/* Geo Charts */} 
        <div 
          style={{
            backgroundColor: "#05b06d",
            color: "#ffffff",
            padding: "20px",
            borderTopLeftRadius: "8px",
            borderTopRightRadius: "8px",
            borderBottomLeftRadius: "0",
            borderBottomRightRadius: "0",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            flex: 1,
            textAlign: "center",
            fontWeight: "bold",
            marginTop: "20px",
            animation: "fadeIn 1s ease-in-out",
          }}
        >
          <div style={{ fontWeight: "bold" }}>
            Riyadh Violation and Crash Distribution
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
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
            <GridItem title="">
              <ViolationCrashGeoChart />
            </GridItem>
          </div>
          </div>
      </main>
    </div>
  );
};

export default GDTDashBoard;

const GridItem = ({ title, children }) => (
  <div
    style={{
      backgroundColor: "#FFFFFF",
      padding: "20px",
      borderTopLeftRadius: "0",
      borderTopRightRadius: "0",
      borderBottomLeftRadius: "8px",
      borderBottomRightRadius: "8px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
      flex: 1,
      minWidth: "550px",
    }}
  >
    <h3 style={{ marginBottom: "15px", textAlign: "center", color: "#059855" }}>
      {title}
    </h3>
    {children}
  </div>
);
