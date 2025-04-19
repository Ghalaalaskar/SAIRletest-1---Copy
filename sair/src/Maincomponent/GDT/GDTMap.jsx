import React, { useEffect, useState, useCallback } from 'react';
import {
  GoogleMap,
  InfoWindowF,
  MarkerF,
  HeatmapLayerF,
} from '@react-google-maps/api';
import motorcycle from '../../images/motorcycle.png';
import '../../css/CustomModal.css';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { SearchOutlined } from '@ant-design/icons';
import { FaFilter } from 'react-icons/fa';
import q from '../../css/Violations.module.css';

import s from '../../css/ComplaintList.module.css'; // CSS module for ComplaintList

const containerStyle = {
  width: '74%', // Set the map width
  height: '590px', // Set the map height
  margin: 'auto', // Center the map
  marginRight: '8px',
  marginLeft: '8px',
};

// Fix: Move static data outside component to prevent re-creation on each render
const staticMotorcycleData = [
  {
    MotorcycleID: '5000000001',
    gpsNumber: '123456789012345',
    lat: 24.7137,
    lng: 46.6753,
    driverName: 'Mohammed Al-Farsi',
    driverID: '4455500001',
    phoneNumber: '+966512345678',
    shortCompanyName: 'Jahez',
    Type: 'T4A',
    LicensePlate: 'XYZ 123',
    status: 'Active',
  },
  {
    MotorcycleID: '5000000002',
    gpsNumber: '123456789012346',
    lat: 24.7137,
    lng: 46.6753,
    driverName: 'Ali Al-Mansour',
    driverID: '6664446892',
    phoneNumber: '+966512345679',
    shortCompanyName: 'Hungerstation',
    Type: 'A3',
    LicensePlate: 'XYZ 124',
    status: 'Inactive',
  },
  {
    MotorcycleID: '5000000003',
    gpsNumber: '123456789012347',
    lat: 24.7137,
    lng: 46.6753,
    driverName: 'Omar Al-Salem',
    driverID: '12358790983',
    phoneNumber: '+966512345680',
    shortCompanyName: 'Jahez',
    Type: 'VX',
    LicensePlate: 'XYZ 125',
    status: 'Active',
  },
  {
    MotorcycleID: '5000000004',
    gpsNumber: '123456789012348',
    lat: 24.7137,
    lng: 46.6753,
    driverName: 'Yusuf Al-Jabir',
    driverID: '9865743564',
    phoneNumber: '+966512345681',
    shortCompanyName: 'Hungerstation',
    Type: '6XX',
    LicensePlate: 'XYZ 126',
    status: 'Inactive',
  },
  {
    MotorcycleID: '5000000005',
    gpsNumber: '123456789012349',
    lat: 24.715,
    lng: 46.6758,
    driverName: 'Sami Al-Dossary',
    driverID: '19354675895',
    phoneNumber: '+966512345682',
    shortCompanyName: 'Jahez',
    Type: 'TD',
    LicensePlate: 'XYZ 127',
    status: 'Active',
  },
  {
    MotorcycleID: '5000000006',
    gpsNumber: '123456789012350',
    lat: 24.7153,
    lng: 46.678,
    driverName: 'Fahad Al-Hamdan',
    driverID: '1357865476',
    phoneNumber: '+966512345683',
    shortCompanyName: 'Hungerstation',
    Type: 'E',
    LicensePlate: 'XYZ 128',
    status: 'Inactive',
  },
  {
    MotorcycleID: '5000000007',
    gpsNumber: '123456789012351',
    lat: 24.721,
    lng: 46.6765,
    driverName: 'Zaid Al-Fahad',
    driverID: '1265879886',
    phoneNumber: '+966512345684',
    shortCompanyName: 'Jahez',
    Type: 'CXC',
    LicensePlate: 'XYZ 129',
    status: 'Active',
  },
  {
    MotorcycleID: '5000000008',
    gpsNumber: '123456789012352',
    lat: 24.73,
    lng: 46.67,
    driverName: 'Nasser Al-Qassem',
    driverID: '3456008643',
    phoneNumber: '+966512345685',
    shortCompanyName: 'Hungerstation',
    Type: 'PO1',
    LicensePlate: 'XYZ 130',
    status: 'Inactive',
  },
  {
    MotorcycleID: '5000000009',
    gpsNumber: '123456789012353',
    lat: 24.734,
    lng: 46.89,
    driverName: 'Salman Al-Harbi',
    driverID: '8363939449',
    phoneNumber: '+966512345686',
    shortCompanyName: 'Jahez',
    Type: 'HW',
    LicensePlate: 'XYZ 131',
    status: 'Active',
  },
  {
    MotorcycleID: '5000000010',
    gpsNumber: '123456789012354',
    lat: 24.74,
    lng: 46.8,
    driverName: 'Khalid Al-Badri',
    driverID: '1136988810',
    phoneNumber: '+966512345687',
    shortCompanyName: 'Hungerstation',
    Type: 'T4',
    LicensePlate: 'XYZ 132',
    status: 'Inactive',
  },
  {
    MotorcycleID: '5000000011',
    gpsNumber: '123456789012355',
    lat: 24.75,
    lng: 46.6,
    driverName: 'Faisal Al-Amin',
    driverID: '4457355111',
    phoneNumber: '+966512345688',
    shortCompanyName: 'Jahez',
    Type: 'CXC',
    LicensePlate: 'XYZ 133',
    status: 'Active',
  },
];

const GDTMap = ({ locations }) => {
  const [gpsState, setGpsState] = useState({ active: [], inactive: [] });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [selectedValues, setSelectedValues] = useState([]);
  const [filters, setFilters] = useState({ company: [], status: [] });

  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 24.7136, lng: 46.6953 }); // Center of Riyadh

  const [zoomLevel, setZoomLevel] = useState(12); // Default zoom level
  const [driverDetails, setDriverDetails] = useState(null);
  const [motorcycleDetails, setMotorcycleDetails] = useState(null);
  const [shortCompanyName, setShortCompanyName] = useState('');
  const [expandedMotorcycleIds, setExpandedMotorcycleIds] = useState([]);
  const [motorcyclesData, setMotorcyclesData] = useState(staticMotorcycleData);

  const [searchQuery, setSearchQuery] = useState('');
  const [uniqueCompanyNames, setUniqueCompanyNames] = useState([]);

  const combinedOptions = [
    // Companies
    ...[...uniqueCompanyNames].sort().map((name) => ({
      value: name,
      label: name,
      category: 'Company',
    })),
    // Statuses
    { value: 'Active', label: 'Active', category: 'Status' },
    { value: 'Inactive', label: 'Inactive', category: 'Status' },
  ];

  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  // Function to fetch GPS state from the server
  const fetchGpsState = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/gps-state'); // need to change port after host the server!!     const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/gps-state`);   هنا بعد ما نرفع السيرفر نحط ال url

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      console.log('Response:', response); // Log the response object
      const data = await response.json();
      console.log('Fetched GPS State:', data);
      setGpsState(data);
    } catch (error) {
      console.error('Error fetching GPS state:', error);
    }
  };

  // Call fetchGpsState when the component mounts
  useEffect(() => {
    // Fetch immediately when component mounts
    fetchGpsState();

    // Then keep fetching every 10 seconds
    const interval = setInterval(() => {
      fetchGpsState();
    }, 15000); // 10 seconds

    // Cleanup the interval when component unmounts
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    window.gm_authFailure = function () {
      console.error('Google Maps API authentication failed.');
    };

    if (window.google && window.google.maps) {
      console.log('Google Maps API Loaded Successfully');
    }
  }, []);

  const fetchMotorcycleAndDriverData = useCallback(async () => {
    if (gpsState.active.length === 0 && gpsState.inactive.length === 0) {
      return; // Don't fetch if there's no GPS data
    }

    const gpsNumbers = [...gpsState.active, ...gpsState.inactive].map(
      (loc) => loc.gpsNumber
    );

    const motorcyclePromises = gpsNumbers.map((gpsNumber) => {
      const motorcycleQuery = query(
        collection(db, 'Motorcycle'),
        where('GPSnumber', '==', gpsNumber)
      );
      return getDocs(motorcycleQuery);
    });

    const driverPromises = gpsNumbers.map((gpsNumber) => {
      const driverQuery = query(
        collection(db, 'Driver'),
        where('GPSnumber', '==', gpsNumber)
      );
      return getDocs(driverQuery);
    });

    const employerPromises = gpsNumbers.map(async (gpsNumber) => {
      // Fetch the driver details first to get the CompanyName
      const driverQuery = query(
        collection(db, 'Driver'),
        where('GPSnumber', '==', gpsNumber)
      );
      const driverSnapshot = await getDocs(driverQuery);
      if (!driverSnapshot.empty) {
        const driverData = driverSnapshot.docs[0].data();
        const employerQuery = query(
          collection(db, 'Employer'),
          where('CompanyName', '==', driverData.CompanyName)
        );
        return getDocs(employerQuery);
      }
      return null; // If no driver found, return null
    });

    const motorcycleSnapshots = await Promise.all(motorcyclePromises);
    const driverSnapshots = await Promise.all(driverPromises);
    const employerSnapshots = await Promise.all(employerPromises);

    const motorcyclesWithDrivers = motorcycleSnapshots.map(
      (snapshot, index) => {
        const motorcycleData = snapshot.docs[0]?.data();
        const driverData = driverSnapshots[index].docs[0]?.data();
        const employerData = employerSnapshots[index]?.docs[0]?.data();

        return {
          motorcycleID: motorcycleData?.MotorcycleID || 'N/A',
          driverID: driverData?.DriverID || 'N/A',
          driverName: driverData
            ? `${driverData.Fname} ${driverData.Lname}`
            : 'Unknown',
          phoneNumber: driverData?.PhoneNumber || 'N/A',
          shortCompanyName: employerData?.ShortCompanyName || 'N/A', // Set ShortCompanyName from employer data
          gpsNumber: motorcycleData?.GPSnumber || 'N/A',
          type: motorcycleData?.Type || 'N/A',
          licensePlate: motorcycleData?.LicensePlate || 'N/A',
        };
      }
    );
    console.log('Motorcycles with Drivers:', motorcyclesWithDrivers); // Log the fetched data
    setMotorcyclesData([...staticMotorcycleData, ...motorcyclesWithDrivers]);
  }, [gpsState.active, gpsState.inactive]);

  useEffect(() => {
    if (gpsState.active.length > 0 || gpsState.inactive.length > 0) {
      fetchMotorcycleAndDriverData();
    }
  }, [gpsState.active, gpsState.inactive, fetchMotorcycleAndDriverData]);

  useEffect(() => {
    const fetchUniqueCompanyNames = () => {
      const companyNames = motorcyclesData.map((item) => item.shortCompanyName);
      const uniqueNames = [...new Set(companyNames)]; // Get unique names
      setUniqueCompanyNames(uniqueNames);
    };

    if (motorcyclesData.length > 0) {
      fetchUniqueCompanyNames();
    }
  }, [motorcyclesData]);

  const motorcycleIcon = {
    url: motorcycle, // Example default icon
    scaledSize: new window.google.maps.Size(50, 50), // Size of the icon
    origin: new window.google.maps.Point(0, 0), // Origin point of the icon
    anchor: new window.google.maps.Point(25, 50), // Anchor point of the icon
  };

  const handleMapLoad = (mapInstance) => {
    mapInstance.addListener('zoom_changed', () => {
      setZoomLevel(mapInstance.getZoom());
    });
  };

  const handleMarkerClick = async (gpsNumber, location) => {
    // setExpandedMotorcycleId(null); // Close dropdowns when a marker is clicked
    setZoomLevel(20); // Set zoom level to 150%
    const clickedMotorcycle = motorcyclesData.find(
      (item) => item.gpsNumber === gpsNumber
    );
    if (clickedMotorcycle) {
      // Handle static motorcycle
      setMotorcycleDetails({
        MotorcycleID: clickedMotorcycle.MotorcycleID || 'N/A',
        GPSnumber: clickedMotorcycle.gpsNumber || 'N/A',
        Type: clickedMotorcycle.Type || 'N/A',
        LicensePlate: clickedMotorcycle.LicensePlate || 'N/A',
      });

      setDriverDetails({
        DriverID: clickedMotorcycle.driverID || 'N/A',
        Fname: clickedMotorcycle.driverName.split(' ')[0], // Assuming first name is the first part
        Lname: clickedMotorcycle.driverName.split(' ')[1] || 'N/A', // Assuming last name is the second part
        PhoneNumber: clickedMotorcycle.phoneNumber || 'N/A',
        CompanyName: clickedMotorcycle.shortCompanyName || 'N/A',
      });

      setShortCompanyName(clickedMotorcycle.shortCompanyName || 'N/A');
      setSelectedLocation(location); // Set selected location for InfoWindow
    } else {
      // Handle dynamic motorcycle
      const driverQuery = query(
        collection(db, 'Driver'),
        where('GPSnumber', '==', gpsNumber)
      );

      const driverSnapshot = await getDocs(driverQuery);
      if (!driverSnapshot.empty) {
        const driverData = driverSnapshot.docs[0].data();
        setDriverDetails({
          DriverID: driverData.DriverID || 'N/A',
          Fname: driverData.Fname || 'N/A',
          Lname: driverData.Lname || 'N/A',
          PhoneNumber: driverData.PhoneNumber || 'N/A',
          CompanyName: driverData.CompanyName || 'N/A',
        });

        const employerQuery = query(
          collection(db, 'Employer'),
          where('CompanyName', '==', driverData.CompanyName)
        );

        const employerSnapshot = await getDocs(employerQuery);
        if (!employerSnapshot.empty) {
          const employerData = employerSnapshot.docs[0].data();
          setShortCompanyName(employerData.ShortCompanyName || 'N/A');
        } else {
          setShortCompanyName('N/A');
        }

        // Then fetch the motorcycle details dynamically
        const motorcycleQuery = query(
          collection(db, 'Motorcycle'),
          where('GPSnumber', '==', gpsNumber)
        );

        const motorcycleSnapshot = await getDocs(motorcycleQuery);
        if (!motorcycleSnapshot.empty) {
          const motorcycleData = motorcycleSnapshot.docs[0].data();
          setMotorcycleDetails({
            MotorcycleID: motorcycleData.MotorcycleID || 'N/A',
            GPSnumber: motorcycleData.GPSnumber || 'N/A',
            Type: motorcycleData.Type || 'N/A',
            LicensePlate: motorcycleData.LicensePlate || 'N/A',
          });
          setSelectedLocation(location); // Set the selected location
        } else {
          // Handle case where no motorcycle data is found
          setMotorcycleDetails({
            MotorcycleID: 'N/A',
            GPSnumber: 'N/A',
            Type: 'N/A',
            LicensePlate: 'N/A',
          });
        }
      } else {
        // Handle case when no driver is found
        setDriverDetails({
          DriverID: 'N/A',
          Fname: 'N/A',
          Lname: 'N/A',
          PhoneNumber: 'N/A',
          CompanyName: 'N/A',
        });

        setMotorcycleDetails({
          MotorcycleID: 'N/A',
          GPSnumber: 'N/A',
          Type: 'N/A',
          LicensePlate: 'N/A',
        });
      }
    }
  };

  const toggleExpand = (motorcycleID) => {
    setExpandedMotorcycleIds((prev) => {
      return prev.includes(motorcycleID)
        ? prev.filter((id) => id !== motorcycleID) // Collapse if already expanded
        : [...prev, motorcycleID]; // Expand this motorcycle
    });
  };

  const capitalizeName = (name) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const handleSelect = (value) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];

    setSelectedValues(newSelection);

    const newCompany = newSelection.filter((val) =>
      uniqueCompanyNames.includes(val)
    );
    const newStatus = newSelection.filter(
      (val) => val === 'Active' || val === 'Inactive'
    );

    setFilters({ company: newCompany, status: newStatus });
  };

  const filterMotorcycle = (motorcycle) => {
    const searchFilter =
      searchQuery === '' ||
      (motorcycle.driverName &&
        motorcycle.driverName
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      (motorcycle.driverID &&
        motorcycle.driverID.toLowerCase().includes(searchQuery.toLowerCase()));
    const companyFilter = filters.company.length
      ? filters.company.includes(motorcycle.shortCompanyName)
      : true;
    const statusFilter = filters.status.length
      ? filters.status.includes(motorcycle.status)
      : true;

    return searchFilter && companyFilter && statusFilter;
  };

  return (
    <div style={{ display: 'flex', height: '80vh' }}>
      <div
        style={{
          width: '400px',
          padding: '10px',
          borderRight: '1px solid #ccc',
          backgroundColor: '#f9f9f9',
          overflowY: 'auto',
          maxHeight: '590px',
        }}
      >
        <h4 style={{ color: 'green', fontSize: '25px', marginBottom: '10px' }}>
          Motorcycle List
        </h4>
        <div
          style={{
            flexDirection: 'column',
            marginBottom: '20px',
            alignItems: 'flex-start',
          }}
        >
          {/* Search Bar */}

          <div
            className={s.searchInputs}
            style={{ width: '100%', marginBottom: '10px' }}
          >
            <div
              className={s.searchContainer}
              style={{ display: 'flex', alignItems: 'center', width: '100%' }}
            >
              <SearchOutlined
                style={{
                  color: '#059855',
                  marginRight: '3px',
                  marginLeft: '-55px',
                }}
              />

              <input
                type='text'
                placeholder='Search by Driver ID or Driver Name'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '230px',

                  height: '20px', // Ensures consistent height

                  borderRadius: '20px', // Round corners

                  border: 'none', // Remove border

                  backgroundColor: 'transparent', // Transparent background

                  padding: '0 0 0 0px', // Left padding to give space for icon

                  boxSizing: 'border-box', // Include padding in width

                  outline: 'none', // Remove outline on focus
                }}
              />
            </div>
          </div>

          {/* Filter Dropdown */}

          <div className={q.searchContainer}>
            <div
              className={`${q.selectWrapper} ${q.dropdownContainer}`}
              style={{ width: '355px', marginLeft: '-11px' }}
            >
              <FaFilter
                className={q.filterIcon}
                style={{ marginLeft: '20px' }}
              />
              <div style={{ position: 'relative', width: '510px' }}>
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
                    fontSize: '14px',
                  }}
                >
                  {selectedValues.length > 0
                    ? selectedValues.join(', ')
                    : 'Filter map'}
                </div>

                {dropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      background: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      zIndex: 1000,
                      width: '350px',
                      left: '-40px',
                    }}
                  >
                    <div style={{ padding: '10px', fontWeight: 'bold' }}>
                      Company
                    </div>
                    {combinedOptions
                      .filter(
                        (combinedOptions) =>
                          combinedOptions.category === 'Company'
                      )
                      .map((combinedOptions) => (
                        <div
                          key={combinedOptions.value}
                          style={{ padding: '10px', cursor: 'pointer' }}
                        >
                          <label
                            style={{ display: 'flex', alignItems: 'center' }}
                          >
                            <input
                              type='checkbox'
                              checked={selectedValues.includes(
                                combinedOptions.value
                              )}
                              onChange={() =>
                                handleSelect(combinedOptions.value)
                              }
                              style={{ marginRight: '10px' }}
                            />
                            {combinedOptions.label}
                          </label>
                        </div>
                      ))}

                    <div style={{ padding: '10px', fontWeight: 'bold' }}>
                      Status
                    </div>
                    {combinedOptions
                      .filter(
                        (combinedOptions) =>
                          combinedOptions.category === 'Status'
                      )
                      .map((combinedOptions) => (
                        <div
                          key={combinedOptions.value}
                          style={{ padding: '10px', cursor: 'pointer' }}
                        >
                          <label
                            style={{ display: 'flex', alignItems: 'center' }}
                          >
                            <input
                              type='checkbox'
                              checked={selectedValues.includes(
                                combinedOptions.value
                              )}
                              onChange={() =>
                                handleSelect(combinedOptions.value)
                              }
                              style={{ marginRight: '10px' }}
                            />
                            {combinedOptions.label}
                          </label>
                        </div>
                      ))}

                    <div style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedValues([]);
                          setFilters({ company: [], status: [] });
                          toggleDropdown();
                        }}
                        style={{
                          backgroundColor: 'transparent',
                          color: 'blue',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '8px 0',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
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
        </div>

        <ul style={{ listStyleType: 'none', padding: '0' }}>
          {motorcyclesData
            .filter(filterMotorcycle)
            .sort((a, b) =>
              (a.driverName || '').localeCompare(b.driverName || '')
            )
            .map((item, index) => {
              const gpsStatus = gpsState.active.includes(item.gpsNumber) ? 'Active' : 'Inactive';
              const status = item.status || gpsStatus;
              // Determine which ID to use for expansion
              const motorcycleIDToUse = item.MotorcycleID || item.motorcycleID;
              return (
                <li
                  key={index}
                  style={{
                    position: 'relative',
                    marginBottom: '10px',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    backgroundColor: '#fff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#059855' }}>
                        Motorcycle ID:
                      </strong>{' '}
                      {motorcycleIDToUse} <br />
                      <strong style={{ color: '#059855' }}>
                        Driver Name:
                      </strong>{' '}
                      {capitalizeName(item.driverName)} <br />
                      <strong style={{ color: '#059855' }}>Status:</strong>{' '}
                      {status === 'Active' ? (
                          <span style={{ color: 'green' }}>{status}</span>
                        ) : (
                          <span style={{ color: 'red' }}>{status}</span>
                        )}
                    </div>
                    
                        
                      
                    <button
                      onClick={() => toggleExpand(motorcycleIDToUse)}
                      style={{
                        position: 'absolute',

                        top: '10px',

                        right: '0px',

                        background: 'none',

                        border: 'none',

                        cursor: 'pointer',

                        color: 'grey',

                        transition: 'color 0.3s',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = '#059855')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = 'grey')
                      }
                    >
                      {expandedMotorcycleIds.includes(motorcycleIDToUse) ? (
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                        >
                          <path
                            d='M6 16 L12 10 L18 16'
                            stroke='currentColor'
                            strokeWidth='2'
                            fill='none'
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                        >
                          <path
                            d='M6 8 L12 14 L18 8'
                            stroke='currentColor'
                            strokeWidth='2'
                            fill='none'
                          />
                        </svg>
                      )}
                    </button>
                  </div>

                  {expandedMotorcycleIds.includes(motorcycleIDToUse) && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#555',
                        marginTop: '5px',
                      }}
                    >
                      <p style={{ margin: '5px 0' }}>
                        <strong style={{ color: '#059855' }}>Driver ID:</strong>{' '}
                        {item.driverID}
                      </p>

                      <p style={{ margin: '5px 0' }}>
                        <strong style={{ color: '#059855' }}>Phone:</strong>{' '}
                        {item.phoneNumber}
                      </p>

                      <p style={{ margin: '5px 0' }}>
                        <strong style={{ color: '#059855' }}>Company:</strong>{' '}
                        {item.shortCompanyName}
                      </p>

                      <p style={{ margin: '5px 0' }}>
                        <strong style={{ color: '#059855' }}>
                          GPS Number:
                        </strong>{' '}
                        {item.gpsNumber}
                        {item.GPSnumber}
                      </p>

                      <p style={{ margin: '5px 0' }}>
                        <strong style={{ color: '#059855' }}>Type:</strong>{' '}
                        {item.type}
                        {item.Type}
                      </p>

                      <p style={{ margin: '5px 0' }}>
                        <strong style={{ color: '#059855' }}>
                          License Plate:
                        </strong>{' '}
                        {item.licensePlate}
                        {item.LicensePlate}
                      </p>


                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          marginTop: '5px',
                        }}
                      >
                        <button
                          onClick={() =>
                            navigate(`/gdtdriverdetails/${item.driverID}`)
                          }
                          style={{
                            backgroundColor: '#059855',
                            color: 'white',
                            border: 'none',
                            padding: '5px',
                            width: '120px',
                            cursor: 'pointer',
                            marginBottom: '5px',
                          }}
                        >
                          Full Information
                        </button>

                        <button
                          onClick={() => {
                            const clickedLocation = item;
                            if (clickedLocation) {
                              setMapCenter({
                                lat: clickedLocation.lat,
                                lng: clickedLocation.lng,
                              }); // Update map center
                              handleMarkerClick(
                                clickedLocation.gpsNumber,
                                clickedLocation
                              );
                            }
                          }}
                          style={{
                            backgroundColor: '#059855',
                            color: 'white',
                            border: 'none',
                            padding: '5px',
                            width: '120px',
                            cursor: 'pointer',
                          }}
                        >
                          Show on Map
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      </div>

      {/* The gps number in the location saved in array after that query the driver collection and motorcycle then display them in the list */}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={zoomLevel}
        onLoad={handleMapLoad}
        // options={{ styles: beigeMapStyle }}
        onClick={() => setSelectedLocation(null)}
        // onLoad={() => setIsMapLoaded(true)}
      >
        <HeatmapLayerF
          data={motorcyclesData.filter(filterMotorcycle).map((motor) => {
            return new window.google.maps.LatLng(motor.lat, motor.lng);
          })}
          options={{
            radius: 30,
            opacity: 0.7,
            gradient: [
              'rgba(0, 0, 255, 0)', // Transparent blue
              'rgba(0, 255, 255, 1)', // Cyan
              'rgba(0, 255, 0, 1)', // Green
              'rgba(255, 255, 0, 1)', // Yellow
              'rgba(255, 128, 0, 1)', // Orange
              'rgba(255, 0, 0, 1)', // Red
            ],
          }}
        />

        {/* Render markers for static motorcycles regardless of zoom level */}
        {zoomLevel >= 16 &&
          motorcyclesData.map((item, index) => (
            <MarkerF
              key={`static-${index}`}
              position={{ lat: item.lat, lng: item.lng }}
              icon={motorcycleIcon}
              onClick={() => handleMarkerClick(item.gpsNumber, item)} // Handle click for static motorcycle
            />
          ))}

        {selectedLocation && (
          <InfoWindowF
            position={{
              lat: selectedLocation.lat + 0.00005,
              lng: selectedLocation.lng,
            }}
            onCloseClick={() => {
              setSelectedLocation(null);
              setDriverDetails(null);
              setMotorcycleDetails(null);
              setShortCompanyName('');
            }}
            options={{ pixelOffset: new window.google.maps.Size(0, -40) }} // Adjust offset if needed
          >
            <div style={{ margin: 0, padding: '10px', lineHeight: '1.5' }}>
              <h4
                style={{
                  color: '#059855',
                  margin: '-13px -10px 0px',
                  padding: '-10px',
                }}
              >
                Driver Information
              </h4>
              <p style={{ margin: '0' }}>
                <strong style={{ color: '#059855' }}>Driver ID:</strong>{' '}
                {driverDetails?.DriverID || 'N/A'}
              </p>
              <p style={{ margin: '0' }}>
                <strong style={{ color: '#059855' }}>Name:</strong>{' '}
                {driverDetails
                  ? `${capitalizeFirstLetter(
                      driverDetails.Fname
                    )} ${capitalizeFirstLetter(driverDetails.Lname)}`
                  : 'N/A'}
              </p>
              <p style={{ margin: '0' }}>
                <strong style={{ color: '#059855' }}>Phone:</strong>{' '}
                {driverDetails?.PhoneNumber || 'N/A'}
              </p>
              <p style={{ marginBottom: '-10px' }}>
                <strong style={{ color: '#059855' }}>Company Name:</strong>{' '}
                {capitalizeFirstLetter(shortCompanyName) || 'Not available'}
              </p>
              <hr></hr>
              <h4 style={{ color: '#059855', margin: '-13px -10px 0px' }}>
                Motorcycle Information
              </h4>
              <p style={{ margin: '0' }}>
                <strong style={{ color: '#059855' }}>ID:</strong>{' '}
                {motorcycleDetails?.MotorcycleID || 'N/A'}
              </p>
              <p style={{ margin: '0' }}>
                <strong style={{ color: '#059855' }}>GPS Number:</strong>{' '}
                {motorcycleDetails?.GPSnumber || 'N/A'}
              </p>
              <p style={{ margin: '0' }}>
                <strong style={{ color: '#059855' }}>Type:</strong>{' '}
                {motorcycleDetails?.Type || 'N/A'}
              </p>
              <p style={{ margin: '0' }}>
                <strong style={{ color: '#059855' }}>License Plate:</strong>{' '}
                {motorcycleDetails?.LicensePlate || 'N/A'}
              </p>
              <button
                onClick={() =>
                  navigate(`/gdtdriverdetails/${driverDetails?.DriverID}`)
                }
                style={{
                  backgroundColor: '#059855',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  width: '120px',
                  marginLeft: '100px',
                  marginTop: '10px',
                  marginBottom: '-25px',
                }}
              >
                Full Information
              </button>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
};

export default GDTMap;
