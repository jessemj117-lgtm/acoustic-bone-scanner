const db = window.supabaseClient;

console.log("Acoustic Bone Scanner app.js loaded");

let currentUser = null;
let currentProfile = null;
let patientPortalData = null;


/* =========================================================
   BASIC HELPERS
========================================================= */

function $(id) {
    return document.getElementById(id);
}

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showMessage(elementId, message, type = "") {
    const element = $(elementId);

    if (!element) return;

    element.textContent = message;
    element.className = "message";

    if (type) {
        element.classList.add(type);
    }
}

function formatDate(value) {
    if (!value) return "—";

    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}

function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return escapeHtml(value);
    }

    return number.toFixed(decimals);
}

function isAdmin() {
    return currentProfile?.role === "admin";
}

function isOperator() {
    return currentProfile?.role === "operator";
}


/* =========================================================
   PAGE MANAGEMENT
========================================================= */

function hideAllPages() {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.add("hidden");
    });
}

function showPage(id) {
    hideAllPages();

    const page = $(id);

    if (page) {
        page.classList.remove("hidden");
    }
}

function showDashboard() {
    showPage("dashboardPage");
}

function showLoginPage() {
    showPage("loginPage");
}

function showPatientPortal() {
    showPage("patientPage");
}

function showPatientResults() {
    showPage("patientResultsPage");
}


/* =========================================================
   APPLICATION PANEL
========================================================= */

function getApplicationPanel() {
    let panel = $("applicationPanel");

    if (!panel) {
        panel = document.createElement("main");
        panel.id = "applicationPanel";
        panel.className = "page hidden";

        const app = document.querySelector(".app");

        if (app) {
            app.appendChild(panel);
        } else {
            document.body.appendChild(panel);
        }
    }

    return panel;
}

function openPanel(title, content) {
    const panel = getApplicationPanel();

    panel.innerHTML = `
        <div class="dashboard-header">
            <div>
                <h2>${escapeHtml(title)}</h2>
                <p>${escapeHtml(currentProfile?.name || "")}</p>
            </div>

            <button
                class="secondary-button"
                onclick="returnToDashboard()">
                ← Dashboard
            </button>
        </div>

        <div class="welcome-panel">
            ${content}
        </div>
    `;

    showPage("applicationPanel");
}

function returnToDashboard() {
    showDashboard();
}


/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(event) {
    event.preventDefault();

    console.log("LOGIN BUTTON CLICKED");

    const email = $("email")?.value.trim();
    const password = $("password")?.value;

    if (!email || !password) {
        showMessage("loginMessage", "Enter email and password.", "error");
        return;
    }

    showMessage("loginMessage", "Logging in...");

    try {
        currentUser = await loginUser(email, password);

        if (!currentUser) {
            throw new Error("Login failed.");
        }

        console.log("Logged in user:", currentUser);

        currentProfile = await getCurrentProfile();

        console.log("User profile:", currentProfile);

        if (!currentProfile) {
            throw new Error(
                "No profile found for this account."
            );
        }

        if (
            currentProfile.role !== "admin" &&
            currentProfile.role !== "operator"
        ) {
            throw new Error(
                "This account does not have operator/admin access."
            );
        }

        $("loginMessage").textContent = "";

        updateDashboardForRole();

        await loadDashboardCounts();

        showDashboard();

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        showMessage(
            "loginMessage",
            error?.message || "Login failed.",
            "error"
        );
    }
}


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboardForRole() {
    if ($("dashboardTitle")) {
        $("dashboardTitle").textContent =
            isAdmin()
                ? "Administrator Dashboard"
                : "Operator Dashboard";
    }

    if ($("userInfo")) {
        $("userInfo").textContent =
            `${currentProfile.name || ""} • ${currentProfile.role}`;
    }

    document.querySelectorAll(".admin-only").forEach(element => {
        if (isAdmin()) {
            element.classList.remove("hidden");
        } else {
            element.classList.add("hidden");
        }
    });

    setupDashboardCards();
}

async function loadDashboardCounts() {
    try {
        const patientResult = await db
            .from("patients")
            .select("id", { count: "exact", head: true })
            .is("deleted_at", null);

        if (!patientResult.error && $("patientCount")) {
            $("patientCount").textContent =
                patientResult.count ?? 0;
        }

        const measurementResult = await db
            .from("measurements")
            .select("id", { count: "exact", head: true });

        if (!measurementResult.error && $("measurementCount")) {
            $("measurementCount").textContent =
                measurementResult.count ?? 0;
        }

        const referenceResult = await db
            .from("reference_samples")
            .select("id", { count: "exact", head: true });

        if (!referenceResult.error && $("referenceCount")) {
            $("referenceCount").textContent =
                referenceResult.count ?? 0;
        }

        const deviceResult = await db
            .from("devices")
            .select("id", { count: "exact", head: true });

        if (!deviceResult.error && $("deviceCount")) {
            $("deviceCount").textContent =
                deviceResult.count ?? 0;
        }

        if ($("systemStatus")) {
            $("systemStatus").textContent =
                "Connected to Supabase";
        }

    } catch (error) {
        console.error("Dashboard count error:", error);

        if ($("systemStatus")) {
            $("systemStatus").textContent =
                "Database connection error";
        }
    }
}

function setupDashboardCards() {
    const cards = document.querySelectorAll(".dashboard-card");

    cards.forEach(card => {
        card.style.cursor = "pointer";
    });

    const patientCard = $("patientCount")?.closest(".dashboard-card");

    if (patientCard) {
        patientCard.onclick = openPatientManagement;
    }

    const measurementCard =
        $("measurementCount")?.closest(".dashboard-card");

    if (measurementCard) {
        measurementCard.onclick =
            openMeasurementManagement;
    }

    const referenceCard = $("referenceCard");

    if (referenceCard) {
        referenceCard.onclick =
            openReferenceManagement;

        referenceCard.style.cursor =
            isAdmin() ? "pointer" : "default";
    }

    const deviceCard = $("deviceCard");

    if (deviceCard) {
        deviceCard.onclick =
            openDeviceManagement;

        deviceCard.style.cursor =
            isAdmin() ? "pointer" : "default";
    }
}


/* =========================================================
   PATIENT MANAGEMENT
========================================================= */

async function openPatientManagement() {
    openPanel(
        "Patient Management",
        `<p>Loading patients...</p>`
    );

    await loadPatients();
}

async function loadPatients() {
    const panel = getApplicationPanel();

    const { data, error } = await db
        .from("patients")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);

        panel.querySelector(".welcome-panel").innerHTML = `
            <div class="message error">
                Failed to load patients: ${escapeHtml(error.message)}
            </div>
        `;

        return;
    }

    let html = `
        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:12px;
            flex-wrap:wrap;
            margin-bottom:20px;
        ">
            <div>
                <h3>Patients</h3>
                <p>${data.length} active patient(s)</p>
            </div>

            <button
                class="primary-button"
                onclick="openPatientForm()">
                + Add Patient
            </button>
        </div>
    `;

    if (!data.length) {
        html += `
            <div class="message">
                No patients have been registered yet.
            </div>
        `;
    } else {
        html += `
            <div style="overflow-x:auto;">
                <table class="data-table">
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
        `;

        data.forEach(patient => {
            html += `
                <tr>
                    <td>
                        <strong>
                            ${escapeHtml(patient.patient_code)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(patient.name)}
                    </td>

                    <td>
                        ${escapeHtml(patient.age ?? "—")}
                    </td>

                    <td>
                        ${escapeHtml(patient.sex ?? "—")}
                    </td>

                    <td>
                        ${escapeHtml(patient.phone ?? "—")}
                    </td>

                    <td>
                        <button
                            class="secondary-button"
                            onclick="viewPatient('${patient.id}')">
                            View
                        </button>

                        <button
                            class="secondary-button"
                            onclick="openPatientForm('${patient.id}')">
                            Edit
                        </button>

                        <button
                            class="primary-button"
                            onclick="startPatientScan('${patient.id}')">
                            Scan
                        </button>

                        <button
                            class="secondary-button"
                            onclick="deletePatient('${patient.id}')">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    panel.querySelector(".welcome-panel").innerHTML = html;
}


/* =========================================================
   PATIENT FORM
========================================================= */

async function openPatientForm(patientId = null) {
    let patient = null;

    if (patientId) {
        const result = await db
            .from("patients")
            .select("*")
            .eq("id", patientId)
            .single();

        if (result.error) {
            alert(result.error.message);
            return;
        }

        patient = result.data;
    }

    const title =
        patient ? "Edit Patient" : "Add Patient";

    const html = `
        <div class="form-card">

            <h3>${title}</h3>

            <form id="patientForm">

                <label>Patient Code</label>
                <input
                    type="text"
                    id="patientFormCode"
                    value="${escapeHtml(patient?.patient_code || "")}"
                    placeholder="Example: K7F9-X2PQ-81"
                    ${patient ? "readonly" : ""}
                    required>

                <label>Name</label>
                <input
                    type="text"
                    id="patientFormName"
                    value="${escapeHtml(patient?.name || "")}"
                    required>

                <label>Age</label>
                <input
                    type="number"
                    id="patientFormAge"
                    value="${escapeHtml(patient?.age ?? "")}"
                    min="1"
                    max="120">

                <label>Sex</label>
                <select id="patientFormSex">
                    <option value="">Select</option>
                    <option value="Male"
                        ${patient?.sex === "Male" ? "selected" : ""}>
                        Male
                    </option>
                    <option value="Female"
                        ${patient?.sex === "Female" ? "selected" : ""}>
                        Female
                    </option>
                    <option value="Other"
                        ${patient?.sex === "Other" ? "selected" : ""}>
                        Other
                    </option>
                </select>

                <label>Phone</label>
                <input
                    type="text"
                    id="patientFormPhone"
                    value="${escapeHtml(patient?.phone || "")}">

                <label>Email</label>
                <input
                    type="email"
                    id="patientFormEmail"
                    value="${escapeHtml(patient?.email || "")}">

                <label>Height (cm)</label>
                <input
                    type="number"
                    step="0.1"
                    id="patientFormHeight"
                    value="${escapeHtml(patient?.height ?? "")}">

                <label>Weight (kg)</label>
                <input
                    type="number"
                    step="0.1"
                    id="patientFormWeight"
                    value="${escapeHtml(patient?.weight ?? "")}">

                <label>Notes</label>
                <textarea id="patientFormNotes">${escapeHtml(
                    patient?.notes || ""
                )}</textarea>

                <div style="
                    display:flex;
                    gap:10px;
                    margin-top:20px;
                    flex-wrap:wrap;
                ">

                    <button
                        type="submit"
                        class="primary-button">
                        ${patient ? "Save Changes" : "Create Patient"}
                    </button>

                    <button
                        type="button"
                        class="secondary-button"
                        onclick="openPatientManagement()">
                        Cancel
                    </button>

                </div>

                <div
                    id="patientFormMessage"
                    class="message">
                </div>

            </form>
        </div>
    `;

    openPanel(title, html);

    $("patientForm").addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            await savePatient(patientId);
        }
    );
}

async function savePatient(patientId) {
    const message = $("patientFormMessage");

    const patientCode =
        $("patientFormCode").value.trim();

    const name =
        $("patientFormName").value.trim();

    if (!patientCode || !name) {
        showMessage(
            "patientFormMessage",
            "Patient code and name are required.",
            "error"
        );

        return;
    }

    const patientData = {
        patient_code: patientCode,
        name,
        age: $("patientFormAge").value
            ? Number($("patientFormAge").value)
            : null,
        sex: $("patientFormSex").value || null,
        phone: $("patientFormPhone").value.trim() || null,
        email: $("patientFormEmail").value.trim() || null,
        height: $("patientFormHeight").value
            ? Number($("patientFormHeight").value)
            : null,
        weight: $("patientFormWeight").value
            ? Number($("patientFormWeight").value)
            : null,
        notes: $("patientFormNotes").value.trim() || null
    };

    showMessage(
        "patientFormMessage",
        "Saving..."
    );

    try {
        if (patientId) {

            const { error } = await db
                .from("patients")
                .update(patientData)
                .eq("id", patientId);

            if (error) throw error;

        } else {

            patientData.created_by =
                currentUser.id;

            const { error } = await db
                .from("patients")
                .insert(patientData);

            if (error) throw error;
        }

        await loadDashboardCounts();
        await openPatientManagement();

    } catch (error) {
        console.error(error);

        showMessage(
            "patientFormMessage",
            error.message || "Unable to save patient.",
            "error"
        );
    }
}


/* =========================================================
   VIEW PATIENT
========================================================= */

async function viewPatient(patientId) {
    const patientResult = await db
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

    if (patientResult.error) {
        alert(patientResult.error.message);
        return;
    }

    const patient = patientResult.data;

    const measurementResult = await db
        .from("measurements")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

    const measurements =
        measurementResult.data || [];

    const html = `
        <div style="margin-bottom:25px;">
            <h3>${escapeHtml(patient.name)}</h3>

            <p>
                <strong>Patient Code:</strong>
                ${escapeHtml(patient.patient_code)}
            </p>

            <p>
                <strong>Age:</strong>
                ${escapeHtml(patient.age ?? "—")}
            </p>

            <p>
                <strong>Sex:</strong>
                ${escapeHtml(patient.sex ?? "—")}
            </p>

            <p>
                <strong>Phone:</strong>
                ${escapeHtml(patient.phone ?? "—")}
            </p>

            <p>
                <strong>Height:</strong>
                ${escapeHtml(patient.height ?? "—")} cm
            </p>

            <p>
                <strong>Weight:</strong>
                ${escapeHtml(patient.weight ?? "—")} kg
            </p>

            <p>
                <strong>Notes:</strong>
                ${escapeHtml(patient.notes ?? "—")}
            </p>
        </div>

        <hr>

        <h3>Measurements</h3>

        ${
            measurements.length
                ? `
                    <div style="overflow-x:auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>f₀ (Hz)</th>
                                    <th>RMS</th>
                                    <th>BW (Hz)</th>
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
                                            ${formatNumber(m.f0, 1)}
                                        </td>
                                        <td>
                                            ${formatNumber(m.rms, 3)}
                                        </td>
                                        <td>
                                            ${formatNumber(m.bandwidth, 1)}
                                        </td>
                                        <td>
                                            ${formatNumber(m.q_factor, 2)}
                                        </td>
                                    </tr>
                                `).join("")}

                            </tbody>
                        </table>
                    </div>
                `
                : `
                    <div class="message">
                        No measurements yet.
                    </div>
                `
        }

        <div style="margin-top:20px;">
            <button
                class="primary-button"
                onclick="startPatientScan('${patient.id}')">
                Start Scan
            </button>

            <button
                class="secondary-button"
                onclick="openPatientManagement()">
                Back
            </button>
        </div>
    `;

    openPanel(
        `Patient: ${patient.name}`,
        html
    );
}


/* =========================================================
   DELETE PATIENT
========================================================= */

async function deletePatient(patientId) {
    const confirmed = confirm(
        "Delete this patient?\n\n" +
        "The patient will be hidden from the active patient list."
    );

    if (!confirmed) return;

    const { error } = await db
        .from("patients")
        .update({
            deleted_at: new Date().toISOString()
        })
        .eq("id", patientId);

    if (error) {
        alert(
            "Unable to delete patient:\n" +
            error.message
        );

        return;
    }

    await loadDashboardCounts();
    await openPatientManagement();
}


/* =========================================================
   START PATIENT SCAN
========================================================= */

async function startPatientScan(patientId) {
    const patientResult = await db
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

    if (patientResult.error) {
        alert(patientResult.error.message);
        return;
    }

    const patient = patientResult.data;

    const deviceResult = await db
        .from("devices")
        .select("*")
        .eq("device_code", "ABS-001")
        .limit(1);

    if (deviceResult.error) {
        alert(deviceResult.error.message);
        return;
    }

    const device = deviceResult.data?.[0];

    if (!device) {
        alert(
            "Scanner ABS-001 was not found in the database."
        );

        return;
    }

    const confirmed = confirm(
        `Start an acoustic scan for ${patient.name}?`
    );

    if (!confirmed) return;

    const { data, error } = await db
        .from("scan_requests")
        .insert({
            device_id: device.id,
            patient_id: patient.id,
            operator_id: currentUser.id,
            status: "pending"
        })
        .select()
        .single();

    if (error) {
        console.error(error);

        alert(
            "Could not create scan request:\n" +
            error.message
        );

        return;
    }

    openScanMonitor(data.id, patient);
}


/* =========================================================
   SCAN MONITOR
========================================================= */

async function openScanMonitor(
    scanRequestId,
    patient
) {
    const html = `
        <div style="text-align:center; padding:20px;">

            <h3>
                Scan for ${escapeHtml(patient.name)}
            </h3>

            <div id="scanStatusBox"
                 class="message"
                 style="margin:20px 0;">
                Waiting for scanner...
            </div>

            <div id="scanDetails">
                Scanner: ABS-001<br>
                Request ID:
                ${escapeHtml(scanRequestId)}
            </div>

            <div style="margin-top:25px;">

                <button
                    class="secondary-button"
                    onclick="cancelScan('${scanRequestId}')">
                    Cancel Scan
                </button>

            </div>

        </div>
    `;

    openPanel(
        "Acoustic Scan",
        html
    );

    monitorScanRequest(
        scanRequestId,
        patient
    );
}

async function monitorScanRequest(
    scanRequestId,
    patient
) {
    let attempts = 0;

    const timer = setInterval(async () => {

        attempts++;

        const { data, error } = await db
            .from("scan_requests")
            .select("*")
            .eq("id", scanRequestId)
            .single();

        if (error) {
            console.error(error);
            return;
        }

        const statusElement =
            $("scanStatusBox");

        if (!statusElement) {
            clearInterval(timer);
            return;
        }

        if (data.status === "pending") {

            statusElement.textContent =
                "Waiting for scanner ABS-001...";

        } else if (data.status === "scanning") {

            statusElement.textContent =
                "Scanner is performing measurement...";

        } else if (data.status === "completed") {

            clearInterval(timer);

            statusElement.textContent =
                "Scan completed.";

            await showCompletedScan(
                scanRequestId,
                patient
            );

        } else if (data.status === "cancelled") {

            clearInterval(timer);

            statusElement.textContent =
                "Scan cancelled.";

        } else if (data.status === "error") {

            clearInterval(timer);

            statusElement.textContent =
                "Scanner reported an error.";

        }

        /*
         * Poll every second.
         *
         * This is deliberately simple for the first
         * prototype. Supabase Realtime can be added later.
         */
    }, 1000);

    /*
     * Safety timeout.
     * 30 minutes is long enough for development/testing.
     */
    setTimeout(() => {
        clearInterval(timer);
    }, 30 * 60 * 1000);
}


/* =========================================================
   CANCEL SCAN
========================================================= */

async function cancelScan(scanRequestId) {
    const confirmed = confirm(
        "Cancel this scan?"
    );

    if (!confirmed) return;

    const { error } = await db
        .from("scan_requests")
        .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString()
        })
        .eq("id", scanRequestId)
        .eq("status", "pending");

    if (error) {
        alert(error.message);
        return;
    }

    returnToDashboard();
}


/* =========================================================
   COMPLETED SCAN
========================================================= */

async function showCompletedScan(
    scanRequestId,
    patient
) {
    const result = await db
        .from("measurements")
        .select("*")
        .eq("scan_request_id", scanRequestId)
        .limit(1);

    if (result.error) {
        console.error(result.error);
        return;
    }

    const measurement = result.data?.[0];

    if (!measurement) {
        $("scanDetails").innerHTML = `
            <div class="message">
                Scan completed, but measurement data
                has not appeared yet.
            </div>
        `;

        return;
    }

    $("scanDetails").innerHTML = `
        <div style="
            display:grid;
            grid-template-columns:
                repeat(auto-fit,minmax(160px,1fr));
            gap:15px;
            margin-top:20px;
        ">

            <div class="dashboard-card">
                <h3>Resonance f₀</h3>
                <p>
                    ${formatNumber(measurement.f0, 1)}
                    Hz
                </p>
            </div>

            <div class="dashboard-card">
                <h3>RMS</h3>
                <p>
                    ${formatNumber(measurement.rms, 3)}
                </p>
            </div>

            <div class="dashboard-card">
                <h3>Bandwidth</h3>
                <p>
                    ${formatNumber(measurement.bandwidth, 1)}
                    Hz
                </p>
            </div>

            <div class="dashboard-card">
                <h3>Q Factor</h3>
                <p>
                    ${formatNumber(measurement.q_factor, 2)}
                </p>
            </div>

        </div>

        <p style="margin-top:20px;">
            Scan completed for
            <strong>${escapeHtml(patient.name)}</strong>.
        </p>
    `;
}


/* =========================================================
   MEASUREMENTS
========================================================= */

async function openMeasurementManagement() {
    openPanel(
        "Measurements",
        `<p>Loading measurements...</p>`
    );

    const { data, error } = await db
        .from("measurements")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    const panel = getApplicationPanel();

    if (error) {
        panel.querySelector(".welcome-panel").innerHTML = `
            <div class="message error">
                ${escapeHtml(error.message)}
            </div>
        `;

        return;
    }

    const measurements = data || [];

    let html = `
        <h3>Scan Measurements</h3>

        <p>
            ${measurements.length}
            measurement(s)
        </p>
    `;

    if (!measurements.length) {

        html += `
            <div class="message">
                No measurements have been recorded yet.
            </div>
        `;

    } else {

        html += `
            <div style="overflow-x:auto;">
                <table class="data-table">

                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Patient ID</th>
                            <th>Device</th>
                            <th>f₀</th>
                            <th>RMS</th>
                            <th>BW</th>
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
                                    ${escapeHtml(
                                        m.patient_id || "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        m.device_id || "—"
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(m.f0, 1)}
                                    Hz
                                </td>

                                <td>
                                    ${formatNumber(m.rms, 3)}
                                </td>

                                <td>
                                    ${formatNumber(
                                        m.bandwidth,
                                        1
                                    )}
                                    Hz
                                </td>

                                <td>
                                    ${formatNumber(
                                        m.q_factor,
                                        2
                                    )}
                                </td>

                            </tr>
                        `).join("")}

                    </tbody>

                </table>
            </div>
        `;
    }

    panel.querySelector(".welcome-panel").innerHTML =
        html;
}


/* =========================================================
   REFERENCE SAMPLES
========================================================= */

async function openReferenceManagement() {
    if (!isAdmin()) {
        alert("Administrator access required.");
        return;
    }

    openPanel(
        "Reference Samples",
        `<p>Loading reference samples...</p>`
    );

    await loadReferences();
}

async function loadReferences() {
    const { data, error } = await db
        .from("reference_samples")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    const panel = getApplicationPanel();

    if (error) {
        panel.querySelector(".welcome-panel").innerHTML = `
            <div class="message error">
                ${escapeHtml(error.message)}
            </div>
        `;

        return;
    }

    let html = `
        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:15px;
            flex-wrap:wrap;
            margin-bottom:20px;
        ">

            <div>
                <h3>Reference Samples</h3>
                <p>
                    Reference values used by the project
                    for experimental comparison.
                </p>
            </div>

            <button
                class="primary-button"
                onclick="openReferenceForm()">
                + Add Reference
            </button>

        </div>
    `;

    if (!data?.length) {

        html += `
            <div class="message">
                No reference samples have been added.
            </div>
        `;

    } else {

        html += `
            <div style="overflow-x:auto;">
                <table class="data-table">

                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Material</th>
                            <th>f₀</th>
                            <th>RMS</th>
                            <th>BW</th>
                            <th>Q</th>
                            <th>Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${data.map(reference => `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        reference.name
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        reference.material || "—"
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        reference.f0,
                                        1
                                    )}
                                    Hz
                                </td>

                                <td>
                                    ${formatNumber(
                                        reference.rms,
                                        3
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        reference.bandwidth,
                                        1
                                    )}
                                    Hz
                                </td>

                                <td>
                                    ${formatNumber(
                                        reference.q_factor,
                                        2
                                    )}
                                </td>

                                <td>
                                    ${formatDate(
                                        reference.created_at
                                    )}
                                </td>

                                <td>
                                    <button
                                        class="secondary-button"
                                        onclick="deleteReference('${reference.id}')">
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

    panel.querySelector(".welcome-panel").innerHTML =
        html;
}


/* =========================================================
   REFERENCE FORM
========================================================= */

function openReferenceForm() {
    if (!isAdmin()) {
        alert("Administrator access required.");
        return;
    }

    const html = `
        <div class="form-card">

            <h3>Add Reference Sample</h3>

            <p>
                Enter a known reference measurement manually.
                Scanner-based reference measurement will be
                connected in the next stage.
            </p>

            <form id="referenceForm">

                <label>Name</label>
                <input
                    id="referenceName"
                    required
                    placeholder="Example: Bone Phantom 1">

                <label>Description</label>
                <textarea
                    id="referenceDescription"></textarea>

                <label>Material</label>
                <input
                    id="referenceMaterial"
                    placeholder="Example: Synthetic bone">

                <label>Resonance Frequency f₀ (Hz)</label>
                <input
                    type="number"
                    step="0.1"
                    id="referenceF0">

                <label>RMS</label>
                <input
                    type="number"
                    step="0.001"
                    id="referenceRms">

                <label>Bandwidth (Hz)</label>
                <input
                    type="number"
                    step="0.1"
                    id="referenceBandwidth">

                <label>Q Factor</label>
                <input
                    type="number"
                    step="0.01"
                    id="referenceQ">

                <label>Notes</label>
                <textarea
                    id="referenceNotes"></textarea>

                <div style="
                    display:flex;
                    gap:10px;
                    margin-top:20px;
                    flex-wrap:wrap;
                ">

                    <button
                        type="submit"
                        class="primary-button">
                        Save Reference
                    </button>

                    <button
                        type="button"
                        class="secondary-button"
                        onclick="openReferenceManagement()">
                        Cancel
                    </button>

                </div>

                <div
                    id="referenceFormMessage"
                    class="message">
                </div>

            </form>

        </div>
    `;

    openPanel(
        "Add Reference Sample",
        html
    );

    $("referenceForm").addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            await saveReference();
        }
    );
}

async function saveReference() {
    const reference = {
        name:
            $("referenceName").value.trim(),

        description:
            $("referenceDescription").value.trim() ||
            null,

        material:
            $("referenceMaterial").value.trim() ||
            null,

        f0:
            $("referenceF0").value
                ? Number($("referenceF0").value)
                : null,

        rms:
            $("referenceRms").value
                ? Number($("referenceRms").value)
                : null,

        bandwidth:
            $("referenceBandwidth").value
                ? Number($("referenceBandwidth").value)
                : null,

        q_factor:
            $("referenceQ").value
                ? Number($("referenceQ").value)
                : null,

        notes:
            $("referenceNotes").value.trim() ||
            null,

        created_by:
            currentUser.id
    };

    if (!reference.name) {
        showMessage(
            "referenceFormMessage",
            "Reference name is required.",
            "error"
        );

        return;
    }

    showMessage(
        "referenceFormMessage",
        "Saving..."
    );

    const { error } = await db
        .from("reference_samples")
        .insert(reference);

    if (error) {
        console.error(error);

        showMessage(
            "referenceFormMessage",
            error.message,
            "error"
        );

        return;
    }

    await loadDashboardCounts();
    await openReferenceManagement();
}


/* =========================================================
   DELETE REFERENCE
========================================================= */

async function deleteReference(referenceId) {
    if (!isAdmin()) {
        alert("Administrator access required.");
        return;
    }

    if (!confirm(
        "Delete this reference sample?"
    )) {
        return;
    }

    const { error } = await db
        .from("reference_samples")
        .delete()
        .eq("id", referenceId);

    if (error) {
        alert(
            "Unable to delete reference:\n" +
            error.message
        );

        return;
    }

    await loadDashboardCounts();
    await loadReferences();
}


/* =========================================================
   DEVICES
========================================================= */

async function openDeviceManagement() {
    if (!isAdmin()) {
        alert("Administrator access required.");
        return;
    }

    openPanel(
        "Scanner Devices",
        `<p>Loading devices...</p>`
    );

    const { data, error } = await db
        .from("devices")
        .select("*")
        .order("created_at", {
            ascending: true
        });

    const panel = getApplicationPanel();

    if (error) {
        panel.querySelector(".welcome-panel").innerHTML = `
            <div class="message error">
                ${escapeHtml(error.message)}
            </div>
        `;

        return;
    }

    let html = `
        <h3>Registered Scanners</h3>
        <p>
            ${data?.length || 0} device(s)
        </p>
    `;

    if (!data?.length) {

        html += `
            <div class="message">
                No scanner devices registered.
            </div>
        `;

    } else {

        html += `
            <div style="overflow-x:auto;">
                <table class="data-table">

                    <thead>
                        <tr>
                            <th>Device</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Last Seen</th>
                            <th>Firmware</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${data.map(device => `
                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            device.device_code
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        device.device_name || "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        device.status || "unknown"
                                    )}
                                </td>

                                <td>
                                    ${formatDate(
                                        device.last_seen
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        device.firmware_version || "—"
                                    )}
                                </td>

                            </tr>
                        `).join("")}

                    </tbody>

                </table>
            </div>
        `;
    }

    panel.querySelector(".welcome-panel").innerHTML =
        html;
}


/* =========================================================
   OPERATORS
========================================================= */

async function openOperatorManagement() {
    if (!isAdmin()) {
        alert("Administrator access required.");
        return;
    }

    openPanel(
        "Operators",
        `<p>Loading operators...</p>`
    );

    const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("role", "operator")
        .order("created_at", {
            ascending: true
        });

    const panel = getApplicationPanel();

    if (error) {
        panel.querySelector(".welcome-panel").innerHTML = `
            <div class="message error">
                ${escapeHtml(error.message)}
            </div>
        `;

        return;
    }

    let html = `
        <h3>System Operators</h3>
        <p>
            ${data?.length || 0} operator(s)
        </p>
    `;

    if (!data?.length) {

        html += `
            <div class="message">
                No operators have been registered yet.
                Operators can be created from the
                Supabase Authentication dashboard and
                assigned an operator profile.
            </div>
        `;

    } else {

        html += `
            <div style="overflow-x:auto;">
                <table class="data-table">

                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>User ID</th>
                            <th>Created</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${data.map(operator => `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        operator.name
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        operator.role
                                    )}
                                </td>

                                <td>
                                    <small>
                                        ${escapeHtml(
                                            operator.id
                                        )}
                                    </small>
                                </td>

                                <td>
                                    ${formatDate(
                                        operator.created_at
                                    )}
                                </td>

                            </tr>
                        `).join("")}

                    </tbody>

                </table>
            </div>
        `;
    }

    panel.querySelector(".welcome-panel").innerHTML =
        html;
}


/* =========================================================
   PATIENT PORTAL
========================================================= */

function openPatientPortal() {
    showPatientPortal();

    const input = $("patientCode");

    if (input) {
        input.value = "";
        input.focus();
    }

    showMessage(
        "patientLoginMessage",
        ""
    );
}

async function handlePatientLogin(event) {
    event.preventDefault();

    const code =
        $("patientCode")?.value.trim();

    if (!code) {
        showMessage(
            "patientLoginMessage",
            "Enter your patient code.",
            "error"
        );

        return;
    }

    showMessage(
        "patientLoginMessage",
        "Checking patient code..."
    );

    try {
        const { data, error } =
            await db.rpc(
                "patient_login",
                {
                    p_patient_code: code
                }
            );

        if (error) {
            throw error;
        }

        if (!data || !data.patient) {
            throw new Error(
                "Invalid patient code."
            );
        }

        patientPortalData = data;

        renderPatientPortal();

        showPatientResults();

    } catch (error) {
        console.error(
            "Patient portal error:",
            error
        );

        showMessage(
            "patientLoginMessage",
            error.message ||
                "Unable to access patient results.",
            "error"
        );
    }
}


/* =========================================================
   PATIENT PORTAL RESULTS
========================================================= */

function renderPatientPortal() {
    if (!patientPortalData) return;

    const patient =
        patientPortalData.patient;

    const measurements =
        patientPortalData.measurements || [];

    if ($("patientName")) {
        $("patientName").textContent =
            patient.name || "";
    }

    if ($("patientDetails")) {

        $("patientDetails").innerHTML = `
            <p>
                <strong>Patient Code:</strong>
                ${escapeHtml(
                    patient.patient_code
                )}
            </p>

            <p>
                <strong>Name:</strong>
                ${escapeHtml(
                    patient.name
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
                    patient.sex ?? "—"
                )}
            </p>
        `;
    }

    if ($("patientMeasurements")) {

        if (!measurements.length) {

            $("patientMeasurements").innerHTML = `
                <div class="message">
                    No measurements available yet.
                </div>
            `;

        } else {

            $("patientMeasurements").innerHTML = `
                <div style="overflow-x:auto;">
                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>f₀</th>
                                <th>RMS</th>
                                <th>Bandwidth</th>
                                <th>Q</th>
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
                                        ${formatNumber(
                                            m.f0,
                                            1
                                        )}
                                        Hz
                                    </td>

                                    <td>
                                        ${formatNumber(
                                            m.rms,
                                            3
                                        )}
                                    </td>

                                    <td>
                                        ${formatNumber(
                                            m.bandwidth,
                                            1
                                        )}
                                        Hz
                                    </td>

                                    <td>
                                        ${formatNumber(
                                            m.q_factor,
                                            2
                                        )}
                                    </td>

                                </tr>
                            `).join("")}

                        </tbody>

                    </table>
                </div>
            `;
        }
    }
}


/* =========================================================
   LOGOUT
========================================================= */

async function handleLogout() {
    try {
        await logoutUser();
    } catch (error) {
        console.error(
            "Logout error:",
            error
        );
    }

    currentUser = null;
    currentProfile = null;

    showLoginPage();

    if ($("email")) {
        $("email").value = "";
    }

    if ($("password")) {
        $("password").value = "";
    }
}

function handlePatientLogout() {
    patientPortalData = null;

    showPatientPortal();

    const patientCodeInput =
        document.getElementById("patientCode");

    if (patientCodeInput) {
        patientCodeInput.value = "";
    }
}


/* =========================================================
   NAVIGATION
========================================================= */

function addOperatorCard() {
    if (!isAdmin()) return;

    const grid =
        document.querySelector(".dashboard-grid");

    if (!grid) return;

    if ($("operatorCard")) return;

    const card =
        document.createElement("div");

    card.id = "operatorCard";

    card.className =
        "dashboard-card admin-only";

    card.innerHTML = `
        <h3>Operators</h3>
        <p>Manage system operators</p>
    `;

    card.onclick =
        openOperatorManagement;

    grid.appendChild(card);
}

function setupNavigation() {
    const patientPortalButton =
        $("patientPortalButton");

    if (patientPortalButton) {
        patientPortalButton.onclick =
            openPatientPortal;
    }

    const backButton =
        $("backToLoginButton");

    if (backButton) {
        backButton.onclick =
            showLoginPage;
    }

    const logoutButton =
        $("logoutButton");

    if (logoutButton) {
        logoutButton.onclick =
            handleLogout;
    }

    const patientLogoutButton =
        $("patientLogoutButton");

    if (patientLogoutButton) {
        patientLogoutButton.onclick =
            handlePatientLogout;
    }

    addOperatorCard();
    setupDashboardCards();
}


/* =========================================================
   STARTUP
========================================================= */

async function initializeApplication() {
    console.log("DOM loaded");

    if (!db) {
        console.error(
            "Supabase client was not found."
        );

        return;
    }

    setupNavigation();

    const loginForm =
        $("loginForm");

    if (loginForm) {
        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }

    const patientLoginForm =
        $("patientLoginForm");

    if (patientLoginForm) {
        patientLoginForm.addEventListener(
            "submit",
            handlePatientLogin
        );
    }

    try {
        currentUser =
            await getCurrentUser();

        if (currentUser) {

            console.log(
                "Existing session found:",
                currentUser
            );

            currentProfile =
                await getCurrentProfile();

            if (
                currentProfile &&
                (
                    currentProfile.role === "admin" ||
                    currentProfile.role === "operator"
                )
            ) {

                updateDashboardForRole();

                await loadDashboardCounts();

                showDashboard();

            } else {

                showLoginPage();
            }

        } else {

            showLoginPage();

        }

    } catch (error) {

        console.error(
            "Startup error:",
            error
        );

        showLoginPage();
    }
}


/* =========================================================
   GLOBAL FUNCTIONS
   Needed by dynamically generated buttons.
========================================================= */

window.openPatientManagement =
    openPatientManagement;

window.openPatientForm =
    openPatientForm;

window.viewPatient =
    viewPatient;

window.deletePatient =
    deletePatient;

window.startPatientScan =
    startPatientScan;

window.cancelScan =
    cancelScan;

window.openMeasurementManagement =
    openMeasurementManagement;

window.openReferenceManagement =
    openReferenceManagement;

window.openReferenceForm =
    openReferenceForm;

window.deleteReference =
    deleteReference;

window.openDeviceManagement =
    openDeviceManagement;

window.openOperatorManagement =
    openOperatorManagement;

window.returnToDashboard =
    returnToDashboard;

window.handleLogin =
    handleLogin;

window.handleLogout =
    handleLogout;

window.handlePatientLogin =
    handlePatientLogin;

window.handlePatientLogout =
    handlePatientLogout;

window.openPatientPortal =
    openPatientPortal;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeApplication
);
