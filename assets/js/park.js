// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAzSsj0BPOTKTdST6Jy9AYoSnk6fd93gh8",
  authDomain: "parking-dcaee.firebaseapp.com",
  databaseURL: "https://parking-dcaee-default-rtdb.firebaseio.com",
  projectId: "parking-dcaee",
  storageBucket: "parking-dcaee.firebasestorage.app",
  messagingSenderId: "645875282372",
  appId: "1:645875282372:web:f1da4441c31dc93b8af491",
  measurementId: "G-BM36TME114",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Parking Configuration
let PARKING_CONFIG = {
  twoWheelerRate: 20, // ₹ per hour
  fourWheelerRate: 40, // ₹ per hour
};

// DOM Elements
const entryForm = document.getElementById("entry-form");
const exitForm = document.getElementById("exit-form");
const ticketPreview = document.getElementById("ticket-preview");
const exitReceipt = document.getElementById("exit-receipt");
const entrySubmitBtn = document.getElementById("entry-submit");
const exitSubmitBtn = document.getElementById("exit-submit");
const entryLoading = document.getElementById("entry-loading");
const exitLoading = document.getElementById("exit-loading");
const entryBtnText = document.getElementById("entry-btn-text");
const exitBtnText = document.getElementById("exit-btn-text");
const confirmResetBtn = document.getElementById("confirmReset");
const applyFiltersBtn = document.getElementById("applyFilters");
const exportCSVBtn = document.getElementById("exportCSV");
const exportPDFBtn = document.getElementById("exportPDF");
const exportRevenueReportBtn = document.getElementById("exportRevenueReport");
const historyTableBody = document.getElementById("historyTableBody");
const historyPagination = document.getElementById("historyPagination");
const printHistoryDetailsBtn = document.getElementById("printHistoryDetails");
const historyDetailContent = document.getElementById("historyDetailContent");
const addSlotForm = document.getElementById("add-slot-form");
const pricingForm = document.getElementById("pricing-form");
const slotManagementBody = document.getElementById("slot-management-body");

// Global variables
let currentHistoryPage = 1;
const HISTORY_PAGE_SIZE = 10;
let allHistoryData = [];
let filteredHistoryData = [];

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initializeData();
  setupEventListeners();
  setupRealtimeListeners();
  loadHistoryData();
  initializeCharts();
  loadConfiguration();
});

// Create initial parking slots
function createInitialSlots() {
  const slots = {};

  // Create 2-wheeler slots in numerical order
  for (let i = 1; i <= 10; i++) {
    const slotId = `2W-${i}`;
    slots[slotId] = {
      number: slotId,
      type: "2W",
      isOccupied: false,
      vehicleNumber: null,
      isActive: true,
      sortOrder: i, // Add a sort order property for proper ordering
    };
  }

  // Create 4-wheeler slots in numerical order
  for (let i = 1; i <= 5; i++) {
    const slotId = `4W-${i}`;
    slots[slotId] = {
      number: slotId,
      type: "4W",
      isOccupied: false,
      vehicleNumber: null,
      isActive: true,
      sortOrder: i, // Add a sort order property for proper ordering
    };
  }

  return slots;
}

// Initialize data if not exists
function initializeData() {
  database
    .ref("parkingData")
    .once("value")
    .then((snapshot) => {
      if (!snapshot.exists()) {
        const initialData = {
          vehicles: {},
          slots: createInitialSlots(),
          todayRevenue: 0,
          totalTransactions: 0,
          todayDate: new Date().toDateString(),
          config: PARKING_CONFIG,
        };

        database
          .ref("parkingData")
          .set(initialData)
          .then(() => {
            console.log("Initial data created");
            loadDashboardData();
          });
      } else {
        loadDashboardData();
      }
    })
    .catch((error) => {
      console.error("Error checking initial data:", error);
      alert("Error connecting to database. Please refresh the page.");
    });
}

// Load configuration
function loadConfiguration() {
  database
    .ref("parkingData/config")
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        PARKING_CONFIG = snapshot.val();
        document.getElementById("twoWheelerRate").value =
          PARKING_CONFIG.twoWheelerRate;
        document.getElementById("fourWheelerRate").value =
          PARKING_CONFIG.fourWheelerRate;
      }
    });
}

// Set up event listeners
function setupEventListeners() {
  // Entry form submission
  entryForm.addEventListener("submit", function (e) {
    e.preventDefault();
    processVehicleEntry();
  });

  // Exit form submission
  exitForm.addEventListener("submit", function (e) {
    e.preventDefault();
    processVehicleExit();
  });

  // Real-time form preview for entry
  document
    .getElementById("vehicleNumber")
    .addEventListener("input", updateTicketPreview);
  document
    .getElementById("vehicleType")
    .addEventListener("change", updateTicketPreview);
  document
    .getElementById("ownerName")
    .addEventListener("input", updateTicketPreview);
  document
    .getElementById("ownerContact")
    .addEventListener("input", updateTicketPreview);

  // Reset system button
  confirmResetBtn.addEventListener("click", resetSystem);

  // History filters
  applyFiltersBtn.addEventListener("click", applyHistoryFilters);

  // Export buttons
  exportCSVBtn.addEventListener("click", exportHistoryCSV);
  exportPDFBtn.addEventListener("click", exportHistoryPDF);
  exportRevenueReportBtn.addEventListener("click", exportRevenueReport);

  // Print history details
  printHistoryDetailsBtn.addEventListener("click", printHistoryDetail);

  // Add slot form
  addSlotForm.addEventListener("submit", function (e) {
    e.preventDefault();
    addNewSlots();
  });

  // Pricing form
  pricingForm.addEventListener("submit", function (e) {
    e.preventDefault();
    savePricingConfiguration();
  });
}

// Setup real-time listeners for dashboard updates
function setupRealtimeListeners() {
  // Listen for parking data changes
  database.ref("parkingData").on("value", (snapshot) => {
    const data = snapshot.val();
    if (data) {
      updateDashboardUI(data);
      updateSlotManagementTable(data.slots);
      updateConfigurationStats(data.slots);
    }
  });

  // Listen for transaction history changes
  database.ref("transactions").on("value", (snapshot) => {
    loadHistoryData();
    initializeCharts();
  });
}

// Update dashboard UI with real-time data
function updateDashboardUI(parkingData) {
  // Check if it's a new day and reset revenue if needed
  const today = new Date().toDateString();
  if (parkingData.todayDate !== today) {
    database.ref("parkingData/todayRevenue").set(0);
    database.ref("parkingData/todayDate").set(today);
    parkingData.todayRevenue = 0;
  }

  // Calculate stats
  const vehicles = parkingData.vehicles
    ? Object.values(parkingData.vehicles)
    : [];
  const currentlyParked = vehicles.filter((v) => !v.exitTime).length;
  const slots = parkingData.slots ? Object.values(parkingData.slots) : [];
  const availableSlots = slots.filter(
    (s) => !s.isOccupied && s.isActive
  ).length;

  // Calculate two-wheeler availability
  const twoWheelerSlots = slots.filter((s) => s.type === "2W" && s.isActive);
  const twoWheelerAvailable = twoWheelerSlots.filter(
    (s) => !s.isOccupied
  ).length;
  const twoWheelerAvailability =
    twoWheelerSlots.length > 0
      ? (twoWheelerAvailable / twoWheelerSlots.length) * 100
      : 0;

  // Calculate four-wheeler availability
  const fourWheelerSlots = slots.filter((s) => s.type === "4W" && s.isActive);
  const fourWheelerAvailable = fourWheelerSlots.filter(
    (s) => !s.isOccupied
  ).length;
  const fourWheelerAvailability =
    fourWheelerSlots.length > 0
      ? (fourWheelerAvailable / fourWheelerSlots.length) * 100
      : 0;

  // Calculate average parking time
  const completedParkings = vehicles.filter((v) => v.exitTime);
  let avgParkingTime = 0;
  if (completedParkings.length > 0) {
    const totalHours = completedParkings.reduce((sum, vehicle) => {
      return sum + (vehicle.duration || 0);
    }, 0);
    avgParkingTime = (totalHours / completedParkings.length).toFixed(1);
  }

  // Update dashboard stats
  document.getElementById("total-vehicles").textContent = currentlyParked;
  document.getElementById("available-slots").textContent = availableSlots;
  document.getElementById("today-revenue").textContent =
    parkingData.todayRevenue || 0;
  document.getElementById("avg-time").textContent = avgParkingTime
    ? `${avgParkingTime}h`
    : "0h";

  // Update progress bars
  const twoWProgress = document.getElementById("twoW-progress");
  const fourWProgress = document.getElementById("fourW-progress");

  twoWProgress.style.width = `${twoWheelerAvailability}%`;
  twoWProgress.textContent = `${twoWheelerAvailable}/${twoWheelerSlots.length} Available`;
  twoWProgress.className = `progress-bar ${
    twoWheelerAvailable > 0 ? "bg-success" : "bg-danger"
  }`;

  fourWProgress.style.width = `${fourWheelerAvailability}%`;
  fourWProgress.textContent = `${fourWheelerAvailable}/${fourWheelerSlots.length} Available`;
  fourWProgress.className = `progress-bar ${
    fourWheelerAvailable > 0 ? "bg-success" : "bg-danger"
  }`;

  // Update current vehicles list
  updateCurrentVehiclesList(vehicles);

  // Update parking visualization
  updateParkingVisualization(slots);
}

// Update configuration statistics
function updateConfigurationStats(slots) {
  if (!slots) return;

  const slotsArray = Object.values(slots);
  const twoWheelerSlots = slotsArray.filter(
    (s) => s.type === "2W" && s.isActive
  );
  const fourWheelerSlots = slotsArray.filter(
    (s) => s.type === "4W" && s.isActive
  );
  const availableSlots = slotsArray.filter(
    (s) => !s.isOccupied && s.isActive
  ).length;

  document.getElementById("config-twoW-count").textContent =
    twoWheelerSlots.length;
  document.getElementById("config-fourW-count").textContent =
    fourWheelerSlots.length;
  document.getElementById("config-total-count").textContent =
    twoWheelerSlots.length + fourWheelerSlots.length;
  document.getElementById("config-available-count").textContent =
    availableSlots;
}

// Update slot management table
function updateSlotManagementTable(slots) {
  if (!slots) return;

  let tableHTML = "";
  const slotsArray = Object.values(slots);

  // Sort slots by type and then by their sortOrder
  slotsArray.sort((a, b) => {
    // First sort by type (2W first, then 4W)
    if (a.type !== b.type) {
      return a.type === "2W" ? -1 : 1;
    }
    // Then sort by sortOrder
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });

  slotsArray.forEach((slot) => {
    tableHTML += `
                    <tr>
                        <td>${slot.number}</td>
                        <td><span class="badge ${
                          slot.type === "2W" ? "bg-info" : "bg-primary"
                        }">${slot.type}</span></td>
                        <td>
                            <span class="badge ${
                              slot.isOccupied
                                ? "bg-danger"
                                : slot.isActive
                                ? "bg-success"
                                : "bg-secondary"
                            }">
                                ${
                                  slot.isOccupied
                                    ? "Occupied"
                                    : slot.isActive
                                    ? "Available"
                                    : "Disabled"
                                }
                            </span>
                        </td>
                        <td>${slot.vehicleNumber || "-"}</td>
                        <td class="config-actions">
                            ${
                              !slot.isOccupied
                                ? `
                                <button class="btn btn-sm ${
                                  slot.isActive ? "btn-warning" : "btn-success"
                                }" 
                                    onclick="toggleSlotStatus('${
                                      slot.number
                                    }', ${!slot.isActive})">
                                    <i class="fas ${
                                      slot.isActive ? "fa-ban" : "fa-check"
                                    }"></i> 
                                    ${slot.isActive ? "Disable" : "Enable"}
                                </button>
                            `
                                : ""
                            }
                            ${
                              !slot.isOccupied
                                ? `
                                <button class="btn btn-sm btn-danger" onclick="deleteSlot('${slot.number}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            `
                                : ""
                            }
                        </td>
                    </tr>
                `;
  });

  slotManagementBody.innerHTML = tableHTML;
}

// Toggle slot status (enable/disable)
function toggleSlotStatus(slotNumber, newStatus) {
  database
    .ref(`parkingData/slots/${slotNumber}/isActive`)
    .set(newStatus)
    .then(() => {
      console.log(
        `Slot ${slotNumber} ${newStatus ? "enabled" : "disabled"} successfully`
      );
    })
    .catch((error) => {
      console.error("Error updating slot status:", error);
      alert("Error updating slot status. Please try again.");
    });
}

// Delete a slot
function deleteSlot(slotNumber) {
  if (
    confirm(
      `Are you sure you want to delete slot ${slotNumber}? This action cannot be undone.`
    )
  ) {
    database
      .ref(`parkingData/slots/${slotNumber}`)
      .remove()
      .then(() => {
        console.log(`Slot ${slotNumber} deleted successfully`);
      })
      .catch((error) => {
        console.error("Error deleting slot:", error);
      });
  }
}

// Add new slots
function addNewSlots() {
  const slotType = document.getElementById("slotType").value;
  const slotCount = parseInt(document.getElementById("slotCount").value);

  if (!slotType || slotCount < 1) {
    alert("Please select a valid slot type and count");
    return;
  }

  database
    .ref("parkingData/slots")
    .once("value")
    .then((snapshot) => {
      const existingSlots = snapshot.val() || {};

      // Find the highest number for this slot type
      let maxNumber = 0;
      Object.values(existingSlots).forEach((slot) => {
        if (slot.type === slotType) {
          const slotNum = parseInt(slot.number.split("-")[1]);
          if (slotNum > maxNumber) maxNumber = slotNum;
        }
      });

      // Create new slots
      const updates = {};
      for (let i = 1; i <= slotCount; i++) {
        const newSlotNumber = maxNumber + i;
        const slotId = `${slotType}-${newSlotNumber}`;

        updates[slotId] = {
          number: slotId,
          type: slotType,
          isOccupied: false,
          vehicleNumber: null,
          isActive: true,
          sortOrder: newSlotNumber, // Add sort order for proper ordering
        };
      }

      // Update Firebase
      database
        .ref("parkingData/slots")
        .update(updates)
        .then(() => {
          alert(`Successfully added ${slotCount} new ${slotType} slots`);
          addSlotForm.reset();
        })
        .catch((error) => {
          console.error("Error adding new slots:", error);
          alert("Error adding new slots. Please try again.");
        });
    });
}

// Save pricing configuration
function savePricingConfiguration() {
  const twoWheelerRate = parseInt(
    document.getElementById("twoWheelerRate").value
  );
  const fourWheelerRate = parseInt(
    document.getElementById("fourWheelerRate").value
  );

  if (
    isNaN(twoWheelerRate) ||
    isNaN(fourWheelerRate) ||
    twoWheelerRate < 10 ||
    fourWheelerRate < 20
  ) {
    alert("Please enter valid rates (2W: min ₹10, 4W: min ₹20)");
    return;
  }

  const newConfig = {
    twoWheelerRate: twoWheelerRate,
    fourWheelerRate: fourWheelerRate,
  };

  database
    .ref("parkingData/config")
    .set(newConfig)
    .then(() => {
      PARKING_CONFIG = newConfig;
      alert("Pricing configuration saved successfully");
    })
    .catch((error) => {
      console.error("Error saving pricing configuration:", error);
      alert("Error saving pricing configuration. Please try again.");
    });
}

// Load dashboard data
function loadDashboardData() {
  database
    .ref("parkingData")
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        updateDashboardUI(data);
      }
    })
    .catch((error) => {
      console.error("Error loading dashboard data:", error);
    });
}

// Update ticket preview
function updateTicketPreview() {
  const vehicleNumber = document.getElementById("vehicleNumber").value;
  const vehicleType = document.getElementById("vehicleType").value;
  const ownerName = document.getElementById("ownerName").value;
  const ownerContact = document.getElementById("ownerContact").value;

  if (vehicleNumber || vehicleType || ownerName || ownerContact) {
    ticketPreview.innerHTML = `
                    <h6>Ticket Preview</h6>
                    <p><strong>Vehicle Number:</strong> ${
                      vehicleNumber || "N/A"
                    }</p>
                    <p><strong>Vehicle Type:</strong> ${
                      vehicleType || "N/A"
                    }</p>
                    <p><strong>Owner Name:</strong> ${ownerName || "N/A"}</p>
                    <p><strong>Contact:</strong> ${ownerContact || "N/A"}</p>
                    <p><strong>Entry Time:</strong> ${new Date().toLocaleTimeString()}</p>
                    <p><strong>Status:</strong> <span class="badge bg-warning">Pending</span></p>
                `;
  } else {
    ticketPreview.innerHTML =
      '<p class="text-center">Form data will appear here</p>';
  }
}

// Process vehicle entry
function processVehicleEntry() {
  const vehicleNumber = document
    .getElementById("vehicleNumber")
    .value.toUpperCase();
  const vehicleType = document.getElementById("vehicleType").value;
  const ownerName = document.getElementById("ownerName").value;
  const ownerContact = document.getElementById("ownerContact").value;

  // Validate form
  if (!vehicleNumber || !vehicleType || !ownerName) {
    alert("Please fill all required fields");
    return;
  }

  // Show loading state
  entryLoading.classList.remove("d-none");
  entryBtnText.textContent = "Processing...";
  entrySubmitBtn.disabled = true;

  database
    .ref("parkingData")
    .once("value")
    .then((snapshot) => {
      const parkingData = snapshot.val();

      // Check if vehicle is already parked
      const vehicles = parkingData.vehicles || {};
      const isAlreadyParked = Object.values(vehicles).some(
        (v) => v.number === vehicleNumber && !v.exitTime
      );

      if (isAlreadyParked) {
        alert("This vehicle is already parked!");
        entryLoading.classList.add("d-none");
        entryBtnText.textContent = "Generate Ticket";
        entrySubmitBtn.disabled = false;
        return;
      }

      // Find available slot
      const slots = parkingData.slots || {};
      const availableSlot = Object.values(slots).find(
        (slot) => slot.type === vehicleType && !slot.isOccupied && slot.isActive
      );

      if (!availableSlot) {
        alert(
          `No available ${
            vehicleType === "2W" ? "2-Wheeler" : "4-Wheeler"
          } slots!`
        );
        entryLoading.classList.add("d-none");
        entryBtnText.textContent = "Generate Ticket";
        entrySubmitBtn.disabled = false;
        return;
      }

      // Create vehicle record
      const vehicleId = `vehicle_${Date.now()}`;
      const vehicleRecord = {
        id: vehicleId,
        number: vehicleNumber,
        type: vehicleType,
        ownerName: ownerName,
        ownerContact: ownerContact || "",
        slot: availableSlot.number,
        entryTime: new Date().toISOString(),
        exitTime: null,
        amount: 0,
      };

      // Update slot status
      const slotUpdate = {};
      slotUpdate[`slots/${availableSlot.number}/isOccupied`] = true;
      slotUpdate[`slots/${availableSlot.number}/vehicleNumber`] = vehicleNumber;

      // Add to vehicles array
      slotUpdate[`vehicles/${vehicleId}`] = vehicleRecord;

      // Update data in Firebase
      database
        .ref("parkingData")
        .update(slotUpdate)
        .then(() => {
          // Update UI
          ticketPreview.innerHTML = `
                        <div class="receipt">
                            <h5 class="text-center">Parking Ticket</h5>
                            <hr>
                            <p><strong>Ticket ID:</strong> ${Math.random()
                              .toString(36)
                              .substr(2, 9)
                              .toUpperCase()}</p>
                            <p><strong>Vehicle Number:</strong> ${vehicleNumber}</p>
                            <p><strong>Slot Number:</strong> ${
                              availableSlot.number
                            }</p>
                            <p><strong>Entry Time:</strong> ${new Date().toLocaleString()}</p>
                            <p><strong>Status:</strong> <span class="badje bg-success">Confirmed</span></p>
                        </div>
                    `;

          // Reset form
          entryForm.reset();

          // Reset button state
          entryLoading.classList.add("d-none");
          entryBtnText.textContent = "Generate Ticket";
          entrySubmitBtn.disabled = false;
        })
        .catch((error) => {
          console.error("Error saving vehicle entry:", error);
          alert("Error processing entry. Please try again.");
          entryLoading.classList.add("d-none");
          entryBtnText.textContent = "Generate Ticket";
          entrySubmitBtn.disabled = false;
        });
    })
    .catch((error) => {
      console.error("Error reading parking data:", error);
      alert("Error reading data. Please try again.");
      entryLoading.classList.add("d-none");
      entryBtnText.textContent = "Generate Ticket";
      entrySubmitBtn.disabled = false;
    });
}

// Process vehicle exit
function processVehicleExit() {
  const vehicleNumber = document
    .getElementById("exitVehicleNumber")
    .value.toUpperCase();

  if (!vehicleNumber) {
    alert("Please enter a vehicle number");
    return;
  }

  // Show loading state
  exitLoading.classList.remove("d-none");
  exitBtnText.textContent = "Processing...";
  exitSubmitBtn.disabled = true;

  database
    .ref("parkingData")
    .once("value")
    .then((snapshot) => {
      const parkingData = snapshot.val();
      const vehicles = parkingData.vehicles || {};

      // Find vehicle
      const vehicleEntry = Object.entries(vehicles).find(
        ([id, v]) => v.number === vehicleNumber && !v.exitTime
      );

      if (!vehicleEntry) {
        alert("Vehicle not found or already exited!");
        exitLoading.classList.add("d-none");
        exitBtnText.textContent = "Process Exit";
        exitSubmitBtn.disabled = false;
        return;
      }

      const [vehicleId, vehicle] = vehicleEntry;

      // Calculate parking duration and amount
      const entryTime = new Date(vehicle.entryTime);
      const exitTime = new Date();
      const durationMs = exitTime - entryTime;
      const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)); // Round up to nearest hour

      const rate =
        vehicle.type === "2W"
          ? PARKING_CONFIG.twoWheelerRate
          : PARKING_CONFIG.fourWheelerRate;
      const amount = durationHours * rate;

      // Update vehicle record
      const updates = {};
      updates[`vehicles/${vehicleId}/exitTime`] = exitTime.toISOString();
      updates[`vehicles/${vehicleId}/amount`] = amount;
      updates[`vehicles/${vehicleId}/duration`] = durationHours;

      // Free up the slot
      const slotNumber = vehicle.slot;
      updates[`slots/${slotNumber}/isOccupied`] = false;
      updates[`slots/${slotNumber}/vehicleNumber`] = null;

      // Update revenue
      updates["todayRevenue"] = (parkingData.todayRevenue || 0) + amount;

      // Update data in Firebase
      database
        .ref("parkingData")
        .update(updates)
        .then(() => {
          // Add to transactions
          const transactionId = `trans_${Date.now()}`;
          const transaction = {
            vehicleNumber: vehicle.number,
            type: vehicle.type,
            ownerName: vehicle.ownerName,
            ownerContact: vehicle.ownerContact || "",
            slot: vehicle.slot,
            entryTime: vehicle.entryTime,
            exitTime: exitTime.toISOString(),
            amount: amount,
            duration: durationHours,
          };

          database.ref(`transactions/${transactionId}`).set(transaction);

          // Update UI
          exitReceipt.innerHTML = `
                        <div class="receipt">
                            <h5 class="text-center">Parking Receipt</h5>
                            <hr>
                            <p><strong>Vehicle Number:</strong> ${
                              vehicle.number
                            }</p>
                            <p><strong>Vehicle Type:</strong> ${
                              vehicle.type
                            }</p>
                            <p><strong>Entry Time:</strong> ${new Date(
                              vehicle.entryTime
                            ).toLocaleString()}</p>
                            <p><strong>Exit Time:</strong> ${exitTime.toLocaleString()}</p>
                            <p><strong>Duration:</strong> ${durationHours} hours</p>
                            <p><strong>Amount:</strong> ₹${amount}</p>
                            <hr>
                            <div class="d-grid gap-2">
                                <button class="btn btn-success" onclick="printReceipt()">
                                    <i class="fas fa-print"></i> Print Receipt
                                </button>
                            </div>
                        </div>
                    `;

          // Reset form
          exitForm.reset();

          // Reset button state
          exitLoading.classList.add("d-none");
          exitBtnText.textContent = "Process Exit";
          exitSubmitBtn.disabled = false;

          // Refresh charts
          initializeCharts();
        })
        .catch((error) => {
          console.error("Error updating exit data:", error);
          alert("Error processing exit. Please try again.");
          exitLoading.classList.add("d-none");
          exitBtnText.textContent = "Process Exit";
          exitSubmitBtn.disabled = false;
        });
    })
    .catch((error) => {
      console.error("Error reading parking data:", error);
      alert("Error reading data. Please try again.");
      exitLoading.classList.add("d-none");
      exitBtnText.textContent = "Process Exit";
      exitSubmitBtn.disabled = false;
    });
}

// Print receipt
function printReceipt() {
  const receiptContent = document.getElementById("exit-receipt").innerHTML;
  const originalContent = document.body.innerHTML;

  document.body.innerHTML = receiptContent;
  window.print();
  document.body.innerHTML = originalContent;

  // Reload to restore functionality
  location.reload();
}

// Update current vehicles list
function updateCurrentVehiclesList(vehicles) {
  const currentVehiclesContainer = document.getElementById("current-vehicles");
  const currentVehicles = vehicles.filter((v) => !v.exitTime);

  if (currentVehicles.length > 0) {
    let vehiclesHTML = "";
    currentVehicles.forEach((vehicle) => {
      const entryTime = new Date(vehicle.entryTime);
      vehiclesHTML += `
                        <div class="d-flex justify-content-between border-bottom py-2">
                            <div>
                                <strong>${vehicle.number}</strong> (${
        vehicle.type
      })
                                <br><small class="text-muted">${
                                  vehicle.ownerName
                                }</small>
                            </div>
                            <div class="text-end">
                                <span class="badge bg-info">${
                                  vehicle.slot
                                }</span>
                                <br><small class="text-muted">${entryTime.toLocaleTimeString()}</small>
                            </div>
                        </div>
                    `;
    });
    currentVehiclesContainer.innerHTML = vehiclesHTML;
  } else {
    currentVehiclesContainer.innerHTML =
      '<p class="text-center">No vehicles currently parked</p>';
  }
}

// Update parking visualization
function updateParkingVisualization(slots) {
  const parkingLot = document.getElementById("parking-lot");

  if (!slots || Object.keys(slots).length === 0) {
    parkingLot.innerHTML =
      '<p class="text-center">No parking data available</p>';
    return;
  }

  // Convert slots object to array and sort by type and then by sortOrder
  const slotsArray = Object.values(slots);
  slotsArray.sort((a, b) => {
    // First sort by type (2W first, then 4W)
    if (a.type !== b.type) {
      return a.type === "2W" ? -1 : 1;
    }
    // Then sort by sortOrder
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });

  let visualizationHTML = "";

  // Group slots by type
  const twoWheelerSlots = slotsArray.filter((s) => s.type === "2W");
  const fourWheelerSlots = slotsArray.filter((s) => s.type === "4W");

  // Display 2-wheeler slots
  visualizationHTML +=
    '<h6 class="mt-3">2-Wheeler Slots</h6><div class="slot-container">';

  // Create rows of 5 slots each for 2-wheelers
  for (let i = 0; i < twoWheelerSlots.length; i += 5) {
    visualizationHTML += '<div class="slot-row">';
    for (let j = i; j < Math.min(i + 5, twoWheelerSlots.length); j++) {
      const slot = twoWheelerSlots[j];
      const slotClass = !slot.isActive
        ? "slot-disabled"
        : slot.isOccupied
        ? "slot-occupied"
        : "slot-available";
      visualizationHTML += `
                        <div class="slot ${slotClass}" 
                             data-bs-toggle="tooltip" title="${slot.number}: ${
        !slot.isActive
          ? "Disabled"
          : slot.isOccupied
          ? "Occupied by " + slot.vehicleNumber
          : "Available"
      }">
                            ${slot.number.split("-")[1]}
                        </div>
                    `;
    }
    visualizationHTML += "</div>";
  }
  visualizationHTML += "</div>";

  // Display 4-wheeler slots
  visualizationHTML +=
    '<h6 class="mt-3">4-Wheeler Slots</h6><div class="slot-container">';

  // Create rows of 5 slots each for 4-wheelers
  for (let i = 0; i < fourWheelerSlots.length; i += 5) {
    visualizationHTML += '<div class="slot-row">';
    for (let j = i; j < Math.min(i + 5, fourWheelerSlots.length); j++) {
      const slot = fourWheelerSlots[j];
      const slotClass = !slot.isActive
        ? "slot-disabled"
        : slot.isOccupied
        ? "slot-occupied"
        : "slot-available";
      visualizationHTML += `
                        <div class="slot ${slotClass}" 
                             data-bs-toggle="tooltip" title="${slot.number}: ${
        !slot.isActive
          ? "Disabled"
          : slot.isOccupied
          ? "Occupied by " + slot.vehicleNumber
          : "Available"
      }">
                            ${slot.number.split("-")[1]}
                        </div>
                    `;
    }
    visualizationHTML += "</div>";
  }
  visualizationHTML += "</div>";

  parkingLot.innerHTML = visualizationHTML;

  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

// Load history data
function loadHistoryData() {
  database
    .ref("transactions")
    .once("value")
    .then((snapshot) => {
      const transactionsData = snapshot.val();
      const transactions = transactionsData
        ? Object.values(transactionsData)
        : [];

      // Sort by exit time (newest first)
      transactions.sort((a, b) => new Date(b.exitTime) - new Date(a.exitTime));

      allHistoryData = transactions;
      filteredHistoryData = [...allHistoryData];

      // Apply any existing filters
      applyHistoryFilters();
    })
    .catch((error) => {
      console.error("Error loading history data:", error);
      historyTableBody.innerHTML =
        '<tr><td colspan="9" class="text-center text-danger">Error loading history data</td></tr>';
    });
}

// Apply history filters
function applyHistoryFilters() {
  const dateFilter = document.getElementById("filterDate").value;
  const typeFilter = document.getElementById("filterVehicleType").value;
  const numberFilter = document
    .getElementById("filterVehicleNumber")
    .value.toLowerCase();

  filteredHistoryData = allHistoryData.filter((transaction) => {
    // Date filter
    if (dateFilter) {
      const transactionDate = new Date(transaction.exitTime)
        .toISOString()
        .split("T")[0];
      if (transactionDate !== dateFilter) return false;
    }

    // Type filter
    if (typeFilter && transaction.type !== typeFilter) return false;

    // Number filter
    if (
      numberFilter &&
      !transaction.vehicleNumber.toLowerCase().includes(numberFilter)
    )
      return false;

    return true;
  });

  // Reset to first page
  currentHistoryPage = 1;
  renderHistoryTable();
  setupPagination();
}

// Render history table
function renderHistoryTable() {
  if (filteredHistoryData.length === 0) {
    historyTableBody.innerHTML =
      '<tr><td colspan="9" class="text-center">No matching records found</td></tr>';
    return;
  }

  const startIndex = (currentHistoryPage - 1) * HISTORY_PAGE_SIZE;
  const endIndex = Math.min(
    startIndex + HISTORY_PAGE_SIZE,
    filteredHistoryData.length
  );
  const pageData = filteredHistoryData.slice(startIndex, endIndex);

  let tableHTML = "";

  pageData.forEach((transaction, index) => {
    const entryTime = new Date(transaction.entryTime);
    const exitTime = new Date(transaction.exitTime);

    tableHTML += `
                    <tr data-id="${startIndex + index}">
                        <td>${startIndex + index + 1}</td>
                        <td>${transaction.vehicleNumber}</td>
                        <td><span class="badge ${
                          transaction.type === "2W" ? "bg-info" : "bg-primary"
                        }">${transaction.type}</span></td>
                        <td>${transaction.ownerName}</td>
                        <td>${entryTime.toLocaleString()}</td>
                        <td>${exitTime.toLocaleString()}</td>
                        <td><span class="badge bg-secondary badge-duration">${
                          transaction.duration
                        }h</span></td>
                        <td><span class="badge bg-success badge-amount">₹${
                          transaction.amount
                        }</span></td>
                        <td class="history-actions">
                            <button class="btn btn-sm btn-info view-details" data-id="${
                              startIndex + index
                            }">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </td>
                    </tr>
                `;
  });

  historyTableBody.innerHTML = tableHTML;

  // Add event listeners to view buttons
  document.querySelectorAll(".view-details").forEach((button) => {
    button.addEventListener("click", function () {
      const dataIndex = parseInt(this.getAttribute("data-id"));
      showHistoryDetails(filteredHistoryData[dataIndex]);
    });
  });

  // Add event listeners to table rows
  document.querySelectorAll("#historyTable tbody tr").forEach((row) => {
    row.addEventListener("click", function () {
      const dataIndex = parseInt(this.getAttribute("data-id"));
      showHistoryDetails(filteredHistoryData[dataIndex]);
    });
  });
}

// Setup pagination
function setupPagination() {
  const totalPages = Math.ceil(filteredHistoryData.length / HISTORY_PAGE_SIZE);

  if (totalPages <= 1) {
    historyPagination.innerHTML = "";
    return;
  }

  let paginationHTML = "";

  // Previous button
  if (currentHistoryPage > 1) {
    paginationHTML += `
                    <li class="page-item">
                        <a class="page-link" href="#" data-page="${
                          currentHistoryPage - 1
                        }">Previous</a>
                    </li>
                `;
  } else {
    paginationHTML += `
                    <li class="page-item disabled">
                        <a class="page-link" href="#">Previous</a>
                    </li>
                `;
  }

  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(
    1,
    currentHistoryPage - Math.floor(maxVisiblePages / 2)
  );
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    if (i === currentHistoryPage) {
      paginationHTML += `
                        <li class="page-item active">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
    } else {
      paginationHTML += `
                        <li class="page-item">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
    }
  }

  // Next button
  if (currentHistoryPage < totalPages) {
    paginationHTML += `
                    <li class="page-item">
                        <a class="page-link" href="#" data-page="${
                          currentHistoryPage + 1
                        }">Next</a>
                    </li>
                `;
  } else {
    paginationHTML += `
                    <li class="page-item disabled">
                        <a class="page-link" href="#">Next</a>
                    </li>
                `;
  }

  historyPagination.innerHTML = paginationHTML;

  // Add event listeners to pagination links
  document.querySelectorAll(".page-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const page = parseInt(this.getAttribute("data-page"));
      if (page && page !== currentHistoryPage) {
        currentHistoryPage = page;
        renderHistoryTable();
        setupPagination();
      }
    });
  });
}

// Show history details
function showHistoryDetails(transaction) {
  const entryTime = new Date(transaction.entryTime);
  const exitTime = new Date(transaction.exitTime);

  historyDetailContent.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Vehicle Information</h6>
                        <p><strong>Vehicle Number:</strong> ${
                          transaction.vehicleNumber
                        }</p>
                        <p><strong>Type:</strong> <span class="badge ${
                          transaction.type === "2W" ? "bg-info" : "bg-primary"
                        }">${transaction.type}</span></p>
                        <p><strong>Owner Name:</strong> ${
                          transaction.ownerName
                        }</p>
                        <p><strong>Contact:</strong> ${
                          transaction.ownerContact || "N/A"
                        }</p>
                        <p><strong>Slot:</strong> ${transaction.slot}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Parking Details</h6>
                        <p><strong>Entry Time:</strong> ${entryTime.toLocaleString()}</p>
                        <p><strong>Exit Time:</strong> ${exitTime.toLocaleString()}</p>
                        <p><strong>Duration:</strong> <span class="badge bg-secondary">${
                          transaction.duration
                        } hours</span></p>
                        <p><strong>Amount:</strong> <span class="badge bg-success">₹${
                          transaction.amount
                        }</span></p>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Payment Information</h6>
                        <p><strong>Payment Status:</strong> <span class="badge bg-success">Paid</span></p>
                        <p><strong>Payment Method:</strong> Cash</p>
                    </div>
                </div>
            `;

  const historyDetailModal = new bootstrap.Modal(
    document.getElementById("historyDetailModal")
  );
  historyDetailModal.show();
}

// Print history detail
function printHistoryDetail() {
  const modalContent = document.getElementById(
    "historyDetailContent"
  ).innerHTML;
  const originalContent = document.body.innerHTML;

  document.body.innerHTML = `
                <div class="container mt-4">
                    <h3 class="text-center mb-4">Parking Record Details</h3>
                    ${modalContent}
                </div>
            `;

  window.print();
  document.body.innerHTML = originalContent;

  // Re-initialize the modal
  const historyDetailModal = new bootstrap.Modal(
    document.getElementById("historyDetailModal")
  );
  historyDetailModal.show();
}

// Export history to CSV
function exportHistoryCSV() {
  if (filteredHistoryData.length === 0) {
    alert("No data to export");
    return;
  }

  let csvContent =
    "Vehicle Number,Type,Owner Name,Entry Time,Exit Time,Duration (hours),Amount\n";

  filteredHistoryData.forEach((transaction) => {
    const entryTime = new Date(transaction.entryTime).toLocaleString();
    const exitTime = new Date(transaction.exitTime).toLocaleString();

    csvContent += `"${transaction.vehicleNumber}",${transaction.type},"${transaction.ownerName}","${entryTime}","${exitTime}",${transaction.duration},${transaction.amount}\n`;
  });

  const blob = new Blob([csvContent], { type: "text/ccsv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().split("T")[0];

  link.setAttribute("href", url);
  link.setAttribute("download", `parking_history_${date}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export history to PDF
function exportHistoryPDF() {
  if (filteredHistoryData.length === 0) {
    alert("No data to export");
    return;
  }

  // Use jsPDF with autoTable plugin
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const date = new Date().toISOString().split("T")[0];

  // Add title
  doc.setFontSize(16);
  doc.text("Parking History Report", 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

  // Prepare data for the table
  const tableData = filteredHistoryData.map((transaction) => {
    const entryTime = new Date(transaction.entryTime).toLocaleString();
    const exitTime = new Date(transaction.exitTime).toLocaleString();

    return [
      transaction.vehicleNumber,
      transaction.type,
      transaction.ownerName,
      entryTime,
      exitTime,
      `${transaction.duration}h`,
      `₹${transaction.amount}`,
    ];
  });

  // Generate autoTable
  doc.autoTable({
    startY: 30,
    head: [
      [
        "Vehicle No.",
        "Type",
        "Owner",
        "Entry Time",
        "Exit Time",
        "Duration",
        "Amount",
      ],
    ],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [44, 62, 80], // Primary color
    },
  });

  // Save the PDF
  doc.save(`parking_history_${date}.pdf`);
}

// Export revenue report
function exportRevenueReport() {
  // Use jsPDF with autoTable plugin
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const date = new Date().toISOString().split("T")[0];

  // Add title
  doc.setFontSize(16);
  doc.text("Monthly Revenue Report", 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

  // Calculate monthly revenue (this is a simplified version)
  const monthlyData = {};
  filteredHistoryData.forEach((transaction) => {
    const monthYear = new Date(transaction.exitTime).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = 0;
    }

    monthlyData[monthYear] += transaction.amount;
  });

  // Prepare data for the table
  const tableData = Object.entries(monthlyData).map(([month, revenue]) => {
    return [month, `₹${revenue}`];
  });

  // Add total row
  const totalRevenue = Object.values(monthlyData).reduce(
    (sum, revenue) => sum + revenue,
    0
  );
  tableData.push(["TOTAL", `₹${totalRevenue}`]);

  // Generate autoTable
  doc.autoTable({
    startY: 30,
    head: [["Month", "Revenue"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [44, 62, 80], // Primary color
    },
    footStyles: {
      fillColor: [58, 64, 90], // Darker color for footer
    },
  });

  // Save the PDF
  doc.save(`revenue_report_${date}.pdf`);
}

// Initialize charts
function initializeCharts() {
  database
    .ref("transactions")
    .once("value")
    .then((snapshot) => {
      const transactionsData = snapshot.val();
      const transactions = transactionsData
        ? Object.values(transactionsData)
        : [];

      // Prepare data for daily chart (last 7 days)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toLocaleDateString("en-US", { weekday: "short" }));
      }

      const dailyCounts = Array(7).fill(0);
      const dailyRevenue = Array(7).fill(0);

      transactions.forEach((transaction) => {
        const transactionDate = new Date(transaction.exitTime);
        const today = new Date();
        const dayDiff = Math.floor(
          (today - transactionDate) / (1000 * 60 * 60 * 24)
        );

        if (dayDiff >= 0 && dayDiff < 7) {
          dailyCounts[6 - dayDiff]++;
          dailyRevenue[6 - dayDiff] += transaction.amount;
        }
      });

      // Daily Chart
      const dailyCtx = document.getElementById("dailyChart").getContext("2d");
      if (window.dailyChartInstance) {
        window.dailyChartInstance.destroy();
      }
      window.dailyChartInstance = new Chart(dailyCtx, {
        type: "bar",
        data: {
          labels: last7Days,
          datasets: [
            {
              label: "Vehicles Parked",
              data: dailyCounts,
              backgroundColor: "rgba(52, 152, 219, 0.7)",
              yAxisID: "y",
            },
            {
              label: "Revenue (₹)",
              data: dailyRevenue,
              type: "line",
              borderColor: "rgba(231, 76, 60, 0.7)",
              backgroundColor: "rgba(231, 76, 60, 0.2)",
              fill: true,
              yAxisID: "y1",
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: "Vehicles Parked & Revenue This Week",
            },
          },
          scales: {
            y: {
              type: "linear",
              display: true,
              position: "left",
              title: {
                display: true,
                text: "Vehicles",
              },
            },
            y1: {
              type: "linear",
              display: true,
              position: "right",
              title: {
                display: true,
                text: "Revenue (₹)",
              },
              grid: {
                drawOnChartArea: false,
              },
            },
          },
        },
      });

      // Revenue by Vehicle Type
      let twoWheelerRevenue = 0;
      let fourWheelerRevenue = 0;
      let twoWheelerCount = 0;
      let fourWheelerCount = 0;

      transactions.forEach((transaction) => {
        if (transaction.type === "2W") {
          twoWheelerRevenue += transaction.amount;
          twoWheelerCount++;
        } else {
          fourWheelerRevenue += transaction.amount;
          fourWheelerCount++;
        }
      });

      const revenueCtx = document
        .getElementById("revenueChart")
        .getContext("2d");
      if (window.revenueChartInstance) {
        window.revenueChartInstance.destroy();
      }
      window.revenueChartInstance = new Chart(revenueCtx, {
        type: "doughnut",
        data: {
          labels: ["2-Wheelers", "4-Wheelers"],
          datasets: [
            {
              data: [twoWheelerRevenue, fourWheelerRevenue],
              backgroundColor: [
                "rgba(46, 204, 113, 0.7)",
                "rgba(52, 152, 219, 0.7)",
              ],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "bottom",
            },
            title: {
              display: true,
              text: "Revenue Distribution",
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || "";
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ₹${value} (${percentage}%)`;
                },
              },
            },
          },
        },
      });

      // Monthly Revenue Chart
      const monthlyRevenue = {};
      const monthlyCount = {};

      // Initialize last 6 months
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthYear = date.toLocaleString("default", {
          month: "short",
          year: "numeric",
        });
        last6Months.push(monthYear);
        monthlyRevenue[monthYear] = 0;
        monthlyCount[monthYear] = 0;
      }

      // Calculate monthly data
      transactions.forEach((transaction) => {
        const transactionDate = new Date(transaction.exitTime);
        const monthYear = transactionDate.toLocaleString("default", {
          month: "short",
          year: "numeric",
        });

        if (last6Months.includes(monthYear)) {
          monthlyRevenue[monthYear] += transaction.amount;
          monthlyCount[monthYear]++;
        }
      });

      const monthlyRevenueData = last6Months.map(
        (month) => monthlyRevenue[month]
      );
      const monthlyCountData = last6Months.map((month) => monthlyCount[month]);

      const monthlyCtx = document
        .getElementById("monthlyRevenueChart")
        .getContext("2d");
      if (window.monthlyChartInstance) {
        window.monthlyChartInstance.destroy();
      }
      window.monthlyChartInstance = new Chart(monthlyCtx, {
        type: "bar",
        data: {
          labels: last6Months,
          datasets: [
            {
              label: "Revenue (₹)",
              data: monthlyRevenueData,
              backgroundColor: "rgba(153, 102, 255, 0.7)",
              yAxisID: "y",
            },
            {
              label: "Vehicles",
              data: monthlyCountData,
              type: "line",
              borderColor: "rgba(255, 159, 64, 0.7)",
              backgroundColor: "rgba(255, 159, 64, 0.2)",
              fill: false,
              yAxisID: "y1",
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: "Monthly Revenue & Vehicle Count",
            },
          },
          scales: {
            y: {
              type: "linear",
              display: true,
              position: "left",
              title: {
                display: true,
                text: "Revenue (₹)",
              },
            },
            y1: {
              type: "linear",
              display: true,
              position: "right",
              title: {
                display: true,
                text: "Vehicles",
              },
              grid: {
                drawOnChartArea: false,
              },
            },
          },
        },
      });
    })
    .catch((error) => {
      console.error("Error loading transactions for charts:", error);
    });
}

// Reset the entire system
function resetSystem() {
  // Show loading state on the reset button
  const originalText = confirmResetBtn.innerHTML;
  confirmResetBtn.innerHTML = '<span class="loading"></span> Resetting...';
  confirmResetBtn.disabled = true;

  // Create initial data structure
  const initialData = {
    vehicles: {},
    slots: createInitialSlots(),
    todayRevenue: 0,
    totalTransactions: 0,
    todayDate: new Date().toDateString(),
    config: PARKING_CONFIG,
  };

  // Clear transactions
  database.ref("transactions").remove();

  // Reset parking data
  database
    .ref("parkingData")
    .set(initialData)
    .then(() => {
      // Close the modal
      const resetModal = bootstrap.Modal.getInstance(
        document.getElementById("resetModal")
      );
      resetModal.hide();

      // Show success message
      alert("System has been reset successfully!");

      // Reset button state
      confirmResetBtn.innerHTML = originalText;
      confirmResetBtn.disabled = false;

      // Refresh charts and history
      initializeCharts();
      loadHistoryData();
    })
    .catch((error) => {
      console.error("Error resetting system:", error);
      alert("Error resetting system. Please try again.");

      // Reset button state
      confirmResetBtn.innerHTML = originalText;
      confirmResetBtn.disabled = false;
    });
}
