// ============================================================
// ACOUSTIC BONE SCANNER - COMPLETE APP
// Group 4 Acoustic Bone Density Scanner
// Frontend: GitHub Pages
// Backend: Supabase
// ============================================================

let currentUser = null;
let currentProfile = null;
let currentPatient = null;
let currentPage = "dashboard";

// ------------------------------------------------------------
// SUPABASE
// ------------------------------------------------------------

const db = window.supabaseClient;

// If config.js used a different variable name, fall back to it.
const supabase =
    window.supabaseClient ||
    window.sb ||
    window.supabase?.createClient
        ? window.supabaseClient
        : null;

// ------------------------------------------------------------
// STARTUP
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
    await initializeApp();
});

async function initializeApp() {
    createApplicationShell();
    bindLoginEvents();

    if (!db) {
        showGlobalError(
            "Supabase is not connected. Check js/config.js."
        );
        return;
    }

    const { data } = await db.auth.getSession();

    if (data && data.session) {
        await loadAuthenticatedUser(data.session.user);
    } else {
        showLoginScreen();
    }

    db.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
            await loadAuthenticatedUser(session.user);
        } else {
            currentUser = null;
            currentProfile = null;
            showLoginScreen();
        }
    });
}

// ------------------------------------------------------------
// APPLICATION SHELL
// ------------------------------------------------------------

function createApplicationShell() {
    let app = document.getElementById("app");

    if (!app) {
        app = document.createElement("div");
        app.id = "app";
        document.body.appendChild(app);
    }

    app.innerHTML = `
        <div id="scannerApp">

            <!-- LOGIN -->
            <section id="loginScreen" class="app-screen">
                <div class="login-container">

                    <div class="brand">
                        <div class="brand-icon">◉</div>
                        <h1>Acoustic Bone Scanner</h1>
                        <p>Group 4 Acoustic Bone Density Scanner</p>
                    </div>

                    <div class="login-card">

                        <div class="login-tabs">
                            <button class="login-tab active" data-login-tab="staff">
                                Staff Login
                            </button>

                            <button class="login-tab" data-login-tab="patient">
                                Patient Portal
                            </button>
                        </div>

                        <!-- STAFF LOGIN -->
                        <div id="staffLoginPanel">

                            <form id="staffLoginForm">

                                <label>Email</label>
                                <input
                                    id="staffEmail"
                                    type="email"
                                    placeholder="admin@example.com"
                                    required
                                >

                                <label>Password</label>
                                <input
                                    id="staffPassword"
                                    type="password"
                                    placeholder="Password"
                                    required
                                >

                                <button type="submit" class="primary-btn">
                                    Login
                                </button>

                                <div id="staffLoginMessage"
                                     class="message">
                                </div>

                            </form>

                        </div>

                        <!-- PATIENT LOGIN -->
                        <div id="patientLoginPanel" style="display:none;">

                            <form id="patientLoginForm">

                                <label>Patient Code</label>

                                <input
                                    id="patientCode"
                                    type="text"
                                    placeholder="K7F9-X2PQ-81"
                                    autocomplete="off"
                                    required
                                >

                                <button type="submit" class="primary-btn">
                                    View My Results
                                </button>

                                <div id="patientLoginMessage"
                                     class="message">
                                </div>

                            </form>

                        </div>

                    </div>

                </div>
            </section>

            <!-- MAIN APPLICATION -->
            <section id="mainScreen"
                     class="app-screen"
                     style="display:none;">

                <header class="topbar">

                    <div>
                        <strong>Acoustic Bone Scanner</strong>
                        <span id="topbarRole"></span>
                    </div>

                    <div class="topbar-right">
                        <span id="topbarUser"></span>

                        <button
                            id="logoutButton"
                            class="secondary-btn">
                            Logout
                        </button>
                    </div>

                </header>

                <div class="app-layout">

                    <aside class="sidebar" id="sidebar">
                    </aside>

                    <main class="content" id="content">
                    </main>

                </div>

            </section>

            <!-- PATIENT PORTAL -->
            <section id="patientScreen"
                     class="app-screen"
                     style="display:none;">

                <header class="topbar">

                    <div>
                        <strong>Acoustic Bone Scanner</strong>
                    </div>

                    <button
                        id="patientLogoutButton"
                        class="secondary-btn">
                        Exit
                    </button>

                </header>

                <main id="patientContent"
                      class="patient-content">
                </main>

            </section>

            <!-- MODAL -->
            <div id="modalContainer"
                 class="modal-container"
                 style="display:none;">
            </div>

        </div>
    `;
}

// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------

function bindLoginEvents() {

    document.querySelectorAll("[data-login-tab]")
        .forEach(button => {

            button.addEventListener("click", () => {

                document.querySelectorAll(".login-tab")
                    .forEach(b => b.classList.remove("active"));

                button.classList.add("active");

                const tab = button.dataset.loginTab;

                document.getElementById("staffLoginPanel").style.display =
                    tab === "staff" ? "block" : "none";

                document.getElementById("patientLoginPanel").style.display =
                    tab === "patient" ? "block" : "none";
            });
        });

    document.getElementById("staffLoginForm")
        .addEventListener("submit", loginStaff);

    document.getElementById("patientLoginForm")
        .addEventListener("submit", loginPatient);

    document.getElementById("logoutButton")
        .addEventListener("click", logout);

    document.getElementById("patientLogoutButton")
        .addEventListener("click", () => {
            currentPatient = null;
            showLoginScreen();
        });
}

async function loginStaff(event) {
    event.preventDefault();

    const email =
        document.getElementById("staffEmail").value.trim();

    const password =
        document.getElementById("staffPassword").value;

    const message =
        document.getElementById("staffLoginMessage");

    message.textContent = "Logging in...";

    const { data, error } =
        await db.auth.signInWithPassword({
            email,
            password
        });

    if (error) {
        message.textContent = error.message;
        message.className = "message error";
        return;
    }

    message.textContent = "";

    await loadAuthenticatedUser(data.user);
}

async function loginPatient(event) {
    event.preventDefault();

    const code =
        document.getElementById("patientCode")
            .value.trim()
            .toUpperCase();

    const message =
        document.getElementById("patientLoginMessage");

    message.textContent = "Checking patient code...";

    const { data, error } =
        await db.rpc("patient_login", {
            p_patient_code: code
        });

    if (error) {
        console.error(error);

        message.textContent =
            "Unable to access patient record.";

        message.className = "message error";
        return;
    }

    if (!data || data.length === 0) {
        message.textContent =
            "Invalid patient code.";

        message.className = "message error";
        return;
    }

    currentPatient = Array.isArray(data)
        ? data[0]
        : data;

    message.textContent = "";

    showPatientPortal(currentPatient);
}

async function logout() {
    await db.auth.signOut();

    currentUser = null;
    currentProfile = null;
    currentPatient = null;

    showLoginScreen();
}

// ------------------------------------------------------------
// AUTHENTICATED USER
// ------------------------------------------------------------

async function loadAuthenticatedUser(user) {

    currentUser = user;

    const { data: profile, error } =
        await db
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

    if (error) {
        console.error(error);

        showGlobalError(
            "Unable to load your profile. Check Supabase permissions for profiles."
        );

        return;
    }

    currentProfile = profile;

    showMainApplication();
}

// ------------------------------------------------------------
// SCREENS
// ------------------------------------------------------------

function showLoginScreen() {

    hideAllScreens();

    document.getElementById("loginScreen").style.display =
        "block";

    const staffMessage =
        document.getElementById("staffLoginMessage");

    const patientMessage =
        document.getElementById("patientLoginMessage");

    if (staffMessage) staffMessage.textContent = "";
    if (patientMessage) patientMessage.textContent = "";
}

function showMainApplication() {

    hideAllScreens();

    document.getElementById("mainScreen").style.display =
        "block";

    document.getElementById("topbarRole").textContent =
        ` • ${capitalize(currentProfile.role)}`;

    document.getElementById("topbarUser").textContent =
        currentProfile.name ||
        currentUser.email;

    buildSidebar();

    loadPage("dashboard");
}

function showPatientPortal(patient) {

    hideAllScreens();

    document.getElementById("patientScreen").style.display =
        "block";

    renderPatientPortal(patient);
}

function hideAllScreens() {

    document.querySelectorAll(".app-screen")
        .forEach(screen => {
            screen.style.display = "none";
        });
}

// ------------------------------------------------------------
// SIDEBAR
// ------------------------------------------------------------

function buildSidebar() {

    const sidebar =
        document.getElementById("sidebar");

    let items = [];

    if (currentProfile.role === "admin") {

        items = [
            ["dashboard", "Dashboard"],
            ["patients", "Patients"],
            ["measurements", "Measurements"],
            ["references", "Reference Samples"],
            ["devices", "Devices"],
            ["operators", "Operators"]
        ];

    } else if (currentProfile.role === "operator") {

        items = [
            ["dashboard", "Dashboard"],
            ["patients", "Patients"],
            ["measurements", "Measurements"],
            ["scan", "New Patient Scan"]
        ];
    }

    sidebar.innerHTML = `
        <nav>
            ${items.map(item => `
                <button
                    class="nav-item"
                    data-page="${item[0]}">
                    ${item[1]}
                </button>
            `).join("")}
        </nav>
    `;

    sidebar.querySelectorAll(".nav-item")
        .forEach(button => {

            button.addEventListener("click", () => {
                loadPage(button.dataset.page);
            });

        });
}

// ------------------------------------------------------------
// PAGE ROUTER
// ------------------------------------------------------------

async function loadPage(page) {

    currentPage = page;

    document.querySelectorAll(".nav-item")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        });

    const content =
        document.getElementById("content");

    content.innerHTML =
        `<div class="loading">Loading...</div>`;

    try {

        switch (page) {

            case "dashboard":
                await renderDashboard();
                break;

            case "patients":
                await renderPatients();
                break;

            case "measurements":
                await renderMeasurements();
                break;

            case "references":
                await renderReferences();
                break;

            case "devices":
                await renderDevices();
                break;

            case "operators":
                await renderOperators();
                break;

            case "scan":
                await renderNewPatientScan();
                break;

            default:
                await renderDashboard();
        }

    } catch (error) {

        console.error(error);

        content.innerHTML = `
            <div class="error-box">
                <h3>Error</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

// ------------------------------------------------------------
// DASHBOARD
// ------------------------------------------------------------

async function renderDashboard() {

    const content =
        document.getElementById("content");

    const [
        patients,
        measurements,
        references,
        devices
    ] = await Promise.all([

        countRows("patients"),
        countRows("measurements"),
        countRows("reference_samples"),
        countRows("devices")

    ]);

    content.innerHTML = `

        <div class="page-header">
            <div>
                <h1>Dashboard</h1>
                <p>
                    Welcome to the Acoustic Bone Scanner system.
                </p>
            </div>
        </div>

        <div class="dashboard-grid">

            <div class="stat-card">
                <span>Patients</span>
                <strong>${patients}</strong>
            </div>

            <div class="stat-card">
                <span>Measurements</span>
                <strong>${measurements}</strong>
            </div>

            <div class="stat-card">
                <span>Reference Samples</span>
                <strong>${references}</strong>
            </div>

            <div class="stat-card">
                <span>Devices</span>
                <strong>${devices}</strong>
            </div>

        </div>

        <div class="panel">

            <h2>Scanner System</h2>

            <div class="system-status">

                <div>
                    <span class="status-dot"></span>
                    Database Connected
                </div>

                <div>
                    Device: <strong>ABS-001</strong>
                </div>

                <div>
                    Frequency Range:
                    <strong>200–1200 Hz</strong>
                </div>

            </div>

        </div>
    `;
}

async function countRows(table) {

    const { count, error } =
        await db
            .from(table)
            .select("*", {
                count: "exact",
                head: true
            });

    if (error) {
        console.error(`Count ${table}`, error);
        return 0;
    }

    return count || 0;
}

// ------------------------------------------------------------
// PATIENTS
// ------------------------------------------------------------

async function renderPatients() {

    const { data, error } =
        await db
            .from("patients")
            .select("*")
            .is("deleted_at", null)
            .order("created_at", {
                ascending: false
            });

    if (error) throw error;

    const content =
        document.getElementById("content");

    content.innerHTML = `

        <div class="page-header">

            <div>
                <h1>Patients</h1>
                <p>Manage patient records.</p>
            </div>

            <button
                class="primary-btn"
                onclick="openPatientForm()">
                + Add Patient
            </button>

        </div>

        <div class="panel">

            <div class="table-container">

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

                        ${
                            data.length
                            ? data.map(patient => `

                                <tr>

                                    <td>
                                        <strong>
                                            ${escapeHtml(patient.patient_code || "")}
                                        </strong>
                                    </td>

                                    <td>
                                        ${escapeHtml(patient.name || "")}
                                    </td>

                                    <td>
                                        ${patient.age ?? "-"}
                                    </td>

                                    <td>
                                        ${escapeHtml(patient.sex || "-")}
                                    </td>

                                    <td>
                                        ${escapeHtml(patient.phone || "-")}
                                    </td>

                                    <td>

                                        <button
                                            class="small-btn"
                                            onclick="viewPatient('${patient.id}')">
                                            View
                                        </button>

                                        <button
                                            class="small-btn"
                                            onclick="openPatientForm('${patient.id}')">
                                            Edit
                                        </button>

                                        <button
                                            class="small-btn danger"
                                            onclick="deletePatient('${patient.id}')">
                                            Delete
                                        </button>

                                    </td>

                                </tr>

                            `).join("")
                            : `
                                <tr>
                                    <td colspan="6">
                                        No patients found.
                                    </td>
                                </tr>
                            `
                        }

                    </tbody>

                </table>

            </div>

        </div>
    `;
}

// ------------------------------------------------------------
// PATIENT FORM
// ------------------------------------------------------------

async function openPatientForm(patientId = null) {

    let patient = null;

    if (patientId) {

        const { data, error } =
            await db
                .from("patients")
                .select("*")
                .eq("id", patientId)
                .single();

        if (error) {
            alert(error.message);
            return;
        }

        patient = data;
    }

    openModal(`
        <h2>${patient ? "Edit Patient" : "Add Patient"}</h2>

        <form id="patientForm">

            <label>Patient Code</label>

            <input
                id="formPatientCode"
                value="${escapeAttribute(patient?.patient_code || generatePatientCode())}"
                ${patient ? "readonly" : ""}
                required
            >

            <label>Name</label>

            <input
                id="formPatientName"
                value="${escapeAttribute(patient?.name || "")}"
                required
            >

            <label>Age</label>

            <input
                id="formPatientAge"
                type="number"
                min="0"
                max="150"
                value="${patient?.age ?? ""}"
            >

            <label>Sex</label>

            <select id="formPatientSex">

                <option value="">Select</option>
                <option value="Male" ${patient?.sex === "Male" ? "selected" : ""}>
                    Male
                </option>

                <option value="Female" ${patient?.sex === "Female" ? "selected" : ""}>
                    Female
                </option>

                <option value="Other" ${patient?.sex === "Other" ? "selected" : ""}>
                    Other
                </option>

            </select>

            <label>Phone</label>

            <input
                id="formPatientPhone"
                value="${escapeAttribute(patient?.phone || "")}"
            >

            <label>Email</label>

            <input
                id="formPatientEmail"
                type="email"
                value="${escapeAttribute(patient?.email || "")}"
            >

            <label>Height (cm)</label>

            <input
                id="formPatientHeight"
                type="number"
                step="0.1"
                value="${patient?.height ?? ""}"
            >

            <label>Weight (kg)</label>

            <input
                id="formPatientWeight"
                type="number"
                step="0.1"
                value="${patient?.weight ?? ""}"
            >

            <label>Notes</label>

            <textarea id="formPatientNotes">${escapeHtml(patient?.notes || "")}</textarea>

            <div class="modal-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="closeModal()">
                    Cancel
                </button>

                <button
                    type="submit"
                    class="primary-btn">
                    ${patient ? "Update Patient" : "Create Patient"}
                </button>

            </div>

        </form>
    `);

    document.getElementById("patientForm")
        .addEventListener("submit", async event => {

            event.preventDefault();

            const payload = {

                patient_code:
                    document.getElementById("formPatientCode").value.trim(),

                name:
                    document.getElementById("formPatientName").value.trim(),

                age:
                    numberOrNull("formPatientAge"),

                sex:
                    document.getElementById("formPatientSex").value || null,

                phone:
                    document.getElementById("formPatientPhone").value.trim() || null,

                email:
                    document.getElementById("formPatientEmail").value.trim() || null,

                height:
                    numberOrNull("formPatientHeight"),

                weight:
                    numberOrNull("formPatientWeight"),

                notes:
                    document.getElementById("formPatientNotes").value.trim() || null
            };

            if (!patient) {
                payload.created_by = currentUser.id;
            }

            let result;

            if (patient) {

                result =
                    await db
                        .from("patients")
                        .update(payload)
                        .eq("id", patient.id);

            } else {

                result =
                    await db
                        .from("patients")
                        .insert(payload);

            }

            if (result.error) {

                alert(result.error.message);
                return;
            }

            closeModal();
            await loadPage("patients");
        });
}

function generatePatientCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 12; i++) {

        if (i === 4 || i === 8) {
            code += "-";
        }

        code +=
            chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
}

async function deletePatient(id) {

    if (!confirm(
        "Delete this patient record?"
    )) return;

    const { error } =
        await db
            .from("patients")
            .update({
                deleted_at: new Date().toISOString()
            })
            .eq("id", id);

    if (error) {

        alert(error.message);
        return;
    }

    await loadPage("patients");
}

// ------------------------------------------------------------
// VIEW PATIENT
// ------------------------------------------------------------

async function viewPatient(id) {

    const { data: patient, error } =
        await db
            .from("patients")
            .select("*")
            .eq("id", id)
            .single();

    if (error) {
        alert(error.message);
        return;
    }

    const { data: measurements } =
        await db
            .from("measurements")
            .select("*")
            .eq("patient_id", id)
            .order("created_at", {
                ascending: false
            });

    openModal(`

        <h2>${escapeHtml(patient.name)}</h2>

        <div class="patient-info">

            <p>
                <strong>Patient Code:</strong>
                ${escapeHtml(patient.patient_code)}
            </p>

            <p>
                <strong>Age:</strong>
                ${patient.age ?? "-"}
            </p>

            <p>
                <strong>Sex:</strong>
                ${escapeHtml(patient.sex || "-")}
            </p>

            <p>
                <strong>Phone:</strong>
                ${escapeHtml(patient.phone || "-")}
            </p>

        </div>

        <h3>Measurements</h3>

        ${
            measurements?.length
            ? `
                <div class="table-container">

                    <table>

                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>f0</th>
                                <th>RMS</th>
                                <th>Bandwidth</th>
                                <th>Q</th>
                            </tr>
                        </thead>

                        <tbody>

                            ${measurements.map(m => `

                                <tr>

                                    <td>
                                        ${formatDate(m.created_at)}
                                    </td>

                                    <td>
                                        ${formatValue(m.f0)} Hz
                                    </td>

                                    <td>
                                        ${formatValue(m.rms)}
                                    </td>

                                    <td>
                                        ${formatValue(m.bandwidth)} Hz
                                    </td>

                                    <td>
                                        ${formatValue(m.q_factor)}
                                    </td>

                                </tr>

                            `).join("")}

                        </tbody>

                    </table>

                </div>
            `
            : `<p>No measurements yet.</p>`
        }

    `);
}

// ------------------------------------------------------------
// MEASUREMENTS
// ------------------------------------------------------------

async function renderMeasurements() {

    const { data, error } =
        await db
            .from("measurements")
            .select(`
                *,
                patients (
                    name,
                    patient_code
                )
            `)
            .order("created_at", {
                ascending: false
            });

    if (error) throw error;

    const content =
        document.getElementById("content");

    content.innerHTML = `

        <div class="page-header">

            <div>
                <h1>Measurements</h1>
                <p>Scanner measurement records.</p>
            </div>

        </div>

        <div class="panel">

            <div class="table-container">

                <table>

                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Patient</th>
                            <th>f0</th>
                            <th>RMS</th>
                            <th>Bandwidth</th>
                            <th>Q-factor</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${
                            data?.length
                            ? data.map(m => `

                                <tr>

                                    <td>
                                        ${formatDate(m.created_at)}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            m.patients?.name || "-"
                                        )}
                                        <small>
                                            ${escapeHtml(
                                                m.patients?.patient_code || ""
                                            )}
                                        </small>
                                    </td>

                                    <td>
                                        ${formatValue(m.f0)} Hz
                                    </td>

                                    <td>
                                        ${formatValue(m.rms)}
                                    </td>

                                    <td>
                                        ${formatValue(m.bandwidth)} Hz
                                    </td>

                                    <td>
                                        ${formatValue(m.q_factor)}
                                    </td>

                                </tr>

                            `).join("")
                            : `
                                <tr>
                                    <td colspan="6">
                                        No measurements found.
                                    </td>
                                </tr>
                            `
                        }

                    </tbody>

                </table>

            </div>

        </div>
    `;
}

// ------------------------------------------------------------
// REFERENCE SAMPLES
// ------------------------------------------------------------

async function renderReferences() {

    if (currentProfile.role !== "admin") {

        document.getElementById("content").innerHTML =
            `<div class="error-box">
                Access restricted to administrators.
            </div>`;

        return;
    }

    const { data, error } =
        await db
            .from("reference_samples")
            .select("*")
            .order("created_at", {
                ascending: false
            });

    if (error) throw error;

    const content =
        document.getElementById("content");

    content.innerHTML = `

        <div class="page-header">

            <div>
                <h1>Reference Samples</h1>
                <p>
                    Device/reference measurements used by the project.
                </p>
            </div>

            <button
                class="primary-btn"
                onclick="openReferenceForm()">
                + Add Reference
            </button>

        </div>

        <div class="panel">

            <div class="table-container">

                <table>

                    <thead>

                        <tr>
                            <th>Name</th>
                            <th>Material</th>
                            <th>Source</th>
                            <th>f0</th>
                            <th>RMS</th>
                            <th>BW</th>
                            <th>Q</th>
                            <th>Actions</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${
                            data?.length
                            ? data.map(ref => `

                                <tr>

                                    <td>
                                        ${escapeHtml(ref.name || "")}
                                    </td>

                                    <td>
                                        ${escapeHtml(ref.material || "-")}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            ref.source_type || "manual"
                                        )}
                                    </td>

                                    <td>
                                        ${formatValue(ref.f0)} Hz
                                    </td>

                                    <td>
                                        ${formatValue(ref.rms)}
                                    </td>

                                    <td>
                                        ${formatValue(ref.bandwidth)} Hz
                                    </td>

                                    <td>
                                        ${formatValue(ref.q_factor)}
                                    </td>

                                    <td>

                                        <button
                                            class="small-btn"
                                            onclick="viewReference('${ref.id}')">
                                            View
                                        </button>

                                        <button
                                            class="small-btn danger"
                                            onclick="deleteReference('${ref.id}')">
                                            Delete
                                        </button>

                                    </td>

                                </tr>

                            `).join("")
                            : `
                                <tr>
                                    <td colspan="8">
                                        No reference samples.
                                    </td>
                                </tr>
                            `
                        }

                    </tbody>

                </table>

            </div>

        </div>
    `;
}

// ------------------------------------------------------------
// ADD REFERENCE
// ------------------------------------------------------------

function openReferenceForm() {

    openModal(`

        <h2>Add Reference Sample</h2>

        <div class="reference-choice">

            <button
                class="choice-card"
                onclick="openManualReferenceForm()">

                <strong>Manual Input</strong>

                <span>
                    Enter an existing reference measurement.
                </span>

            </button>

            <button
                class="choice-card"
                onclick="openReferenceScanForm()">

                <strong>Scan Reference</strong>

                <span>
                    Use the physical Acoustic Bone Scanner.
                </span>

            </button>

        </div>

    `);
}

// ------------------------------------------------------------
// MANUAL REFERENCE
// ------------------------------------------------------------

function openManualReferenceForm() {

    openModal(`

        <h2>Manual Reference</h2>

        <form id="referenceForm">

            <label>Name</label>

            <input
                id="refName"
                required
                placeholder="Reference sample 1"
            >

            <label>Material</label>

            <input
                id="refMaterial"
                placeholder="Test material"
            >

            <label>Description</label>

            <textarea
                id="refDescription">
            </textarea>

            <label>Resonance f0 (Hz)</label>

            <input
                id="refF0"
                type="number"
                step="0.01"
            >

            <label>RMS</label>

            <input
                id="refRMS"
                type="number"
                step="0.001"
            >

            <label>Bandwidth (Hz)</label>

            <input
                id="refBandwidth"
                type="number"
                step="0.01"
            >

            <label>Q-factor</label>

            <input
                id="refQ"
                type="number"
                step="0.01"
            >

            <label>Notes</label>

            <textarea id="refNotes"></textarea>

            <div class="modal-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="openReferenceForm()">
                    Back
                </button>

                <button
                    type="submit"
                    class="primary-btn">
                    Save Reference
                </button>

            </div>

        </form>
    `);

    document.getElementById("referenceForm")
        .addEventListener("submit", saveManualReference);
}

async function saveManualReference(event) {

    event.preventDefault();

    const payload = {

        name:
            document.getElementById("refName").value.trim(),

        material:
            document.getElementById("refMaterial").value.trim() || null,

        description:
            document.getElementById("refDescription").value.trim() || null,

        f0:
            numberOrNull("refF0"),

        rms:
            numberOrNull("refRMS"),

        bandwidth:
            numberOrNull("refBandwidth"),

        q_factor:
            numberOrNull("refQ"),

        notes:
            document.getElementById("refNotes").value.trim() || null,

        source_type: "manual",

        created_by: currentUser.id
    };

    const { error } =
        await db
            .from("reference_samples")
            .insert(payload);

    if (error) {

        alert(error.message);
        return;
    }

    closeModal();
    await loadPage("references");
}

// ------------------------------------------------------------
// REFERENCE SCAN
// ------------------------------------------------------------

async function openReferenceScanForm() {

    const { data: devices, error } =
        await db
            .from("devices")
            .select("*")
            .order("device_code");

    if (error) {

        alert(error.message);
        return;
    }

    openModal(`

        <h2>Scan Reference Sample</h2>

        <p>
            The scanner will perform the same acoustic sweep
            used for measurements.
        </p>

        <form id="referenceScanForm">

            <label>Reference Name</label>

            <input
                id="scanReferenceName"
                required
                placeholder="Reference sample"
            >

            <label>Material</label>

            <input
                id="scanReferenceMaterial"
                placeholder="Material"
            >

            <label>Device</label>

            <select id="scanDevice">

                ${
                    devices?.map(device => `

                        <option value="${device.id}">
                            ${escapeHtml(
                                device.device_code
                            )}
                        </option>

                    `).join("")
                    || ""
                }

            </select>

            <label>Notes</label>

            <textarea id="scanReferenceNotes"></textarea>

            <div class="modal-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="openReferenceForm()">
                    Back
                </button>

                <button
                    type="submit"
                    class="primary-btn">
                    Start Reference Scan
                </button>

            </div>

        </form>

        <div id="referenceScanStatus"></div>
    `);

    document.getElementById("referenceScanForm")
        .addEventListener(
            "submit",
            startReferenceScan
        );
}

async function startReferenceScan(event) {

    event.preventDefault();

    const name =
        document.getElementById(
            "scanReferenceName"
        ).value.trim();

    const material =
        document.getElementById(
            "scanReferenceMaterial"
        ).value.trim();

    const deviceId =
        document.getElementById("scanDevice").value;

    const notes =
        document.getElementById(
            "scanReferenceNotes"
        ).value.trim();

    const status =
        document.getElementById(
            "referenceScanStatus"
        );

    status.innerHTML =
        `<p>Creating scan request...</p>`;

    const { data, error } =
        await db
            .from("scan_requests")
            .insert({

                device_id: deviceId,

                operator_id: currentUser.id,

                scan_type: "reference",

                status: "pending"

            })
            .select()
            .single();

    if (error) {

        status.innerHTML =
            `<p class="error">${escapeHtml(error.message)}</p>`;

        return;
    }

    status.innerHTML = `

        <div class="success-box">

            <strong>Scan request created.</strong>

            <p>
                Waiting for the scanner...
            </p>

            <p>
                Request:
                ${escapeHtml(data.id)}
            </p>

            <button
                class="primary-btn"
                onclick="monitorReferenceScan(
                    '${data.id}',
                    '${escapeAttribute(name)}',
                    '${escapeAttribute(material)}',
                    '${escapeAttribute(notes)}'
                )">
                Monitor Scan
            </button>

        </div>
    `;
}

async function monitorReferenceScan(
    requestId,
    name,
    material,
    notes
) {

    openModal(`

        <h2>Reference Scan</h2>

        <div id="scanMonitor">

            <div class="scanner-animation">
                Waiting for scanner...
            </div>

            <p>
                Request ID:
                ${escapeHtml(requestId)}
            </p>

        </div>
    `);

    const interval =
        setInterval(async () => {

            const { data, error } =
                await db
                    .from("scan_requests")
                    .select("*")
                    .eq("id", requestId)
                    .single();

            if (error) {
                console.error(error);
                return;
            }

            const monitor =
                document.getElementById("scanMonitor");

            if (!monitor) {
                clearInterval(interval);
                return;
            }

            if (data.status === "scanning") {

                monitor.innerHTML = `
                    <div class="scanner-animation">
                        Scanner is measuring...
                    </div>

                    <p>
                        Acoustic frequency sweep in progress.
                    </p>
                `;

            } else if (data.status === "completed") {

                clearInterval(interval);

                await showCompletedReferenceScan(
                    requestId,
                    name,
                    material,
                    notes
                );

            } else if (data.status === "error") {

                clearInterval(interval);

                monitor.innerHTML = `
                    <div class="error-box">

                        <h3>Scan Error</h3>

                        <p>
                            The scanner reported an error.
                        </p>

                    </div>
                `;
            }

        }, 1000);
}

async function showCompletedReferenceScan(
    requestId,
    name,
    material,
    notes
) {

    const { data: measurement, error } =
        await db
            .from("measurements")
            .select("*")
            .eq("scan_request_id", requestId)
            .single();

    if (error) {

        console.error(error);

        document.getElementById(
            "scanMonitor"
        ).innerHTML = `
            <div class="error-box">
                Scan completed but result was not found.
            </div>
        `;

        return;
    }

    document.getElementById(
        "scanMonitor"
    ).innerHTML = `

        <div class="success-box">

            <h3>Scan Complete</h3>

            <div class="result-grid">

                <div>
                    <span>f0</span>
                    <strong>
                        ${formatValue(measurement.f0)} Hz
                    </strong>
                </div>

                <div>
                    <span>RMS</span>
                    <strong>
                        ${formatValue(measurement.rms)}
                    </strong>
                </div>

                <div>
                    <span>Bandwidth</span>
                    <strong>
                        ${formatValue(measurement.bandwidth)} Hz
                    </strong>
                </div>

                <div>
                    <span>Q-factor</span>
                    <strong>
                        ${formatValue(measurement.q_factor)}
                    </strong>
                </div>

            </div>

            <p>
                Review the result before saving it.
            </p>

            <button
                class="primary-btn"
                onclick="saveScannedReference(
                    '${requestId}',
                    '${escapeAttribute(name)}',
                    '${escapeAttribute(material)}',
                    '${escapeAttribute(notes)}'
                )">
                Save Reference
            </button>

            <button
                class="secondary-btn"
                onclick="closeModal()">
                Cancel
            </button>

        </div>
    `;
}

async function saveScannedReference(
    requestId,
    name,
    material,
    notes
) {

    const { data: measurement, error } =
        await db
            .from("measurements")
            .select("*")
            .eq("scan_request_id", requestId)
            .single();

    if (error) {

        alert(error.message);
        return;
    }

    const payload = {

        name,

        material: material || null,

        description: "Reference scanned using ABS device.",

        f0: measurement.f0,

        rms: measurement.rms,

        bandwidth: measurement.bandwidth,

        q_factor: measurement.q_factor,

        notes: notes || null,

        source_type: "scanned",

        device_id: measurement.device_id,

        scan_request_id: requestId,

        created_by: currentUser.id,

        frequency_start:
            measurement.frequency_start,

        frequency_end:
            measurement.frequency_end,

        frequency_step:
            measurement.frequency_step,

        raw_data:
            measurement.raw_data
    };

    const { error: saveError } =
        await db
            .from("reference_samples")
            .insert(payload);

    if (saveError) {

        alert(saveError.message);
        return;
    }

    closeModal();

    await loadPage("references");
}

// ------------------------------------------------------------
// VIEW / DELETE REFERENCE
// ------------------------------------------------------------

async function viewReference(id) {

    const { data, error } =
        await db
            .from("reference_samples")
            .select("*")
            .eq("id", id)
            .single();

    if (error) {

        alert(error.message);
        return;
    }

    openModal(`

        <h2>${escapeHtml(data.name)}</h2>

        <div class="result-grid">

            <div>
                <span>Material</span>
                <strong>
                    ${escapeHtml(data.material || "-")}
                </strong>
            </div>

            <div>
                <span>Source</span>
                <strong>
                    ${escapeHtml(data.source_type || "-")}
                </strong>
            </div>

            <div>
                <span>f0</span>
                <strong>
                    ${formatValue(data.f0)} Hz
                </strong>
            </div>

            <div>
                <span>RMS</span>
                <strong>
                    ${formatValue(data.rms)}
                </strong>
            </div>

            <div>
                <span>Bandwidth</span>
                <strong>
                    ${formatValue(data.bandwidth)} Hz
                </strong>
            </div>

            <div>
                <span>Q-factor</span>
                <strong>
                    ${formatValue(data.q_factor)}
                </strong>
            </div>

        </div>

        <p>
            ${escapeHtml(data.description || "")}
        </p>

        <p>
            ${escapeHtml(data.notes || "")}
        </p>
    `);
}

async function deleteReference(id) {

    if (!confirm(
        "Delete this reference sample?"
    )) return;

    const { error } =
        await db
            .from("reference_samples")
            .delete()
            .eq("id", id);

    if (error) {

        alert(error.message);
        return;
    }

    await loadPage("references");
}

// ------------------------------------------------------------
// DEVICES
// ------------------------------------------------------------

async function renderDevices() {

    const { data, error } =
        await db
            .from("devices")
            .select("*")
            .order("created_at");

    if (error) throw error;

    const content =
        document.getElementById("content");

    content.innerHTML = `

        <div class="page-header">

            <div>
                <h1>Devices</h1>
                <p>Scanner device status.</p>
            </div>

        </div>

        <div class="device-grid">

            ${
                data?.map(device => {

                    let status = "Offline";

                    if (device.last_seen) {

                        const age =
                            Date.now() -
                            new Date(device.last_seen).getTime();

                        if (age < 15000) {
                            status = "Online";
                        }
                    }

                    return `

                        <div class="device-card">

                            <h2>
                                ${escapeHtml(
                                    device.device_code
                                )}
                            </h2>

                            <p>
                                ${escapeHtml(
                                    device.device_name || ""
                                )}
                            </p>

                            <div class="device-status">

                                <span class="status-dot"></span>

                                ${status}

                            </div>

                            <p>
                                Firmware:
                                ${escapeHtml(
                                    device.firmware_version || "-"
                                )}
                            </p>

                            <p>
                                Last seen:
                                ${device.last_seen
                                    ? formatDate(device.last_seen)
                                    : "Never"}
                            </p>

                        </div>
                    `;
                }).join("")
                || `<p>No devices registered.</p>`
            }

        </div>
    `;
}

// ------------------------------------------------------------
// OPERATORS
// ------------------------------------------------------------

async function renderOperators() {

    if (currentProfile.role !== "admin") {

        document.getElementById("content").innerHTML =
            `<div class="error-box">
                Administrator access required.
            </div>`;

        return;
    }

    const { data, error } =
        await db
            .from("profiles")
            .select("*")
            .eq("role", "operator")
            .order("created_at");

    if (error) throw error;

    const content =
        document.getElementById("content");

    content.innerHTML = `

        <div class="page-header">

            <div>
                <h1>Operators</h1>

                <p>
                    Scanner operators registered in the system.
                </p>

            </div>

        </div>

        <div class="panel">

            <div class="table-container">

                <table>

                    <thead>

                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Created</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${
                            data?.length
                            ? data.map(operator => `

                                <tr>

                                    <td>
                                        ${escapeHtml(
                                            operator.name || "-"
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            operator.email || "-"
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            operator.created_at
                                        )}
                                    </td>

                                </tr>

                            `).join("")
                            : `
                                <tr>
                                    <td colspan="3">
                                        No operators found.
                                    </td>
                                </tr>
                            `
                        }

                    </tbody>

                </table>

            </div>

        </div>

        <div class="info-box">

            <strong>Operator account creation</strong>

            <p>
                For the current no-server architecture,
                authentication users are created through the
                Supabase Auth dashboard, then their profile role
                is set to "operator".
            </p>

        </div>
    `;
}

// ------------------------------------------------------------
// NEW PATIENT SCAN
// ------------------------------------------------------------

async function renderNewPatientScan() {

    const { data: patients, error } =
        await db
            .from("patients")
            .select("*")
            .is("deleted_at", null)
            .order("name");

    if (error) throw error;

    const { data: devices } =
        await db
            .from("devices")
            .select("*")
            .order("device_code");

    const content =
        document.getElementById("content");

    content.innerHTML = `

        <div class="page-header">

            <div>
                <h1>New Patient Scan</h1>

                <p>
                    Send a scan request to the scanner.
                </p>

            </div>

        </div>

        <div class="panel">

            <form id="patientScanForm">

                <label>Patient</label>

                <select id="scanPatient" required>

                    <option value="">
                        Select patient
                    </option>

                    ${
                        patients?.map(patient => `

                            <option value="${patient.id}">

                                ${escapeHtml(
                                    patient.name
                                )}
                                —
                                ${escapeHtml(
                                    patient.patient_code
                                )}

                            </option>

                        `).join("")
                        || ""
                    }

                </select>

                <label>Scanner</label>

                <select id="patientScanDevice" required>

                    ${
                        devices?.map(device => `

                            <option value="${device.id}">
                                ${escapeHtml(
                                    device.device_code
                                )}
                            </option>

                        `).join("")
                        || ""
                    }

                </select>

                <button
                    type="submit"
                    class="primary-btn">
                    Start Scan
                </button>

            </form>

            <div id="patientScanStatus"></div>

        </div>
    `;

    document.getElementById("patientScanForm")
        .addEventListener(
            "submit",
            startPatientScan
        );
}

async function startPatientScan(event) {

    event.preventDefault();

    const patientId =
        document.getElementById(
            "scanPatient"
        ).value;

    const deviceId =
        document.getElementById(
            "patientScanDevice"
        ).value;

    const status =
        document.getElementById(
            "patientScanStatus"
        );

    status.innerHTML =
        `<p>Creating scan request...</p>`;

    const { data, error } =
        await db
            .from("scan_requests")
            .insert({

                patient_id: patientId,

                device_id: deviceId,

                operator_id: currentUser.id,

                scan_type: "patient",

                status: "pending"

            })
            .select()
            .single();

    if (error) {

        status.innerHTML = `
            <div class="error-box">
                ${escapeHtml(error.message)}
            </div>
        `;

        return;
    }

    status.innerHTML = `

        <div class="success-box">

            <h3>Scan Requested</h3>

            <p>
                Request sent to the scanner.
            </p>

            <p>
                Waiting for ABS device...
            </p>

            <button
                class="secondary-btn"
                onclick="monitorPatientScan('${data.id}')">
                Monitor Scan
            </button>

        </div>
    `;
}

// ------------------------------------------------------------
// MONITOR PATIENT SCAN
// ------------------------------------------------------------

async function monitorPatientScan(requestId) {

    openModal(`

        <h2>Patient Scan</h2>

        <div id="patientScanMonitor">

            <div class="scanner-animation">
                Waiting for scanner...
            </div>

            <p>
                Request ID:
                ${escapeHtml(requestId)}
            </p>

        </div>

    `);

    const interval =
        setInterval(async () => {

            const { data, error } =
                await db
                    .from("scan_requests")
                    .select("*")
                    .eq("id", requestId)
                    .single();

            if (error) {
                console.error(error);
                return;
            }

            const monitor =
                document.getElementById(
                    "patientScanMonitor"
                );

            if (!monitor) {

                clearInterval(interval);
                return;
            }

            if (data.status === "scanning") {

                monitor.innerHTML = `

                    <div class="scanner-animation">
                        Scanning...
                    </div>

                    <p>
                        The Acoustic Bone Scanner
                        is performing the frequency sweep.
                    </p>

                `;

            } else if (data.status === "completed") {

                clearInterval(interval);

                const { data: measurement } =
                    await db
                        .from("measurements")
                        .select("*")
                        .eq(
                            "scan_request_id",
                            requestId
                        )
                        .single();

                renderScanResult(
                    monitor,
                    measurement
                );

            } else if (data.status === "error") {

                clearInterval(interval);

                monitor.innerHTML = `

                    <div class="error-box">

                        <h3>Scan Error</h3>

                        <p>
                            The scanner reported an error.
                        </p>

                    </div>

                `;
            }

        }, 1000);
}

function renderScanResult(container, measurement) {

    if (!measurement) {

        container.innerHTML = `
            <div class="error-box">
                Measurement result was not found.
            </div>
        `;

        return;
    }

    container.innerHTML = `

        <div class="success-box">

            <h2>Scan Complete</h2>

            <div class="result-grid">

                <div>
                    <span>Resonance f0</span>
                    <strong>
                        ${formatValue(measurement.f0)}
                        Hz
                    </strong>
                </div>

                <div>
                    <span>RMS</span>
                    <strong>
                        ${formatValue(measurement.rms)}
                    </strong>
                </div>

                <div>
                    <span>Bandwidth</span>
                    <strong>
                        ${formatValue(
                            measurement.bandwidth
                        )}
                        Hz
                    </strong>
                </div>

                <div>
                    <span>Q-factor</span>
                    <strong>
                        ${formatValue(
                            measurement.q_factor
                        )}
                    </strong>
                </div>

            </div>

            <p>
                Measurement has been stored in the database.
            </p>

        </div>
    `;
}

// ------------------------------------------------------------
// PATIENT PORTAL
// ------------------------------------------------------------

function renderPatientPortal(patient) {

    const content =
        document.getElementById(
            "patientContent"
        );

    const measurements =
        patient.measurements || [];

    content.innerHTML = `

        <div class="patient-header">

            <h1>
                Welcome,
                ${escapeHtml(patient.name || "Patient")}
            </h1>

            <p>
                Patient Code:
                <strong>
                    ${escapeHtml(
                        patient.patient_code || ""
                    )}
                </strong>
            </p>

        </div>

        <div class="patient-grid">

            <div class="patient-card">

                <h2>My Details</h2>

                <p>
                    <strong>Name:</strong>
                    ${escapeHtml(patient.name || "-")}
                </p>

                <p>
                    <strong>Age:</strong>
                    ${patient.age ?? "-"}
                </p>

                <p>
                    <strong>Sex:</strong>
                    ${escapeHtml(patient.sex || "-")}
                </p>

            </div>

            <div class="patient-card">

                <h2>My Measurements</h2>

                <strong>
                    ${measurements.length}
                </strong>

                <span>
                    recorded measurements
                </span>

            </div>

        </div>

        <div class="panel">

            <h2>Measurement Results</h2>

            ${
                measurements.length
                ? `

                    <div class="table-container">

                        <table>

                            <thead>

                                <tr>
                                    <th>Date</th>
                                    <th>f0</th>
                                    <th>RMS</th>
                                    <th>Bandwidth</th>
                                    <th>Q-factor</th>
                                </tr>

                            </thead>

                            <tbody>

                                ${measurements.map(m => `

                                    <tr>

                                        <td>
                                            ${formatDate(
                                                m.created_at
                                            )}
                                        </td>

                                        <td>
                                            ${formatValue(
                                                m.f0
                                            )} Hz
                                        </td>

                                        <td>
                                            ${formatValue(
                                                m.rms
                                            )}
                                        </td>

                                        <td>
                                            ${formatValue(
                                                m.bandwidth
                                            )} Hz
                                        </td>

                                        <td>
                                            ${formatValue(
                                                m.q_factor
                                            )}
                                        </td>

                                    </tr>

                                `).join("")}

                            </tbody>

                        </table>

                    </div>

                `
                : `
                    <div class="empty-state">
                        No measurements are available yet.
                    </div>
                `
            }

        </div>

        <div class="info-box">

            <strong>Important</strong>

            <p>
                This system is an experimental acoustic
                measurement prototype. Results should not
                be interpreted as a clinical diagnosis or
                as a replacement for clinical bone-density
                testing.
            </p>

        </div>
    `;
}

// ------------------------------------------------------------
// MODAL
// ------------------------------------------------------------

function openModal(content) {

    const modal =
        document.getElementById(
            "modalContainer"
        );

    modal.innerHTML = `

        <div class="modal-backdrop"
             onclick="handleModalBackdrop(event)">

            <div class="modal"
                 onclick="event.stopPropagation()">

                <button
                    class="modal-close"
                    onclick="closeModal()">
                    ×
                </button>

                ${content}

            </div>

        </div>
    `;

    modal.style.display = "block";
}

function closeModal() {

    const modal =
        document.getElementById(
            "modalContainer"
        );

    modal.style.display = "none";
    modal.innerHTML = "";
}

function handleModalBackdrop(event) {

    if (
        event.target.classList.contains(
            "modal-backdrop"
        )
    ) {
        closeModal();
    }
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function numberOrNull(id) {

    const value =
        document.getElementById(id).value;

    if (value === "") return null;

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

function formatValue(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "N/A";
    }

    if (typeof value === "number") {

        return Number.isInteger(value)
            ? value
            : value.toFixed(2);
    }

    return escapeHtml(String(value));
}

function formatDate(value) {

    if (!value) return "-";

    try {

        return new Date(value)
            .toLocaleString();

    } catch {

        return value;
    }
}

function capitalize(value) {

    if (!value) return "";

    return value.charAt(0).toUpperCase() +
        value.slice(1);
}

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {

    return escapeHtml(value);
}

function showGlobalError(message) {

    let app =
        document.getElementById("app");

    if (!app) {

        app = document.createElement("div");
        app.id = "app";

        document.body.appendChild(app);
    }

    app.innerHTML = `

        <div class="error-box"
             style="margin:40px;">

            <h2>Application Error</h2>

            <p>
                ${escapeHtml(message)}
            </p>

        </div>
    `;
}

// ------------------------------------------------------------
// MAKE FUNCTIONS AVAILABLE TO HTML BUTTONS
// ------------------------------------------------------------

window.loadPage = loadPage;

window.openPatientForm = openPatientForm;
window.deletePatient = deletePatient;
window.viewPatient = viewPatient;

window.openReferenceForm = openReferenceForm;
window.openManualReferenceForm =
    openManualReferenceForm;
window.openReferenceScanForm =
    openReferenceScanForm;

window.monitorReferenceScan =
    monitorReferenceScan;

window.saveScannedReference =
    saveScannedReference;

window.viewReference = viewReference;
window.deleteReference = deleteReference;

window.monitorPatientScan =
    monitorPatientScan;

window.closeModal = closeModal;

window.startPatientScan =
    startPatientScan;
