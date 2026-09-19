/* ================================================================
   GROUP 4 ACOUSTIC BONE DENSITY SCANNER
   app.js
   Complete replacement

   Supabase client:
   window.supabaseClient

   Roles:
   - admin
   - operator
   - patient portal by patient code

   Reference system:
   - Reference groups
   - Age range
   - Sex
   - Bone
   - Side
   - Multiple samples per group
================================================================ */


/* ================================================================
   SUPABASE
================================================================ */

const db = window.supabaseClient;

if (!db) {
    console.error(
        "Supabase client was not initialized. Check js/config.js."
    );
}


/* ================================================================
   GLOBAL STATE
================================================================ */

let currentUser = null;
let currentProfile = null;
let currentPatientPortalData = null;
let currentScanRequest = null;
let scanMonitorTimer = null;


/* ================================================================
   INITIALIZATION
================================================================ */

document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    setupAuthListener();
    restoreSession();
});


/* ================================================================
   EVENT LISTENERS
================================================================ */

function setupEventListeners() {

    bind("loginForm", "submit", handleLogin);
    bind("createAccountForm", "submit", handleCreateAccount);
    bind("patientLoginForm", "submit", handlePatientLogin);

    bind("logoutButton", "click", handleLogout);

    bind("patientPortalButton", "click", showPatientPortal);
    bind("createAccountButton", "click", showCreateAccountPage);
    bind("backToLoginButton", "click", showLoginPage);
    bind("patientPortalBackButton", "click", showLoginPage);
    bind("patientResultsLogoutButton", "click", showLoginPage);

    bind(
        "adminPatientsButton",
        "click",
        openPatientManagement
    );

    bind(
        "adminMeasurementsButton",
        "click",
        openMeasurementManagement
    );

    bind(
        "adminReferencesButton",
        "click",
        openReferenceManagement
    );

    bind(
        "adminDevicesButton",
        "click",
        openDeviceManagement
    );

    bind(
        "adminOperatorsButton",
        "click",
        openOperatorManagement
    );

    bind(
        "operatorPatientsButton",
        "click",
        openPatientManagement
    );

    bind(
        "operatorMeasurementsButton",
        "click",
        openMeasurementManagement
    );

    bind(
        "operatorScannerButton",
        "click",
        openNewPatientScan
    );

    const referenceCard =
        document.getElementById("referenceCard");

    if (referenceCard) {
        referenceCard.addEventListener(
            "click",
            openReferenceManagement
        );
    }
}


function bind(id, event, handler) {

    const element = document.getElementById(id);

    if (element) {
        element.addEventListener(event, handler);
    }
}


/* ================================================================
   AUTH STATE LISTENER
================================================================ */

function setupAuthListener() {

    if (!db || !db.auth) {
        return;
    }

    db.auth.onAuthStateChange(async (event, session) => {

        console.log(
            "Supabase auth event:",
            event
        );

        if (
            event === "SIGNED_OUT"
        ) {

            currentUser = null;
            currentProfile = null;
            currentScanRequest = null;

            stopScanMonitoring();

            showLoginPage();

            return;
        }

        if (
            event === "SIGNED_IN" ||
            event === "INITIAL_SESSION"
        ) {

            if (!session) {
                return;
            }

            currentUser = session.user;

            try {

                await loadCurrentProfile();

                if (currentProfile) {
                    await showDashboard();
                }

            } catch (error) {

                console.error(
                    "Auth profile error:",
                    error
                );

            }

        }

    });
}


/* ================================================================
   SESSION RESTORE
================================================================ */

async function restoreSession() {

    if (!db) {
        showLoginPage();
        return;
    }

    updateSystemStatus(
        "Connecting to Supabase..."
    );

    try {

        const {
            data,
            error
        } = await db.auth.getSession();

        if (error) {
            throw error;
        }

        if (
            data &&
            data.session &&
            data.session.user
        ) {

            currentUser =
                data.session.user;

            await loadCurrentProfile();

            if (currentProfile) {

                await showDashboard();

            } else {

                showLoginPage();

            }

        } else {

            showLoginPage();

        }

        updateSystemStatus(
            "System ready."
        );

    } catch (error) {

        console.error(
            "Session restore error:",
            error
        );

        updateSystemStatus(
            "Connection error."
        );

        showLoginPage();
    }
}


/* ================================================================
   LOGIN
================================================================ */

async function handleLogin(event) {

    event.preventDefault();

    /*
     * IMPORTANT:
     * Read directly from the actual login inputs.
     * This avoids the "Please enter email and password"
     * problem caused by reading the wrong element.
     */

    const emailElement =
        document.getElementById("loginEmail");

    const passwordElement =
        document.getElementById("loginPassword");

    const email =
        emailElement
            ? String(emailElement.value || "").trim()
            : "";

    const password =
        passwordElement
            ? String(passwordElement.value || "")
            : "";

    console.log(
        "Login attempt:",
        email,
        password.length
    );

    if (!email || !password) {

        showLoginMessage(
            "Please enter email and password.",
            "error"
        );

        return;
    }

    showLoginMessage(
        "Signing in..."
    );

    try {

        const {
            data,
            error
        } = await db.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        if (!data || !data.user) {
            throw new Error(
                "Login succeeded but no user session was returned."
            );
        }

        currentUser =
            data.user;

        await loadCurrentProfile();

        /*
         * A confirmed user may exist in auth.users but still
         * not have a profile row.
         */

        if (!currentProfile) {

            /*
             * Try creating a profile for an account that was
             * created by the website.
             *
             * This is safe for an already-existing profile
             * because upsert is used.
             */

            const metadataName =
                data.user.user_metadata?.name ||
                data.user.user_metadata?.full_name ||
                data.user.email ||
                "Operator";

            const {
                error: profileError
            } = await db
                .from("profiles")
                .upsert(
                    {
                        id: data.user.id,
                        name: metadataName,
                        role: "operator"
                    },
                    {
                        onConflict: "id"
                    }
                );

            if (profileError) {

                console.error(
                    "Profile creation error:",
                    profileError
                );

                await db.auth.signOut();

                currentUser = null;

                throw new Error(
                    "Your login is valid, but your profile could not be loaded. " +
                    "Ask the administrator to check your profile."
                );
            }

            await loadCurrentProfile();
        }

        showLoginMessage("");

        await showDashboard();

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        showLoginMessage(
            getErrorMessage(error),
            "error"
        );
    }
}


/* ================================================================
   LOAD CURRENT PROFILE
================================================================ */

async function loadCurrentProfile() {

    if (!currentUser) {
        currentProfile = null;
        return null;
    }

    const {
        data,
        error
    } = await db
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    currentProfile =
        data || null;

    return currentProfile;
}


/* ================================================================
   CREATE ACCOUNT
================================================================ */

async function handleCreateAccount(event) {

    event.preventDefault();

    const name =
        valueOf("createName");

    const email =
        valueOf("createEmail");

    const password =
        valueOf("createPassword");

    const message =
        document.getElementById(
            "createAccountMessage"
        );

    if (!name || !email || !password) {

        setMessage(
            message,
            "Please complete all fields.",
            "error"
        );

        return;
    }

    if (password.length < 6) {

        setMessage(
            message,
            "Password must contain at least 6 characters.",
            "error"
        );

        return;
    }

    setMessage(
        message,
        "Creating account..."
    );

    try {

        const {
            data,
            error
        } = await db.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    role: "operator"
                }
            }
        });

        if (error) {
            throw error;
        }

        /*
         * Email confirmation enabled:
         * data.session is normally null.
         *
         * In that case the user must confirm the email.
         * The login handler will create the profile if the
         * database trigger has not already done so.
         */

        if (
            data &&
            data.session &&
            data.user
        ) {

            await db
                .from("profiles")
                .upsert(
                    {
                        id: data.user.id,
                        name: name,
                        role: "operator"
                    },
                    {
                        onConflict: "id"
                    }
                );

            currentUser =
                data.user;

            await loadCurrentProfile();

            setMessage(
                message,
                "Account created successfully.",
                "success"
            );

            await showDashboard();

        } else {

            setMessage(
                message,
                "Account created. Please confirm your email, then return here and log in.",
                "success"
            );

        }

    } catch (error) {

        console.error(
            "Create account error:",
            error
        );

        setMessage(
            message,
            getErrorMessage(error),
            "error"
        );
    }
}


/* ================================================================
   LOGOUT
================================================================ */

async function handleLogout() {

    stopScanMonitoring();

    try {
        await db.auth.signOut();
    } catch (error) {
        console.error(
            "Logout error:",
            error
        );
    }

    currentUser = null;
    currentProfile = null;
    currentPatientPortalData = null;
    currentScanRequest = null;

    showLoginPage();
}


/* ================================================================
   PAGE DISPLAY
================================================================ */

function hideAllPages() {

    const ids = [
        "loginPage",
        "createAccountPage",
        "dashboardPage",
        "patientPortal",
        "patientResults"
    ];

    ids.forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {
            element.classList.add("hidden");
        }

    });
}


function showLoginPage() {

    stopScanMonitoring();

    hideAllPages();

    const page =
        document.getElementById("loginPage");

    if (page) {
        page.classList.remove("hidden");
    }

    showLoginMessage("");

    const email =
        document.getElementById("loginEmail");

    if (email) {
        setTimeout(
            () => email.focus(),
            100
        );
    }
}


function showCreateAccountPage() {

    hideAllPages();

    const page =
        document.getElementById(
            "createAccountPage"
        );

    if (page) {
        page.classList.remove("hidden");
    }
}


function showPatientPortal() {

    hideAllPages();

    const page =
        document.getElementById(
            "patientPortal"
        );

    if (page) {
        page.classList.remove("hidden");
    }

    const code =
        document.getElementById(
            "patientCode"
        );

    if (code) {
        setTimeout(
            () => code.focus(),
            100
        );
    }
}


/* ================================================================
   DASHBOARD
================================================================ */

async function showDashboard() {

    if (!currentUser) {
        showLoginPage();
        return;
    }

    if (!currentProfile) {
        await loadCurrentProfile();
    }

    if (!currentProfile) {
        showLoginPage();
        return;
    }

    hideAllPages();

    const page =
        document.getElementById(
            "dashboardPage"
        );

    if (page) {
        page.classList.remove("hidden");
    }

    updateDashboardForRole();

    await loadDashboardCounts();

    hideContent();
}


function updateDashboardForRole() {

    const name =
        document.getElementById(
            "dashboardUserName"
        );

    const role =
        document.getElementById(
            "dashboardRole"
        );

    if (name) {

        name.textContent =
            currentProfile?.name ||
            currentUser?.email ||
            "User";
    }

    if (role) {

        role.textContent =
            currentProfile?.role ||
            "";
    }

    const admin =
        document.getElementById(
            "adminDashboard"
        );

    const operator =
        document.getElementById(
            "operatorDashboard"
        );

    if (admin) {

        admin.classList.toggle(
            "hidden",
            !isAdmin()
        );
    }

    if (operator) {

        operator.classList.toggle(
            "hidden",
            !isOperator()
        );
    }
}


/* ================================================================
   DASHBOARD COUNTS
================================================================ */

async function loadDashboardCounts() {

    if (!isStaff()) {
        return;
    }

    const counts = {};

    try {

        const patientQuery =
            await db
                .from("patients")
                .select("*", {
                    count: "exact",
                    head: true
                });

        counts.patients =
            patientQuery.count ?? 0;

    } catch (error) {

        console.error(
            "Patient count error:",
            error
        );

        counts.patients = "—";
    }

    try {

        const measurementQuery =
            await db
                .from("measurements")
                .select("*", {
                    count: "exact",
                    head: true
                });

        counts.measurements =
            measurementQuery.count ?? 0;

    } catch (error) {

        console.error(
            "Measurement count error:",
            error
        );

        counts.measurements = "—";
    }

    if (isAdmin()) {

        try {

            const referenceQuery =
                await db
                    .from("reference_samples")
                    .select("*", {
                        count: "exact",
                        head: true
                    });

            counts.references =
                referenceQuery.count ?? 0;

        } catch (error) {

            console.error(
                "Reference count error:",
                error
            );

            counts.references = "—";
        }

        try {

            const deviceQuery =
                await db
                    .from("devices")
                    .select("*", {
                        count: "exact",
                        head: true
                    });

            counts.devices =
                deviceQuery.count ?? 0;

        } catch (error) {

            console.error(
                "Device count error:",
                error
            );

            counts.devices = "—";
        }

        try {

            const operatorQuery =
                await db
                    .from("profiles")
                    .select("*", {
                        count: "exact",
                        head: true
                    })
                    .eq(
                        "role",
                        "operator"
                    );

            counts.operators =
                operatorQuery.count ?? 0;

        } catch (error) {

            console.error(
                "Operator count error:",
                error
            );

            counts.operators = "—";
        }
    }

    setText(
        "adminPatientCount",
        counts.patients
    );

    setText(
        "adminMeasurementCount",
        counts.measurements
    );

    setText(
        "referenceCount",
        counts.references ?? "—"
    );

    setText(
        "deviceCount",
        counts.devices ?? "—"
    );

    setText(
        "operatorCount",
        counts.operators ?? "—"
    );

    setText(
        "operatorPatientCount",
        counts.patients
    );

    setText(
        "operatorMeasurementCount",
        counts.measurements
    );
}


/* ================================================================
   PATIENT MANAGEMENT
================================================================ */

async function openPatientManagement() {

    if (!isStaff()) {
        return;
    }

    try {

        const {
            data: patients,
            error
        } = await db
            .from("patients")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        let html = `
            <div class="content-header">
                <div>
                    <h2>Patients</h2>
                    <p>Manage patient records.</p>
                </div>

                <button
                    class="primary-button"
                    onclick="openPatientForm()"
                >
                    Add Patient
                </button>
            </div>
        `;

        if (!patients || patients.length === 0) {

            html += `
                <div class="welcome-panel">
                    <h3>No Patients</h3>
                    <p>No patient records have been created.</p>
                </div>
            `;

        } else {

            html += `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Patient Code</th>
                                <th>Age</th>
                                <th>Sex</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            patients.forEach(patient => {

                html += `
                    <tr>
                        <td>
                            ${escapeHtml(patient.name || "—")}
                        </td>

                        <td>
                            ${escapeHtml(patient.patient_code || "—")}
                        </td>

                        <td>
                            ${escapeHtml(
                                patient.age != null
                                    ? patient.age
                                    : "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(patient.sex || "—")}
                        </td>

                        <td>
                            <button
                                class="secondary-button"
                                onclick="editPatient('${patient.id}')"
                            >
                                Edit
                            </button>

                            <button
                                class="danger-button"
                                onclick="deletePatient('${patient.id}')"
                            >
                                Delete
                            </button>

                            <button
                                class="primary-button"
                                onclick="startPatientScan('${patient.id}')"
                            >
                                Scan
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

        showContent(html);

    } catch (error) {

        console.error(
            "Patient management error:",
            error
        );

        showContent(`
            <h2>Patients</h2>
            <p class="error-text">
                ${escapeHtml(getErrorMessage(error))}
            </p>
        `);
    }
}


/* ================================================================
   PATIENT FORM
================================================================ */

function openPatientForm(patient = null) {

    const editing =
        !!patient;

    showModal(
        editing
            ? "Edit Patient"
            : "Add Patient",
        `
        <form id="patientForm">

            <label>
                Patient Name
                <input
                    id="patientName"
                    type="text"
                    value="${escapeAttr(patient?.name || "")}"
                    required
                >
            </label>

            <label>
                Patient Code
                <input
                    id="patientCodeForm"
                    type="text"
                    value="${escapeAttr(
                        patient?.patient_code ||
                        generatePatientCode()
                    )}"
                    required
                >
            </label>

            <label>
                Age
                <input
                    id="patientAge"
                    type="number"
                    min="0"
                    max="150"
                    value="${escapeAttr(
                        patient?.age ?? ""
                    )}"
                    required
                >
            </label>

            <label>
                Sex
                <select id="patientSex" required>
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
            </label>

            <label>
                Notes
                <textarea id="patientNotes">${escapeHtml(
                    patient?.notes || ""
                )}</textarea>
            </label>

            <div class="button-row">

                <button
                    type="submit"
                    class="primary-button"
                >
                    ${editing ? "Save Changes" : "Create Patient"}
                </button>

                <button
                    type="button"
                    class="secondary-button"
                    onclick="closeModal()"
                >
                    Cancel
                </button>

            </div>

        </form>
        `
    );

    const form =
        document.getElementById(
            "patientForm"
        );

    if (form) {

        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                const payload = {

                    name:
                        valueOf("patientName"),

                    patient_code:
                        valueOf("patientCodeForm"),

                    age:
                        Number(
                            valueOf("patientAge")
                        ),

                    sex:
                        valueOf("patientSex"),

                    notes:
                        valueOf("patientNotes")

                };

                try {

                    if (editing) {

                        const {
                            error
                        } = await db
                            .from("patients")
                            .update(payload)
                            .eq(
                                "id",
                                patient.id
                            );

                        if (error) {
                            throw error;
                        }

                    } else {

                        const {
                            error
                        } = await db
                            .from("patients")
                            .insert(payload);

                        if (error) {
                            throw error;
                        }
                    }

                    closeModal();

                    await openPatientManagement();

                } catch (error) {

                    alert(
                        getErrorMessage(error)
                    );
                }
            }
        );
    }
}


async function editPatient(patientId) {

    try {

        const {
            data,
            error
        } = await db
            .from("patients")
            .select("*")
            .eq("id", patientId)
            .single();

        if (error) {
            throw error;
        }

        openPatientForm(data);

    } catch (error) {

        alert(
            getErrorMessage(error)
        );
    }
}


async function deletePatient(patientId) {

    if (!confirm(
        "Delete this patient and associated records?"
    )) {
        return;
    }

    try {

        const {
            error
        } = await db
            .from("patients")
            .delete()
            .eq("id", patientId);

        if (error) {
            throw error;
        }

        await openPatientManagement();

    } catch (error) {

        alert(
            getErrorMessage(error)
        );
    }
}


/* ================================================================
   MEASUREMENTS
================================================================ */

async function openMeasurementManagement() {

    if (!isStaff()) {
        return;
    }

    try {

        const {
            data: measurements,
            error
        } = await db
            .from("measurements")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        let html = `
            <div class="content-header">
                <div>
                    <h2>Measurements</h2>
                    <p>Scanner measurement records.</p>
                </div>
            </div>
        `;

        if (
            !measurements ||
            measurements.length === 0
        ) {

            html += `
                <div class="welcome-panel">
                    <h3>No Measurements</h3>
                    <p>No scanner measurements are available.</p>
                </div>
            `;

        } else {

            html += `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Patient</th>
                                <th>Device</th>
                                <th>f0</th>
                                <th>RMS</th>
                                <th>Bandwidth</th>
                                <th>Q</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            measurements.forEach(row => {

                html += `
                    <tr>

                        <td>
                            ${formatDate(
                                row.created_at ||
                                row.measured_at
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                row.patient_id || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                row.device_id || "—"
                            )}
                        </td>

                        <td>
                            ${formatMetric(
                                row.f0 ??
                                row.resonance_frequency
                            )}
                        </td>

                        <td>
                            ${formatMetric(row.rms)}
                        </td>

                        <td>
                            ${formatMetric(row.bandwidth)}
                        </td>

                        <td>
                            ${formatMetric(
                                row.q ??
                                row.q_factor
                            )}
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

        showContent(html);

    } catch (error) {

        console.error(
            "Measurement management error:",
            error
        );

        showContent(`
            <h2>Measurements</h2>
            <p class="error-text">
                ${escapeHtml(getErrorMessage(error))}
            </p>
        `);
    }
}


/* ================================================================
   REFERENCE MANAGEMENT
================================================================ */

async function openReferenceManagement() {

    if (!isAdmin()) {

        showContent(`
            <h2>Access Denied</h2>
            <p>Only administrators can manage reference data.</p>
        `);

        return;
    }

    try {

        const {
            data: groups,
            error
        } = await db
            .from("reference_groups")
            .select("*")
            .order(
                "age_min",
                {
                    ascending: true
                }
            );

        if (error) {
            throw error;
        }

        let html = `
            <div class="content-header">

                <div>
                    <h2>Reference Database</h2>
                    <p>
                        Manage age, sex, bone and side reference groups.
                    </p>
                </div>

                <button
                    class="primary-button"
                    onclick="openReferenceGroupForm()"
                >
                    Add Reference Group
                </button>

            </div>
        `;

        if (!groups || groups.length === 0) {

            html += `
                <div class="welcome-panel">

                    <h3>No Reference Groups</h3>

                    <p>
                        Create a reference group before adding
                        reference measurements.
                    </p>

                    <button
                        class="primary-button"
                        onclick="openReferenceGroupForm()"
                    >
                        Create First Group
                    </button>

                </div>
            `;

        } else {

            html += `
                <div class="table-container">

                    <table>

                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Age</th>
                                <th>Sex</th>
                                <th>Bone</th>
                                <th>Side</th>
                                <th>Version</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
            `;

            for (const group of groups) {

                let sampleCount = "—";

                try {

                    const result =
                        await db
                            .from("reference_samples")
                            .select("*", {
                                count: "exact",
                                head: true
                            })
                            .eq(
                                "reference_group_id",
                                group.id
                            );

                    sampleCount =
                        result.count ?? 0;

                } catch (error) {

                    console.error(
                        "Reference sample count error:",
                        error
                    );
                }

                html += `
                    <tr>

                        <td>
                            ${escapeHtml(
                                group.name
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                `${group.age_min}–${group.age_max}`
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                capitalize(group.sex)
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                capitalize(group.bone)
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                capitalize(group.side)
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                group.version ?? 1
                            )}
                        </td>

                        <td>

                            <button
                                class="secondary-button"
                                onclick="openReferenceGroupForm('${group.id}')"
                            >
                                Edit
                            </button>

                            <button
                                class="primary-button"
                                onclick="openReferenceSamples('${group.id}')"
                            >
                                Samples (${sampleCount})
                            </button>

                            <button
                                class="danger-button"
                                onclick="deleteReferenceGroup('${group.id}')"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>
                `;
            }

            html += `
                        </tbody>

                    </table>

                </div>
            `;
        }

        html += `
            <div class="welcome-panel">

                <h3>Reference Workflow</h3>

                <p>
                    Each group can contain multiple reference
                    measurements. Reference groups are matched using
                    patient age, sex, bone and side.
                </p>

                <p>
                    Reference samples may be entered manually or
                    generated by the scanner workflow.
                </p>

            </div>
        `;

        showContent(html);

    } catch (error) {

        console.error(
            "Reference management error:",
            error
        );

        showContent(`
            <h2>Reference Database</h2>

            <p class="error-text">
                ${escapeHtml(getErrorMessage(error))}
            </p>

            <p>
                If the error says that
                <strong>reference_groups</strong>
                does not exist, run the reference-group SQL
                migration in Supabase first.
            </p>
        `);
    }
}


/* ================================================================
   REFERENCE GROUP FORM
================================================================ */

async function openReferenceGroupForm(groupId = null) {

    let group = null;

    if (groupId) {

        try {

            const {
                data,
                error
            } = await db
                .from("reference_groups")
                .select("*")
                .eq("id", groupId)
                .single();

            if (error) {
                throw error;
            }

            group = data;

        } catch (error) {

            alert(
                getErrorMessage(error)
            );

            return;
        }
    }

    const editing =
        !!group;

    showModal(
        editing
            ? "Edit Reference Group"
            : "Create Reference Group",

        `
        <form id="referenceGroupForm">

            <label>
                Group Name
                <input
                    id="referenceGroupName"
                    type="text"
                    required
                    value="${escapeAttr(
                        group?.name || ""
                    )}"
                    placeholder="Female 30–39 Left Radius"
                >
            </label>

            <label>
                Minimum Age
                <input
                    id="referenceAgeMin"
                    type="number"
                    min="0"
                    max="150"
                    required
                    value="${escapeAttr(
                        group?.age_min ?? ""
                    )}"
                >
            </label>

            <label>
                Maximum Age
                <input
                    id="referenceAgeMax"
                    type="number"
                    min="0"
                    max="150"
                    required
                    value="${escapeAttr(
                        group?.age_max ?? ""
                    )}"
                >
            </label>

            <label>
                Sex
                <select
                    id="referenceSex"
                    required
                >
                    <option value="">Select</option>

                    <option
                        value="male"
                        ${group?.sex === "male" ? "selected" : ""}
                    >
                        Male
                    </option>

                    <option
                        value="female"
                        ${group?.sex === "female" ? "selected" : ""}
                    >
                        Female
                    </option>

                    <option
                        value="other"
                        ${group?.sex === "other" ? "selected" : ""}
                    >
                        Other
                    </option>

                </select>
            </label>

            <label>
                Bone
                <select
                    id="referenceBone"
                    required
                >
                    <option value="">Select</option>

                    <option
                        value="radius"
                        ${group?.bone === "radius" ? "selected" : ""}
                    >
                        Radius
                    </option>

                    <option
                        value="ulna"
                        ${group?.bone === "ulna" ? "selected" : ""}
                    >
                        Ulna
                    </option>

                </select>
            </label>

            <label>
                Side
                <select
                    id="referenceSide"
                    required
                >
                    <option value="">Select</option>

                    <option
                        value="left"
                        ${group?.side === "left" ? "selected" : ""}
                    >
                        Left
                    </option>

                    <option
                        value="right"
                        ${group?.side === "right" ? "selected" : ""}
                    >
                        Right
                    </option>

                </select>
            </label>

            <label>
                Description
                <textarea
                    id="referenceDescription"
                >${escapeHtml(
                    group?.description || ""
                )}</textarea>
            </label>

            <div class="button-row">

                <button
                    type="submit"
                    class="primary-button"
                >
                    ${editing ? "Save Group" : "Create Group"}
                </button>

                <button
                    type="button"
                    class="secondary-button"
                    onclick="closeModal()"
                >
                    Cancel
                </button>

            </div>

        </form>
        `
    );

    const form =
        document.getElementById(
            "referenceGroupForm"
        );

    if (!form) {
        return;
    }

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const ageMin =
                Number(
                    valueOf("referenceAgeMin")
                );

            const ageMax =
                Number(
                    valueOf("referenceAgeMax")
                );

            if (
                !Number.isFinite(ageMin) ||
                !Number.isFinite(ageMax) ||
                ageMin < 0 ||
                ageMax < ageMin
            ) {

                alert(
                    "Please enter a valid age range."
                );

                return;
            }

            const payload = {

                name:
                    valueOf(
                        "referenceGroupName"
                    ),

                age_min:
                    ageMin,

                age_max:
                    ageMax,

                sex:
                    valueOf(
                        "referenceSex"
                    ).toLowerCase(),

                bone:
                    valueOf(
                        "referenceBone"
                    ).toLowerCase(),

                side:
                    valueOf(
                        "referenceSide"
                    ).toLowerCase(),

                description:
                    valueOf(
                        "referenceDescription"
                    )

            };

            try {

                if (editing) {

                    const {
                        error
                    } = await db
                        .from("reference_groups")
                        .update({
                            ...payload,
                            version:
                                Number(
                                    group.version || 1
                                ) + 1,
                            updated_at:
                                new Date().toISOString()
                        })
                        .eq(
                            "id",
                            group.id
                        );

                    if (error) {
                        throw error;
                    }

                } else {

                    const {
                        error
                    } = await db
                        .from("reference_groups")
                        .insert({
                            ...payload,
                            version: 1
                        });

                    if (error) {
                        throw error;
                    }
                }

                closeModal();

                await openReferenceManagement();

            } catch (error) {

                console.error(
                    "Reference group save error:",
                    error
                );

                alert(
                    getErrorMessage(error)
                );
            }
        }
    );
}


/* ================================================================
   REFERENCE SAMPLES
================================================================ */

async function openReferenceSamples(groupId) {

    if (!isAdmin()) {
        return;
    }

    try {

        const {
            data: group,
            error: groupError
        } = await db
            .from("reference_groups")
            .select("*")
            .eq("id", groupId)
            .single();

        if (groupError) {
            throw groupError;
        }

        const {
            data: samples,
            error: sampleError
        } = await db
            .from("reference_samples")
            .select("*")
            .eq(
                "reference_group_id",
                groupId
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (sampleError) {
            throw sampleError;
        }

        let html = `

            <div class="content-header">

                <div>

                    <h2>
                        ${escapeHtml(group.name)}
                    </h2>

                    <p>
                        Age ${group.age_min}–${group.age_max},
                        ${capitalize(group.sex)},
                        ${capitalize(group.side)}
                        ${capitalize(group.bone)}
                    </p>

                </div>

                <div class="button-row">

                    <button
                        class="primary-button"
                        onclick="openReferenceSampleForm('${groupId}')"
                    >
                        Add Manual Sample
                    </button>

                    <button
                        class="secondary-button"
                        onclick="openReferenceManagement()"
                    >
                        Back
                    </button>

                </div>

            </div>

        `;

        if (
            !samples ||
            samples.length === 0
        ) {

            html += `
                <div class="welcome-panel">

                    <h3>No Reference Samples</h3>

                    <p>
                        Add a manual sample or use the scanner
                        reference workflow.
                    </p>

                </div>
            `;

        } else {

            html += `
                <div class="table-container">

                    <table>

                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Source</th>
                                <th>f0</th>
                                <th>RMS</th>
                                <th>Bandwidth</th>
                                <th>Q</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
            `;

            samples.forEach(sample => {

                html += `
                    <tr>

                        <td>
                            ${escapeHtml(
                                sample.name || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                sample.source_type ||
                                "manual"
                            )}
                        </td>

                        <td>
                            ${formatMetric(
                                sample.f0
                            )}
                        </td>

                        <td>
                            ${formatMetric(
                                sample.rms
                            )}
                        </td>

                        <td>
                            ${formatMetric(
                                sample.bandwidth
                            )}
                        </td>

                        <td>
                            ${formatMetric(
                                sample.q ??
                                sample.q_factor
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                sample.created_at
                            )}
                        </td>

                        <td>

                            <button
                                class="danger-button"
                                onclick="deleteReferenceSample('${sample.id}','${groupId}')"
                            >
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

        showContent(html);

    } catch (error) {

        console.error(
            "Reference samples error:",
            error
        );

        showContent(`
            <h2>Reference Samples</h2>

            <p class="error-text">
                ${escapeHtml(getErrorMessage(error))}
            </p>
        `);
    }
}


/* ================================================================
   MANUAL REFERENCE SAMPLE
================================================================ */

function openReferenceSampleForm(groupId) {

    showModal(
        "Add Reference Sample",

        `
        <form id="referenceSampleForm">

            <label>
                Sample Name
                <input
                    id="referenceSampleName"
                    type="text"
                    required
                >
            </label>

            <label>
                Description
                <input
                    id="referenceSampleDescription"
                    type="text"
                >
            </label>

            <label>
                Material
                <input
                    id="referenceSampleMaterial"
                    type="text"
                >
            </label>

            <label>
                Resonance Frequency f0 (Hz)
                <input
                    id="referenceSampleF0"
                    type="number"
                    step="0.01"
                    required
                >
            </label>

            <label>
                RMS
                <input
                    id="referenceSampleRMS"
                    type="number"
                    step="0.000001"
                    required
                >
            </label>

            <label>
                Bandwidth (Hz)
                <input
                    id="referenceSampleBandwidth"
                    type="number"
                    step="0.01"
                >
            </label>

            <label>
                Q Factor
                <input
                    id="referenceSampleQ"
                    type="number"
                    step="0.01"
                >
            </label>

            <label>
                Notes
                <textarea
                    id="referenceSampleNotes"
                ></textarea>
            </label>

            <div class="button-row">

                <button
                    type="submit"
                    class="primary-button"
                >
                    Save Reference
                </button>

                <button
                    type="button"
                    class="secondary-button"
                    onclick="closeModal()"
                >
                    Cancel
                </button>

            </div>

        </form>
        `
    );

    const form =
        document.getElementById(
            "referenceSampleForm"
        );

    if (!form) {
        return;
    }

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const payload = {

                reference_group_id:
                    groupId,

                name:
                    valueOf(
                        "referenceSampleName"
                    ),

                description:
                    valueOf(
                        "referenceSampleDescription"
                    ),

                material:
                    valueOf(
                        "referenceSampleMaterial"
                    ),

                f0:
                    numberOrNull(
                        valueOf(
                            "referenceSampleF0"
                        )
                    ),

                rms:
                    numberOrNull(
                        valueOf(
                            "referenceSampleRMS"
                        )
                    ),

                bandwidth:
                    numberOrNull(
                        valueOf(
                            "referenceSampleBandwidth"
                        )
                    ),

                q:
                    numberOrNull(
                        valueOf(
                            "referenceSampleQ"
                        )
                    ),

                notes:
                    valueOf(
                        "referenceSampleNotes"
                    ),

                source_type:
                    "manual",

                created_by:
                    currentUser?.id || null,

                version:
                    1

            };

            try {

                const {
                    error
                } = await db
                    .from("reference_samples")
                    .insert(payload);

                if (error) {
                    throw error;
                }

                closeModal();

                await openReferenceSamples(
                    groupId
                );

            } catch (error) {

                console.error(
                    "Reference sample save error:",
                    error
                );

                alert(
                    getErrorMessage(error)
                );
            }
        }
    );
}


/* ================================================================
   DELETE REFERENCE GROUP
================================================================ */

async function deleteReferenceGroup(groupId) {

    if (!isAdmin()) {
        return;
    }

    if (!confirm(
        "Delete this reference group and all of its samples?"
    )) {
        return;
    }

    try {

        const {
            error
        } = await db
            .from("reference_groups")
            .delete()
            .eq(
                "id",
                groupId
            );

        if (error) {
            throw error;
        }

        await openReferenceManagement();

    } catch (error) {

        alert(
            getErrorMessage(error)
        );
    }
}


/* ================================================================
   DELETE REFERENCE SAMPLE
================================================================ */

async function deleteReferenceSample(
    sampleId,
    groupId
) {

    if (!isAdmin()) {
        return;
    }

    if (!confirm(
        "Delete this reference sample?"
    )) {
        return;
    }

    try {

        const {
            error
        } = await db
            .from("reference_samples")
            .delete()
            .eq(
                "id",
                sampleId
            );

        if (error) {
            throw error;
        }

        await openReferenceSamples(
            groupId
        );

    } catch (error) {

        alert(
            getErrorMessage(error)
        );
    }
}


/* ================================================================
   REFERENCE SCANNER INFORMATION
================================================================ */

function openReferenceScanner() {

    if (!isAdmin()) {
        return;
    }

    showContent(`

        <div class="content-header">

            <div>
                <h2>Scanner Reference Capture</h2>

                <p>
                    Create a physical reference sample using
                    the Acoustic Bone Scanner.
                </p>
            </div>

        </div>

        <div class="welcome-panel">

            <h3>Workflow</h3>

            <ol>

                <li>
                    Select or create the reference group.
                </li>

                <li>
                    Prepare the reference sample.
                </li>

                <li>
                    Run the normal scanner frequency sweep.
                </li>

                <li>
                    Record f0, RMS, bandwidth and Q.
                </li>

                <li>
                    Preserve the complete frequency response.
                </li>

                <li>
                    Store the result as a scanner-generated
                    reference sample.
                </li>

            </ol>

            <p>
                The physical scanner workflow requires the
                ESP32 online scan-request path.
            </p>

        </div>

        <button
            class="secondary-button"
            onclick="openReferenceManagement()"
        >
            Back to Reference Database
        </button>

    `);
}


/* ================================================================
   DEVICE MANAGEMENT
================================================================ */

async function openDeviceManagement() {

    if (!isAdmin()) {
        return;
    }

    try {

        const {
            data: devices,
            error
        } = await db
            .from("devices")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        let html = `

            <div class="content-header">

                <div>
                    <h2>Scanner Devices</h2>
                    <p>
                        Registered Acoustic Bone Scanner devices.
                    </p>
                </div>

            </div>

        `;

        if (
            !devices ||
            devices.length === 0
        ) {

            html += `
                <div class="welcome-panel">
                    <h3>No Scanner Devices</h3>
                    <p>
                        No scanner device has been registered.
                    </p>
                </div>
            `;

        } else {

            html += `
                <div class="table-container">

                    <table>

                        <thead>

                            <tr>
                                <th>Device Code</th>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Firmware</th>
                                <th>Last Seen</th>
                            </tr>

                        </thead>

                        <tbody>
            `;

            devices.forEach(device => {

                html += `
                    <tr>

                        <td>
                            ${escapeHtml(
                                device.device_code || "—"
                            )}
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
                            ${escapeHtml(
                                device.firmware_version || "—"
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                device.last_seen
                            )}
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

        showContent(html);

    } catch (error) {

        console.error(
            "Device management error:",
            error
        );

        showContent(`
            <h2>Devices</h2>

            <p class="error-text">
                ${escapeHtml(getErrorMessage(error))}
            </p>
        `);
    }
}


/* ================================================================
   OPERATOR MANAGEMENT
================================================================ */

async function openOperatorManagement() {

    if (!isAdmin()) {

        showContent(`
            <h2>Access Denied</h2>
            <p>Only administrators can manage operators.</p>
        `);

        return;
    }

    try {

        const {
            data: operators,
            error
        } = await db
            .from("profiles")
            .select("*")
            .eq(
                "role",
                "operator"
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        let html = `

            <div class="content-header">

                <div>

                    <h2>Operator Management</h2>

                    <p>
                        View and manage scanner operator accounts.
                    </p>

                </div>

            </div>

        `;

        if (
            !operators ||
            operators.length === 0
        ) {

            html += `
                <div class="welcome-panel">

                    <h3>No Operators</h3>

                    <p>
                        There are currently no operator profiles.
                    </p>

                </div>
            `;

        } else {

            html += `

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>
                                <th>Name</th>
                                <th>Role</th>
                                <th>User ID</th>
                                <th>Created</th>
                                <th>Action</th>
                            </tr>

                        </thead>

                        <tbody>
            `;

            operators.forEach(operator => {

                const name =
                    operator.name ||
                    "Unnamed Operator";

                html += `

                    <tr>

                        <td>
                            ${escapeHtml(name)}
                        </td>

                        <td>
                            ${escapeHtml(
                                operator.role ||
                                "operator"
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

                        <td>

                            <button
                                class="danger-button"
                                onclick="deleteOperatorAccount(
                                    '${operator.id}',
                                    '${escapeJsString(name)}'
                                )"
                            >
                                Delete Account
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

        showContent(html);

    } catch (error) {

        console.error(
            "Operator management error:",
            error
        );

        showContent(`

            <h2>Operator Management</h2>

            <p class="error-text">
                ${escapeHtml(getErrorMessage(error))}
            </p>

        `);
    }
}


/* ================================================================
   DELETE OPERATOR
================================================================ */

async function deleteOperatorAccount(
    operatorId,
    operatorName
) {

    if (!isAdmin()) {

        showModal(
            "Access Denied",
            "Only administrators can delete operator accounts."
        );

        return;
    }

    if (!operatorId) {

        showModal(
            "Error",
            "Operator ID is missing."
        );

        return;
    }

    if (
        operatorId ===
        currentUser?.id
    ) {

        showModal(
            "Error",
            "You cannot delete your own administrator account."
        );

        return;
    }

    const confirmed =
        confirm(
            `Delete operator account "${operatorName}"?\n\n` +
            "This permanently removes the Supabase login account."
        );

    if (!confirmed) {
        return;
    }

    try {

        const {
            data,
            error
        } = await db.rpc(
            "delete_operator_account",
            {
                operator_user_id:
                    operatorId
            }
        );

        if (error) {
            throw error;
        }

        console.log(
            "Operator deletion result:",
            data
        );

        await openOperatorManagement();

    } catch (error) {

        console.error(
            "Delete operator error:",
            error
        );

        showModal(
            "Unable to Delete Operator",
            `
                <p>
                    ${escapeHtml(
                        getErrorMessage(error)
                    )}
                </p>

                <p>
                    Make sure the secure
                    <code>delete_operator_account</code>
                    Supabase function has been created.
                </p>
            `
        );
    }
}


/* ================================================================
   START PATIENT SCAN
================================================================ */

async function startPatientScan(patientId) {

    if (!isStaff()) {
        return;
    }

    try {

        const {
            data: devices,
            error: deviceError
        } = await db
            .from("devices")
            .select("*")
            .order(
                "device_code",
                {
                    ascending: true
                }
            );

        if (deviceError) {
            throw deviceError;
        }

        if (
            !devices ||
            devices.length === 0
        ) {

            alert(
                "No scanner device is registered."
            );

            return;
        }

        const onlineDevices =
            devices.filter(
                device =>
                    device.status === "online"
            );

        const selectedDevice =
            onlineDevices[0] ||
            devices[0];

        const {
            data: patient,
            error: patientError
        } = await db
            .from("patients")
            .select("*")
            .eq(
                "id",
                patientId
            )
            .single();

        if (patientError) {
            throw patientError;
        }

        const scanOptions =
            await openScanOptions(
                patient
            );

        if (!scanOptions) {
            return;
        }

        const confirmed =
            confirm(
                `Start acoustic scan for:\n\n` +
                `${patient.name}\n` +
                `Patient Code: ${patient.patient_code}\n` +
                `Bone: ${capitalize(scanOptions.bone)}\n` +
                `Side: ${capitalize(scanOptions.side)}\n\n` +
                `Device: ${selectedDevice.device_code}`
            );

        if (!confirmed) {
            return;
        }

        /*
         * These bone/side fields must exist in scan_requests.
         * If they have not yet been added to Supabase, run the
         * corresponding database migration.
         */

        const requestData = {

            device_id:
                selectedDevice.id,

            patient_id:
                patientId,

            operator_id:
                currentUser.id,

            status:
                "pending",

            requested_at:
                new Date().toISOString(),

            bone:
                scanOptions.bone,

            side:
                scanOptions.side
        };

        const {
            data: request,
            error
        } = await db
            .from("scan_requests")
            .insert(requestData)
            .select("*")
            .single();

        if (error) {
            throw error;
        }

        currentScanRequest =
            request;

        await monitorScanRequest(
            request.id
        );

    } catch (error) {

        console.error(
            "Start patient scan error:",
            error
        );

        alert(
            getErrorMessage(error)
        );
    }
}


/* ================================================================
   SCAN OPTIONS
================================================================ */

function openScanOptions(patient) {

    return new Promise(resolve => {

        showModal(
            "Select Scan Location",

            `
            <form id="scanOptionsForm">

                <p>
                    Patient:
                    <strong>
                        ${escapeHtml(
                            patient.name
                        )}
                    </strong>
                </p>

                <label>
                    Bone

                    <select
                        id="scanBone"
                        required
                    >

                        <option value="">
                            Select bone
                        </option>

                        <option value="radius">
                            Radius
                        </option>

                        <option value="ulna">
                            Ulna
                        </option>

                    </select>
                </label>

                <label>
                    Side

                    <select
                        id="scanSide"
                        required
                    >

                        <option value="">
                            Select side
                        </option>

                        <option value="left">
                            Left
                        </option>

                        <option value="right">
                            Right
                        </option>

                    </select>
                </label>

                <div class="button-row">

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Continue
                    </button>

                    <button
                        type="button"
                        class="secondary-button"
                        id="cancelScanOptions"
                    >
                        Cancel
                    </button>

                </div>

            </form>
            `
        );

        const form =
            document.getElementById(
                "scanOptionsForm"
            );

        const cancel =
            document.getElementById(
                "cancelScanOptions"
            );

        if (cancel) {

            cancel.addEventListener(
                "click",
                () => {

                    closeModal();

                    resolve(null);
                }
            );
        }

        if (form) {

            form.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    const bone =
                        valueOf("scanBone");

                    const side =
                        valueOf("scanSide");

                    if (!bone || !side) {
                        return;
                    }

                    closeModal();

                    resolve({
                        bone,
                        side
                    });
                }
            );
        }

    });
}


/* ================================================================
   NEW PATIENT SCAN
================================================================ */

async function openNewPatientScan() {

    if (!isStaff()) {
        return;
    }

    try {

        const {
            data: patients,
            error
        } = await db
            .from("patients")
            .select("*")
            .order(
                "name",
                {
                    ascending: true
                }
            );

        if (error) {
            throw error;
        }

        let html = `

            <div class="content-header">

                <div>
                    <h2>Start Patient Scan</h2>
                    <p>Select a patient.</p>
                </div>

            </div>

        `;

        if (
            !patients ||
            patients.length === 0
        ) {

            html += `

                <div class="welcome-panel">

                    <h3>No Patients</h3>

                    <p>
                        Create a patient before starting a scan.
                    </p>

                    <button
                        class="primary-button"
                        onclick="openPatientForm()"
                    >
                        Add Patient
                    </button>

                </div>
            `;

        } else {

            html += `

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>
                                <th>Name</th>
                                <th>Patient Code</th>
                                <th>Age</th>
                                <th>Sex</th>
                                <th>Action</th>
                            </tr>

                        </thead>

                        <tbody>
            `;

            patients.forEach(patient => {

                html += `

                    <tr>

                        <td>
                            ${escapeHtml(
                                patient.name
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                patient.patient_code
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                patient.age
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                patient.sex
                            )}
                        </td>

                        <td>

                            <button
                                class="primary-button"
                                onclick="startPatientScan('${patient.id}')"
                            >
                                Start Scan
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

        showContent(html);

    } catch (error) {

        console.error(
            "New patient scan error:",
            error
        );

        showContent(`
            <h2>Start Scan</h2>
            <p class="error-text">
                ${escapeHtml(getErrorMessage(error))}
            </p>
        `);
    }
}


/* ================================================================
   MONITOR SCAN REQUEST
================================================================ */

async function monitorScanRequest(
    requestId
) {

    stopScanMonitoring();

    showContent(`

        <div class="welcome-panel">

            <h2>Scanner Ready</h2>

            <p>
                Waiting for the scanner to receive the scan request.
            </p>

            <p>
                Request ID:
                <code>
                    ${escapeHtml(requestId)}
                </code>
            </p>

            <p>
                Keep the scanner in Online mode.
            </p>

            <button
                class="danger-button"
                onclick="cancelCurrentScanRequest('${requestId}')"
            >
                Cancel Scan
            </button>

        </div>
    `);

    scanMonitorTimer =
        setInterval(
            async () => {

                try {

                    const {
                        data,
                        error
                    } = await db
                        .from("scan_requests")
                        .select("*")
                        .eq(
                            "id",
                            requestId
                        )
                        .single();

                    if (error) {
                        throw error;
                    }

                    currentScanRequest =
                        data;

                    if (
                        data.status ===
                        "completed"
                    ) {

                        stopScanMonitoring();

                        await showCompletedScan(
                            data
                        );

                    } else if (
                        data.status ===
                        "error"
                    ) {

                        stopScanMonitoring();

                        showContent(`

                            <div class="welcome-panel">

                                <h2>Scan Error</h2>

                                <p class="error-text">
                                    The scanner reported an error.
                                </p>

                            </div>
                        `);

                    } else if (
                        data.status ===
                        "cancelled"
                    ) {

                        stopScanMonitoring();

                        showContent(`

                            <div class="welcome-panel">

                                <h2>Scan Cancelled</h2>

                                <p>
                                    The scan request was cancelled.
                                </p>

                            </div>
                        `);
                    }

                } catch (error) {

                    console.error(
                        "Scan monitoring error:",
                        error
                    );

                }

            },
            1500
        );
}


function stopScanMonitoring() {

    if (scanMonitorTimer) {

        clearInterval(
            scanMonitorTimer
        );

        scanMonitorTimer = null;
    }
}


async function cancelCurrentScanRequest(
    requestId
) {

    if (!confirm(
        "Cancel this scan?"
    )) {
        return;
    }

    try {

        const {
            error
        } = await db
            .from("scan_requests")
            .update({
                status: "cancelled"
            })
            .eq(
                "id",
                requestId
            );

        if (error) {
            throw error;
        }

        stopScanMonitoring();

        showContent(`

            <div class="welcome-panel">

                <h2>Scan Cancelled</h2>

                <p>
                    The scan request has been cancelled.
                </p>

            </div>

        `);

    } catch (error) {

        alert(
            getErrorMessage(error)
        );
    }
}


/* ================================================================
   COMPLETED SCAN
================================================================ */

async function showCompletedScan(request) {

    let measurement = null;

    try {

        /*
         * Measurements normally reference the scan request.
         */

        const result =
            await db
                .from("measurements")
                .select("*")
                .eq(
                    "scan_request_id",
                    request.id
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .limit(1)
                .maybeSingle();

        if (!result.error) {
            measurement =
                result.data;
        }

    } catch (error) {

        console.error(
            "Completed measurement lookup error:",
            error
        );
    }

    showContent(`

        <div class="content-header">

            <div>
                <h2>Scan Complete</h2>

                <p>
                    Acoustic scan completed successfully.
                </p>
            </div>

        </div>

        <div class="welcome-panel">

            <h3>Scan Details</h3>

            <p>
                Bone:
                <strong>
                    ${escapeHtml(
                        request.bone || "—"
                    )}
                </strong>
            </p>

            <p>
                Side:
                <strong>
                    ${escapeHtml(
                        request.side || "—"
                    )}
                </strong>
            </p>

            ${
                measurement
                    ? `
                    <hr>

                    <p>
                        Resonance f0:
                        <strong>
                            ${formatMetric(
                                measurement.f0 ??
                                measurement.resonance_frequency
                            )}
                        </strong>
                    </p>

                    <p>
                        RMS:
                        <strong>
                            ${formatMetric(
                                measurement.rms
                            )}
                        </strong>
                    </p>

                    <p>
                        Bandwidth:
                        <strong>
                            ${formatMetric(
                                measurement.bandwidth
                            )}
                        </strong>
                    </p>

                    <p>
                        Q:
                        <strong>
                            ${formatMetric(
                                measurement.q ??
                                measurement.q_factor
                            )}
                        </strong>
                    </p>
                    `
                    : `
                    <p>
                        Measurement record is being processed.
                    </p>
                    `
            }

        </div>

    `);
}


/* ================================================================
   PATIENT PORTAL LOGIN
================================================================ */

async function handlePatientLogin(event) {

    event.preventDefault();

    const code =
        valueOf("patientCode");

    if (!code) {

        showPatientPortalMessage(
            "Please enter your patient code.",
            "error"
        );

        return;
    }

    showPatientPortalMessage(
        "Loading..."
    );

    try {

        const {
            data,
            error
        } = await db.rpc(
            "patient_login",
            {
                p_patient_code:
                    code
            }
        );

        if (error) {
            throw error;
        }

        if (!data) {

            showPatientPortalMessage(
                "Patient not found.",
                "error"
            );

            return;
        }

        currentPatientPortalData =
            Array.isArray(data)
                ? data[0]
                : data;

        await showPatientResults(
            currentPatientPortalData
        );

    } catch (error) {

        console.error(
            "Patient portal login error:",
            error
        );

        showPatientPortalMessage(
            getErrorMessage(error),
            "error"
        );
    }
}


/* ================================================================
   PATIENT RESULTS
================================================================ */

async function showPatientResults(
    patient
) {

    hideAllPages();

    const page =
        document.getElementById(
            "patientResults"
        );

    if (page) {
        page.classList.remove("hidden");
    }

    const container =
        document.getElementById(
            "patientResultsContent"
        );

    if (!container) {
        return;
    }

    const patientId =
        patient?.id;

    let measurements = [];

    if (patientId) {

        try {

            const {
                data,
                error
            } = await db
                .from("measurements")
                .select("*")
                .eq(
                    "patient_id",
                    patientId
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

            if (!error) {
                measurements =
                    data || [];
            }

        } catch (error) {

            console.error(
                "Patient measurements error:",
                error
            );
        }
    }

    let html = `

        <div class="content-header">

            <div>

                <h2>
                    Patient Results
                </h2>

                <p>
                    ${escapeHtml(
                        patient?.name ||
                        "Patient"
                    )}
                </p>

            </div>

        </div>

        <div class="welcome-panel">

            <p>
                Patient Code:
                <strong>
                    ${escapeHtml(
                        patient?.patient_code ||
                        "—"
                    )}
                </strong>
            </p>

            <p>
                Age:
                <strong>
                    ${escapeHtml(
                        patient?.age ?? "—"
                    )}
                </strong>
            </p>

            <p>
                Sex:
                <strong>
                    ${escapeHtml(
                        patient?.sex || "—"
                    )}
                </strong>
            </p>

        </div>
    `;

    if (
        measurements.length === 0
    ) {

        html += `

            <div class="welcome-panel">

                <h3>No Measurements</h3>

                <p>
                    No measurement results are currently available.
                </p>

            </div>

        `;

    } else {

        html += `

            <div class="table-container">

                <table>

                    <thead>

                        <tr>
                            <th>Date</th>
                            <th>Bone</th>
                            <th>Side</th>
                            <th>f0</th>
                            <th>RMS</th>
                            <th>Bandwidth</th>
                            <th>Q</th>
                        </tr>

                    </thead>

                    <tbody>
        `;

        measurements.forEach(row => {

            html += `

                <tr>

                    <td>
                        ${formatDate(
                            row.created_at ||
                            row.measured_at
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            row.bone || "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            row.side || "—"
                        )}
                    </td>

                    <td>
                        ${formatMetric(
                            row.f0 ??
                            row.resonance_frequency
                        )}
                    </td>

                    <td>
                        ${formatMetric(
                            row.rms
                        )}
                    </td>

                    <td>
                        ${formatMetric(
                            row.bandwidth
                        )}
                    </td>

                    <td>
                        ${formatMetric(
                            row.q ??
                            row.q_factor
                        )}
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

    container.innerHTML =
        html;
}


/* ================================================================
   CONTENT AREA
================================================================ */

function showContent(html) {

    const area =
        document.getElementById(
            "contentArea"
        );

    if (!area) {
        return;
    }

    area.innerHTML =
        html;

    area.classList.remove(
        "hidden"
    );

    area.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function hideContent() {

    const area =
        document.getElementById(
            "contentArea"
        );

    if (!area) {
        return;
    }

    area.innerHTML = "";

    area.classList.add(
        "hidden"
    );
}


/* ================================================================
   MODAL
================================================================ */

function setupModal() {

    const modal =
        document.getElementById(
            "modal"
        );

    if (!modal) {
        return;
    }

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {
                closeModal();
            }
        }
    );
}


function showModal(
    title,
    content
) {

    const modal =
        document.getElementById(
            "modal"
        );

    const modalTitle =
        document.getElementById(
            "modalTitle"
        );

    const modalBody =
        document.getElementById(
            "modalBody"
        );

    if (!modal) {
        return;
    }

    if (modalTitle) {
        modalTitle.textContent =
            title;
    }

    if (modalBody) {
        modalBody.innerHTML =
            content;
    }

    modal.classList.remove(
        "hidden"
    );
}


function closeModal() {

    const modal =
        document.getElementById(
            "modal"
        );

    if (modal) {
        modal.classList.add(
            "hidden"
        );
    }
}


/* ================================================================
   ROLE HELPERS
================================================================ */

function isAdmin() {

    return (
        currentProfile &&
        currentProfile.role === "admin"
    );
}


function isOperator() {

    return (
        currentProfile &&
        currentProfile.role === "operator"
    );
}


function isStaff() {

    return (
        isAdmin() ||
        isOperator()
    );
}


/* ================================================================
   UI MESSAGE HELPERS
================================================================ */

function showLoginMessage(
    message,
    type = ""
) {

    const element =
        document.getElementById(
            "loginMessage"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message || "";

    element.className =
        type
            ? `message ${type}`
            : "message";
}


function showPatientPortalMessage(
    message,
    type = ""
) {

    const element =
        document.getElementById(
            "patientPortalMessage"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message || "";

    element.className =
        type
            ? `message ${type}`
            : "message";
}


function setMessage(
    element,
    message,
    type = ""
) {

    if (!element) {
        return;
    }

    element.textContent =
        message || "";

    element.className =
        type
            ? `message ${type}`
            : "message";
}


/* ================================================================
   SYSTEM STATUS
================================================================ */

function updateSystemStatus(
    message
) {

    const element =
        document.getElementById(
            "systemStatus"
        );

    if (element) {
        element.textContent =
            message;
    }
}


/* ================================================================
   GENERAL HELPERS
================================================================ */

function valueOf(id) {

    const element =
        document.getElementById(id);

    if (!element) {
        return "";
    }

    return String(
        element.value || ""
    ).trim();
}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value == null
                ? "—"
                : value;
    }
}


function numberOrNull(value) {

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


function formatMetric(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return escapeHtml(
            String(value)
        );
    }

    return escapeHtml(
        number.toFixed(2)
    );
}


function formatDate(value) {

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


function capitalize(value) {

    if (!value) {
        return "";
    }

    const text =
        String(value);

    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );
}


function generatePatientCode() {

    const random =
        Math.floor(
            100000 +
            Math.random() * 900000
        );

    return `P-${random}`;
}


function getErrorMessage(error) {

    if (!error) {
        return "Unknown error.";
    }

    if (
        typeof error === "string"
    ) {
        return error;
    }

    return (
        error.message ||
        error.error_description ||
        error.details ||
        error.hint ||
        "An unexpected error occurred."
    );
}


/* ================================================================
   HTML ESCAPING
================================================================ */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttr(value) {
    return escapeHtml(value);
}


function escapeJsString(value) {

    return String(value || "")
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'")
        .replaceAll('"', '\\"')
        .replaceAll("\n", "\\n")
        .replaceAll("\r", "\\r");
}


/* ================================================================
   EXPORT FUNCTIONS USED BY INLINE HTML BUTTONS
================================================================ */

window.openPatientForm =
    openPatientForm;

window.editPatient =
    editPatient;

window.deletePatient =
    deletePatient;

window.openReferenceManagement =
    openReferenceManagement;

window.openReferenceGroupForm =
    openReferenceGroupForm;

window.openReferenceSamples =
    openReferenceSamples;

window.openReferenceSampleForm =
    openReferenceSampleForm;

window.deleteReferenceGroup =
    deleteReferenceGroup;

window.deleteReferenceSample =
    deleteReferenceSample;

window.openReferenceScanner =
    openReferenceScanner;

window.openDeviceManagement =
    openDeviceManagement;

window.openOperatorManagement =
    openOperatorManagement;

window.deleteOperatorAccount =
    deleteOperatorAccount;

window.startPatientScan =
    startPatientScan;

window.openNewPatientScan =
    openNewPatientScan;

window.cancelCurrentScanRequest =
    cancelCurrentScanRequest;

window.closeModal =
    closeModal;

window.showLoginPage =
    showLoginPage;

window.showCreateAccountPage =
    showCreateAccountPage;

window.showPatientPortal =
    showPatientPortal;

window.showDashboard =
    showDashboard;


/* ================================================================
   END
================================================================ */
