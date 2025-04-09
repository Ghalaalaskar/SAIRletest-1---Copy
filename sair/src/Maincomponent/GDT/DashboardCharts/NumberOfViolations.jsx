"use client";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';


const NumberofViolations = ({ dateType, companyName }) => {
  const [data, setData] = useState([]);
  const [offset, setOffset] = useState(0); // 0 = current week/month

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const violationSnapshot = await getDocs(collection(db, "Violation"));
        const driverIDs = new Set();

        violationSnapshot.forEach((doc) => {
          const { driverID } = doc.data();
          if (driverID) driverIDs.add(driverID);
        });

        const driverIDList = [...driverIDs];
        const driverMap = new Map();

        // Fetch drivers in batches
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

        // Fetch all employers to map CompanyName to ShortCompanyName
        const employerSnapshot = await getDocs(collection(db, "Employer"));
        const employerMap = new Map();

        employerSnapshot.forEach((doc) => {
          const { CompanyName, ShortCompanyName } = doc.data();
          if (CompanyName && ShortCompanyName) {
            employerMap.set(CompanyName, ShortCompanyName);
          }
        });

        const violationsMap = new Map();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate, endDate;
        if (dateType === "week") {
          endDate = new Date(today);
          endDate.setDate(today.getDate() - 7 * offset);
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 6);
        } else {
          const currentYear = today.getFullYear();
          const targetYear = currentYear - offset;
          startDate = new Date(targetYear, 0, 1); // Jan 1st of target year
          endDate = new Date(targetYear, 11, 31); // Dec 31st of target year
        }
        

        // Initialize the date range for the chart
        const dateRange = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const formattedDate = dateType === "week"
            ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "long" })
            : d.toLocaleDateString("en-GB", { year: "numeric", month: "long" });
        
          dateRange.push({ date: formattedDate, count: 0 });
        }
        
        // Process violations and group by date
        violationSnapshot.forEach((doc) => {
          const { time, driverID } = doc.data();
          if (!time) return;

          const violationDate = new Date(time * 1000);
          violationDate.setHours(0, 0, 0, 0);

          if (violationDate >= startDate && violationDate <= endDate) {
            const companyNameFromDriver = driverMap.get(driverID);
            const shortName = employerMap.get(companyNameFromDriver) || companyNameFromDriver;

            // Filter by company name if provided
            if (companyName !== "All" && shortName !== companyName) return;

            const formattedDate = dateType === "week"
              ? violationDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long" })
              : violationDate.toLocaleDateString("en-GB", { year: "numeric", month: "long" });

            violationsMap.set(
              formattedDate,
              (violationsMap.get(formattedDate) || 0) + 1
            );
          }
        });

        // Update the date range with actual counts
        dateRange.forEach(({ date }) => {
          if (violationsMap.has(date)) {
            const count = violationsMap.get(date);
            // Set the count for the existing date
            violationsMap.set(date, count);
          } else {
            // Ensure it exists with a count of 0
            violationsMap.set(date, 0);
          }
        });

        // Convert Map to an array and sort it in ascending order
        const chartData = Array.from(violationsMap, ([date, count]) => ({
          date,
          count,
        })).sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date ascending

        console.log("Chart Data:", chartData); // Debugging line
        setData(chartData);
      } catch (error) {
        console.error("Error fetching violations:", error);
      }
    };

    fetchViolations(); // Fetch violations data
  }, [dateType, companyName, offset]);

  return (
    <div style={{ width: "100%", height: "400px" ,  position: "relative" }}>
<button
  onClick={() => setOffset((prev) => prev + 1)}
  style={{
    position: "absolute",
    left: "4rem",
    top: "-7%",
    transform: "translateY(-50%)",
    zIndex: 1,
    fontSize: "20px",
    backgroundColor: "#f9f9f9",
    border: "1px solid #ccc",
    borderRadius: "10%",
    width: "40px",
    height: "40px",
    cursor: "pointer",
    boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.1)",
    transition: "all 0.2s ease-in-out",
  }}
  onMouseOver={(e) => {
    e.target.style.backgroundColor = "#e6f5e9";
  }}
  onMouseOut={(e) => {
    e.target.style.backgroundColor = "#f9f9f9";
  }}
>
  ◀
</button>

<button
  onClick={() => setOffset((prev) => Math.max(prev - 1, 0))}
  disabled={offset === 0}
  style={{
    position: "absolute",
    right: "2rem",
    top: "-7%",
    transform: "translateY(-50%)",
    zIndex: 1,
    fontSize: "20px",
    backgroundColor: offset === 0 ? "#eee" : "#f9f9f9",
    border: "1px solid #ccc",
    borderRadius: "10%",
    width: "40px",
    height: "40px",
    cursor: offset === 0 ? "not-allowed" : "pointer",
    boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.1)",
    opacity: offset === 0 ? 0.5 : 1,
    transition: "all 0.2s ease-in-out",
  }}
  onMouseOver={(e) => {
    if (offset !== 0) e.target.style.backgroundColor = "#e6f5e9";
  }}
  onMouseOut={(e) => {
    if (offset !== 0) e.target.style.backgroundColor = "#f9f9f9";
  }}
>
  ▶
</button>


  <ResponsiveContainer width="100%" height="100%">
    <LineChart
      data={data}
      margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
    >

        <defs>
          <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          interval={0}
          angle={-45}
          textAnchor="end"
          label={{ value: "Date", position: "insideBottom", dy: 55 }}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          allowDecimals={false}
          label={{
            value: "Number of Violations",
            angle: -90,
            position: "middle",
            dx: -20,
          }}
        />
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#82ca9d"
          dot={true}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
  );
};

export default NumberofViolations;