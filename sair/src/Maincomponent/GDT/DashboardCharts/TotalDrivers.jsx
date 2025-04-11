"use client";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { useNavigate } from "react-router-dom";

const COLORS = [
  "#2E7D32",
  "#4CAF50",
  "#FFC107",
  "#FF5722",
  "#03A9F4",
  "#9C27B0",
]; // Colors for companies

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const NumberofDrivers = () => {
  const [data, setData] = useState([]);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const driverSnapshot = await getDocs(collection(db, "Driver"));
        const companyMap = new Map();

        driverSnapshot.forEach((doc) => {
          const { CompanyName } = doc.data();
          if (CompanyName) {
            companyMap.set(CompanyName, (companyMap.get(CompanyName) || 0) + 1);
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
        // Dummy data for testing
        const dummyDrivers = [
          { CompanyName: "Ninja" },
          { CompanyName: "Nana" },
          { CompanyName: "Ninja" },
          { CompanyName: "Keeta" },
          { CompanyName: "Nana" },
          { CompanyName: "Ninja" },
          { CompanyName: "Keeta" },
          { CompanyName: "Nana" },
          { CompanyName: "Nana" },

          { CompanyName: "TheChefz" },
        ];

        dummyDrivers.forEach(({ CompanyName }) => {
          if (CompanyName) {
            companyMap.set(CompanyName, (companyMap.get(CompanyName) || 0) + 1);
          }
        });
        //end of Dummy
        const chartData = Array.from(companyMap, ([companyName, value]) => ({
          name: capitalizeFirstLetter(
            employerMap.get(companyName) || companyName
          ),
          value,
          companyName,
        }));

        setData(chartData);
        setTotalDrivers(chartData.reduce((sum, entry) => sum + entry.value, 0)); // Calculate total count
      } catch (error) {
        console.error("Error fetching drivers:", error);
      }
    };

    fetchDrivers();
  }, []);
  return (
    <div style={{ width: "100%", height: "400px", position: "relative" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          width={data.length * 150}
          margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
          onClick={(state) => {
            const company = state?.activePayload?.[0]?.payload?.companyName;
            if (company) {
              navigate(`/GDTdriverlist/${encodeURIComponent(company)}`);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          {/* X Axis in the middle */}
          <XAxis
            dataKey="name"
            tick={{ dy: 10 }}
            label={{
              value: "Delivery Companies",
              position: "insideBottom",
              dy: 25,
            }}
          />

          <YAxis
            allowDecimals={false}
            label={{
              value: "Number of Drivers",
              angle: -90,
              position: "middle",
              dx: -20,
            }}
          />
          <Tooltip />
          <Bar
            dataKey="value"
            fill="#4CAF50"
            name="Number of Drivers"
            barSize={80}
            style={{ cursor: "pointer" }}
          >
            {data.map((_, index) => (
              <rect key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Total Drivers Display */}
      <div
        style={{
          position: "absolute",
          top: "-12px",
          right: "30px",
          fontSize: "18px",
          fontWeight: "bold",
          color: "#333",
        }}
      >
        Total Drivers: {totalDrivers}
      </div>
    </div>
  );
};

export default NumberofDrivers;
