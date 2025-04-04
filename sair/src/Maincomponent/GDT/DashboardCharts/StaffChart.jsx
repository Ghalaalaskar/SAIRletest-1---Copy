"use client";
import { useEffect, useState, useRef } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, where, query } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Tooltip as AntTooltip } from "antd";

const CustomLegend = () => {
  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        justifyContent: "center",
        marginBottom: "10px",
      }}
    >
      <AntTooltip title="Number of Crach Response for this Staff">
        <span
          style={{ color: "#2E7D32", fontWeight: "bold", cursor: "pointer" }}
        >
          ● Staff Crach Response
        </span>
      </AntTooltip>
      <AntTooltip title="Number of Complaint Response for this Staff">
        <span
          style={{ color: "#4CAF50", fontWeight: "bold", cursor: "pointer" }}
        >
          ● Staff Complaint Response
        </span>
      </AntTooltip>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: "white",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "5px",
          boxShadow: "0px 0px 5px rgba(0,0,0,0.2)",
        }}
      >
        <p style={{ fontWeight: "bold", marginBottom: "5px" }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, margin: 0 }}>
            {entry.name}: {entry.value}
          </p>
        ))}
        <button
          style={{
            marginTop: "10px",
            padding: "5px 10px",
            backgroundColor: "#059855",
            color: "white",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
          }}
          onClick={() => alert(`Clicked on ${label}`)}
        >
          Full Information
        </button>
      </div>
    );
  }
  return null;
};

const StaffChart = () => {
  const [data, setData] = useState([]);
  const chartContainerRef = useRef(null);
  const maxVisibleBars = 5; // Show up to 5 bars before scrolling
  const barWidth = 150; // Fixed width per bar

  useEffect(() => {
    const fetchResponse = async () => {
      try {
        const CrashQuerySnapshot = await getDocs(
          collection(db, "Crash"),
          where("Status", "==", "Emergency SOS")
        );
        const ComplaintQuerySnapshot = await getDocs(
          collection(db, "Complaint")
        );
        const StaffCounts = new Map();

        //count crash response
        CrashQuerySnapshot.forEach((doc) => {
          const { RespondedBy } = doc.data();

          if (RespondedBy) {
            if (!StaffCounts.has(RespondedBy)) {
              StaffCounts.set(RespondedBy, {
                countCrash: 0,
                countComplaint: 0,
              });
            }
            StaffCounts.get(RespondedBy).countCrash += 1; // Increment crash response count
          }
        });

        //count complaint response
        ComplaintQuerySnapshot.forEach((doc) => {
          const { RespondedBy } = doc.data();
          if (RespondedBy) {
            if (!StaffCounts.has(RespondedBy)) {
              StaffCounts.set(RespondedBy, {
                countCrash: 0,
                countComplaint: 0,
              });
            }
            StaffCounts.get(RespondedBy).countComplaint += 1;
          }
        });

        // Get GDT (Staff) first names from Firestore
        const staffData = await Promise.all(
          Array.from(StaffCounts.keys()).map(async (GDTID) => {
            const gdtQuery = query(
              collection(db, "GDT"),
              where("ID", "==", GDTID)
            ); // Match ID field
            const gdtDocs = await getDocs(gdtQuery);

            let firstName = "";
            if (!gdtDocs.empty) {
              firstName = gdtDocs.docs[0].data().Fname || ""; // Extract first name
            }

            return {
              FirstName: firstName,
              Crash: StaffCounts.get(GDTID).countCrash,
              Complaint: StaffCounts.get(GDTID).countComplaint,
            };
          })
        );
        // Convert map values to array and update state
        setData(staffData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchResponse();
  }, []);

  // Determine whether scrolling is needed
  const needsScroll = data.length > maxVisibleBars;
  const dynamicWidth = needsScroll ? data.length * barWidth : "100%";

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <CustomLegend />
      <div
        ref={chartContainerRef}
        style={{
          overflowX: needsScroll ? "auto" : "hidden",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ width: dynamicWidth }}>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="FirstName"
                textAnchor="middle"
                interval={0}
                height={60}
              />
              <YAxis allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="Crash"
                fill="#2E7D32"
                name="Number of Crash Responses"
              />
              <Bar
                dataKey="Complaint"
                fill="#4CAF50"
                name="Number of Complaint Responses"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StaffChart;
