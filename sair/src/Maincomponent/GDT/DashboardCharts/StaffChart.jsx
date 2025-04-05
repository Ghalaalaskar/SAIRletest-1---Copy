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
  const [isHovered, setIsHovered] = useState(false);

  if ((active || isHovered) && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: "white",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "5px",
          boxShadow: "0px 0px 5px rgba(0,0,0,0.2)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
  const [tooltipData, setTooltipData] = useState(null); // tooltip state
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveringTooltip, setHoveringTooltip] = useState(false);

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
            StaffCounts.get(RespondedBy).countCrash += 1;
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
            let StaffID = "";
            if (!gdtDocs.empty) {
              firstName = gdtDocs.docs[0].data().Fname || "";
              StaffID = gdtDocs.docs[0].data().GDTID || "";
            }

            return {
              FirstName: firstName,
              GDTID: StaffID,
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
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
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
              onMouseLeave={() => {
                if (!hoveringTooltip) setTooltipData(null);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="FirstName" interval={0} height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label, coordinate }) => {
                  if (active && payload && coordinate) {
                    setTooltipData({ label, payload });
                    setTooltipPos({ x: coordinate.x, y: coordinate.y });
                  } else if (!hoveringTooltip) {
                    setTooltipData(null);
                  }
                  return null; // Don't show default tooltip
                }}
              />
              <Bar dataKey="Crash" fill="#2E7D32" name="Crash Responses" />
              <Bar
                dataKey="Complaint"
                fill="#4CAF50"
                name="Number of Complaint Responses"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {tooltipData && (
        <div
          onMouseEnter={() => setHoveringTooltip(true)}
          onMouseLeave={() => {
            setHoveringTooltip(false);
            setTooltipData(null);
          }}
          style={{
            position: "absolute",
            left: tooltipPos.x + 60,
            top: tooltipPos.y,
            backgroundColor: "white",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "5px",
            boxShadow: "0px 0px 5px rgba(0,0,0,0.2)",
            zIndex: 10,
          }}
        >
          <p style={{ fontWeight: "bold", marginBottom: "5px" }}>
            {tooltipData.label}
          </p>
          {tooltipData.payload.map((entry, index) => (
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
            onClick={() => alert(`Clicked on ${tooltipData.label}`)}
          >
            Full Information
          </button>
        </div>
      )}
    </div>
  );
};

export default StaffChart;
