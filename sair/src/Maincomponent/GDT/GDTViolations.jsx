import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import EyeIcon from "../../images/eye.png";
import { Table } from "antd";
import Header from "./GDTHeader";
import s from "../../css/Violations.module.css";
import "../../css/CustomModal.css";
import { Button, Modal } from "antd";
import X from "../../images/redx.webp";
import { Pagination } from "antd";
import { FaFilter } from "react-icons/fa";
const ViolationList = () => {
  const [motorcycles, setMotorcycles] = useState({});
  const [violations, setViolations] = useState([]);
  const [drivers, setDrivers] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const navigate = useNavigate();
  const [violationTypeFilter, setViolationTypeFilter] = useState("");
  const gdtUID = sessionStorage.getItem("gdtUID");
  const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [filters, setFilters] = useState({
      type: [],
      status: [],
    });
const [dropdownOpen, setDropdownOpen] = useState(false);
const [selectedValues, setSelectedValues] = useState([]);
const options = [
  { value: "Reckless Violations", label: "Reckless Violations" },
  { value: "Regular Violations", label: "Regular Violations" },
  { value: "Active", label: "Active" },
  { value: "Revoked", label: "Revoked" },
];
  const [clickedViolations, setClickedViolations] = useState(() => {
    // Load clicked violations from local storage using a user-specific key
    const savedClickedViolations = localStorage.getItem(`clickedViolations_${gdtUID}`);
    return savedClickedViolations ? JSON.parse(savedClickedViolations) : [];
  });
  useEffect(() => {
    const fetchEmployerDrivers = async () => {
      if (gdtUID) {
        const employerDoc = await getDoc(doc(db, "GDT", gdtUID));
        fetchDrivers();
      }
    };

    fetchEmployerDrivers();
  }, [gdtUID]);

  const handleClickDetails = (id) => {
    if (!clickedViolations.includes(id)) {
      const updatedClickedViolations = [...clickedViolations, id];
      setClickedViolations(updatedClickedViolations);
      // Save to local storage with a user-specific key
      localStorage.setItem(`clickedViolations_${gdtUID}`, JSON.stringify(updatedClickedViolations));
    }
  };
  const fetchDrivers = () => {
    const driverCollection = query(collection(db, "Driver"));

    const unsubscribe = onSnapshot(driverCollection, (snapshot) => {
      const driverMap = {};
      const driverIDs = [];
      const companyPromises = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        driverMap[data.DriverID] = {
          name: `${data.Fname} ${data.Lname}`,
          companyName: data.CompanyName,
          shortCompanyName: "", // Placeholder for ShortCompanyName
        };
        driverIDs.push(data.DriverID);

        // Add a promise to fetch the company details
        companyPromises.push(
          fetchCompany(data.CompanyName).then((shortName) => {
            driverMap[data.DriverID].shortCompanyName = shortName;
          })
        );
      });

      // Wait for all company data to be fetched before updating state
      Promise.all(companyPromises).then(() => {
        setDrivers(driverMap);
      });

      // Fetch violations if there are valid driver IDs
      if (driverIDs.length > 0) {
        fetchViolations(driverIDs);
      } else {
        setViolations([]);
      }
    });

    return () => unsubscribe();
  };

  const fetchCompany = async (companyName) => {
    const companyQuery = query(
      collection(db, "Employer"),
      where("CompanyName", "==", companyName)
    );

    const snapshot = await getDocs(companyQuery);
    if (!snapshot.empty) {
      const companyData = snapshot.docs[0].data();
      return companyData.ShortCompanyName || companyName; // Fallback to full name if short name not available
    }
    return companyName; // Return the original name if no match found
  };

  const fetchMotorcycles = (violationIDs) => {
    const motorcycleCollection = query(
      collection(db, "History"),
      where("ID", "in", violationIDs) // Matching by violationID
    );
    const unsubscribe = onSnapshot(motorcycleCollection, (snapshot) => {
      const motorcycleMap = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Fetched Motorcycle Data:", data);
        motorcycleMap[data.ID] = data.LicensePlate; // Map ID to License Plate
      });
      console.log("Motorcycle Map:", motorcycleMap); // Log the entire motorcycle map
      setMotorcycles(motorcycleMap);
    });

    return () => unsubscribe();
  };
  // Function to format the date
  const formatDate = (time) => {
    const date = new Date(time * 1000); // Assuming timestamp is in seconds
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-based
    const day = date.getDate().toString().padStart(2, "0"); // Days are 1-based
    return `${month}/${day}/${year}`; // Format as MM/DD/YYYY
  };
  const handleViewViolations = () => {
    if (violations.length > 0) {
      navigate(`/gdtricklessdrives`); // Navigate to the first violation
    } else {
      setIsPopupVisible(true); // Show popup if no violation exist
    }
  };
  const fetchViolations = (driverIDs) => {
    const violationCollection = query(
      collection(db, "Violation"),
      where("driverID", "in", driverIDs)
    );

    const unsubscribe = onSnapshot(violationCollection, (snapshot) => {
      const violationList = snapshot.docs.map((doc) => {
        const data = doc.data();
        const isReckless = data.count30 > 0 || data.count50 > 0;
        return {
          id: doc.id,
          ...data,
          isReckless, // Add reckless classification
        };
      });
      // Ensure violations not clicked yet are highlighted
      const newViolationIDs = violationList.map((v) => v.id);
      setClickedViolations((prev) =>
        prev.filter((id) => newViolationIDs.includes(id))
      );
      setViolations(violationList);
      if (violationList.length > 0) {
        const violationIDs = violationList.map((v) => v.violationID); // Collecting violation IDs
        fetchMotorcycles(violationIDs); // Fetch motorcycles using violation IDs
      } else {
        setMotorcycles({});
      }
    });

    return () => unsubscribe();
  };

  // Filtering violations
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleSelect = (value) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];

    setSelectedValues(newSelection);
    const newType = newSelection.filter(val => val === "Reckless Violations" || val === "Regular Violations");
    const newStatus = newSelection.filter(val => val === "Active" || val === "Revoked");
    setFilters({ type: newType, status: newStatus });
  };

  const filteredViolations = violations
  .filter((violation) => {
    const driverName = drivers[violation.driverID]?.name || "";
    const licensePlate = motorcycles[violation.violationID] || ' ';

    // Format the violation date using formatDate
    const violationDate = violation.time ? formatDate(violation.time) : "";

    // Format searchDate to MM/DD/YYYY
    const formattedSearchDate = searchDate ? formatDate(new Date(searchDate).getTime() / 1000) : "";

    const matchesSearchQuery = driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               licensePlate.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearchDate = formattedSearchDate ? violationDate === formattedSearchDate : true;

    const matchesTypeFilter = filters.type.length === 0 ||
      (filters.type.includes("Reckless Violations") && violation.isReckless) ||
      (filters.type.includes("Regular Violations") && !violation.isReckless);

    const matchesStatusFilter = filters.status.length === 0 ||
      filters.status.includes(violation.Status);

    console.log(`Checking violation: ${violation.id} - Status: ${violation.Status}, 
                 Matches Status Filter: ${matchesStatusFilter}, 
                 Matches Search Query: ${matchesSearchQuery}, 
                 Matches Search Date: ${matchesSearchDate}, 
                 Violation Date: ${violationDate}, 
                 Search Date: ${formattedSearchDate}`);

    return matchesSearchQuery && matchesSearchDate && matchesTypeFilter && matchesStatusFilter;
  })
  .sort((a, b) => (b.time || 0) - (a.time || 0));
  
  const capitalizeFirstLetter = (string) => {
    if (!string) return "";
    return string
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const columns = [
    {
      title: "Violation ID",
      dataIndex: "violationID",
      key: "violationID",
      align: "center",
    },
    {
      title: "Driver ID",
      dataIndex: "driverID",
      key: "driverID",
      align: "center",
    },
    {
      title: "Driver Name",
      key: "driverName",
      align: "center",
      render: (text, record) => {
        const driverName = drivers[record.driverID]?.name || "";
        return capitalizeFirstLetter(driverName);
      },
    },
    {
      title: "Company Name",
      key: "CompanyName",
      align: "center",
      render: (text, record) => {
        const companyName = drivers[record.driverID]?.shortCompanyName || "";
        return capitalizeFirstLetter(companyName);
      },
    },
    {
      title: "Motorcycle License Plate",
      key: "motorcyclePlate",
      align: "center",
      render: (text, record) => motorcycles[record.violationID] || "   ", // Use violationID for lookup
    },
    {
      title: "Speed",
      dataIndex: "driverSpeed",
      key: "driverSpeed",
      align: "center",
    },
    {
      title: "Type",
      dataIndex: "violationType",
      key: "violationType",
      align: "center",
      render: (text, record) =>
        record.isReckless ? "Reckless Violation" : "Regular Violation",
    },
    {
      title: "Status",
      dataIndex: "Status",
      key: "Status",
      align: "center",
      render: (text, record) => (
        <span style={{ color: record.Status === "Active" ? 'green' : 'red' }}>
          {record.Status}
        </span>
      ),    
    },
    {
      title: "Date",
      key: "date",
      align: "center",
      render: (text, record) => formatDate(record.time),
    },
    {
      title: "Violation Details",
      key: "Details",
      align: "center",
      render: (text, record) => (
        <Link
          to={`/gdtviolation/general/${record.id}`}
          onClick={(e) => {
            e.preventDefault(); // Prevent immediate navigation
            handleClickDetails(record.id); // Update state
            setTimeout(
              () => navigate(`/gdtviolation/general/${record.id}`),
              100
            ); // Navigate after state update
          }}
        >
          <img src={EyeIcon} alt="Details" style={{ cursor: "pointer" }} />
        </Link>
      ),
    },
  ];

  return (
    <>
      <Header active="gdtviolations" />
      <div className="breadcrumb">
        <a onClick={() => navigate("/gdthome")}>Home</a>
        <span> / </span>
        <a onClick={() => navigate("/GDTviolations")}>Violations List</a>
      </div>
      <main>
        {" "}
        <div>
          <div className={s.container}>
            <div className={s.searchHeader}>
              <h2 className={s.title}>Violations List</h2>
              <div className={s.searchContainer}>
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="#059855"
                    strokeLinecap="round"
                    strokeWidth="2"
                    d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by Driver ID  or License Plate"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "235px", height:"20px" }}
                />
              </div>
              <div className={s.searchContainer} >
                <div className={`${s.selectWrapper} ${s.dropdownContainer}`} style={{  width: '355px' }}>
                  <FaFilter className={s.filterIcon} />
                  <div style={{ position: 'relative', width: '510px'}}>
                    <div
                      onClick={toggleDropdown}
                      style={{
                        padding: '8px',
                        backgroundColor: 'transparent', // Make background transparent
                        cursor: 'pointer',
                        borderRadius: '4px',
                        transition: 'border 0.3s',
                        color: 'grey', // Set text color to grey
                        lineHeight: '1.0', 
                        fontSize:'14px',
                      }}
                    >
                    {selectedValues.length > 0 ? selectedValues.join(', ') : 'Filter violations'}

                    </div>
                    {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    background: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    zIndex: 1000,
                    width: '350px', // Set a wider width for the dropdown
                    left: '-40px', // Adjust this value to move the dropdown left
              
                  }}
                >
                  <div style={{ padding: '10px', fontWeight: 'bold' }}>Type</div>
                  {options.filter(option => option.value === "Reckless Violations" || option.value === "Regular Violations").map((option) => (
                    <div key={option.value} style={{ padding: '10px', cursor: 'pointer' }}>
                      <label style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedValues.includes(option.value)}
                          onChange={() => handleSelect(option.value)}
                          style={{ marginRight: '10px' }} // Space between checkbox and text
                        />
                        {option.label}
                      </label>
                    </div>
                  ))}
                  <div style={{ padding: '10px', fontWeight: 'bold' }}>Status</div>
                  {options.filter(option => option.value === "Active" || option.value === "Revoked").map((option) => (
                    <div key={option.value} style={{ padding: '10px', cursor: 'pointer' }}>
                      <label style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedValues.includes(option.value)}
                          onChange={() => handleSelect(option.value)}
                          style={{ marginRight: '10px' }} // Space between checkbox and text
                        />
                        {option.label}
                      </label>
                    </div>
                  ))}
                  {/* Reset Button */}
                  <div style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setSelectedValues([]); // Reset selected values
                        setFilters({ type: [], status: [] }); // Reset filters
                        toggleDropdown(); // Optionally close the dropdown
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        color: 'blue',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 0', // Adjust padding for better appearance
                        cursor: 'pointer',
                        width: '100%', 
                        textAlign:'left',
                      }}
                    >
                      Reset Filter
                    </button>
                  </div>
                </div>
              )}
                </div>
                </div>
              </div>
              <div
  className={s.searchContainerdate}
  style={{ position: "relative" }}
>
  <div>
    {/* Conditional rendering for the green circle with tick */}
    {searchDate && (
      <div style={{
        position: "absolute",
        top: "-1px",  // Adjust to position it higher
        right: "-1px",  // Adjust to position it to the right
        width: "16px",  // Smaller size for better fit
        height: "16px", // Smaller size for better fit
        borderRadius: "50%",
        backgroundColor: "#059855",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        fontSize: "12px", // Slightly smaller font size
        zIndex: 1, // Ensure it appears in front

      }}>
        ✓ 
      </div>
    )}

    <svg
      onClick={() => document.getElementById("date-input").focus()}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        top: "50%",
        left: "1px",
        transform: "translateY(-50%)",
        cursor: "pointer",
        width: "40px", // Adjusted width
        height: "40px", // Adjusted height
      }}
    >
      <path
        d="M18 2V4M6 2V4"
        stroke="#059855"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.9955 13H12.0045M11.9955 17H12.0045M15.991 13H16M8 13H8.00897M8 17H8.00897"
        stroke="#059855"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 8H20.5"
        stroke="#059855"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 12.2432C2.5 7.88594 2.5 5.70728 3.75212 4.35364C5.00424 3 7.01949 3 11.05 3H12.95C16.9805 3 18.9958 3 20.2479 4.35364C21.5 5.70728 21.5 7.88594 21.5 12.2432V12.7568C21.5 17.1141 21.5 19.2927 20.2479 20.6464C18.9958 22 16.9805 22 12.95 22H11.05C7.01949 22 5.00424 22 3.75212 20.6464C2.5 19.2927 2.5 17.1141 2.5 12.7568V12.2432Z"
        stroke="#059855"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 8H21"
        stroke="#059855"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>

    <input
      id="date-input"
      type="date"
      value={searchDate}
      onChange={(e) => setSearchDate(e.target.value)}
      style={{
        width: "100%",
        height: "40px", // Adjusted height
        fontSize: "16px",
        paddingLeft: "40px", // Add padding to avoid overlap with the icon
        backgroundColor: "transparent",
        border: "0px solid #ccc",
        borderRadius: "4px",
      }}
    />
  </div>
</div>
            </div>
          </div>
          <Table
  columns={columns}
  dataSource={filteredViolations}
  rowKey="id"
  rowClassName={(record) =>
    clickedViolations.includes(record.id) ? "" : s.highlightRow
  }
  pagination={false}
/>
          {/* Flex container for button and pagination */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
            }}
          >
            <Button
              onClick={handleViewViolations}
              style={{
                width: "auto",
                height: "60px",
                fontSize: "15px",
                color: "#059855",
                borderColor: "#059855",
              }}
            >
              <i className="fas fa-eye" style={{ marginRight: "8px" }}></i>
              View Reckless Drivers
            </Button>

            <Pagination
              defaultCurrent={1}
              total={filteredViolations.length}
              pageSize={5} // Number of items per page
              style={{ marginLeft: "auto" }} // Align pagination to the right
            />
          </div>

          {/* Popup for no violations */}
          <Modal
            title={null}
            visible={isPopupVisible}
            onCancel={() => setIsPopupVisible(false)}
            footer={
              <p style={{ textAlign: "center" }}>
                There are no drivers with reckless violations.
              </p>
            }
            style={{ top: "38%" }}
            className="custom-modal"
            closeIcon={<span className="custom-modal-close-icon">×</span>}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <img
                src={X}
                alt="No Reckless Drivers"
                style={{ width: "20%", marginBottom: "16px" }}
              />
            </div>
          </Modal>
        </div>
      </main>
    </>
  );
};

export default ViolationList;