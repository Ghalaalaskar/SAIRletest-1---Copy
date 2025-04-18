import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  doc,
  onSnapshot,
  deleteDoc,
  query,
  where,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import EyeIcon from "../../images/eye.png";
import successImage from "../../images/Sucess.png";
import errorImage from "../../images/Error.png";
import { SearchOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import { Button, Table, Modal, Pagination } from "antd";
import Header from "./GDTHeader";
import "../../css/CustomModal.css";
import s from "../../css/DriverList.module.css";
import { useNavigate } from "react-router-dom";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useParams } from "react-router-dom";
import formstyle from "../../css/Profile.module.css";

const DriverList = () => {
  const { type, company } = useParams();
  const [driverData, setDriverData] = useState([]);
  const [driverToRemove, setDriverToRemove] = useState(null);
  const [availableMotorcycles, setAvailableMotorcycles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [isSuccess, setIsSuccess] = useState(true);
  const navigate = useNavigate();
  const [companyMap, setCompanyMap] = useState({});
  const goBack = () => navigate(-1); // Go back to the previous page
  const GDTUID = sessionStorage.getItem("gdtUID");
  const capitalizeFirstLetter = (string) => {
    if (!string) return "";
    return string
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };
  const [isPopupVisibleCompany, setIsPopupVisibleCompany] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    Name: "",
    ShortName: "",
    CommercialNum: "",
    CompamyEmail: "",
    ComPhoneNumber: "",
  });

  const fetchCompanyMap = async () => {
    const companiesSnapshot = await getDocs(collection(db, "Employer"));
    const map = {};
    companiesSnapshot.forEach((doc) => {
      const data = doc.data();
      map[data.CompanyName] = data.ShortCompanyName || data.CompanyName;
    });
    setCompanyMap(map);
  };

  
  const fetchCompamny = async (company) => {
    try {
      const compayQuery = query(collection(db, "Employer"), where("CompanyName", "==", company));
      const snapshot = await getDocs(compayQuery);
      if (!snapshot.empty) {
        const companyData = snapshot.docs[0].data();
        return {
          Name: companyData.CompanyName  || "",
          ShortName: companyData.ShortCompanyName || "",
          CommercialNum: companyData.commercialNumber || "",
          CompanyEmail: companyData.CompanyEmail || "",
          PhoneNumber: companyData.PhoneNumber || "",
        };
      }
      return {
        Name: "",
        ShortName: "",
        CommercialNum: "",
        CompanyEmail: "",
        PhoneNumber: "",
      };
    } catch (error) {
      console.error("Error fetching GDT data:", error);
      return {
        Name: "",
        ShortName: "",
        CommercialNum: "",
        CompanyEmail: "",
        PhoneNumber: "",
      };
    }
  };

  
  useEffect(() => {
    const getComp = async () => {
      if (company) {
        const info = await fetchCompamny(company);
        setCompanyInfo(info);
      }
    };
    getComp();
  }, [company]);
    
  const handleShowPopupStaff = () => {
    setIsPopupVisibleCompany(true);
  };

  const handleClosePopupStaff = () => {
    setIsPopupVisibleCompany(false);
  };

  const fetchRecklessDrivers = async () => {
    try {
      // Step 1: Fetch drivers with count30
      const count30Query = query(
        collection(db, "Violation"),
        where("count30", ">=", 1)
      );

      const count30Snapshot = await getDocs(count30Query);
      console.log("Count30 Snapshot:", count30Snapshot.docs);

      const recklessDrivers = {};
      console.log("Processing Count30 Drivers:");

      count30Snapshot.docs.forEach((doc) => {
        const data = doc.data();
        console.log(`Count30 DriverID: ${data.driverID}`);
        if (data.driverID) {
          if (!recklessDrivers[data.driverID]) {
            recklessDrivers[data.driverID] = {
              id: doc.id,
              ...data,
            };
            console.log(`Added to Reckless Drivers: ${data.driverID}`);
          }
        }
      });

      // Step 2: Fetch drivers with count50
      const count50Query = query(
        collection(db, "Violation"),
        where("count50", ">=", 1)
      );

      const count50Snapshot = await getDocs(count50Query);
      console.log("Processing Count50 Drivers:");

      count50Snapshot.docs.forEach((doc) => {
        const data = doc.data();
        console.log(`Count50 DriverID: ${data.driverID}`);
        if (data.driverID) {
          if (!recklessDrivers[data.driverID]) {
            recklessDrivers[data.driverID] = {
              id: doc.id,
              ...data,
            };
            console.log(`Added to Reckless Drivers: ${data.driverID}`);
          } else {
            console.log(`Driver already exists: ${data.driverID}`);
            recklessDrivers[data.driverID].count50 = data.count50; // Combine counts
          }
        }
      });

      console.log("Reckless Drivers:", recklessDrivers);

      // Step 3: Fetch driver details from the Driver table
      const driverIDs = Object.keys(recklessDrivers);

      // Use Promise.all to fetch all driver details in parallel
      const driverDetailsPromises = driverIDs.map(async (id) => {
        const driverQuery = query(
          collection(db, "Driver"),
          where("DriverID", "==", id)
        );
        const driverSnapshot = await getDocs(driverQuery);
        if (!driverSnapshot.empty) {
          const driverData = driverSnapshot.docs[0].data();
          return {
            ...recklessDrivers[id],
            ...driverData, // Merge driver data
          };
        }
        return recklessDrivers[id]; // Return reckless driver if no match found
      });

      const detailedRecklessDrivers = await Promise.all(
        driverDetailsPromises
      );

      let filteredDrivers = detailedRecklessDrivers;

      // If type is passed, filter the reckless violations accordingly
      if (type === "30") {
        filteredDrivers = filteredDrivers.filter((driver) => driver.count30 >= 1);
      } else if (type === "50") {
        filteredDrivers = filteredDrivers.filter((driver) => driver.count50 >= 1);
      }

      setDriverData(filteredDrivers);
      console.log("Detailed Reckless Drivers:", detailedRecklessDrivers);
      setDriverData(detailedRecklessDrivers);
    } catch (error) {
      console.error("Error fetching reckless drivers:", error);
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetching reckless drivers data
        const count30Query = query(collection(db, "Violation"), where("count30", ">=", 1));
        const count30Snapshot = await getDocs(count30Query);
  
        const recklessDrivers = {};
        count30Snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.driverID) {
            recklessDrivers[data.driverID] = { id: doc.id, ...data };
          }
        });
  
        const count50Query = query(collection(db, "Violation"), where("count50", ">=", 1));
        const count50Snapshot = await getDocs(count50Query);
        
        count50Snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.driverID) {
            if (!recklessDrivers[data.driverID]) {
              recklessDrivers[data.driverID] = { id: doc.id, ...data };
            } else {
              recklessDrivers[data.driverID].count50 = data.count50;
            }
          }
        });
  
        const driverIDs = Object.keys(recklessDrivers);
        const driverDetailsPromises = driverIDs.map(async (id) => {
          const driverQuery = query(collection(db, "Driver"), where("DriverID", "==", id));
          const driverSnapshot = await getDocs(driverQuery);
          if (!driverSnapshot.empty) {
            const driverData = driverSnapshot.docs[0].data();
            return { ...recklessDrivers[id], ...driverData };
          }
          return recklessDrivers[id];
        });
  
        const detailedRecklessDrivers = await Promise.all(driverDetailsPromises);
        setDriverData(detailedRecklessDrivers);
        
        // Fetching motorcycles data
        const motorcycleQuery = query(collection(db, "Motorcycle"));
        const unsubscribeMotorcycles = onSnapshot(motorcycleQuery, (snapshot) => {
          const bikes = snapshot.docs.map((doc) => ({
            id: doc.id,
            GPSnumber: doc.data().GPSnumber,
          }));
          setAvailableMotorcycles(bikes);
        });
  
        return () => unsubscribeMotorcycles();
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
  
    fetchData();
    fetchCompanyMap();
  }, [GDTUID]);
  

  const columns = [
    {
      title: "Driver ID",
      dataIndex: "DriverID",
      key: "DriverID",
      align: "center",
    },
    {
      title: "Company Name",
      key: "CompanyName",
      align: "center",
      render: (_, record) => capitalizeFirstLetter(companyMap[record.CompanyName] || ""),
    },
    {
      title: "Driver Name",
      dataIndex: "DriverName",
      key: "DriverName",
      align: "center",
      render: (text, record) => (
        <span>{capitalizeFirstLetter(`${record.Fname} ${record.Lname}`)}</span>
      ),
    },
    {
      title: "Phone Number",
      dataIndex: "PhoneNumber",
      key: "PhoneNumber",
      align: "center",
    },
    {
      title: "Email",
      dataIndex: "Email",
      key: "Email",
      align: "center",
      render: (text) => (
        <a
          href={`mailto:${text}`}
          style={{
            color: "black",
            textDecoration: "underline",
            transition: "color 0.3s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "green")} // Change color on hover
          onMouseLeave={(e) => (e.currentTarget.style.color = "black")} // Revert color on mouse leave
        >
          {text}
        </a>
      ),
    },
    {
      title: "Violations Details",
      key: "Details",
      align: "center",
      render: (text, record) => (
        <img
          style={{ cursor: "pointer" }}
          src={EyeIcon}
          alt="Details"
          onClick={() => viewDriverDetails(record.DriverID)}
        />
      ),
    },
  ];

  const filteredData = driverData.filter((driver) => {
    // Company filter if a companyName is passed (navigate from dashboard)
    if (company && driver.CompanyName !== company) {
      return false;
    }
    const fullName = `${driver.Fname || ""} ${
      driver.Lname || ""
    }`.toLowerCase();
    const driverID = (driver.DriverID || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return driverID.includes(query) || fullName.includes(query);
  });

  useEffect(() => {
    const fetchRecklessDrivers = async () => {
      try {
        // Step 1: Fetch drivers with count30
        const count30Query = query(
          collection(db, "Violation"),
          where("count30", ">=", 1)
        );

        const count30Snapshot = await getDocs(count30Query);
        console.log("Count30 Snapshot:", count30Snapshot.docs);

        const recklessDrivers = {};
        console.log("Processing Count30 Drivers:");

        count30Snapshot.docs.forEach((doc) => {
          const data = doc.data();
          console.log(`Count30 DriverID: ${data.driverID}`);
          if (data.driverID) {
            if (!recklessDrivers[data.driverID]) {
              recklessDrivers[data.driverID] = {
                id: doc.id,
                ...data,
              };
              console.log(`Added to Reckless Drivers: ${data.driverID}`);
            }
          }
        });

        // Step 2: Fetch drivers with count50
        const count50Query = query(
          collection(db, "Violation"),
          where("count50", ">=", 1)
        );

        const count50Snapshot = await getDocs(count50Query);
        console.log("Processing Count50 Drivers:");

        count50Snapshot.docs.forEach((doc) => {
          const data = doc.data();
          console.log(`Count50 DriverID: ${data.driverID}`);
          if (data.driverID) {
            if (!recklessDrivers[data.driverID]) {
              recklessDrivers[data.driverID] = {
                id: doc.id,
                ...data,
              };
              console.log(`Added to Reckless Drivers: ${data.driverID}`);
            } else {
              console.log(`Driver already exists: ${data.driverID}`);
              recklessDrivers[data.driverID].count50 = data.count50; // Combine counts
            }
          }
        });

        console.log("Reckless Drivers:", recklessDrivers);

        // Step 3: Fetch driver details from the Driver table
        const driverIDs = Object.keys(recklessDrivers);

        // Use Promise.all to fetch all driver details in parallel
        const driverDetailsPromises = driverIDs.map(async (id) => {
          const driverQuery = query(
            collection(db, "Driver"),
            where("DriverID", "==", id)
          );
          const driverSnapshot = await getDocs(driverQuery);
          if (!driverSnapshot.empty) {
            const driverData = driverSnapshot.docs[0].data();
            return {
              ...recklessDrivers[id],
              ...driverData, // Merge driver data
            };
          }
          return recklessDrivers[id]; // Return reckless driver if no match found
        });

        const detailedRecklessDrivers = await Promise.all(
          driverDetailsPromises
        );

        console.log("Detailed Reckless Drivers:", detailedRecklessDrivers);
        setDriverData(detailedRecklessDrivers);
      } catch (error) {
        console.error("Error fetching reckless drivers:", error);
      }
    };
    const fetchMotorcycles = () => {
      const motorcycleQuery = query(collection(db, "Motorcycle"));
      const unsubscribe = onSnapshot(motorcycleQuery, (snapshot) => {
        const bikes = snapshot.docs.map((doc) => ({
          id: doc.id,
          GPSnumber: doc.data().GPSnumber,
        }));
        setAvailableMotorcycles(bikes);
      });
      return () => unsubscribe();
    };

    fetchRecklessDrivers();
    fetchMotorcycles();
  }, [GDTUID]);

  const viewDriverDetails = (driverID) => {
    console.log("Navigating to details for driver ID:", driverID);
    navigate(`/gdtviolationdriver/${driverID}`);
  };

  const handleLogout = () => {
    auth
      .signOut()
      .then(() => {
        navigate("/");
      })
      .catch((error) => {
        console.error("Error LOGGING out:", error);
      });
  };

  return (
    <div>
      <Header active="gdtdriverlist" />
      <div className="breadcrumb" style={{ marginRight: "100px" }}>
      {company ? (
          <a onClick={() => navigate("/GDTDashBoard")}>Dash Board</a>
        ) : (
          <a onClick={() => navigate("/gdthome")}>Home</a>
        )}
        <span> / </span>
      {!company && (
      <>
        <a onClick={() => navigate("/gdtviolations")}>Violation List</a>
        <span> / </span>
      </>
      )}
        <a>Reckless Drivers List</a>
      </div>
      <main>
        <div className={s.container}>
          <h2 className={s.title}>
                {company && (
                  <>
                    <span
                      className={s.gdtName}
                      style={{ textDecoration: "underline", cursor: "pointer" }}
                      onClick={handleShowPopupStaff}
                    >
                      {companyInfo.ShortName}
                    </span>
                    {" "}
                  </>
                )}
              Reckless Drivers List
              </h2>
          <div className={s.searchInputs}>
            <div className={s.searchContainer}>
              <SearchOutlined style={{ color: "#059855" }} />
              <input
                type="text"
                placeholder="Search by Driver ID or Driver Name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "300px" }}
              />
            </div>
          </div>
        </div>
        <br />

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={false} // Disable default pagination
          style={{ width: "1200px", margin: "0 auto", marginBottom: "20px" }}
        />

        {/* Flexbox container for button and pagination */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <Button
            onClick={goBack}
            style={{
              height: "60px",
              fontSize: "15px",
              color: "#059855",
              borderColor: "#059855",
            }}
          >
            <ArrowLeftOutlined style={{ marginRight: "8px" }} /> Go Back
          </Button>

          {/* Pagination component */}
          <Pagination
            defaultCurrent={1}
            total={filteredData.length}
            pageSize={5}
            showSizeChanger={false} // Optional: hide size changer if not needed
          />
        </div>

        {/* Notification Modal */}
        <Modal
          visible={isNotificationVisible}
          onCancel={() => setIsNotificationVisible(false)}
          footer={<p style={{ textAlign: "center" }}>{notificationMessage}</p>}
          style={{ top: "38%" }}
          className="custom-modal"
          closeIcon={<span className="custom-modal-close-icon">×</span>}
        >
          <div style={{ textAlign: "center" }}>
            <img
              src={isSuccess ? successImage : errorImage}
              alt={isSuccess ? "Success" : "Error"}
              style={{ width: "20%", marginBottom: "16px" }}
            />
          </div>
        </Modal>

        
          {/*//////////////// POP-UP  ////////////////*/}
          <Modal
            visible={isPopupVisibleCompany}
            onCancel={handleClosePopupStaff}
            footer={null}
            width={700}
            closeIcon={<span className="custom-modal-close-icon">×</span>}
          >
            <main className={formstyle.GDTcontainer}>
              <div>
                <h4 className={formstyle.GDTLabel}>Delivery Comany Information</h4>

                <div id="Company name">
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
                      d="M16 10L18.1494 10.6448C19.5226 11.0568 20.2092 11.2628 20.6046 11.7942C21 12.3256 21 13.0425 21 14.4761V22"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 9L11 9M8 13L11 13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 22V19C12 18.0572 12 17.5858 11.7071 17.2929C11.4142 17 10.9428 17 10 17H9C8.05719 17 7.58579 17 7.29289 17.2929C7 17.5858 7 18.0572 7 19V22"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 22L22 22"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M3 22V6.71724C3 4.20649 3 2.95111 3.79118 2.32824C4.58237 1.70537 5.74742 2.04355 8.07752 2.7199L13.0775 4.17122C14.4836 4.57937 15.1867 4.78344 15.5933 5.33965C16 5.89587 16 6.65344 16 8.16857V22"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                    Company Full Name
                  </h3>
                  <p
                    style={{
                      fontSize: "18px",
                      marginLeft: "45px",
                      marginBottom: "20px",
                    }}
                  >
                    {companyInfo.Name}
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
                      d="M16 10L18.1494 10.6448C19.5226 11.0568 20.2092 11.2628 20.6046 11.7942C21 12.3256 21 13.0425 21 14.4761V22"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 9L11 9M8 13L11 13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 22V19C12 18.0572 12 17.5858 11.7071 17.2929C11.4142 17 10.9428 17 10 17H9C8.05719 17 7.58579 17 7.29289 17.2929C7 17.5858 7 18.0572 7 19V22"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 22L22 22"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M3 22V6.71724C3 4.20649 3 2.95111 3.79118 2.32824C4.58237 1.70537 5.74742 2.04355 8.07752 2.7199L13.0775 4.17122C14.4836 4.57937 15.1867 4.78344 15.5933 5.33965C16 5.89587 16 6.65344 16 8.16857V22"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                    Company Short Name
                  </h3>
                  <p
                    style={{
                      fontSize: "18px",
                      marginLeft: "45px",
                      marginBottom: "20px",
                    }}
                  >
                    {companyInfo.ShortName}
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
                      d="M16 10L18.1494 10.6448C19.5226 11.0568 20.2092 11.2628 20.6046 11.7942C21 12.3256 21 13.0425 21 14.4761V22"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 9L11 9M8 13L11 13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 22V19C12 18.0572 12 17.5858 11.7071 17.2929C11.4142 17 10.9428 17 10 17H9C8.05719 17 7.58579 17 7.29289 17.2929C7 17.5858 7 18.0572 7 19V22"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 22L22 22"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M3 22V6.71724C3 4.20649 3 2.95111 3.79118 2.32824C4.58237 1.70537 5.74742 2.04355 8.07752 2.7199L13.0775 4.17122C14.4836 4.57937 15.1867 4.78344 15.5933 5.33965C16 5.89587 16 6.65344 16 8.16857V22"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                    Company Commercial Number
                  </h3>
                  <p
                    style={{
                      fontSize: "18px",
                      marginLeft: "45px",
                      marginBottom: "20px",
                    }}
                  >
                    {companyInfo.CommercialNum}
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
                    Company Email
                  </h3>
                  <p style={{ fontSize: "18px", marginLeft: "45px" }}>
                    <a
                      href={`mailto:${companyInfo?.CompamyEmail}`}
                      style={{ color: "#444", textDecoration: "underline" }}
                    >
                      {companyInfo.CompanyEmail}
                    </a>
                  </p>
                </div>
              </div>
            </main>
          </Modal>
          {/*///////////////////////////////END POP-UP/////////////////////////////////////////// */}
      </main>
    </div>
  );
};

export default DriverList;
