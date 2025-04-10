import React, { useEffect, useState } from "react";
import homeBackground from "../../images/homebackground7.png";
import Header from "./GDTHeader";
import "../../css/EmployerHome.module.css";
import "../../css/CustomModal.css";
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
import { Button, Modal } from "antd";
import { Table, Select } from "antd";
import { useParams } from "react-router-dom";
import { FaFilter } from "react-icons/fa";
import s from "../../css/ComplaintList.module.css"; // CSS module for ComplaintList
import c from "../../css/CrashList.module.css";
import "../../css/CustomModal.css";
import formstyle from "../../css/Profile.module.css";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Pagination } from "antd";

const GDTComplaintList = () => {
  const { GDTID } = useParams();
  const [motorcycles, setMotorcycles] = useState({});
  const [complaints, setComplaints] = useState([]);
  const [drivers, setDrivers] = useState({});
  const [selectedStatus, setSelectedStatus] = useState(""); // State for selected status
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const [searchDate, setSearchDate] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [isPopupVisibleStaff, setIsPopupVisibleStaff] = useState(false);
  const [gdtInfo, setGdtInfo] = useState({
    Fname: "",
    Lname: "",
    ID: "",
    GDTEmail: "",
    PhoneNumber: "",
  });

  //const employerUID = sessionStorage.getItem('employerUID');
  const gdtUID = sessionStorage.getItem("gdtUID");

  // State to track viewed complaints
  const [viewedComplaints, setViewedComplaints] = useState(() => {
    const storedViewedComplaints = sessionStorage.getItem("viewedComplaints");
    return storedViewedComplaints ? JSON.parse(storedViewedComplaints) : {};
  });

  useEffect(() => {
    const fetchDriversAndComplaints = async () => {
      if (!gdtUID) return;

      //const employerDoc = await getDoc(doc(db, 'Employer', employerUID));
      const GdtDoc = await getDoc(doc(db, "GDT", gdtUID));
      if (!GdtDoc.exists()) {
        console.error("No such gdt!");
        return;
      }

      //const companyName = employerDoc.data().CompanyName;

      // Fetch all drivers
      const driverCollection = query(collection(db, "Driver"));

      const unsubscribeDrivers = onSnapshot(driverCollection, (snapshot) => {
        const driverIds = [];
        const driverMap = {};
        const companyPromises = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.DriverID) {
            driverMap[data.DriverID] = {
              name: `${data.Fname} ${data.Lname}`,
              companyName: data.CompanyName,
              shortCompanyName: "", // Placeholder for ShortCompanyName
            };
          }

          driverIds.push(data.DriverID);
          companyPromises.push(
            fetchCompany(data.CompanyName).then((shortName) => {
              driverMap[data.DriverID].shortCompanyName = shortName;
            })
          );
        });

        setDrivers(driverMap); // Update state with driver names
        fetchComplaints(driverIds);
      });

      return () => unsubscribeDrivers();
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

    const fetchComplaints = (driverIds) => {
      if (driverIds.length === 0) return;

      const complaintCollection = query(collection(db, "Complaint"));

      const unsubscribeComplaints = onSnapshot(
        complaintCollection,
        (snapshot) => {
          const complaintList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setComplaints(complaintList);
          fetchMotorcycles(complaintList);
        }
      );

      return () => unsubscribeComplaints();
    };

    const fetchMotorcycles = (complaintList) => {
      const violationIDs = complaintList.map(
        (complaint) => complaint.ViolationID
      ); // Use ViolationID for fetching
      if (violationIDs.length === 0) return;

      const motorcycleCollection = query(
        collection(db, "History"),
        where("ID", "in", violationIDs) // Match ID from History with ViolationID
      );

      const unsubscribeMotorcycles = onSnapshot(
        motorcycleCollection,
        (snapshot) => {
          const motorcycleMap = {};
          snapshot.forEach((doc) => {
            const data = doc.data();
            motorcycleMap[data.ID] = data.LicensePlate; // Map ID to LicensePlate
          });
          setMotorcycles(motorcycleMap);
        }
      );

      return () => unsubscribeMotorcycles();
    };

    fetchDriversAndComplaints();
  }, [gdtUID]);

  const fetchGDTName = async (GDTID) => {
    try {
      const gdtQuery = query(collection(db, "GDT"), where("ID", "==", GDTID));
      const snapshot = await getDocs(gdtQuery);
      if (!snapshot.empty) {
        const gdtData = snapshot.docs[0].data();
        return {
          Fname: gdtData.Fname || "",
          Lname: gdtData.Lname || "",
          ID: gdtData.ID || "",
          GDTEmail: gdtData.GDTEmail || "",
          PhoneNumber: gdtData.PhoneNumber || "",
          // Add other fields as needed
        };
      }
      return {
        Fname: "Unknown",
        Lname: "",
        ID: "",
        GDTEmail: "",
        PhoneNumber: "",
      };
    } catch (error) {
      console.error("Error fetching GDT data:", error);
      return {
        Fname: "Error",
        Lname: "",
        ID: "",
        GDTEmail: "",
        PhoneNumber: "",
      };
    }
  };

  useEffect(() => {
    const getName = async () => {
      if (GDTID) {
        const info = await fetchGDTName(GDTID);
        setGdtInfo(info);
      }
    };
    getName();
  }, [GDTID]);

  const handleViewDetails = (record) => {
    const updatedViewedComplaints = { ...viewedComplaints, [record.id]: true };
    setViewedComplaints(updatedViewedComplaints);
    sessionStorage.setItem(
      "viewedComplaints",
      JSON.stringify(updatedViewedComplaints)
    );

    navigate(`/gdtcomplaints/general/${record.id}`);
  };

  const GDTResponse = (RespondedBy, setResponseByName) => {
    try {
      // Reference to GDT collection with filtering
      const gdtQuery = query(
        collection(db, "GDT"),
        where("ID", "==", RespondedBy)
      );

      // Set up a real-time listener
      const unsubscribe = onSnapshot(gdtQuery, (snapshot) => {
        if (!snapshot.empty) {
          const gdtData = snapshot.docs[0].data();
          setResponseByName(`${gdtData.Fname} ${gdtData.Lname}`);
        } else {
          console.error("No GDT document found with ID:", RespondedBy);
          setResponseByName("Unknown");
        }
      });

      // Cleanup function to remove listener when component unmounts
      return unsubscribe;
    } catch (error) {
      console.error("Error fetching GDT details:", error);
      setResponseByName("Error");
    }
  };

  const ResponseBy = ({ respondedBy }) => {
    const [responseByName, setResponseByName] = useState("");

    useEffect(() => {
      if (respondedBy) {
        const unsubscribe = GDTResponse(respondedBy, setResponseByName);
        return () => unsubscribe && unsubscribe(); // Cleanup listener on unmount
      }
    }, [respondedBy]);

    return <span>{responseByName}</span>;
  };

  const filteredComplaints = complaints
  .sort((a, b) => (b.DateTime?.seconds || 0) - (a.DateTime?.seconds || 0)) // Sort by DateTime in descending order
  .filter((complaint) => {
    const complaintDate = complaint.DateTime
      ? new Date(complaint.DateTime.seconds * 1000)
          .toISOString()
          .split("T")[0]
      : "";

    const matchesStatus = selectedStatus
      ? complaint.Status === selectedStatus
      : true;

    const driverId = complaint.driverID;
    const licensePlate = motorcycles[complaint.ViolationID] || " ";

    const matchesSearchQuery =
      driverId.includes(searchQuery) ||
      licensePlate.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = searchDate ? complaintDate === searchDate : true;

    const matchesGDT = GDTID ? complaint.RespondedBy === GDTID : true;

    return matchesStatus && matchesDate && matchesSearchQuery && matchesGDT;
  });

  const columns = [
    {
      title: "Complaint ID",
      dataIndex: "ComplaintID",
      key: "id",
      align: "center",
    },
    {
      title: "Driver Name",
      key: "driverName",
      align: "center",
      render: (text, record) => {
        const driverName = drivers[record.driverID]?.name || "   ";
        const capitalizeddriverName =
          driverName.charAt(0).toUpperCase() + driverName.slice(1);
        return capitalizeddriverName;
      },
    },
    {
      title: "Company Name",
      key: "CompanyName",
      align: "center",

      render: (text, record) => {
        const companyName = drivers[record.driverID]?.shortCompanyName || "   ";
        const capitalizedCompanyName =
          companyName.charAt(0).toUpperCase() + companyName.slice(1);
        return capitalizedCompanyName;
      },
    },
    {
      title: "Motorcycle License Plate",
      key: "motorcyclePlate",
      align: "center",
      render: (text, record) => motorcycles[record.ViolationID] || "   ",
    },
    {
      title: "Status",
      key: "Status",
      align: "center",
      render: (text, record) => {
        const formattedStatus =
          record.Status.charAt(0).toUpperCase() +
          record.Status.slice(1).toLowerCase();
        const color =
          formattedStatus === "Pending"
            ? "orange"
            : formattedStatus === "Accepted"
            ? "green"
            : "red";
        return <span style={{ color }}>{formattedStatus}</span>;
      },
    },
    {
      title: "Response By",
      key: "Responsed",
      align: "center",
      render: (text, record) => {
        const formattedStatus =
          record.Status.charAt(0).toUpperCase() +
          record.Status.slice(1).toLowerCase();

        if (record.RespondedBy) {
          // Render the RespondedBy value with an underline
          return <ResponseBy respondedBy={record.RespondedBy} />;
        } else if (!record.RespondedBy) {
          return (
            <p
              style={{
                backgroundColor: "transparent",
                color: "red",
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "default",
              }}
            >
              Need for Response
            </p>
          );
        } else {
          return null;
        }

        //return <span style={{ color }}>{formattedStatus}</span>;
      },
    },
    {
      title: "Date",
      key: "date",
      align: "center",
      render: (text, record) =>
        record.DateTime
          ? new Date(record.DateTime.seconds * 1000).toLocaleDateString()
          : "",
    },
    {
      title: "Complaint Details",
      key: "Details",
      align: "center",
      render: (text, record) => (
        <Link
          to={`/gdtcomplaints/general/${record.id}`}
          onClick={() => handleViewDetails(record)}
        >
          <img style={{ cursor: "pointer" }} src={EyeIcon} alt="Details" />
        </Link>
      ),
    },
  ];

  const handleShowPopupStaff = () => {
    setIsPopupVisibleStaff(true);
  };

  const handleClosePopupStaff = () => {
    setIsPopupVisibleStaff(false);
  };

  const goBack = () => {
    navigate(-1);
  };

  return (
    <>
      <Header active="gdtcomplaints" />
      <div className="breadcrumb">
      {GDTID ? (
          <a onClick={() => navigate("/GDTDashBoard")}>Dash Board</a>
        ) : (
          <a onClick={() => navigate("/gdthome")}>Home</a>
        )}
        <span> / </span>
        <a onClick={() => navigate("/GDTComplaintList")}>Complaints List</a>
      </div>
      <main>
        <div className={s.container}>
          <div className={s.searchHeader}>
            <div>
              <h2 className={s.title}>
                Complaints List{" "}
                {GDTID && (
                  <>
                    Responded by{" "}
                    <span
                      className={s.gdtName}
                      style={{ textDecoration: "underline", cursor: "pointer" }}
                      onClick={handleShowPopupStaff}
                    >
                      {gdtInfo.Fname} {gdtInfo.Lname}
                    </span>
                  </>
                )}
              </h2>
            </div>
            <div className={s.searchInputs}>
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
                  placeholder="Search by Driver ID or License Plate"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "235px", height: "20px" }}
                />
              </div>

              {!GDTID && (
                <div className={s.searchContainer}>
                  <div className={s.selectWrapper}>
                    <FaFilter className={s.filterIcon} />
                    <select
                      className={s.customSelect}
                      onChange={(event) =>
                        setSelectedStatus(event.target.value)
                      }
                      defaultValue=""
                      style={{
                        width: "280px",
                        height: "35px", // Widen the select bar
                        padding: "8px", // Add padding
                        fontSize: "14px", // Adjust font size
                        color: "grey",
                      }}
                    >
                      <option value="" disabled>
                        Filter by Status
                      </option>
                      <option value="">All</option>
                      <option value="Pending">Pending</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              )}
              {/* <div className={s.searchContainer}>
                <input
                  type="date"
                  value={searchDate}
                  className={s.dateInput}
                  onChange={(e) => setSearchDate(e.target.value)}
                  style={{ width: "120px", backgroundColor: "transparent" }}
                />
              </div> */}
              <div
                className={c.searchContainerdate}
                style={{ position: "relative" }}
              >
                <div>
                  {/* Conditional rendering for the green circle with tick */}
                  {searchDate && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-1px", // Adjust to position it higher
                        right: "-1px", // Adjust to position it to the right
                        width: "16px", // Smaller size for better fit
                        height: "16px", // Smaller size for better fit
                        borderRadius: "50%",
                        backgroundColor: "#059855",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "white",
                        fontSize: "12px", // Slightly smaller font size
                        zIndex: 1, // Ensure it appears in front
                      }}
                    >
                      ✓
                    </div>
                  )}

                  {/* Your SVG Icon */}
                  <svg
                    onClick={() =>
                      document.getElementById("date-input").focus()
                    }
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

          {/*//////////////// POP-UP  ////////////////*/}
          <Modal
            visible={isPopupVisibleStaff}
            onCancel={handleClosePopupStaff}
            footer={null}
            width={700}
          >
            <main className={formstyle.GDTcontainer}>
              <div>
                <h4 className={formstyle.GDTLabel}>Staff Information</h4>

                <div id="Staff name">
                  <h3
                    style={{
                      color: "#059855",
                      fontWeight: "bold",
                      fontSize: "20px",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      color="#059855"
                      fill="none"
                      width="35"
                      height="35"
                      style={{ marginBottom: "-5px", marginRight: "10px" }}
                    >
                      <path
                        d="M14 3.5H10C6.22876 3.5 4.34315 3.5 3.17157 4.67157C2 5.84315 2 7.72876 2 11.5V12.5C2 16.2712 2 18.1569 3.17157 19.3284C4.34315 20.5 6.22876 20.5 10 20.5H14C17.7712 20.5 19.6569 20.5 20.8284 19.3284C22 18.1569 22 16.2712 22 12.5V11.5C22 7.72876 22 5.84315 20.8284 4.67157C19.6569 3.5 17.7712 3.5 14 3.5Z"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M5 16C6.03569 13.4189 9.89616 13.2491 11 16"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                      <path
                        d="M9.75 9.75C9.75 10.7165 8.9665 11.5 8 11.5C7.0335 11.5 6.25 10.7165 6.25 9.75C6.25 8.7835 7.0335 8 8 8C8.9665 8 9.75 8.7835 9.75 9.75Z"
                        stroke="currentColor"
                        stroke-width="1.5"
                      />
                      <path
                        d="M14 8.5H19M14 12H19M14 15.5H16.5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    Staff ID (National Number)
                  </h3>
                  <p
                    style={{
                      fontSize: "18px",
                      marginLeft: "45px",
                      marginBottom: "20px",
                    }}
                  >
                    {gdtInfo.ID}
                  </p>

                  <h3
                    style={{
                      color: "#059855",
                      fontWeight: "bold",
                      fontSize: "20px",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      color="#059855"
                      fill="none"
                      width="35"
                      height="35"
                      style={{ marginBottom: "-5px", marginRight: "10px" }}
                    >
                      <path
                        d="M14 3.5H10C6.22876 3.5 4.34315 3.5 3.17157 4.67157C2 5.84315 2 7.72876 2 11.5V12.5C2 16.2712 2 18.1569 3.17157 19.3284C4.34315 20.5 6.22876 20.5 10 20.5H14C17.7712 20.5 19.6569 20.5 20.8284 19.3284C22 18.1569 22 16.2712 22 12.5V11.5C22 7.72876 22 5.84315 20.8284 4.67157C19.6569 3.5 17.7712 3.5 14 3.5Z"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M5 16C6.03569 13.4189 9.89616 13.2491 11 16"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                      <path
                        d="M9.75 9.75C9.75 10.7165 8.9665 11.5 8 11.5C7.0335 11.5 6.25 10.7165 6.25 9.75C6.25 8.7835 7.0335 8 8 8C8.9665 8 9.75 8.7835 9.75 9.75Z"
                        stroke="currentColor"
                        stroke-width="1.5"
                      />
                      <path
                        d="M14 8.5H19M14 12H19M14 15.5H16.5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    Staff Name
                  </h3>
                  <p
                    style={{
                      fontSize: "18px",
                      marginLeft: "45px",
                      marginBottom: "20px",
                    }}
                  >
                    {gdtInfo.Fname} {gdtInfo.Lname}
                  </p>

                  <h3
                    style={{
                      color: "#059855",
                      fontWeight: "bold",
                      fontSize: "20px",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="35"
                      height="35"
                      style={{ marginBottom: "-5px", marginRight: "10px" }}
                      color="#059855"
                      fill="none"
                    >
                      <path
                        d="M9.1585 5.71223L8.75584 4.80625C8.49256 4.21388 8.36092 3.91768 8.16405 3.69101C7.91732 3.40694 7.59571 3.19794 7.23592 3.08785C6.94883 3 6.6247 3 5.97645 3C5.02815 3 4.554 3 4.15597 3.18229C3.68711 3.39702 3.26368 3.86328 3.09497 4.3506C2.95175 4.76429 2.99278 5.18943 3.07482 6.0397C3.94815 15.0902 8.91006 20.0521 17.9605 20.9254C18.8108 21.0075 19.236 21.0485 19.6496 20.9053C20.137 20.7366 20.6032 20.3131 20.818 19.8443C21.0002 19.4462 21.0002 18.9721 21.0002 18.0238C21.0002 17.3755 21.0002 17.0514 20.9124 16.7643C20.8023 16.4045 20.5933 16.0829 20.3092 15.8362C20.0826 15.6393 19.7864 15.5077 19.194 15.2444L18.288 14.8417C17.6465 14.5566 17.3257 14.4141 16.9998 14.3831C16.6878 14.3534 16.3733 14.3972 16.0813 14.5109C15.7762 14.6297 15.5066 14.8544 14.9672 15.3038C14.4304 15.7512 14.162 15.9749 13.834 16.0947C13.5432 16.2009 13.1588 16.2403 12.8526 16.1951C12.5071 16.1442 12.2426 16.0029 11.7135 15.7201C10.0675 14.8405 9.15977 13.9328 8.28011 12.2867C7.99738 11.7577 7.85602 11.4931 7.80511 11.1477C7.75998 10.8414 7.79932 10.457 7.90554 10.1663C8.02536 9.83828 8.24905 9.56986 8.69643 9.033C9.14586 8.49368 9.37058 8.22402 9.48939 7.91891C9.60309 7.62694 9.64686 7.3124 9.61719 7.00048C9.58618 6.67452 9.44362 6.35376 9.1585 5.71223Z"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                    </svg>
                    Staff Phone Numbr
                  </h3>
                  <p
                    style={{
                      fontSize: "18px",
                      marginLeft: "45px",
                      marginBottom: "20px",
                    }}
                  >
                    {gdtInfo.PhoneNumber}
                  </p>

                  <h3
                    style={{
                      color: "#059855",
                      fontWeight: "bold",
                      fontSize: "20px",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="35"
                      height="35"
                      style={{ marginBottom: "-5px", marginRight: "10px" }}
                      color="#059855"
                      fill="none"
                    >
                      <path
                        d="M2 5L8.91302 8.92462C11.4387 10.3585 12.5613 10.3585 15.087 8.92462L22 5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M10.5 19.5C10.0337 19.4939 9.56682 19.485 9.09883 19.4732C5.95033 19.3941 4.37608 19.3545 3.24496 18.2184C2.11383 17.0823 2.08114 15.5487 2.01577 12.4814C1.99475 11.4951 1.99474 10.5147 2.01576 9.52843C2.08114 6.46113 2.11382 4.92748 3.24495 3.79139C4.37608 2.6553 5.95033 2.61573 9.09882 2.53658C11.0393 2.4878 12.9607 2.48781 14.9012 2.53659C18.0497 2.61574 19.6239 2.65532 20.755 3.79141C21.8862 4.92749 21.9189 6.46114 21.9842 9.52844C21.9939 9.98251 21.9991 10.1965 21.9999 10.5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M19 17C19 17.8284 18.3284 18.5 17.5 18.5C16.6716 18.5 16 17.8284 16 17C16 16.1716 16.6716 15.5 17.5 15.5C18.3284 15.5 19 16.1716 19 17ZM19 17V17.5C19 18.3284 19.6716 19 20.5 19C21.3284 19 22 18.3284 22 17.5V17C22 14.5147 19.9853 12.5 17.5 12.5C15.0147 12.5 13 14.5147 13 17C13 19.4853 15.0147 21.5 17.5 21.5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    Staff Email
                  </h3>
                  <p style={{ fontSize: "18px", marginLeft: "45px" }}>
                    <a
                      href={`mailto:${gdtInfo?.GDTEmail}`}
                      style={{ color: "#444", textDecoration: "underline" }}
                    >
                      {gdtInfo.GDTEmail}
                    </a>
                  </p>
                </div>
              </div>
            </main>
          </Modal>
          {/*///////////////////////////////END POP-UP/////////////////////////////////////////// */}

          <Table
            columns={columns}
            dataSource={filteredComplaints}
            rowKey="id"
            pagination={GDTID? false: {pageSize: 5}}
            onRow={(record) => ({
              style: {
                backgroundColor:
                  !viewedComplaints[record.id] && !record.RespondedBy
                    ? "#d0e0d0"
                    : "transparent",
              },
            })}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
            }}
          >
            {GDTID && (
              <Button
                onClick={goBack}
                style={{
                  width: "auto",
                  height: "60px",
                  fontSize: "15px",
                  color: "#059855",
                  borderColor: "#059855",
                }}
              >
                <ArrowLeftOutlined style={{ marginRight: "8px" }} />
                Go Back
              </Button>
            )}

            {GDTID && (
             <Pagination
             defaultCurrent={1}
             total={filteredComplaints.length}
             pageSize={5}
             style={{ marginLeft: "auto" }}
           /> 
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default GDTComplaintList;
