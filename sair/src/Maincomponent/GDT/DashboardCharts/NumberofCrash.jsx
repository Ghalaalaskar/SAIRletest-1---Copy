"use client";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
} from "recharts";

const NumberofCrash = ({ dateType, companyName }) => {
  const [data, setData] = useState([]);
  const [offset, setOffset] = useState(0); // 0 = current week/month
  useEffect(() => {
    const fetchCrashes = async () => {
      try {
        const crashSnapshot = await getDocs(collection(db, "Crash"));
        const driverIDs = new Set();

        crashSnapshot.forEach((doc) => {
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

        const crashesMap = new Map();
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

        const dateRange = [];
        if (dateType === "week") {
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const formattedDate = d.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
            });
            dateRange.push({ date: formattedDate, count: 0 });
          }
        } else {
          const months = Array.from({ length: 12 }, (_, i) =>
            new Date(startDate.getFullYear(), i, 1).toLocaleDateString("en-GB", {
              month: "long",
            })
          );
          months.forEach((month) => {
            dateRange.push({ date: month, count: 0 });
          });
        }
        
        // Process crashes and group by date
        crashSnapshot.forEach((doc) => {
          const { time, driverID } = doc.data();
          if (!time) return;

          const crashDate = new Date(time * 1000);
          crashDate.setHours(0, 0, 0, 0);

          if (crashDate >= startDate && crashDate <= endDate) {
            const companyNameFromDriver = driverMap.get(driverID);
            const shortName =
              employerMap.get(companyNameFromDriver) || companyNameFromDriver;

            // Filter by company name if provided
            if (companyName !== "All" && shortName !== companyName) return;

            const formattedDate =
            dateType === "week"
              ? crashDate.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                })
              : crashDate.toLocaleDateString("en-GB", {
                  month: "long",
                });
          

            crashesMap.set(
              formattedDate,
              (crashesMap.get(formattedDate) || 0) + 1
            );
          }
        });

        // Update the date range with actual counts
        dateRange.forEach(({ date }) => {
          if (crashesMap.has(date)) {
            const count = crashesMap.get(date);
            // Set the count for the existing date
            crashesMap.set(date, count);
          } else {
            // Ensure it exists with a count of 0
            crashesMap.set(date, 0);
          }
        });

        // Convert Map to an array
        let chartData = Array.from(crashesMap, ([date, count]) => ({
          date,
          count,
          // Add a sortOrder property for proper month sorting
          sortOrder: dateType === "week" 
            ? new Date(date.split(" ")[1] + " " + date.split(" ")[0] + ", " + startDate.getFullYear()).getTime() 
            : new Date(date + " 1, " + startDate.getFullYear()).getTime()
        }));
        
        // Sort by sortOrder (chronological order)
        chartData.sort((a, b) => a.sortOrder - b.sortOrder);
        
        // Remove the sortOrder property before rendering
        chartData = chartData.map(({ date, count }) => ({ date, count }));

        console.log("Chart Data:", chartData); // Debugging line
        setData(chartData);
      } catch (error) {
        console.error("Error fetching crashes:", error);
      }
    };

    fetchCrashes(); // Fetch crashes data
  }, [dateType, companyName, offset]);

  return (
    <div style={{ width: "100%", height: "400px", position: "relative" }}>
      {/* Left Arrow Button (← - Increase Offset) */}
      <button
        onClick={() => setOffset((prev) => prev + 1)}
        style={{
          position: "absolute",
          left: "10px",
          top: "-45px",
          fontSize: "20px",
          backgroundColor: "white",
          color: "black",
          width: "45px",
          height: "45px",
          border: "1px solid #e7eae8",
          borderRadius: "8px",
          cursor: "pointer",
          opacity: 1,
          zIndex: 2,
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = "#e6f5e9";
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = "#f9f9f9";
        }}
      >
        ←
      </button>

      {/* Right Arrow Button (→ - Decrease Offset) */}
      <button
        onClick={() => setOffset((prev) => Math.max(prev - 1, 0))}
        disabled={offset === 0}
        style={{
          position: "absolute",
          right: "10px",
          top: "-45px",
          fontSize: "20px",
          backgroundColor: "white",
          color: "black",
          width: "45px",
          height: "45px",
          backgroundColor: offset === 0 ? "#eee" : "#f9f9f9",
          border: "1px solid #e7eae8",
          borderRadius: "8px",
          cursor: offset === 0 ? "not-allowed" : "pointer",
          opacity: offset === 0 ? 0.5 : 1,
          zIndex: 2,
        }}
        onMouseOver={(e) => {
          if (offset !== 0) e.target.style.backgroundColor = "#e6f5e9";
        }}
        onMouseOut={(e) => {
          if (offset !== 0) e.target.style.backgroundColor = "#f9f9f9";
        }}
      >
        →
      </button>

      <ResponsiveContainer width="100%" height="100%">
        {" "}
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
            label={{
              value:
                dateType === "week"
                  ? "Date"
                  : `Date (Year ${new Date().getFullYear() - offset})`,
              position: "insideBottom",
              dy: 55,
            }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            label={{
              value: "Number of Crashes",
              angle: -90,
              position: "middle",
              dx: -20,
            }}
          />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#82ca9d" dot={true} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NumberofCrash;