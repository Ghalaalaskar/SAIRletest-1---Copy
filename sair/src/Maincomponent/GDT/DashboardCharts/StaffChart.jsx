"use client";
import { useEffect, useState } from "react";
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
    <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginBottom: "10px" }}>
      <AntTooltip title="Number of Crach Response for this Staff">
        <span style={{ color: "#2E7D32", fontWeight: "bold", cursor: "pointer" }}>● Staff Crach Response</span>
      </AntTooltip>
      <AntTooltip title="Number of Complaint Response for this Staff">
        <span style={{ color: "#4CAF50", fontWeight: "bold", cursor: "pointer" }}>● Staff Complaint Response</span>
      </AntTooltip>
    </div>
  );
};


const StaffChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchResponse = async () => {
      try {
        // Fetch all staff from GDT collection
        const staffQuerySnapshot = await getDocs(collection(db, "GDT"));
        const allStaff = staffQuerySnapshot.docs.map((doc) => ({
          ID: doc.data().ID, 
          FirstName: doc.data().Fname || "Unknown",
          Crash: 0,
          Complaint: 0,
        }));

        // Create a map of staff responses
        const staffResponseMap = new Map(allStaff.map(staff => [staff.ID, { ...staff }]));

        // Fetch and count Crash responses
        const CrashQuerySnapshot = await getDocs(collection(db, "Crash"), where("Status", "==", "Emergency SOS"));
        CrashQuerySnapshot.forEach((doc) => {
          const { RespondedBy } = doc.data();
          if (RespondedBy && staffResponseMap.has(RespondedBy)) {
            staffResponseMap.get(RespondedBy).Crash += 1;
          }
        });

        // Fetch and count Complaint responses
        const ComplaintQuerySnapshot = await getDocs(collection(db, "Complaint"));
        ComplaintQuerySnapshot.forEach((doc) => {
          const { RespondedBy } = doc.data();
          if (RespondedBy && staffResponseMap.has(RespondedBy)) {
            staffResponseMap.get(RespondedBy).Complaint += 1;
          }
        });

        // Convert map values to array and update state
        setData(Array.from(staffResponseMap.values()));
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchResponse();
  }, []); 

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <CustomLegend />
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="FirstName" textAnchor="middle" interval={0} height={60} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="Crash" fill="#2E7D32" name="Number of Crash Responses" />
          <Bar dataKey="Complaint" fill="#4CAF50" name="Number of Complaint Responses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StaffChart;