// ============================================================
// ACOUSTIC BONE SCANNER - COMPLETE WEB APPLICATION
// Group 4 Acoustic Bone Density Scanner
//
// IMPORTANT:
// - config.js creates window.supabaseClient
// - auth.js provides loginUser(), logoutUser(),
//   getCurrentUser(), getCurrentProfile()
// - This file must NOT create another Supabase client.
// ============================================================

const db = window.supabaseClient;

let currentUser = null;
let currentProfile = null;

let currentPatient = null;
let currentScanRequest = null;
let currentReferenceRequest = null;

let refreshTimer = null;


// ============================================================
// STARTUP
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("app.js loaded");
    console.log("Supabase client:", db);
    console.log("loginUser:", typeof loginUser);

    setupNavigation();
    setupLogin();
    setupPatientPortal();
    setupLogout();

    await restoreSession();

});


// ============================================================
// SESSION RESTORE
// ============================================================

async function restoreSession() {

    try {

        currentUser = await getCurrentUser();

        if (!currentUser) {
            showPage("loginPage");
            return;
        }

        currentProfile = await getCurrentProfile();

        if (!currentProfile) {
            await logoutUser();
            showPage("loginPage");
            return;
        }

        await showDashboard();

    } catch (error) {

        console.error("SESSION RESTORE ERROR:", error);

        showPage("loginPage");

    }
}


// ============================================================
// LOGIN
// ============================================================

function setupLogin() {

    const form = document.getElementById("loginForm");

    if (!form) {
        console.error("loginForm not found");
        return;
    }

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const message =
            document.getElementById("loginMessage");

        setMessage(message, "Logging in...", "info");

        try {

            currentUser =
                await loginUser(email, password);

            currentProfile =
                await getCurrentProfile();

            if (!currentProfile) {

                throw new Error(
                    "Login successful, but no profile was found."
                );

            }

            console.log("Logged in user:", currentUser);
            console.log("User profile:", currentProfile);

            setMessage(
                message,
                "Login successful.",
                "success"
            );

            await showDashboard();

        } catch (error) {

            console.error("LOGIN ERROR:", error);

            setMessage(
                message,
                error?.message || "Login failed.",
                "error"
            );

        }

    });

}


// ============================================================
// DASHBOARD
// ============================================================

async function showDashboard() {

    if (!currentProfile) {
        showPage("loginPage");
        return;
    }

    showPage("dashboardPage");

    updateDashboardHeader();

    await buildDashboard();

    startDashboardRefresh();

}


// ============================================================
// DASHBOARD HEADER
// ============================================================

function updateDashboardHeader() {

    const title =
        document.getElementById("dashboardTitle");

    const userInfo =
        document.getElementById("userInfo");

    if (title) {

        title.textContent =
            currentProfile.role === "admin"
                ? "Admin Dashboard"
                : "Operator Dashboard";

    }

    if (userInfo) {

        const name =
            currentProfile.name ||
            currentUser?.email ||
            "User";

        userInfo.textContent =
            `${name} • ${currentProfile.role}`;

    }

    document
        .querySelectorAll(".admin-only")
        .forEach(element => {

            if (currentProfile.role === "admin") {
                element.classList.remove("hidden");
            } else {
                element.classList.add("hidden");
            }

        });

}


// ============================================================
// DASHBOARD DATA
// ============================================================

async function buildDashboard() {

    await Promise.all([
        loadPatientCount(),
        loadMeasurementCount(),
        loadReferenceCount(),
        loadDeviceCount(),
        updateSystemStatus()
    ]);

}


async function loadPatientCount() {

    const element =
        document.getElementById("patientCount");

    if (!element) return;

    try {

        const { count, error } =
            await db
                .from("patients")
                .select("*", {
                    count: "exact",
                    head: true
                })
                .is("deleted_at", null);

        if (error) throw error;

        element.textContent =
            count ?? 0;

    } catch (error) {

        console.error(
            "PATIENT COUNT ERROR:",
            error
        );

        element.textContent = "—";

    }

}


async function loadMeasurementCount() {

    const element =
        document.getElementById("measurementCount");

    if (!element) return;

    try {

        const { count, error } =
            await db
                .from("measurements")
                .select("*", {
                    count: "exact",
                    head: true
                });

        if (error) throw error;

        element.textContent =
            count ?? 0;

    } catch (error) {

        console.error(
            "MEASUREMENT COUNT ERROR:",
            error
        );

        element.textContent = "—";

    }

}


async function loadReferenceCount() {

    const element =
        document.getElementById("referenceCount");

    if (!element) return;

    if (currentProfile?.role !== "admin") {
        return;
    }

    try {

        const { count, error } =
            await db
                .from("reference_samples")
                .select("*", {
                    count: "exact",
                    head: true
                });

        if (error) throw error;

        element.textContent =
            count ?? 0;

    } catch (error) {

        console.error(
            "REFERENCE COUNT ERROR:",
            error
        );

        element.textContent = "—";

    }

}


async function loadDeviceCount() {

    const element =
        document.getElementById("deviceCount");

    if (!element) return;

    if (currentProfile?.role !== "admin") {
        return;
    }

    try {

        const { count, error } =
            await db
                .from("devices")
                .select("*", {
                    count: "exact",
                    head: true
                });

        if (error) throw error;

        element.textContent =
            count ?? 0;

    } catch (error) {

        console.error(
            "DEVICE COUNT ERROR:",
            error
        );

        element.textContent = "—";

    }

}


async function updateSystemStatus() {

    const element =
        document.getElementById("systemStatus");

    if (!element) return;

    try {

        const { data, error } =
            await db
                .from("devices")
                .select("*")
                .order("created_at", {
                    ascending: true
                })
                .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {

            element.textContent =
                "No scanner device registered.";

            return;

        }

        const device = data[0];

        if (!device.last_seen) {

            element.textContent =
                `${device.device_code || "Device"} • Waiting for connection`;

            return;

        }

        const lastSeen =
            new Date(device.last_seen);

        const seconds =
            (Date.now() - lastSeen.getTime()) / 1000;

        if (seconds < 15) {

            element.textContent =
                `${device.device_code || "Device"} • Online`;

        } else {

            element.textContent =
                `${device.device_code || "Device"} • Offline / waiting`;

        }

    } catch (error) {

        console.error(
            "SYSTEM STATUS ERROR:",
            error
        );

        element.textContent =
            "System status unavailable.";

    }

}


// ============================================================
// REFRESH DASHBOARD
// ============================================================

function startDashboardRefresh() {

    stopDashboardRefresh();

    refreshTimer =
        setInterval(async () => {

            if (
                document
                    .getElementById("dashboardPage")
                    ?.classList
                    .contains("hidden")
            ) {
                return;
            }

            await updateSystemStatus();

        }, 10000);

}


function stopDashboardRefresh() {

    if (refreshTimer) {

        clearInterval(refreshTimer);

        refreshTimer = null;

    }

}


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    // The current index.html contains the basic dashboard.
    // Additional application sections are generated dynamically.

    const referenceCard =
        document.getElementById("referenceCard");

    const deviceCard =
        document.getElementById("deviceCard");

    if (referenceCard) {

        referenceCard.style.cursor = "pointer";

        referenceCard.addEventListener(
            "click",
            () => {

                if (currentProfile?.role === "admin") {
                    openReferenceManagement();
                }

            }
        );

    }

    if (deviceCard) {

        deviceCard.style.cursor = "pointer";

        deviceCard.addEventListener(
            "click",
            () => {

                if (currentProfile?.role === "admin") {
                    openDeviceManagement();
                }

            }
        );

    }

}


// ============================================================
// PATIENT MANAGEMENT
// ============================================================

async function openPatientManagement() {

    const patients =
        await fetchPatients();

    const html = `

        <div class="app-panel">

            <div class="panel-header">

                <h2>Patients</h2>

                <button
                    class="primary-button"
                    onclick="openCreatePatient()"
                >
                    + New Patient
                </button>

            </div>

            <div id="patientManagementContent">

                ${renderPatientTable(patients)}

            </div>

        </div>

    `;

    showApplicationPanel(
        html,
        "Patients"
    );

}


async function fetchPatients() {

    const { data, error } =
        await db
            .from("patients")
            .select("*")
            .is("deleted_at", null)
            .order("created_at", {
                ascending: false
            });

    if (error) {

        console.error(
            "FETCH PATIENTS ERROR:",
            error
        );

        showError(error.message);

        return [];

    }

    return data || [];

}


function renderPatientTable(patients) {

    if (!patients.length) {

        return `
            <div class="empty-state">
                No patients found.
            </div>
        `;

    }

    return `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>
                        <th>Patient Code</th>
                        <th>Name</th>
                        <th>Age</th>
                        <th>Sex</th>
                        <th>Phone</th>
                        <th>Actions</th>
                    </tr>

                </thead>

                <tbody>

                    ${patients.map(patient => `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    patient.patient_code
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    patient.name
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    patient.age ?? ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    patient.sex ?? ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    patient.phone ?? ""
                                )}
                            </td>

                            <td>

                                <button
                                    class="secondary-button"
                                    onclick="editPatient('${patient.id}')"
                                >
                                    Edit
                                </button>

                                <button
                                    class="secondary-button"
                                    onclick="requestPatientScan('${patient.id}')"
                                >
                                    Scan
                                </button>

                                <button
                                    class="secondary-button"
                                    onclick="deletePatient('${patient.id}')"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;

}


// ============================================================
// CREATE PATIENT
// ============================================================

function openCreatePatient() {

    const code =
        generatePatientCode();

    const html = `

        <div class="app-panel">

            <h2>New Patient</h2>

            <form id="createPatientForm">

                <label>Patient Code</label>

                <input
                    id="newPatientCode"
                    value="${code}"
                    readonly
                >

                <label>Name</label>

                <input
                    id="newPatientName"
                    required
                >

                <label>Age</label>

                <input
                    id="newPatientAge"
                    type="number"
                    min="0"
                    max="150"
                >

                <label>Sex</label>

                <select id="newPatientSex">

                    <option value="">
                        Select
                    </option>

                    <option value="Male">
                        Male
                    </option>

                    <option value="Female">
                        Female
                    </option>

                    <option value="Other">
                        Other
                    </option>

                </select>

                <label>Phone</label>

                <input
                    id="newPatientPhone"
                    type="tel"
                >

                <label>Email</label>

                <input
                    id="newPatientEmail"
                    type="email"
                >

                <label>Height (cm)</label>

                <input
                    id="newPatientHeight"
                    type="number"
                    step="0.1"
                >

                <label>Weight (kg)</label>

                <input
                    id="newPatientWeight"
                    type="number"
                    step="0.1"
                >

                <label>Notes</label>

                <textarea
                    id="newPatientNotes"
                ></textarea>

                <div class="form-actions">

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Create Patient
                    </button>

                    <button
                        type="button"
                        class="secondary-button"
                        onclick="openPatientManagement()"
                    >
                        Cancel
                    </button>

                </div>

                <div
                    id="patientFormMessage"
                    class="message"
                ></div>

            </form>

        </div>

    `;

    showApplicationPanel(
        html,
        "New Patient"
    );

    document
        .getElementById("createPatientForm")
        .addEventListener(
            "submit",
            createPatient
        );

}


async function createPatient(event) {

    event.preventDefault();

    const message =
        document.getElementById(
            "patientFormMessage"
        );

    try {

        const patient = {

            patient_code:
                document
                    .getElementById("newPatientCode")
                    .value,

            name:
                document
                    .getElementById("newPatientName")
                    .value
                    .trim(),

            age:
                numberOrNull(
                    document
                        .getElementById("newPatientAge")
                        .value
                ),

            sex:
                document
                    .getElementById("newPatientSex")
                    .value || null,

            phone:
                document
                    .getElementById("newPatientPhone")
                    .value
                    .trim() || null,

            email:
                document
                    .getElementById("newPatientEmail")
                    .value
                    .trim() || null,

            height:
                numberOrNull(
                    document
                        .getElementById("newPatientHeight")
                        .value
                ),

            weight:
                numberOrNull(
                    document
                        .getElementById("newPatientWeight")
                        .value
                ),

            notes:
                document
                    .getElementById("newPatientNotes")
                    .value
                    .trim() || null,

            created_by:
                currentUser.id

        };

        if (!patient.name) {

            throw new Error(
                "Patient name is required."
            );

        }

        const { data, error } =
            await db
                .from("patients")
                .insert(patient)
                .select()
                .single();

        if (error) throw error;

        console.log(
            "Patient created:",
            data
        );

        setMessage(
            message,
            `Patient created. Code: ${data.patient_code}`,
            "success"
        );

        setTimeout(
            openPatientManagement,
            1000
        );

    } catch (error) {

        console.error(
            "CREATE PATIENT ERROR:",
            error
        );

        setMessage(
            message,
            error.message,
            "error"
        );

    }

}


// ============================================================
// EDIT PATIENT
// ============================================================

async function editPatient(patientId) {

    try {

        const { data: patient, error } =
            await db
                .from("patients")
                .select("*")
                .eq("id", patientId)
                .single();

        if (error) throw error;

        const html = `

            <div class="app-panel">

                <h2>Edit Patient</h2>

                <form id="editPatientForm">

                    <input
                        type="hidden"
                        id="editPatientId"
                        value="${patient.id}"
                    >

                    <label>Patient Code</label>

                    <input
                        value="${escapeHtml(
                            patient.patient_code
                        )}"
                        readonly
                    >

                    <label>Name</label>

                    <input
                        id="editPatientName"
                        value="${escapeHtml(
                            patient.name || ""
                        )}"
                        required
                    >

                    <label>Age</label>

                    <input
                        id="editPatientAge"
                        type="number"
                        value="${patient.age ?? ""}"
                    >

                    <label>Sex</label>

                    <select id="editPatientSex">

                        <option value="">
                            Select
                        </option>

                        <option
                            value="Male"
                            ${patient.sex === "Male" ? "selected" : ""}
                        >
                            Male
                        </option>

                        <option
                            value="Female"
                            ${patient.sex === "Female" ? "selected" : ""}
                        >
                            Female
                        </option>

                        <option
                            value="Other"
                            ${patient.sex === "Other" ? "selected" : ""}
                        >
                            Other
                        </option>

                    </select>

                    <label>Phone</label>

                    <input
                        id="editPatientPhone"
                        value="${escapeHtml(
                            patient.phone || ""
                        )}"
                    >

                    <label>Email</label>

                    <input
                        id="editPatientEmail"
                        type="email"
                        value="${escapeHtml(
                            patient.email || ""
                        )}"
                    >

                    <label>Height (cm)</label>

                    <input
                        id="editPatientHeight"
                        type="number"
                        step="0.1"
                        value="${patient.height ?? ""}"
                    >

                    <label>Weight (kg)</label>

                    <input
                        id="editPatientWeight"
                        type="number"
                        step="0.1"
                        value="${patient.weight ?? ""}"
                    >

                    <label>Notes</label>

                    <textarea
                        id="editPatientNotes"
                    >${escapeHtml(
                        patient.notes || ""
                    )}</textarea>

                    <div class="form-actions">

                        <button
                            type="submit"
                            class="primary-button"
                        >
                            Save Changes
                        </button>

                        <button
                            type="button"
                            class="secondary-button"
                            onclick="openPatientManagement()"
                        >
                            Cancel
                        </button>

                    </div>

                    <div
                        id="editPatientMessage"
                        class="message"
                    ></div>

                </form>

            </div>

        `;

        showApplicationPanel(
            html,
            "Edit Patient"
        );

        document
            .getElementById("editPatientForm")
            .addEventListener(
                "submit",
                savePatientChanges
            );

    } catch (error) {

        console.error(
            "EDIT PATIENT ERROR:",
            error
        );

        showError(error.message);

    }

}


async function savePatientChanges(event) {

    event.preventDefault();

    const message =
        document.getElementById(
            "editPatientMessage"
        );

    const patientId =
        document.getElementById(
            "editPatientId"
        ).value;

    try {

        const updates = {

            name:
                document
                    .getElementById("editPatientName")
                    .value
                    .trim(),

            age:
                numberOrNull(
                    document
                        .getElementById("editPatientAge")
                        .value
                ),

            sex:
                document
                    .getElementById("editPatientSex")
                    .value || null,

            phone:
                document
                    .getElementById("editPatientPhone")
                    .value
                    .trim() || null,

            email:
                document
                    .getElementById("editPatientEmail")
                    .value
                    .trim() || null,

            height:
                numberOrNull(
                    document
                        .getElementById("editPatientHeight")
                        .value
                ),

            weight:
                numberOrNull(
                    document
                        .getElementById("editPatientWeight")
                        .value
                ),

            notes:
                document
                    .getElementById("editPatientNotes")
                    .value
                    .trim() || null,

            updated_at:
                new Date().toISOString()

        };

        const { error } =
            await db
                .from("patients")
                .update(updates)
                .eq("id", patientId);

        if (error) throw error;

        setMessage(
            message,
            "Patient updated successfully.",
            "success"
        );

        setTimeout(
            openPatientManagement,
            700
        );

    } catch (error) {

        console.error(
            "SAVE PATIENT ERROR:",
            error
        );

        setMessage(
            message,
            error.message,
            "error"
        );

    }

}


// ============================================================
// DELETE PATIENT
// ============================================================

async function deletePatient(patientId) {

    if (
        !confirm(
            "Delete this patient? Their record will be marked deleted."
        )
    ) {
        return;
    }

    try {

        const { error } =
            await db
                .from("patients")
                .update({
                    deleted_at:
                        new Date().toISOString()
                })
                .eq("id", patientId);

        if (error) throw error;

        await openPatientManagement();

    } catch (error) {

        console.error(
            "DELETE PATIENT ERROR:",
            error
        );

        showError(error.message);

    }

}


// ============================================================
// PATIENT SCAN REQUEST
// ============================================================

async function requestPatientScan(patientId) {

    try {

        const { data: devices, error } =
            await db
                .from("devices")
                .select("*")
                .order("created_at", {
                    ascending: true
                });

        if (error) throw error;

        if (!devices || devices.length === 0) {

            showError(
                "No scanner device is registered."
            );

            return;

        }

        const device =
            devices[0];

        const { data: patient, error: patientError } =
            await db
                .from("patients")
                .select("*")
                .eq("id", patientId)
                .single();

        if (patientError) throw patientError;

        const html = `

            <div class="app-panel">

                <h2>Patient Scan</h2>

                <p>
                    <strong>Patient:</strong>
                    ${escapeHtml(patient.name)}
                </p>

                <p>
                    <strong>Patient Code:</strong>
                    ${escapeHtml(patient.patient_code)}
                </p>

                <p>
                    <strong>Device:</strong>
                    ${escapeHtml(
                        device.device_code || "Scanner"
                    )}
                </p>

                <div class="scan-status">

                    <h3>Ready to Scan</h3>

                    <p>
                        Position the sensor head correctly
                        and start the scan from the physical
                        scanner.
                    </p>

                    <button
                        class="primary-button"
                        onclick="createPatientScanRequest('${patient.id}', '${device.id}')"
                    >
                        Send Scan Request
                    </button>

                    <button
                        class="secondary-button"
                        onclick="openPatientManagement()"
                    >
                        Cancel
                    </button>

                </div>

                <div id="scanRequestStatus"></div>

            </div>

        `;

        showApplicationPanel(
            html,
            "Patient Scan"
        );

    } catch (error) {

        console.error(
            "REQUEST PATIENT SCAN ERROR:",
            error
        );

        showError(error.message);

    }

}


async function createPatientScanRequest(
    patientId,
    deviceId
) {

    const status =
        document.getElementById(
            "scanRequestStatus"
        );

    setMessage(
        status,
        "Sending scan request to scanner...",
        "info"
    );

    try {

        const request = {

            device_id:
                deviceId,

            patient_id:
                patientId,

            operator_id:
                currentUser.id,

            status:
                "pending"

        };

        // scan_type is used if it exists in the schema.
        // The first insert intentionally uses only
        // the core fields from the base schema.

        const { data, error } =
            await db
                .from("scan_requests")
                .insert(request)
                .select()
                .single();

        if (error) throw error;

        currentScanRequest =
            data;

        setMessage(
            status,
            "Scan request sent. Waiting for scanner...",
            "success"
        );

        monitorScanRequest(
            data.id,
            status,
            "patient"
        );

    } catch (error) {

        console.error(
            "CREATE SCAN REQUEST ERROR:",
            error
        );

        setMessage(
            status,
            error.message,
            "error"
        );

    }

}


// ============================================================
// SCAN REQUEST MONITOR
// ============================================================

async function monitorScanRequest(
    requestId,
    statusElement,
    type
) {

    let attempts = 0;

    const timer =
        setInterval(async () => {

            attempts++;

            try {

                const { data, error } =
                    await db
                        .from("scan_requests")
                        .select("*")
                        .eq("id", requestId)
                        .single();

                if (error) throw error;

                if (!data) return;

                currentScanRequest =
                    data;

                const status =
                    data.status;

                if (status === "pending") {

                    setMessage(
                        statusElement,
                        "Waiting for scanner...",
                        "info"
                    );

                } else if (status === "scanning") {

                    setMessage(
                        statusElement,
                        "Scanner is performing measurement...",
                        "info"
                    );

                } else if (status === "completed") {

                    clearInterval(timer);

                    setMessage(
                        statusElement,
                        "Scan completed successfully.",
                        "success"
                    );

                    await showScanResult(
                        requestId,
                        type
                    );

                } else if (
                    status === "cancelled" ||
                    status === "error"
                ) {

                    clearInterval(timer);

                    setMessage(
                        statusElement,
                        `Scan ${status}.`,
                        "error"
                    );

                }

                // Stop after 10 minutes
                if (attempts >= 600) {

                    clearInterval(timer);

                    setMessage(
                        statusElement,
                        "Scan monitoring timed out.",
                        "error"
                    );

                }

            } catch (error) {

                console.error(
                    "SCAN MONITOR ERROR:",
                    error
                );

            }

        }, 1000);

}


// ============================================================
// SHOW SCAN RESULT
// ============================================================

async function showScanResult(
    requestId,
    type
) {

    try {

        const { data, error } =
            await db
                .from("measurements")
                .select("*")
                .eq("scan_request_id", requestId)
                .order("created_at", {
                    ascending: false
                })
                .limit(1);

        if (error) throw error;

        const measurement =
            data?.[0];

        if (!measurement) {

            showApplicationPanel(
                `
                    <div class="app-panel">

                        <h2>Scan Completed</h2>

                        <p>
                            The scanner reported completion,
                            but the measurement record is
                            not yet available.
                        </p>

                    </div>
                `,
                "Scan Result"
            );

            return;

        }

        showApplicationPanel(
            renderMeasurementResult(
                measurement
            ),
            "Scan Result"
        );

    } catch (error) {

        console.error(
            "SHOW SCAN RESULT ERROR:",
            error
        );

        showError(error.message);

    }

}


// ============================================================
// MEASUREMENTS
// ============================================================

async function openMeasurementManagement() {

    try {

        const { data, error } =
            await db
                .from("measurements")
                .select(`
                    *,
                    patients (
                        patient_code,
                        name
                    )
                `)
                .order("created_at", {
                    ascending: false
                });

        if (error) throw error;

        const measurements =
            data || [];

        const html = `

            <div class="app-panel">

                <div class="panel-header">

                    <h2>Measurements</h2>

                    <button
                        class="secondary-button"
                        onclick="showDashboard()"
                    >
                        Dashboard
                    </button>

                </div>

                ${
                    measurements.length
                        ? renderMeasurementTable(
                            measurements
                        )
                        : `
                            <div class="empty-state">
                                No measurements available.
                            </div>
                        `
                }

            </div>

        `;

        showApplicationPanel(
            html,
            "Measurements"
        );

    } catch (error) {

        console.error(
            "MEASUREMENTS ERROR:",
            error
        );

        showError(error.message);

    }

}


function renderMeasurementTable(
    measurements
) {

    return `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>Patient</th>
                        <th>f0 (Hz)</th>
                        <th>RMS</th>
                        <th>Bandwidth</th>
                        <th>Q</th>
                        <th>Date</th>

                    </tr>

                </thead>

                <tbody>

                    ${measurements.map(m => `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    m.patients?.name ||
                                    m.patients?.patient_code ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    m.f0 ?? "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    m.rms ?? "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    m.bandwidth ?? "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    m.q_factor ?? "—"
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    m.created_at
                                )}
                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;

}


function renderMeasurementResult(
    measurement
) {

    return `

        <div class="app-panel">

            <h2>Scan Result</h2>

            <div class="result-grid">

                <div class="result-card">

                    <h3>Resonant Frequency</h3>

                    <strong>
                        ${escapeHtml(
                            measurement.f0 ?? "—"
                        )}
                    </strong>

                    <span>Hz</span>

                </div>

                <div class="result-card">

                    <h3>RMS</h3>

                    <strong>
                        ${escapeHtml(
                            measurement.rms ?? "—"
                        )}
                    </strong>

                </div>

                <div class="result-card">

                    <h3>Bandwidth</h3>

                    <strong>
                        ${escapeHtml(
                            measurement.bandwidth ?? "—"
                        )}
                    </strong>

                    <span>Hz</span>

                </div>

                <div class="result-card">

                    <h3>Q Factor</h3>

                    <strong>
                        ${escapeHtml(
                            measurement.q_factor ?? "—"
                        )}
                    </strong>

                </div>

            </div>

            <p class="measurement-note">

                These measurements represent acoustic /
                resonance response parameters from the
                experimental scanner prototype. They are
                not direct bone mineral density values and
                are not an osteoporosis diagnosis.

            </p>

        </div>

    `;

}


// ============================================================
// REFERENCE SAMPLES
// ============================================================

async function openReferenceManagement() {

    if (currentProfile?.role !== "admin") {

        showError(
            "Administrator access required."
        );

        return;

    }

    try {

        const { data, error } =
            await db
                .from("reference_samples")
                .select("*")
                .order("created_at", {
                    ascending: false
                });

        if (error) throw error;

        const references =
            data || [];

        const html = `

            <div class="app-panel">

                <div class="panel-header">

                    <h2>Reference Samples</h2>

                    <div>

                        <button
                            class="primary-button"
                            onclick="openManualReferenceForm()"
                        >
                            + Manual Reference
                        </button>

                        <button
                            class="primary-button"
                            onclick="openReferenceScan()"
                        >
                            + Scan Reference
                        </button>

                    </div>

                </div>

                ${
                    references.length
                        ? renderReferenceTable(
                            references
                        )
                        : `
                            <div class="empty-state">
                                No reference samples found.
                            </div>
                        `
                }

            </div>

        `;

        showApplicationPanel(
            html,
            "Reference Samples"
        );

    } catch (error) {

        console.error(
            "REFERENCE MANAGEMENT ERROR:",
            error
        );

        showError(error.message);

    }

}


function renderReferenceTable(
    references
) {

    return `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>Name</th>
                        <th>Material</th>
                        <th>f0</th>
                        <th>RMS</th>
                        <th>Bandwidth</th>
                        <th>Q</th>
                        <th>Actions</th>

                    </tr>

                </thead>

                <tbody>

                    ${references.map(ref => `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    ref.name || "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    ref.material || "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    ref.f0 ?? "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    ref.rms ?? "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    ref.bandwidth ?? "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    ref.q_factor ?? "—"
                                )}
                            </td>

                            <td>

                                <button
                                    class="secondary-button"
                                    onclick="deleteReference('${ref.id}')"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;

}


// ============================================================
// MANUAL REFERENCE
// ============================================================

function openManualReferenceForm() {

    const html = `

        <div class="app-panel">

            <h2>Add Reference Sample</h2>

            <form id="referenceForm">

                <label>Name</label>

                <input
                    id="referenceName"
                    required
                >

                <label>Description</label>

                <textarea
                    id="referenceDescription"
                ></textarea>

                <label>Material</label>

                <input
                    id="referenceMaterial"
                >

                <label>Resonant Frequency (Hz)</label>

                <input
                    id="referenceF0"
                    type="number"
                    step="0.01"
                >

                <label>RMS</label>

                <input
                    id="referenceRms"
                    type="number"
                    step="0.0001"
                >

                <label>Bandwidth (Hz)</label>

                <input
                    id="referenceBandwidth"
                    type="number"
                    step="0.01"
                >

                <label>Q Factor</label>

                <input
                    id="referenceQ"
                    type="number"
                    step="0.01"
                >

                <label>Notes</label>

                <textarea
                    id="referenceNotes"
                ></textarea>

                <div class="form-actions">

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Save Reference
                    </button>

                    <button
                        type="button"
                        class="secondary-button"
                        onclick="openReferenceManagement()"
                    >
                        Cancel
                    </button>

                </div>

                <div
                    id="referenceMessage"
                    class="message"
                ></div>

            </form>

        </div>

    `;

    showApplicationPanel(
        html,
        "Add Reference"
    );

    document
        .getElementById("referenceForm")
        .addEventListener(
            "submit",
            saveManualReference
        );

}


async function saveManualReference(
    event
) {

    event.preventDefault();

    const message =
        document.getElementById(
            "referenceMessage"
        );

    try {

        const reference = {

            name:
                document
                    .getElementById("referenceName")
                    .value
                    .trim(),

            description:
                document
                    .getElementById(
                        "referenceDescription"
                    )
                    .value
                    .trim() || null,

            material:
                document
                    .getElementById(
                        "referenceMaterial"
                    )
                    .value
                    .trim() || null,

            f0:
                numberOrNull(
                    document
                        .getElementById(
                            "referenceF0"
                        )
                        .value
                ),

            rms:
                numberOrNull(
                    document
                        .getElementById(
                            "referenceRms"
                        )
                        .value
                ),

            bandwidth:
                numberOrNull(
                    document
                        .getElementById(
                            "referenceBandwidth"
                        )
                        .value
                ),

            q_factor:
                numberOrNull(
                    document
                        .getElementById(
                            "referenceQ"
                        )
                        .value
                ),

            notes:
                document
                    .getElementById(
                        "referenceNotes"
                    )
                    .value
                    .trim() || null,

            created_by:
                currentUser.id,

            source_type:
                "manual"

        };

        if (!reference.name) {

            throw new Error(
                "Reference name is required."
            );

        }

        const { error } =
            await db
                .from("reference_samples")
                .insert(reference);

        if (error) throw error;

        setMessage(
            message,
            "Reference sample saved.",
            "success"
        );

        setTimeout(
            openReferenceManagement,
            800
        );

    } catch (error) {

        console.error(
            "SAVE REFERENCE ERROR:",
            error
        );

        setMessage(
            message,
            error.message,
            "error"
        );

    }

}


// ============================================================
// DELETE REFERENCE
// ============================================================

async function deleteReference(
    referenceId
) {

    if (currentProfile?.role !== "admin") {
        return;
    }

    if (
        !confirm(
            "Delete this reference sample?"
        )
    ) {
        return;
    }

    try {

        const { error } =
            await db
                .from("reference_samples")
                .delete()
                .eq("id", referenceId);

        if (error) throw error;

        await openReferenceManagement();

    } catch (error) {

        console.error(
            "DELETE REFERENCE ERROR:",
            error
        );

        showError(error.message);

    }

}


// ============================================================
// REFERENCE SCAN
// ============================================================

async function openReferenceScan() {

    if (currentProfile?.role !== "admin") {
        return;
    }

    try {

        const { data: devices, error } =
            await db
                .from("devices")
                .select("*")
                .order("created_at", {
                    ascending: true
                });

        if (error) throw error;

        if (!devices?.length) {

            showError(
                "No scanner device is registered."
            );

            return;

        }

        const device =
            devices[0];

        const html = `

            <div class="app-panel">

                <h2>Scan Reference Sample</h2>

                <p>
                    Device:
                    <strong>
                        ${escapeHtml(
                            device.device_code ||
                            "Scanner"
                        )}
                    </strong>
                </p>

                <label>Reference Name</label>

                <input
                    id="scanReferenceName"
                    placeholder="Example: Reference Sample 1"
                >

                <label>Material / Description</label>

                <textarea
                    id="scanReferenceDescription"
                ></textarea>

                <button
                    class="primary-button"
                    onclick="createReferenceScanRequest('${device.id}')"
                >
                    Send Reference Scan
                </button>

                <button
                    class="secondary-button"
                    onclick="openReferenceManagement()"
                >
                    Cancel
                </button>

                <div
                    id="referenceScanStatus"
                    class="message"
                ></div>

            </div>

        `;

        showApplicationPanel(
            html,
            "Reference Scan"
        );

    } catch (error) {

        console.error(
            "OPEN REFERENCE SCAN ERROR:",
            error
        );

        showError(error.message);

    }

}


async function createReferenceScanRequest(
    deviceId
) {

    const status =
        document.getElementById(
            "referenceScanStatus"
        );

    const name =
        document
            .getElementById(
                "scanReferenceName"
            )
            .value
            .trim();

    const description =
        document
            .getElementById(
                "scanReferenceDescription"
            )
            .value
            .trim();

    if (!name) {

        setMessage(
            status,
            "Reference name is required.",
            "error"
        );

        return;

    }

    setMessage(
        status,
        "Sending reference scan request...",
        "info"
    );

    try {

        const request = {

            device_id:
                deviceId,

            operator_id:
                currentUser.id,

            status:
                "pending"

        };

        const { data, error } =
            await db
                .from("scan_requests")
                .insert(request)
                .select()
                .single();

        if (error) throw error;

        currentReferenceRequest = {
            ...data,
            reference_name: name,
            reference_description: description
        };

        setMessage(
            status,
            "Reference scan request sent.",
            "success"
        );

        monitorReferenceScan(
            data.id,
            name,
            description,
            status
        );

    } catch (error) {

        console.error(
            "REFERENCE SCAN REQUEST ERROR:",
            error
        );

        setMessage(
            status,
            error.message,
            "error"
        );

    }

}


async function monitorReferenceScan(
    requestId,
    name,
    description,
    statusElement
) {

    let attempts = 0;

    const timer =
        setInterval(async () => {

            attempts++;

            try {

                const { data, error } =
                    await db
                        .from("scan_requests")
                        .select("*")
                        .eq("id", requestId)
                        .single();

                if (error) throw error;

                if (data.status === "pending") {

                    setMessage(
                        statusElement,
                        "Waiting for scanner...",
                        "info"
                    );

                }

                if (data.status === "scanning") {

                    setMessage(
                        statusElement,
                        "Reference scan in progress...",
                        "info"
                    );

                }

                if (data.status === "completed") {

                    clearInterval(timer);

                    await saveReferenceFromScan(
                        requestId,
                        name,
                        description,
                        statusElement
                    );

                }

                if (
                    data.status === "error" ||
                    data.status === "cancelled"
                ) {

                    clearInterval(timer);

                    setMessage(
                        statusElement,
                        `Reference scan ${data.status}.`,
                        "error"
                    );

                }

                if (attempts >= 600) {

                    clearInterval(timer);

                    setMessage(
                        statusElement,
                        "Reference scan timed out.",
                        "error"
                    );

                }

            } catch (error) {

                console.error(
                    "REFERENCE MONITOR ERROR:",
                    error
                );

            }

        }, 1000);

}


// ============================================================
// SAVE REFERENCE FROM SCAN
// ============================================================

async function saveReferenceFromScan(
    requestId,
    name,
    description,
    statusElement
) {

    try {

        const { data, error } =
            await db
                .from("measurements")
                .select("*")
                .eq("scan_request_id", requestId)
                .order("created_at", {
                    ascending: false
                })
                .limit(1);

        if (error) throw error;

        const measurement =
            data?.[0];

        if (!measurement) {

            throw new Error(
                "Scan completed but no measurement was found."
            );

        }

        const reference = {

            name,

            description:
                description || null,

            f0:
                measurement.f0 ?? null,

            rms:
                measurement.rms ?? null,

            bandwidth:
                measurement.bandwidth ?? null,

            q_factor:
                measurement.q_factor ?? null,

            created_by:
                currentUser.id,

            source_type:
                "scan",

            device_id:
                measurement.device_id ?? null,

            scan_request_id:
                requestId

        };

        const { error: insertError } =
            await db
                .from("reference_samples")
                .insert(reference);

        if (insertError) throw insertError;

        setMessage(
            statusElement,
            "Reference sample saved from scanner.",
            "success"
        );

    } catch (error) {

        console.error(
            "SAVE SCANNED REFERENCE ERROR:",
            error
        );

        setMessage(
            statusElement,
            error.message,
            "error"
        );

    }

}


// ============================================================
// DEVICES
// ============================================================

async function openDeviceManagement() {

    if (currentProfile?.role !== "admin") {

        showError(
            "Administrator access required."
        );

        return;

    }

    try {

        const { data, error } =
            await db
                .from("devices")
                .select("*")
                .order("created_at", {
                    ascending: true
                });

        if (error) throw error;

        const devices =
            data || [];

        const html = `

            <div class="app-panel">

                <div class="panel-header">

                    <h2>Scanner Devices</h2>

                    <button
                        class="secondary-button"
                        onclick="showDashboard()"
                    >
                        Dashboard
                    </button>

                </div>

                ${
                    devices.length
                        ? renderDeviceTable(
                            devices
                        )
                        : `
                            <div class="empty-state">
                                No devices registered.
                            </div>
                        `
                }

            </div>

        `;

        showApplicationPanel(
            html,
            "Devices"
        );

    } catch (error) {

        console.error(
            "DEVICE MANAGEMENT ERROR:",
            error
        );

        showError(error.message);

    }

}


function renderDeviceTable(
    devices
) {

    return `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>Device</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Firmware</th>
                        <th>Last Seen</th>

                    </tr>

                </thead>

                <tbody>

                    ${devices.map(device => `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    device.device_code ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    device.device_name ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${getDeviceStatus(
                                    device
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    device.firmware_version ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    device.last_seen
                                )}
                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;

}


function getDeviceStatus(device) {

    if (!device.last_seen) {
        return "Waiting";
    }

    const seconds =
        (Date.now() -
            new Date(device.last_seen).getTime()) /
        1000;

    return seconds < 15
        ? "Online"
        : "Offline";

}


// ============================================================
// OPERATORS
// ============================================================

async function openOperatorManagement() {

    if (currentProfile?.role !== "admin") {
        return;
    }

    try {

        const { data, error } =
            await db
                .from("profiles")
                .select("*")
                .order("created_at", {
                    ascending: false
                });

        if (error) throw error;

        const profiles =
            data || [];

        const html = `

            <div class="app-panel">

                <div class="panel-header">

                    <h2>Users / Operators</h2>

                    <button
                        class="secondary-button"
                        onclick="showDashboard()"
                    >
                        Dashboard
                    </button>

                </div>

                <p>
                    Authentication accounts are managed
                    through Supabase Auth. This page displays
                    application profiles.
                </p>

                <div class="table-wrapper">

                    <table>

                        <thead>

                            <tr>

                                <th>Name</th>
                                <th>Role</th>
                                <th>Created</th>

                            </tr>

                        </thead>

                        <tbody>

                            ${profiles.map(profile => `

                                <tr>

                                    <td>
                                        ${escapeHtml(
                                            profile.name ||
                                            "—"
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            profile.role ||
                                            "—"
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            profile.created_at
                                        )}
                                    </td>

                                </tr>

                            `).join("")}

                        </tbody>

                    </table>

                </div>

            </div>

        `;

        showApplicationPanel(
            html,
            "Users"
        );

    } catch (error) {

        console.error(
            "OPERATOR MANAGEMENT ERROR:",
            error
        );

        showError(error.message);

    }

}


// ============================================================
// PATIENT PORTAL
// ============================================================

function setupPatientPortal() {

    const portalButton =
        document.getElementById(
            "patientPortalButton"
        );

    const backButton =
        document.getElementById(
            "backToLoginButton"
        );

    const patientForm =
        document.getElementById(
            "patientLoginForm"
        );

    if (portalButton) {

        portalButton.addEventListener(
            "click",
            () => {

                showPage("patientPage");

            }
        );

    }

    if (backButton) {

        backButton.addEventListener(
            "click",
            () => {

                showPage("loginPage");

            }
        );

    }

    if (patientForm) {

        patientForm.addEventListener(
            "submit",
            patientPortalLogin
        );

    }

}


async function patientPortalLogin(event) {

    event.preventDefault();

    const code =
        document
            .getElementById("patientCode")
            .value
            .trim();

    const message =
        document.getElementById(
            "patientLoginMessage"
        );

    if (!code) {

        setMessage(
            message,
            "Please enter your patient code.",
            "error"
        );

        return;

    }

    setMessage(
        message,
        "Checking patient code...",
        "info"
    );

    try {

        const { data, error } =
            await db.rpc(
                "patient_login",
                {
                    p_patient_code: code
                }
            );

        if (error) throw error;

        if (!data || data.length === 0) {

            setMessage(
                message,
                "Invalid patient code.",
                "error"
            );

            return;

        }

        const patient =
            normalizePatientRpcResult(
                data
            );

        currentPatient =
            patient;

        displayPatientResults(
            patient
        );

        showPage(
            "patientResultsPage"
        );

    } catch (error) {

        console.error(
            "PATIENT LOGIN ERROR:",
            error
        );

        setMessage(
            message,
            error.message ||
                "Unable to access patient results.",
            "error"
        );

    }

}


function normalizePatientRpcResult(
    data
) {

    const first =
        data?.[0] || {};

    // Depending on the RPC implementation,
    // measurements may already be nested or may be
    // returned as individual rows.

    let patient = {
        ...first
    };

    if (!patient.measurements) {

        patient.measurements =
            data
                .filter(row =>
                    row.f0 !== undefined ||
                    row.rms !== undefined ||
                    row.q_factor !== undefined ||
                    row.bandwidth !== undefined
                )
                .map(row => ({
                    f0: row.f0,
                    rms: row.rms,
                    bandwidth: row.bandwidth,
                    q_factor: row.q_factor,
                    created_at: row.created_at
                }));

    }

    return patient;

}


function displayPatientResults(
    patient
) {

    const name =
        document.getElementById(
            "patientName"
        );

    const details =
        document.getElementById(
            "patientDetails"
        );

    const measurements =
        document.getElementById(
            "patientMeasurements"
        );

    if (name) {

        name.textContent =
            patient.name ||
            "Patient";

    }

    if (details) {

        details.innerHTML = `

            <div class="patient-details">

                <p>
                    <strong>Patient Code:</strong>
                    ${escapeHtml(
                        patient.patient_code || ""
                    )}
                </p>

                <p>
                    <strong>Name:</strong>
                    ${escapeHtml(
                        patient.name || ""
                    )}
                </p>

                <p>
                    <strong>Age:</strong>
                    ${escapeHtml(
                        patient.age ?? "—"
                    )}
                </p>

                <p>
                    <strong>Sex:</strong>
                    ${escapeHtml(
                        patient.sex || "—"
                    )}
                </p>

            </div>

        `;

    }

    const measurementList =
        patient.measurements || [];

    if (!measurements) {
        return;
    }

    if (!measurementList.length) {

        measurements.innerHTML = `
            <p>No measurements available.</p>
        `;

        return;

    }

    measurements.innerHTML = `

        <div class="measurement-list">

            ${measurementList.map(
                measurement => `

                    <div class="measurement-card">

                        <h4>
                            Measurement
                        </h4>

                        <p>
                            <strong>
                                Resonant Frequency:
                            </strong>
                            ${escapeHtml(
                                measurement.f0 ??
                                "—"
                            )}
                            Hz
                        </p>

                        <p>
                            <strong>RMS:</strong>
                            ${escapeHtml(
                                measurement.rms ??
                                "—"
                            )}
                        </p>

                        <p>
                            <strong>Bandwidth:</strong>
                            ${escapeHtml(
                                measurement.bandwidth ??
                                "—"
                            )}
                            Hz
                        </p>

                        <p>
                            <strong>Q Factor:</strong>
                            ${escapeHtml(
                                measurement.q_factor ??
                                "—"
                            )}
                        </p>

                        <p>
                            <small>
                                ${formatDate(
                                    measurement.created_at
                                )}
                            </small>
                        </p>

                    </div>

                `
            ).join("")}

        </div>

    `;

}


// ============================================================
// LOGOUT
// ============================================================

function setupLogout() {

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logoutApplication
        );

    }

    const patientLogout =
        document.getElementById(
            "patientLogoutButton"
        );

    if (patientLogout) {

        patientLogout.addEventListener(
            "click",
            () => {

                currentPatient = null;

                document
                    .getElementById(
                        "patientCode"
                    )
                    ?.value = "";

                showPage(
                    "loginPage"
                );

            }
        );

    }

}


async function logoutApplication() {

    try {

        stopDashboardRefresh();

        await logoutUser();

        currentUser = null;
        currentProfile = null;

        showPage(
            "loginPage"
        );

        const form =
            document.getElementById(
                "loginForm"
            );

        if (form) {
            form.reset();
        }

    } catch (error) {

        console.error(
            "LOGOUT ERROR:",
            error
        );

    }

}


// ============================================================
// APPLICATION PANEL
// ============================================================

function showApplicationPanel(
    html,
    title
) {

    let panel =
        document.getElementById(
            "applicationPanel"
        );

    if (!panel) {

        panel =
            document.createElement("main");

        panel.id =
            "applicationPanel";

        panel.className =
            "page";

        document
            .querySelector(".app")
            .appendChild(panel);

    }

    panel.innerHTML = `

        <div class="dashboard-header">

            <div>

                <h2>
                    ${escapeHtml(title || "Scanner")}
                </h2>

                <p>
                    ${
                        currentProfile
                            ? escapeHtml(
                                currentProfile.name ||
                                currentUser?.email ||
                                ""
                              )
                            : ""
                    }
                </p>

            </div>

            <div>

                <button
                    class="secondary-button"
                    onclick="showDashboard()"
                >
                    Dashboard
                </button>

                <button
                    class="secondary-button"
                    onclick="logoutApplication()"
                >
                    Logout
                </button>

            </div>

        </div>

        ${html}

    `;

    showPage(
        "applicationPanel"
    );

}


// ============================================================
// PAGE SWITCHING
// ============================================================

function showPage(
    pageId
) {

    const pageIds = [

        "loginPage",
        "dashboardPage",
        "patientPage",
        "patientResultsPage",
        "applicationPanel"

    ];

    pageIds.forEach(id => {

        const page =
            document.getElementById(id);

        if (!page) return;

        if (id === pageId) {

            page.classList.remove(
                "hidden"
            );

        } else {

            page.classList.add(
                "hidden"
            );

        }

    });

}


// ============================================================
// ERROR / MESSAGE
// ============================================================

function showError(
    message
) {

    const html = `

        <div class="app-panel">

            <h2>Error</h2>

            <div class="message error">

                ${escapeHtml(
                    message || "Unknown error."
                )}

            </div>

            <button
                class="secondary-button"
                onclick="showDashboard()"
            >
                Back to Dashboard
            </button>

        </div>

    `;

    showApplicationPanel(
        html,
        "Error"
    );

}


function setMessage(
    element,
    message,
    type
) {

    if (!element) return;

    element.textContent =
        message || "";

    element.className =
        `message ${type || ""}`;

}


// ============================================================
// UTILITIES
// ============================================================

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function numberOrNull(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;

}


function formatDate(
    value
) {

    if (!value) {
        return "—";
    }

    try {

        return new Date(value)
            .toLocaleString();

    } catch {

        return String(value);

    }

}


function generatePatientCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    function part(length) {

        let result = "";

        for (
            let i = 0;
            i < length;
            i++
        ) {

            result +=
                chars[
                    Math.floor(
                        Math.random() *
                        chars.length
                    )
                ];

        }

        return result;

    }

    return `${part(4)}-${part(4)}-${part(2)}`;

}


// ============================================================
// GLOBAL FUNCTIONS
// ============================================================
//
// These are required because buttons generated dynamically
// use onclick="functionName(...)".

window.showDashboard =
    showDashboard;

window.openPatientManagement =
    openPatientManagement;

window.openCreatePatient =
    openCreatePatient;

window.editPatient =
    editPatient;

window.deletePatient =
    deletePatient;

window.requestPatientScan =
    requestPatientScan;

window.createPatientScanRequest =
    createPatientScanRequest;

window.openMeasurementManagement =
    openMeasurementManagement;

window.openReferenceManagement =
    openReferenceManagement;

window.openManualReferenceForm =
    openManualReferenceForm;

window.deleteReference =
    deleteReference;

window.openReferenceScan =
    openReferenceScan;

window.createReferenceScanRequest =
    createReferenceScanRequest;

window.openDeviceManagement =
    openDeviceManagement;

window.openOperatorManagement =
    openOperatorManagement;

window.logoutApplication =
    logoutApplication;
