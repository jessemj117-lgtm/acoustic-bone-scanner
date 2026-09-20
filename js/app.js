/* ================================================================
   GROUP 4 ACOUSTIC BONE SCANNER
   FRONTEND APPLICATION
================================================================ */


/* ================================================================
   GLOBAL STATE
================================================================ */

const db = window.supabaseClient;

let currentUser = null;
let currentProfile = null;

let patientPortalPatient = null;

let currentPage = "dashboard";

let referenceGroupsCache = [];

let selectedPatientId = null;

let scanPollTimer = null;


/* ================================================================
   INITIALIZATION
================================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializeApplication
);


async function initializeApplication() {

    console.log(
        "Acoustic Bone Scanner frontend starting..."
    );


    if (!db) {

        showFatalError(
            "Supabase could not be initialized. Check js/config.js."
        );

        return;
    }


    bindStaticEvents();


    setupModal();


    await restoreAuthentication();


    updateConnectionStatus(
        true
    );
}


/* ================================================================
   STATIC EVENT HANDLERS
================================================================ */

function bindStaticEvents() {

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }


    const createAccountForm =
        document.getElementById(
            "createAccountForm"
        );

    if (createAccountForm) {

        createAccountForm.addEventListener(
            "submit",
            handleCreateAccount
        );
    }


    const patientLoginForm =
        document.getElementById(
            "patientLoginForm"
        );

    if (patientLoginForm) {

        patientLoginForm.addEventListener(
            "submit",
            handlePatientLogin
        );
    }


    document
        .getElementById("patientPortalButton")
        ?.addEventListener(
            "click",
            showPatientLogin
        );


    document
        .getElementById("createAccountButton")
        ?.addEventListener(
            "click",
            showCreateAccount
        );


    document
        .getElementById("backToLoginButton")
        ?.addEventListener(
            "click",
            showStaffLogin
        );


    document
        .getElementById("patientBackButton")
        ?.addEventListener(
            "click",
            showStaffLogin
        );


    document
        .getElementById("logoutButton")
        ?.addEventListener(
            "click",
            logout
        );


    document
        .getElementById("patientPortalLogout")
        ?.addEventListener(
            "click",
            showStaffLogin
        );


    document
        .getElementById("mobileMenuButton")
        ?.addEventListener(
            "click",
            toggleSidebar
        );
}


/* ================================================================
   AUTHENTICATION
================================================================ */

async function restoreAuthentication() {

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

                showApplication();
                return;
            }


            await db.auth.signOut();

            currentUser = null;
            currentProfile = null;
        }


        showAuthScreen();

    } catch (error) {

        console.error(
            "Session restore error:",
            error
        );

        showAuthScreen();
    }


    db.auth.onAuthStateChange(
        async (event, session) => {

            console.log(
                "Auth event:",
                event
            );


            if (
                event === "SIGNED_OUT"
            ) {

                currentUser = null;
                currentProfile = null;

                showAuthScreen();

                return;
            }


            if (
                session &&
                session.user
            ) {

                currentUser =
                    session.user;

                try {

                    await loadCurrentProfile();

                    if (currentProfile) {
                        showApplication();
                    }

                } catch (error) {

                    console.error(
                        "Auth state profile error:",
                        error
                    );
                }
            }
        }
    );
}


/* ================================================================
   LOGIN
================================================================ */

async function handleLogin(event) {

    event.preventDefault();


    const form =
        event.currentTarget;


    const formData =
        new FormData(form);


    const email =
        String(
            formData.get("email") || ""
        ).trim();


    const password =
        String(
            formData.get("password") || ""
        );


    const message =
        document.getElementById(
            "loginMessage"
        );


    clearMessage(message);


    if (!email) {

        setMessage(
            message,
            "Please enter your email address.",
            "error"
        );

        return;
    }


    if (!password) {

        setMessage(
            message,
            "Please enter your password.",
            "error"
        );

        return;
    }


    setMessage(
        message,
        "Signing in...",
        "info"
    );


    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );


    setButtonLoading(
        submitButton,
        true,
        "Signing in..."
    );


    try {

        const {
            data,
            error
        } = await db.auth.signInWithPassword({

            email,
            password

        });


        if (error) {
            throw error;
        }


        if (
            !data ||
            !data.user
        ) {

            throw new Error(
                "Supabase did not return a user."
            );
        }


        currentUser =
            data.user;


        await loadCurrentProfile();


        if (!currentProfile) {

            await db.auth.signOut();

            currentUser = null;

            throw new Error(
                "Your login exists, but no application profile was found. Ask the administrator to create your operator profile."
            );
        }


        clearMessage(message);


        form.reset();


        showApplication();


        toast(
            "Signed in successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        setMessage(
            message,
            readableAuthError(error),
            "error"
        );

    } finally {

        setButtonLoading(
            submitButton,
            false,
            "Sign in"
        );
    }
}


/* ================================================================
   CREATE ACCOUNT
================================================================ */

async function handleCreateAccount(event) {

    event.preventDefault();


    const form =
        event.currentTarget;


    const formData =
        new FormData(form);


    const name =
        String(
            formData.get("name") || ""
        ).trim();


    const email =
        String(
            formData.get("email") || ""
        ).trim();


    const password =
        String(
            formData.get("password") || ""
        );


    const message =
        document.getElementById(
            "createAccountMessage"
        );


    clearMessage(message);


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


    const button =
        form.querySelector(
            'button[type="submit"]'
        );


    setButtonLoading(
        button,
        true,
        "Creating account..."
    );


    try {

        const {
            data,
            error
        } = await db.auth.signUp({

            email,
            password,

            options: {

                data: {
                    name,
                    role: "operator"
                }

            }

        });


        if (error) {
            throw error;
        }


        /*
         * If Supabase email confirmation is disabled,
         * a session may immediately exist.
         */

        if (
            data &&
            data.session &&
            data.user
        ) {

            currentUser =
                data.user;


            /*
             * Try to create the profile.
             *
             * If the database trigger already created it,
             * this will simply update it.
             */

            await ensureOperatorProfile(
                data.user.id,
                name
            );


            await loadCurrentProfile();


            form.reset();


            showApplication();


            toast(
                "Operator account created.",
                "success"
            );


        } else {

            /*
             * Email confirmation is enabled.
             */

            setMessage(
                message,
                "Account created. Check your email, confirm the account, then return here and sign in.",
                "success"
            );

            form.reset();
        }


    } catch (error) {

        console.error(
            "Create account error:",
            error
        );


        setMessage(
            message,
            error.message ||
                "Unable to create account.",
            "error"
        );

    } finally {

        setButtonLoading(
            button,
            false,
            "Create account"
        );
    }
}


/* ================================================================
   ENSURE OPERATOR PROFILE
================================================================ */

async function ensureOperatorProfile(
    userId,
    name
) {

    if (!userId) {
        return;
    }


    const {
        error
    } = await db
        .from("profiles")
        .upsert({

            id: userId,

            name:
                name ||
                "Operator",

            role: "operator"

        });


    if (error) {

        console.warn(
            "Could not automatically create profile:",
            error
        );
    }
}


/* ================================================================
   LOAD PROFILE
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
        .eq(
            "id",
            currentUser.id
        )
        .maybeSingle();


    if (error) {
        throw error;
    }


    currentProfile =
        data || null;


    return currentProfile;
}


/* ================================================================
   LOGOUT
================================================================ */

async function logout() {

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


    stopScanPolling();


    showAuthScreen();


    toast(
        "You have been signed out.",
        "success"
    );
}


/* ================================================================
   SCREEN MANAGEMENT
================================================================ */

function showAuthScreen() {

    document
        .getElementById("authScreen")
        ?.classList.remove("hidden");


    document
        .getElementById("appScreen")
        ?.classList.add("hidden");


    document
        .getElementById("patientPortalScreen")
        ?.classList.add("hidden");


    showStaffLogin();
}


function showApplication() {

    document
        .getElementById("authScreen")
        ?.classList.add("hidden");


    document
        .getElementById("patientPortalScreen")
        ?.classList.add("hidden");


    document
        .getElementById("appScreen")
        ?.classList.remove("hidden");


    updateUserHeader();


    buildNavigation();


    navigate(
        "dashboard"
    );
}


/* ================================================================
   AUTH VIEWS
================================================================ */

function hideAuthViews() {

    [
        "loginView",
        "createAccountView",
        "patientLoginView"
    ].forEach(id => {

        document
            .getElementById(id)
            ?.classList.add("hidden");
    });
}


function showStaffLogin() {

    // Clear patient portal state
    patientPortalPatient = null;

    // Hide the patient portal
    document
        .getElementById("patientPortalScreen")
        ?.classList.add("hidden");

    // Hide the staff application
    document
        .getElementById("appScreen")
        ?.classList.add("hidden");

    // IMPORTANT:
    // The authentication container itself was hidden
    // when the patient portal was opened.
    document
        .getElementById("authScreen")
        ?.classList.remove("hidden");

    // Hide all authentication views
    hideAuthViews();

    // Show the normal staff login
    document
        .getElementById("loginView")
        ?.classList.remove("hidden");
}

function showCreateAccount() {

    hideAuthViews();

    document
        .getElementById("createAccountView")
        ?.classList.remove("hidden");


    document
        .getElementById("createAccountMessage")
        ?.replaceChildren();
}


function showPatientLogin() {

    hideAuthViews();

    document
        .getElementById("patientLoginView")
        ?.classList.remove("hidden");
}


/* ================================================================
   PATIENT PORTAL LOGIN
================================================================ */

async function handlePatientLogin(event) {

    event.preventDefault();

    const code =
        document.getElementById(
            "patientCode"
        ).value.trim();

    const message =
        document.getElementById(
            "patientLoginMessage"
        );

    if (!code) {

        message.textContent =
            "Please enter your patient code.";

        message.className =
            "message error";

        return;
    }

    message.textContent =
        "Loading results...";

    message.className =
        "message";

    try {

        const {
            data,
            error
        } = await db.rpc(
            "patient_login",
            {
                p_patient_code: code
            }
        );

        if (error) {
            throw error;
        }

        if (
            !data ||
            data.success !== true ||
            !data.patient
        ) {

            throw new Error(
                data?.message ||
                "Patient code not found."
            );
        }

        const patient =
            data.patient;

        if (!patient.id) {

            throw new Error(
                "Patient login succeeded, but no patient ID was returned."
            );
        }

        patientPortalPatient =
            patient;

        await renderPatientPortal(
            patient
        );

    } catch (error) {

        console.error(
            "Patient login error:",
            error
        );

        message.textContent =
            error.message ||
            "Unable to find patient.";

        message.className =
            "message error";
    }
}


/* ================================================================
   PATIENT PORTAL
================================================================ */

/* ================================================================
   PATIENT PORTAL
================================================================ */

async function renderPatientPortal(
    patient
) {

    const patientId =
        patient?.id;

    if (!patientId) {

        throw new Error(
            "Invalid patient ID."
        );

    }

    document
        .getElementById("authScreen")
        ?.classList.add("hidden");

    document
        .getElementById("appScreen")
        ?.classList.add("hidden");

    document
        .getElementById("patientPortalScreen")
        ?.classList.remove("hidden");

    const container =
        document.getElementById(
            "patientPortalContent"
        );

    if (!container) {

        throw new Error(
            "Patient portal container not found."
        );

    }

    container.innerHTML =
        renderLoading(
            "Loading your measurements..."
        );

    try {

        /*
         * patient_login() already returns the
         * patient's measurements through its
         * SECURITY DEFINER function.
         *
         * Do NOT query measurements directly
         * from the public/browser role.
         */

        const measurements =
            Array.isArray(
                patient.measurements
            )
                ? patient.measurements
                : [];

        container.innerHTML =
            renderPatientResults(
                patient,
                measurements
            );

    } catch (error) {

        console.error(
            "Patient results error:",
            error
        );

        container.innerHTML = `

            <div class="panel">

                <div class="panel-body">

                    <h2>
                        Unable to load results
                    </h2>

                    <p>
                        ${escapeHtml(
                            error.message ||
                            "An error occurred."
                        )}
                    </p>

                </div>

            </div>

        `;

    }

}


function renderPatientResults(
    patient,
    measurements
) {

    const name =
        patient.name ||
        "Patient";


    let latest =
        measurements.length
            ? measurements[0]
            : null;


    let html = `

        <div class="patient-welcome">

            <div class="section-kicker">
                PATIENT PORTAL
            </div>

            <h1>
                Hello, ${escapeHtml(name)}
            </h1>

            <p>
                Patient code:
                <strong>
                    ${escapeHtml(
                        patient.patient_code ||
                        "—"
                    )}
                </strong>
            </p>

        </div>

    `;


    if (latest) {

        html += `

            <div class="panel">

                <div class="panel-header">

                    <div>

                        <h3>
                            Latest measurement
                        </h3>

                        <p>
                            ${formatDate(
                                latest.created_at
                            )}
                        </p>

                    </div>

                    <span class="badge primary">
                        Experimental result
                    </span>

                </div>

                <div class="panel-body">

                    ${renderMeasurementMetrics(
                        latest
                    )}

                </div>

            </div>

        `;
    }


    html += `

        <div class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Measurement history
                    </h3>

                    <p>
                        Your recorded scanner measurements.
                    </p>

                </div>

            </div>

            ${
                measurements.length
                    ? `
                        <div class="table-wrap">

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

                                    ${measurements
                                        .map(
                                            renderMeasurementRow
                                        )
                                        .join("")}

                                </tbody>

                            </table>

                        </div>
                    `
                    : `
                        <div class="empty-state">

                            <div class="empty-state-icon">
                                📊
                            </div>

                            <h3>
                                No measurements yet
                            </h3>

                            <p>
                                Your measurement results
                                will appear here after a scan
                                has been completed.
                            </p>

                        </div>
                    `
            }

        </div>


        <div class="research-note">

            <strong>
                Important information
            </strong>

            <p>
                This website displays results from an
                experimental acoustic scanner. The measurements
                are research data and should not be interpreted
                as a clinical diagnosis or as a direct
                measurement of bone mineral density.
            </p>

        </div>

    `;


    return html;
}


/* ================================================================
   NAVIGATION
================================================================ */

function buildNavigation() {

    const navigation =
        document.getElementById(
            "mainNavigation"
        );


    if (!navigation) {
        return;
    }


    const admin =
        isAdmin();


    const common =
        [

            {
                id: "dashboard",
                label: "Dashboard",
                group: "MAIN"
            },

            {
                id: "patients",
                label: "Patients",
                group: "CLINICAL"
            },

            {
                id: "measurements",
                label: "Measurements",
                group: "CLINICAL"
            },

            {
                id: "scanner",
                label: "Scanner",
                group: "CLINICAL"
            }

        ];


    const adminItems =
        [

            {
                id: "references",
                label: "Reference Groups",
                group: "DATABASE"
            },

            {
                id: "devices",
                label: "Devices",
                group: "SYSTEM"
            },

            {
                id: "operators",
                label: "Operators",
                group: "SYSTEM"
            }

        ];


    const items =
        admin
            ? common.concat(adminItems)
            : common;


    const groups = {};


    items.forEach(item => {

        if (!groups[item.group]) {
            groups[item.group] = [];
        }

        groups[item.group].push(item);
    });


    let html = "";


    Object.keys(groups)
        .forEach(group => {

            html += `

                <div class="nav-group">

                    <div class="nav-label">
                        ${escapeHtml(group)}
                    </div>

            `;


            groups[group]
                .forEach(item => {

                    html += `

                        <button
                            class="nav-item"
                            data-page="${item.id}"
                            type="button"
                        >
                            ${escapeHtml(
                                item.label
                            )}
                        </button>

                    `;
                });


            html += `
                </div>
            `;
        });


    navigation.innerHTML =
        html;


    navigation
        .querySelectorAll(".nav-item")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    navigate(
                        button.dataset.page
                    );


                    closeSidebar();
                }
            );
        });


    updateNavigation();
}


function updateNavigation() {

    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.page ===
                    currentPage
            );
        });
}


async function navigate(page) {

    currentPage =
        page;


    updateNavigation();


    const titleMap = {

        dashboard:
            "Dashboard",

        patients:
            "Patients",

        measurements:
            "Measurements",

        scanner:
            "Scanner",

        references:
            "Reference Groups",

        devices:
            "Devices",

        operators:
            "Operators"

    };


    document
        .getElementById("pageTitle")
        .textContent =
            titleMap[page] ||
            "Dashboard";


    document
        .getElementById("pageKicker")
        .textContent =
            page === "dashboard"
                ? "OVERVIEW"
                : "SCANNER SYSTEM";


    const content =
        document.getElementById(
            "mainContent"
        );


    content.innerHTML =
        renderLoading(
            "Loading..."
        );


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


            case "scanner":

                await renderScanner();
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


            default:

                await renderDashboard();
        }

    } catch (error) {

        console.error(
            `Page ${page} error:`,
            error
        );


        content.innerHTML =
            renderError(
                error.message ||
                "Unable to load this page."
            );
    }
}


/* ================================================================
   DASHBOARD
================================================================ */

async function renderDashboard() {

    const content =
        document.getElementById(
            "mainContent"
        );


    const [
        patients,
        measurements,
        references,
        devices
    ] = await Promise.all([

        countRows("patients"),

        countRows("measurements"),

        isAdmin()
            ? countRows("reference_samples")
            : Promise.resolve(null),

        isAdmin()
            ? countRows("devices")
            : Promise.resolve(null)

    ]);


    content.innerHTML = `

        <section class="dashboard-hero">

            <div class="section-kicker">
                ACOUSTIC BONE SCANNER
            </div>

            <h2>
                ${isAdmin()
                    ? "System overview"
                    : "Scanner workspace"}
            </h2>

            <p>
                Manage patients, acoustic measurements,
                scanner requests and reference data from
                one workspace.
            </p>

            <div class="dashboard-hero-actions">

                <button
                    class="button primary"
                    onclick="navigate('patients')"
                >
                    Patients
                </button>

                <button
                    class="button secondary"
                    onclick="navigate('scanner')"
                >
                    Scanner
                </button>

            </div>

        </section>


        <section class="stats-grid">

            ${statCard(
                "Patients",
                patients,
                "Registered patient records"
            )}

            ${statCard(
                "Measurements",
                measurements,
                "Recorded scan results"
            )}

            ${
                isAdmin()
                    ? statCard(
                        "References",
                        references,
                        "Reference samples"
                    )
                    : statCard(
                        "Role",
                        capitalize(
                            currentProfile?.role ||
                            "operator"
                        ),
                        "Current access level"
                    )
            }

            ${
                isAdmin()
                    ? statCard(
                        "Devices",
                        devices,
                        "Registered scanners"
                    )
                    : statCard(
                        "Device",
                        "ABS-001",
                        "Configured scanner"
                    )
            }

        </section>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        System information
                    </h3>

                    <p>
                        Current scanner platform configuration.
                    </p>

                </div>

                <span class="badge success">
                    Web system online
                </span>

            </div>

            <div class="panel-body">

                <div class="scanner-status">

                    ${scannerInfoCard(
                        "Scanner",
                        "ABS-001",
                        "Configured device"
                    )}

                    ${scannerInfoCard(
                        "Frequency range",
                        "200–1200 Hz",
                        "Coarse sweep"
                    )}

                    ${scannerInfoCard(
                        "Fine scan",
                        "±100 Hz / 5 Hz",
                        "Around coarse peak"
                    )}

                    ${scannerInfoCard(
                        "Primary metrics",
                        "f0 · RMS · BW · Q",
                        "Acoustic response"
                    )}

                </div>

            </div>

        </section>


        <section class="research-note">

            <strong>
                Experimental use
            </strong>

            <p>
                The Acoustic Bone Scanner is an academic
                research prototype. Its output represents
                measured acoustic/electromechanical response
                parameters and should not be presented as a
                direct clinical bone mineral density result.
            </p>

        </section>

    `;
}


/* ================================================================
   PATIENTS
================================================================ */

async function renderPatients() {

    const {
        data,
        error
    } = await db
        .from("patients")
        .select("*")
        .is("deleted_at", null)
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {
        throw error;
    }


    const patients =
        data || [];


    const content =
        document.getElementById(
            "mainContent"
        );


    content.innerHTML = `

        <div class="page-header">

            <div>

                <div class="section-kicker">
                    CLINICAL RECORDS
                </div>

                <h2>
                    Patients
                </h2>

                <p>
                    Manage patient records and start
                    acoustic measurements.
                </p>

            </div>

            <div class="actions">

                <button
                    class="button primary"
                    onclick="openPatientForm()"
                >
                    + Add patient
                </button>

            </div>

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Patient records
                    </h3>

                    <p>
                        ${patients.length}
                        active patient
                        ${patients.length === 1
                            ? ""
                            : "s"}
                    </p>

                </div>

            </div>


            ${
                patients.length
                    ? `
                        <div class="table-wrap">

                            <table>

                                <thead>

                                    <tr>
                                        <th>Name</th>
                                        <th>Patient code</th>
                                        <th>Age</th>
                                        <th>Sex</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>

                                </thead>

                                <tbody>

                                    ${patients
                                        .map(
                                            renderPatientRow
                                        )
                                        .join("")}

                                </tbody>

                            </table>

                        </div>
                    `
                    : renderEmpty(
                        "No patients",
                        "Create a patient record before starting a scanner measurement.",
                        "👤"
                    )
            }

        </section>

    `;
}


function renderPatientRow(patient) {

    return `

        <tr>

            <td>
                <strong>
                    ${escapeHtml(
                        patient.name ||
                        "Unnamed"
                    )}
                </strong>
            </td>

            <td>
                <span class="badge neutral">
                    ${escapeHtml(
                        patient.patient_code ||
                        "—"
                    )}
                </span>
            </td>

            <td>
                ${patient.age ?? "—"}
            </td>

            <td>
                ${escapeHtml(
                    patient.sex ||
                    "—"
                )}
            </td>

            <td>
                ${formatDate(
                    patient.created_at
                )}
            </td>

            <td>

                <div class="actions">

                    <button
                        class="button small secondary"
                        onclick="viewPatient('${patient.id}')"
                    >
                        View
                    </button>

                    <button
                        class="button small primary"
                        onclick="startPatientScan('${patient.id}')"
                    >
                        Scan
                    </button>

                    <button
                        class="button small danger"
                        onclick="deletePatient('${patient.id}')"
                    >
                        Delete
                    </button>

                </div>

            </td>

        </tr>

    `;
}


/* ================================================================
   PATIENT FORM
================================================================ */

function openPatientForm(
    patient = null
) {

    const editing =
        Boolean(patient);


    openModal(
        editing
            ? "Edit patient"
            : "Add patient",
        `

            <form
                id="patientForm"
                onsubmit="savePatient(event, '${patient?.id || ""}')"
            >

                <div class="form-grid">

                    <div class="full-width">

                        <label class="form-label">
                            Full name
                        </label>

                        <input
                            name="name"
                            required
                            value="${escapeAttribute(
                                patient?.name || ""
                            )}"
                            placeholder="Patient name"
                        >

                    </div>


                    <div>

                        <label class="form-label">
                            Age
                        </label>

                        <input
                            name="age"
                            type="number"
                            min="0"
                            max="130"
                            required
                            value="${escapeAttribute(
                                patient?.age ?? ""
                            )}"
                        >

                    </div>


                    <div>

                        <label class="form-label">
                            Sex
                        </label>

                        <select
                            name="sex"
                            required
                        >

                            <option value="">
                                Select
                            </option>

                            ${selectOption(
                                "Male",
                                patient?.sex
                            )}

                            ${selectOption(
                                "Female",
                                patient?.sex
                            )}

                            ${selectOption(
                                "Other",
                                patient?.sex
                            )}

                        </select>

                    </div>


                    <div class="full-width">

                        <label class="form-label">
                            Notes
                        </label>

                        <textarea
                            name="notes"
                            placeholder="Optional notes"
                        >${escapeHtml(
                            patient?.notes || ""
                        )}</textarea>

                    </div>

                </div>


                <div class="form-actions">

                    <button
                        type="button"
                        class="button secondary"
                        onclick="closeModal()"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="button primary"
                    >
                        ${editing
                            ? "Save changes"
                            : "Create patient"}
                    </button>

                </div>

            </form>

        `
    );
}


async function savePatient(
    event,
    patientId
) {

    event.preventDefault();


    if (!isStaff()) {
        return;
    }


    const form =
        event.currentTarget;


    const data =
        Object.fromEntries(
            new FormData(form)
        );


    const payload = {

        name:
            String(
                data.name || ""
            ).trim(),

        age:
            Number(data.age),

        sex:
            String(
                data.sex || ""
            ),

        notes:
            String(
                data.notes || ""
            ).trim()

    };


    try {

        if (patientId) {

            const {
                error
            } = await db
                .from("patients")
                .update(payload)
                .eq(
                    "id",
                    patientId
                );


            if (error) {
                throw error;
            }


            toast(
                "Patient updated.",
                "success"
            );

        } else {

            /*
             * Generate a simple human-readable code.
             *
             * The database remains the source of truth if
             * it has its own generation mechanism.
             */

            payload.patient_code =
                generatePatientCode();


            const {
                error
            } = await db
                .from("patients")
                .insert(payload);


            if (error) {
                throw error;
            }


            toast(
                "Patient created.",
                "success"
            );
        }


        closeModal();


        await renderPatients();


    } catch (error) {

        console.error(
            "Save patient error:",
            error
        );


        toast(
            error.message ||
            "Unable to save patient.",
            "error"
        );
    }
}


/* ================================================================
   VIEW PATIENT
================================================================ */

async function viewPatient(
    patientId
) {

    const {
        data: patient,
        error
    } = await db
        .from("patients")
        .select("*")
        .eq(
            "id",
            patientId
        )
        .single();


    if (error) {
        throw error;
    }


    const {
        data: measurements,
        error:
            measurementError
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


    if (measurementError) {
        throw measurementError;
    }


    selectedPatientId =
        patientId;


    const content =
        document.getElementById(
            "mainContent"
        );


    content.innerHTML = `

        <div class="page-header">

            <div>

                <button
                    class="text-button"
                    onclick="navigate('patients')"
                >
                    ← Back to patients
                </button>

                <div class="section-kicker">
                    PATIENT RECORD
                </div>

                <h2>
                    ${escapeHtml(
                        patient.name ||
                        "Patient"
                    )}
                </h2>

                <p>
                    ${escapeHtml(
                        patient.patient_code ||
                        "No patient code"
                    )}
                </p>

            </div>

            <div class="actions">

                <button
                    class="button secondary"
                    onclick="openPatientForm(${JSON.stringify(
                        patient
                    ).replace(/"/g, "&quot;")})"
                >
                    Edit
                </button>

                <button
                    class="button primary"
                    onclick="startPatientScan('${patient.id}')"
                >
                    Start scan
                </button>

            </div>

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Patient information
                    </h3>

                </div>

            </div>

            <div class="panel-body">

                <div class="form-grid">

                    ${infoItem(
                        "Name",
                        patient.name
                    )}

                    ${infoItem(
                        "Patient code",
                        patient.patient_code
                    )}

                    ${infoItem(
                        "Age",
                        patient.age
                    )}

                    ${infoItem(
                        "Sex",
                        patient.sex
                    )}

                </div>

            </div>

        </section>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Measurement history
                    </h3>

                    <p>
                        ${measurements?.length || 0}
                        recorded measurements
                    </p>

                </div>

            </div>

            ${
                measurements?.length
                    ? `
                        <div class="table-wrap">

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

                                    ${measurements
                                        .map(
                                            renderMeasurementRow
                                        )
                                        .join("")}

                                </tbody>

                            </table>

                        </div>
                    `
                    : renderEmpty(
                        "No measurements",
                        "Start a scanner measurement for this patient.",
                        "📊"
                    )
            }

        </section>

    `;
}


/* ================================================================
   DELETE PATIENT
================================================================ */

async function deletePatient(
    patientId
) {

    if (!isStaff()) {
        return;
    }


    const confirmed =
        confirm(
            "Delete this patient record?\n\nThis action cannot be undone."
        );


    if (!confirmed) {
        return;
    }


    try {

        /*
         * Existing project uses soft deletion.
         */

        const {
            error
        } = await db
            .from("patients")
            .update({
                deleted_at:
                    new Date().toISOString()
            })
            .eq(
                "id",
                patientId
            );


        if (error) {
            throw error;
        }


        toast(
            "Patient deleted.",
            "success"
        );


        await renderPatients();


    } catch (error) {

        console.error(
            "Delete patient error:",
            error
        );


        toast(
            error.message ||
            "Unable to delete patient.",
            "error"
        );
    }
}


/* ================================================================
   MEASUREMENTS
================================================================ */

async function renderMeasurements() {

    const {
        data,
        error
    } = await db
        .from("measurements")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        )
        .limit(200);


    if (error) {
        throw error;
    }


    const measurements =
        data || [];


    const content =
        document.getElementById(
            "mainContent"
        );


    content.innerHTML = `

        <div class="page-header">

            <div>

                <div class="section-kicker">
                    SCAN DATA
                </div>

                <h2>
                    Measurements
                </h2>

                <p>
                    Recorded acoustic scanner measurements.
                </p>

            </div>

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Measurement records
                    </h3>

                    <p>
                        Showing the latest
                        ${measurements.length}
                        records.
                    </p>

                </div>

            </div>


            ${
                measurements.length
                    ? `
                        <div class="table-wrap">

                            <table>

                                <thead>

                                    <tr>
                                        <th>Date</th>
                                        <th>Patient</th>
                                        <th>f0</th>
                                        <th>RMS</th>
                                        <th>Bandwidth</th>
                                        <th>Q</th>
                                    </tr>

                                </thead>

                                <tbody>

                                    ${measurements
                                        .map(
                                            m => `

                                                <tr>

                                                    <td>
                                                        ${formatDate(
                                                            m.created_at
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${escapeHtml(
                                                            m.patient_id ||
                                                            "—"
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${formatNumber(
                                                            m.f0
                                                        )}
                                                        Hz
                                                    </td>

                                                    <td>
                                                        ${formatNumber(
                                                            m.rms
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${formatNumber(
                                                            m.bandwidth
                                                        )}
                                                        Hz
                                                    </td>

                                                    <td>
                                                        ${formatNumber(
                                                            m.q_factor ??
                                                            m.q
                                                        )}
                                                    </td>

                                                </tr>

                                            `
                                        )
                                        .join("")}

                                </tbody>

                            </table>

                        </div>
                    `
                    : renderEmpty(
                        "No measurements",
                        "Completed scanner measurements will appear here.",
                        "📊"
                    )
            }

        </section>

    `;
}


/* ================================================================
   SCANNER
================================================================ */

async function renderScanner() {

    const content =
        document.getElementById(
            "mainContent"
        );


    const {
        data: devices,
        error
    } = await db
        .from("devices")
        .select("*")
        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if (error) {
        throw error;
    }


    const device =
        devices?.find(
            d =>
                d.device_code ===
                "ABS-001"
        ) ||
        devices?.[0];
const scannerOnline =
    isScannerOnline(device);

    content.innerHTML = `

        <div class="page-header">

            <div>

                <div class="section-kicker">
                    SCANNER CONTROL
                </div>

                <h2>
                    Scanner
                </h2>

                <p>
                    Prepare and request an acoustic measurement.
                </p>

            </div>

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Scanner status
                    </h3>

                    <p>
                        Device configuration and connectivity.
                    </p>

                </div>

                ${
                    device
                        ? `
                            <span class="badge success">
                                Registered
                            </span>
                        `
                        : `
                            <span class="badge danger">
                                Device missing
                            </span>
                        `
                }

            </div>

            <div class="panel-body">

                <div class="scanner-status">

                    ${scannerInfoCard(
                        "Device",
                        device?.device_code ||
                            "ABS-001",
                        "Scanner ID"
                    )}

                    ${scannerInfoCard(
                        "Status",
                        device?.status ||
                            "Unknown",
                        "Reported status"
                    )}

                    ${scannerInfoCard(
                        "Sweep",
                        "200–1200 Hz",
                        "25 Hz coarse steps"
                    )}

                    ${scannerInfoCard(
                        "Sampling",
                        "8 kHz / 256 samples",
                        "Per frequency"
                    )}

                </div>

            </div>

        </section>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Start patient measurement
                    </h3>

                    <p>
                        Select a patient and measurement location.
                    </p>

                </div>

            </div>

            <div class="panel-body">

                <div id="scannerPatientSelector">

                    ${renderLoading(
                        "Loading patients..."
                    )}

                </div>

            </div>

        </section>


        <section class="research-note">

            <strong>
                Measurement workflow
            </strong>

            <p>
                The operator selects the patient, radius or ulna,
                and left or right side. The website creates a
                scan request for the configured ESP32 scanner.
                The scanner performs the sweep and returns the
                measured f0, RMS, bandwidth and Q-factor.
            </p>

        </section>

    `;


    await loadScannerPatientSelector();
}


async function loadScannerPatientSelector() {

    const container =
        document.getElementById(
            "scannerPatientSelector"
        );


    if (!container) {
        return;
    }


    const {
        data: patients,
        error
    } = await db
        .from("patients")
        .select("*")
        .is("deleted_at", null)
        .order(
            "name",
            {
                ascending: true
            }
        );


    if (error) {

        container.innerHTML =
            renderError(
                error.message
            );

        return;
    }


    if (!patients?.length) {

        container.innerHTML =
            renderEmpty(
                "No patients available",
                "Create a patient before starting a scan.",
                "👤"
            );

        return;
    }


    container.innerHTML = `

        <form
            id="scannerRequestForm"
            onsubmit="createScanRequest(event)"
        >

            <div class="form-grid">

                <div>

                    <label class="form-label">
                        Patient
                    </label>

                    <select
                        name="patient_id"
                        required
                    >

                        <option value="">
                            Select patient
                        </option>

                        ${patients
                            .map(
                                p => `

                                    <option
                                        value="${escapeAttribute(
                                            p.id
                                        )}"
                                    >
                                        ${escapeHtml(
                                            p.name ||
                                            "Unnamed"
                                        )}
                                        —
                                        ${escapeHtml(
                                            p.patient_code ||
                                            "No code"
                                        )}
                                    </option>

                                `
                            )
                            .join("")}

                    </select>

                </div>


                <div>

                    <label class="form-label">
                        Bone
                    </label>

                    <select
                        name="bone"
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

                </div>


                <div>

                    <label class="form-label">
                        Side
                    </label>

                    <select
                        name="side"
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

                </div>


                <div>

                    <label class="form-label">
                        Scanner
                    </label>

                    <input
                        value="ABS-001"
                        disabled
                    >

                </div>

            </div>


            <div class="form-actions">

                <button
                    class="button primary"
                    type="submit"
                >
                    Create scan request
                </button>

            </div>

        </form>

        <div id="scanRequestStatus"></div>

    `;
}


/* ================================================================
   CREATE SCAN REQUEST
================================================================ */

async function createScanRequest(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    const device = await getScannerDevice();

    if (!device) {
        toast("Scanner device ABS-001 was not found in Supabase.", "error");
        return;
    }

    const status = document.getElementById("scanRequestStatus");

    try {
        const {
            data: scanRequest,
            error: scanRequestError
        } = await db
            .from("scan_requests")
            .insert({
                device_id: device.id,
                patient_id: data.patient_id,
                operator_id: currentUser.id,

                // Database allows only: patient or reference
                scan_type: "patient",

                status: "pending",
                requested_at: new Date().toISOString(),
                bone: data.bone || null,
                side: data.side || null
            })
            .select("*")
            .single();

        if (scanRequestError) {
            throw scanRequestError;
        }

        selectedPatientId = data.patient_id;

        if (status) {
            status.innerHTML = `
                <div class="success-message">
                    Scan request created successfully.<br>
                    Request ID: <strong>${escapeHtml(scanRequest.id)}</strong><br>
                    Scanner: <strong>ABS-001</strong><br>
                    Status: <strong>Waiting for scanner</strong>
                </div>
            `;
        }

        form.reset();

        toast("Scan request sent to ABS-001.", "success");

        monitorScanRequest(scanRequest.id);

    } catch (error) {
        console.error("Create scan request error:", error);

        if (status) {
            status.innerHTML = `
                <div class="error-message">
                    ${escapeHtml(error.message || "Unable to create scan request.")}
                </div>
            `;
        }

        toast(
            error.message || "Unable to create scan request.",
            "error"
        );
    }
}

/* ================================================================
   SCAN REQUEST POLLING
================================================================ */

function monitorScanRequest(
    requestId
) {

    stopScanPolling();


    let attempts = 0;


    scanPollTimer =
        setInterval(
            async () => {

                attempts++;


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


                    const status =
                        document.getElementById(
                            "activeScanStatus"
                        );


                    if (status) {

                        status.textContent =
                            `Scanner status: ${
                                data.status ||
                                "pending"
                            }`;
                    }


                    if (
                        [
                            "completed",
                            "error",
                            "cancelled"
                        ].includes(
                            data.status
                        )
                    ) {

                        stopScanPolling();


                        if (
                            data.status ===
                            "completed"
                        ) {

                            toast(
                                "Scanner measurement completed.",
                                "success"
                            );

                        } else {

                            toast(
                                `Scan ${data.status}.`,
                                "error"
                            );
                        }
                    }


                    /*
                     * Stop polling after 10 minutes.
                     */

                    if (
                        attempts >= 400
                    ) {

                        stopScanPolling();

                        if (status) {

                            status.textContent =
                                "Scanner request timed out. Check the device connection.";
                        }
                    }

                } catch (error) {

                    console.error(
                        "Scan polling error:",
                        error
                    );
                }

            },
            1500
        );
}


function stopScanPolling() {

    if (scanPollTimer) {

        clearInterval(
            scanPollTimer
        );

        scanPollTimer = null;
    }
}


/* ================================================================
   QUICK PATIENT SCAN
================================================================ */

async function startPatientScan(
    patientId
) {

    selectedPatientId =
        patientId;


    navigate(
        "scanner"
    );


    /*
     * Scanner selector loads after navigation.
     * Give it a moment, then select the patient.
     */

    setTimeout(
        () => {

            const select =
                document.querySelector(
                    '#scannerRequestForm select[name="patient_id"]'
                );


            if (select) {

                select.value =
                    patientId;
            }

        },
        500
    );
}


/* ================================================================
   REFERENCES
================================================================ */

async function renderReferences() {

    if (!isAdmin()) {

        showAccessDenied();

        return;
    }


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


    referenceGroupsCache =
        groups || [];


    const sampleCounts =
        {};


    for (
        const group of referenceGroupsCache
    ) {

        const {
            count
        } = await db
            .from("reference_samples")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "reference_group_id",
                group.id
            );


        sampleCounts[group.id] =
            count || 0;
    }


    const content =
        document.getElementById(
            "mainContent"
        );


    content.innerHTML = `

        <div class="page-header">

            <div>

                <div class="section-kicker">
                    RESEARCH DATABASE
                </div>

                <h2>
                    Reference Groups
                </h2>

                <p>
                    Define population reference groups by
                    age, sex, bone and side.
                </p>

            </div>

            <div class="actions">

                <button
                    class="button primary"
                    onclick="openReferenceGroupForm()"
                >
                    + Add reference group
                </button>

            </div>

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Reference groups
                    </h3>

                    <p>
                        Reference groups remain separate
                        from individual scanner/device baselines.
                    </p>

                </div>

            </div>


            ${
                referenceGroupsCache.length
                    ? `
                        <div class="panel-body">

                            <div class="reference-group-grid">

                                ${referenceGroupsCache
                                    .map(
                                        group =>
                                            renderReferenceGroupCard(
                                                group,
                                                sampleCounts[
                                                    group.id
                                                ] || 0
                                            )
                                    )
                                    .join("")}

                            </div>

                        </div>
                    `
                    : renderEmpty(
                        "No reference groups",
                        "Create the first reference group for the research dataset.",
                        "🧬"
                    )
            }

        </section>

    `;
}


function renderReferenceGroupCard(
    group,
    sampleCount
) {

    return `

        <article
            class="reference-group-card"
        >

            <div class="section-kicker">
                ${escapeHtml(
                    group.sex ||
                    ""
                ).toUpperCase()}
            </div>

            <h3>
                ${escapeHtml(
                    group.name
                )}
            </h3>


            <div class="reference-group-meta">

                <span class="badge primary">
                    Age ${group.age_min}–${group.age_max}
                </span>

                <span class="badge neutral">
                    ${capitalize(
                        group.bone
                    )}
                </span>

                <span class="badge neutral">
                    ${capitalize(
                        group.side
                    )}
                </span>

                <span class="badge success">
                    ${sampleCount}
                    sample${sampleCount === 1 ? "" : "s"}
                </span>

            </div>


            <div class="reference-group-description">

                ${escapeHtml(
                    group.description ||
                    "No description."
                )}

            </div>


            <div class="reference-group-footer">

                <button
                    class="button small secondary"
                    onclick="openReferenceSamples('${group.id}')"
                >
                    View samples
                </button>

                <div class="actions">

                    <button
                        class="button small secondary"
                        onclick="editReferenceGroup('${group.id}')"
                    >
                        Edit
                    </button>

                    <button
                        class="button small danger"
                        onclick="deleteReferenceGroup('${group.id}')"
                    >
                        Delete
                    </button>

                </div>

            </div>

        </article>

    `;
}


/* ================================================================
   REFERENCE GROUP FORM
================================================================ */

function openReferenceGroupForm(
    existing = null
) {

    openModal(
        existing
            ? "Edit reference group"
            : "Create reference group",

        `

            <form
                onsubmit="saveReferenceGroup(event, '${existing?.id || ""}')"
            >

                <div class="form-grid">

                    <div class="full-width">

                        <label class="form-label">
                            Group name
                        </label>

                        <input
                            name="name"
                            required
                            value="${escapeAttribute(
                                existing?.name || ""
                            )}"
                            placeholder="Female 30–39 Left Radius"
                        >

                    </div>


                    <div>

                        <label class="form-label">
                            Minimum age
                        </label>

                        <input
                            name="age_min"
                            type="number"
                            min="0"
                            required
                            value="${escapeAttribute(
                                existing?.age_min ?? ""
                            )}"
                        >

                    </div>


                    <div>

                        <label class="form-label">
                            Maximum age
                        </label>

                        <input
                            name="age_max"
                            type="number"
                            min="0"
                            required
                            value="${escapeAttribute(
                                existing?.age_max ?? ""
                            )}"
                        >

                    </div>


                    <div>

                        <label class="form-label">
                            Sex
                        </label>

                        <select
                            name="sex"
                            required
                        >

                            <option value="">
                                Select
                            </option>

                            ${selectOption(
                                "male",
                                existing?.sex
                            )}

                            ${selectOption(
                                "female",
                                existing?.sex
                            )}

                            ${selectOption(
                                "other",
                                existing?.sex
                            )}

                        </select>

                    </div>


                    <div>

                        <label class="form-label">
                            Bone
                        </label>

                        <select
                            name="bone"
                            required
                        >

                            ${selectOption(
                                "radius",
                                existing?.bone
                            )}

                            ${selectOption(
                                "ulna",
                                existing?.bone
                            )}

                        </select>

                    </div>


                    <div>

                        <label class="form-label">
                            Side
                        </label>

                        <select
                            name="side"
                            required
                        >

                            ${selectOption(
                                "left",
                                existing?.side
                            )}

                            ${selectOption(
                                "right",
                                existing?.side
                            )}

                        </select>

                    </div>


                    <div class="full-width">

                        <label class="form-label">
                            Description
                        </label>

                        <textarea
                            name="description"
                            placeholder="Optional description"
                        >${escapeHtml(
                            existing?.description ||
                            ""
                        )}</textarea>

                    </div>

                </div>


                <div class="form-actions">

                    <button
                        type="button"
                        class="button secondary"
                        onclick="closeModal()"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="button primary"
                    >
                        ${existing
                            ? "Save changes"
                            : "Create group"}
                    </button>

                </div>

            </form>

        `
    );
}


async function saveReferenceGroup(
    event,
    groupId
) {

    event.preventDefault();


    const form =
        event.currentTarget;


    const data =
        Object.fromEntries(
            new FormData(form)
        );


    const ageMin =
        Number(
            data.age_min
        );


    const ageMax =
        Number(
            data.age_max
        );


    if (
        ageMin < 0 ||
        ageMax < ageMin
    ) {

        toast(
            "Please enter a valid age range.",
            "error"
        );

        return;
    }


    const payload = {

        name:
            String(
                data.name || ""
            ).trim(),

        age_min:
            ageMin,

        age_max:
            ageMax,

        sex:
            String(
                data.sex || ""
            ),

        bone:
            String(
                data.bone || ""
            ),

        side:
            String(
                data.side || ""
            ),

        description:
            String(
                data.description || ""
            ).trim()

    };


    try {

        if (groupId) {

            const {
                error
            } = await db
                .from("reference_groups")
                .update(payload)
                .eq(
                    "id",
                    groupId
                );


            if (error) {
                throw error;
            }


            toast(
                "Reference group updated.",
                "success"
            );

        } else {

            const {
                error
            } = await db
                .from("reference_groups")
                .insert(
                    payload
                );


            if (error) {
                throw error;
            }


            toast(
                "Reference group created.",
                "success"
            );
        }


        closeModal();


        await renderReferences();


    } catch (error) {

        console.error(
            "Reference group save error:",
            error
        );


        toast(
            error.message ||
            "Unable to save reference group.",
            "error"
        );
    }
}


/* ================================================================
   EDIT REFERENCE GROUP
================================================================ */

function editReferenceGroup(
    groupId
) {

    const group =
        referenceGroupsCache.find(
            g =>
                g.id === groupId
        );


    if (!group) {

        toast(
            "Reference group not found.",
            "error"
        );

        return;
    }


    openReferenceGroupForm(
        group
    );
}


/* ================================================================
   DELETE REFERENCE GROUP
================================================================ */

async function deleteReferenceGroup(
    groupId
) {

    if (!isAdmin()) {
        return;
    }


    const confirmed =
        confirm(
            "Delete this reference group?\n\nAll reference samples belonging to this group may also be deleted."
        );


    if (!confirmed) {
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


        toast(
            "Reference group deleted.",
            "success"
        );


        await renderReferences();


    } catch (error) {

        console.error(
            "Delete reference group error:",
            error
        );


        toast(
            error.message ||
            "Unable to delete reference group.",
            "error"
        );
    }
}


/* ================================================================
   REFERENCE SAMPLES
================================================================ */

async function openReferenceSamples(
    groupId
) {

    const group =
        referenceGroupsCache.find(
            g =>
                g.id === groupId
        );


    if (!group) {
        return;
    }


    const {
        data: samples,
        error
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


    if (error) {
        throw error;
    }


    const content =
        document.getElementById(
            "mainContent"
        );


    content.innerHTML = `

        <div class="page-header">

            <div>

                <button
                    class="text-button"
                    onclick="navigate('references')"
                >
                    ← Back to reference groups
                </button>

                <div class="section-kicker">
                    REFERENCE SAMPLES
                </div>

                <h2>
                    ${escapeHtml(
                        group.name
                    )}
                </h2>

                <p>
                    Age ${group.age_min}–${group.age_max}
                    ·
                    ${capitalize(
                        group.sex
                    )}
                    ·
                    ${capitalize(
                        group.bone
                    )}
                    ·
                    ${capitalize(
                        group.side
                    )}
                </p>

            </div>

            <div class="actions">

                <button
                    class="button primary"
                    onclick="openReferenceSampleForm('${group.id}')"
                >
                    + Add sample
                </button>

            </div>

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Reference measurements
                    </h3>

                    <p>
                        Multiple samples may belong to one
                        population reference group.
                    </p>

                </div>

            </div>


            ${
                samples?.length
                    ? `
                        <div class="table-wrap">

                            <table>

                                <thead>

                                    <tr>
                                        <th>Name</th>
                                        <th>Source</th>
                                        <th>f0</th>
                                        <th>RMS</th>
                                        <th>BW</th>
                                        <th>Q</th>
                                        <th>Date</th>
                                        <th></th>
                                    </tr>

                                </thead>

                                <tbody>

                                    ${samples
                                        .map(
                                            sample =>
                                                renderReferenceSampleRow(
                                                    sample
                                                )
                                        )
                                        .join("")}

                                </tbody>

                            </table>

                        </div>
                    `
                    : renderEmpty(
                        "No samples",
                        "Add a manual reference measurement or connect the scanner workflow.",
                        "🧬"
                    )
            }

        </section>

    `;
}


function renderReferenceSampleRow(
    sample
) {

    return `

        <tr>

            <td>
                <strong>
                    ${escapeHtml(
                        sample.name ||
                        "Unnamed sample"
                    )}
                </strong>
            </td>

            <td>

                <span class="badge ${
                    sample.source_type === "scanner"
                        ? "primary"
                        : "neutral"
                }">

                    ${escapeHtml(
                        sample.source_type ||
                        "manual"
                    )}

                </span>

            </td>

            <td>
                ${formatNumber(
                    sample.f0
                )}
                Hz
            </td>

            <td>
                ${formatNumber(
                    sample.rms
                )}
            </td>

            <td>
                ${formatNumber(
                    sample.bandwidth
                )}
                Hz
            </td>

            <td>
                ${formatNumber(
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
                    class="button small danger"
                    onclick="deleteReferenceSample('${sample.id}', '${escapeJsString(sample.name || "sample")}')"
                >
                    Delete
                </button>

            </td>

        </tr>

    `;
}


/* ================================================================
   MANUAL REFERENCE SAMPLE
================================================================ */

async function openReferenceSampleForm(
    groupId
) {

    openModal(
        "Add reference sample",

        `

            <form
                onsubmit="saveReferenceSample(event, '${groupId}')"
            >

                <div class="form-grid">

                    <div class="full-width">

                        <label class="form-label">
                            Sample name
                        </label>

                        <input
                            name="name"
                            required
                            placeholder="Reference sample 01"
                        >

                    </div>


                    <div>

                        <label class="form-label">
                            Resonance f0 (Hz)
                        </label>

                        <input
                            name="f0"
                            type="number"
                            step="any"
                            required
                        >

                    </div>


                    <div>

                        <label class="form-label">
                            RMS
                        </label>

                        <input
                            name="rms"
                            type="number"
                            step="any"
                            required
                        >

                    </div>


                    <div>

                        <label class="form-label">
                            Bandwidth (Hz)
                        </label>

                        <input
                            name="bandwidth"
                            type="number"
                            step="any"
                        >

                    </div>


                    <div>

                        <label class="form-label">
                            Q-factor
                        </label>

                        <input
                            name="q"
                            type="number"
                            step="any"
                        >

                    </div>


                    <div class="full-width">

                        <label class="form-label">
                            Material / sample description
                        </label>

                        <input
                            name="material"
                            placeholder="Optional"
                        >

                    </div>


                    <div class="full-width">

                        <label class="form-label">
                            Notes
                        </label>

                        <textarea
                            name="notes"
                            placeholder="Optional notes"
                        ></textarea>

                    </div>

                </div>


                <div class="form-actions">

                    <button
                        type="button"
                        class="button secondary"
                        onclick="closeModal()"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="button primary"
                    >
                        Add sample
                    </button>

                </div>

            </form>

        `
    );
}


async function saveReferenceSample(
    event,
    groupId
) {

    event.preventDefault();


    const data =
        Object.fromEntries(
            new FormData(
                event.currentTarget
            )
        );


    const payload = {

        reference_group_id:
            groupId,

        name:
            String(
                data.name || ""
            ).trim(),

        description:
            String(
                data.material || ""
            ).trim(),

        material:
            String(
                data.material || ""
            ).trim(),

        f0:
            numberOrNull(
                data.f0
            ),

        rms:
            numberOrNull(
                data.rms
            ),

        bandwidth:
            numberOrNull(
                data.bandwidth
            ),

        q:
            numberOrNull(
                data.q
            ),

        notes:
            String(
                data.notes || ""
            ).trim(),

        source_type:
            "manual",

        created_by:
            currentUser.id

    };


    try {

        const {
            error
        } = await db
            .from("reference_samples")
            .insert(
                payload
            );


        if (error) {
            throw error;
        }


        closeModal();


        toast(
            "Reference sample added.",
            "success"
        );


        await openReferenceSamples(
            groupId
        );


    } catch (error) {

        console.error(
            "Reference sample error:",
            error
        );


        toast(
            error.message ||
            "Unable to add reference sample.",
            "error"
        );
    }
}


/* ================================================================
   DELETE REFERENCE SAMPLE
================================================================ */

async function deleteReferenceSample(
    sampleId,
    sampleName
) {

    if (!isAdmin()) {
        return;
    }


    if (
        !confirm(
            `Delete reference sample "${sampleName}"?`
        )
    ) {
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


        toast(
            "Reference sample deleted.",
            "success"
        );


        navigate(
            "references"
        );

    } catch (error) {

        console.error(
            "Delete reference sample error:",
            error
        );


        toast(
            error.message ||
            "Unable to delete sample.",
            "error"
        );
    }
}


/* ================================================================
   DEVICES
================================================================ */

async function renderDevices() {

    if (!isAdmin()) {

        showAccessDenied();

        return;
    }


    const {
        data: devices,
        error
    } = await db
        .from("devices")
        .select("*")
        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if (error) {
        throw error;
    }


    const content =
        document.getElementById(
            "mainContent"
        );


    content.innerHTML = `

        <div class="page-header">

            <div>

                <div class="section-kicker">
                    HARDWARE
                </div>

                <h2>
                    Devices
                </h2>

                <p>
                    Registered Acoustic Bone Scanner devices.
                </p>

            </div>

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Registered scanners
                    </h3>

                </div>

            </div>


            ${
                devices?.length
                    ? `
                        <div class="table-wrap">

                            <table>

                                <thead>

                                    <tr>
                                        <th>Device code</th>
                                        <th>Name</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Last seen</th>
                                    </tr>

                                </thead>

                                <tbody>

                                    ${devices
                                        .map(
                                            device =>
                                                `

                                                    <tr>

                                                        <td>
                                                            <strong>
                                                                ${escapeHtml(
                                                                    device.device_code ||
                                                                    "—"
                                                                )}
                                                            </strong>
                                                        </td>

                                                        <td>
                                                            ${escapeHtml(
                                                                device.name ||
                                                                "Acoustic Scanner"
                                                            )}
                                                        </td>

                                                        <td>
                                                            <span class="badge ${
                                                                device.status === "online"
                                                                    ? "success"
                                                                    : "neutral"
                                                            }">
                                                                ${escapeHtml(
                                                                    device.status ||
                                                                    "unknown"
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            ${formatDate(
                                                                device.created_at
                                                            )}
                                                        </td>

                                                        <td>
                                                            ${formatDate(
                                                                device.last_seen_at
                                                            )}
                                                        </td>

                                                    </tr>

                                                `
                                        )
                                        .join("")}

                                </tbody>

                            </table>

                        </div>
                    `
                    : renderEmpty(
                        "No devices",
                        "Register ABS-001 in Supabase before using the scanner.",
                        "📡"
                    )
            }

        </section>

    `;
}


/* ================================================================
   OPERATORS
================================================================ */

async function renderOperators() {

    if (!isAdmin()) {

        showAccessDenied();

        return;
    }


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


    const content =
        document.getElementById(
            "mainContent"
        );


    content.innerHTML = `

        <div class="page-header">

            <div>

                <div class="section-kicker">
                    USER MANAGEMENT
                </div>

                <h2>
                    Operators
                </h2>

                <p>
                    Manage accounts with scanner operator access.
                </p>

            </div>

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Operator accounts
                    </h3>

                    <p>
                        ${operators?.length || 0}
                        operator accounts.
                    </p>

                </div>

            </div>


            ${
                operators?.length
                    ? `
                        <div class="table-wrap">

                            <table>

                                <thead>

                                    <tr>
                                        <th>Name</th>
                                        <th>User ID</th>
                                        <th>Created</th>
                                        <th>Action</th>
                                    </tr>

                                </thead>

                                <tbody>

                                    ${operators
                                        .map(
                                            operator =>
                                                `

                                                    <tr>

                                                        <td>
                                                            <strong>
                                                                ${escapeHtml(
                                                                    operator.name ||
                                                                    "Unnamed operator"
                                                                )}
                                                            </strong>
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
                                                                class="button small danger"
                                                                onclick="deleteOperatorAccount('${operator.id}', '${escapeJsString(operator.name || "operator")}')"
                                                            >
                                                                Delete
                                                            </button>

                                                        </td>

                                                    </tr>

                                                `
                                        )
                                        .join("")}

                                </tbody>

                            </table>

                        </div>
                    `
                    : renderEmpty(
                        "No operators",
                        "No operator profiles have been registered.",
                        "👥"
                    )
            }

        </section>

    `;
}


/* ================================================================
   DELETE OPERATOR
================================================================ */

async function deleteOperatorAccount(
    operatorId,
    operatorName
) {

    if (!isAdmin()) {
        return;
    }


    if (
        operatorId ===
        currentUser?.id
    ) {

        toast(
            "You cannot delete your own account.",
            "error"
        );

        return;
    }


    if (
        !confirm(
            `Delete operator account "${operatorName}"?\n\nThis permanently removes the authentication account when the secure Supabase RPC is configured.`
        )
    ) {
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


        if (!data) {

            throw new Error(
                "The operator account was not deleted."
            );
        }


        toast(
            "Operator account deleted.",
            "success"
        );


        await renderOperators();


    } catch (error) {

        console.error(
            "Delete operator error:",
            error
        );


        toast(
            error.message ||
            "Unable to delete operator.",
            "error"
        );
    }
}


/* ================================================================
   DEVICE HELPER
================================================================ */

async function getScannerDevice() {

    const {
        data,
        error
    } = await db
        .from("devices")
        .select("*")
        .eq(
            "device_code",
            "ABS-001"
        )
        .maybeSingle();


    if (error) {

        console.error(
            "Device lookup error:",
            error
        );

        return null;
    }


    return data;
}


/* ================================================================
   AUTHORIZATION
================================================================ */

function isAdmin() {

    return (
        currentProfile?.role ===
        "admin"
    );
}


function isStaff() {

    return (
        currentProfile?.role ===
            "admin" ||
        currentProfile?.role ===
            "operator"
    );
}


/* ================================================================
   USER HEADER
================================================================ */
function isScannerOnline(device) {

    if (!device?.last_seen) {
        return false;
    }

    const lastSeen =
        new Date(device.last_seen).getTime();

    if (!Number.isFinite(lastSeen)) {
        return false;
    }

    const age =
        Date.now() - lastSeen;

    // ESP32 heartbeat = every 15 seconds.
    // Allow a 30-second safety margin.
    return age >= 0 && age <= 45000;
}
function updateUserHeader() {

    const name =
        currentProfile?.name ||
        currentUser?.email ||
        "User";


    document
        .getElementById(
            "userName"
        )
        .textContent =
            name;


    document
        .getElementById(
            "userRole"
        )
        .textContent =
            capitalize(
                currentProfile?.role ||
                "operator"
            );


    document
        .getElementById(
            "userAvatar"
        )
        .textContent =
            initials(name);
}


/* ================================================================
   SIDEBAR
================================================================ */

function toggleSidebar() {

    document
        .getElementById(
            "sidebar"
        )
        ?.classList.toggle(
            "open"
        );
}


function closeSidebar() {

    document
        .getElementById(
            "sidebar"
        )
        ?.classList.remove(
            "open"
        );
}


/* ================================================================
   MODAL
================================================================ */

function setupModal() {

    document
        .getElementById(
            "modalCloseButton"
        )
        ?.addEventListener(
            "click",
            closeModal
        );


    document
        .getElementById(
            "modalBackdrop"
        )
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "modalBackdrop"
                ) {

                    closeModal();
                }
            }
        );
}


function openModal(
    title,
    body,
    kicker = "INFORMATION"
) {

    document
        .getElementById(
            "modalKicker"
        )
        .textContent =
            kicker;


    document
        .getElementById(
            "modalTitle"
        )
        .textContent =
            title;


    document
        .getElementById(
            "modalBody"
        )
        .innerHTML =
            body;


    document
        .getElementById(
            "modalBackdrop"
        )
        .classList.remove(
            "hidden"
        );
}


function closeModal() {

    document
        .getElementById(
            "modalBackdrop"
        )
        ?.classList.add(
            "hidden"
        );
}


/* ================================================================
   COMMON UI
================================================================ */

function renderLoading(
    text = "Loading..."
) {

    return `

        <div class="loading">
            ${escapeHtml(text)}
        </div>

    `;
}


function renderEmpty(
    title,
    description,
    icon = "📁"
) {

    return `

        <div class="empty-state">

            <div class="empty-state-icon">
                ${icon}
            </div>

            <h3>
                ${escapeHtml(title)}
            </h3>

            <p>
                ${escapeHtml(description)}
            </p>

        </div>

    `;
}


function renderError(
    message
) {

    return `

        <div class="panel">

            <div class="panel-body">

                <span class="badge danger">
                    Error
                </span>

                <h3 style="margin-top:12px">
                    Unable to load this section
                </h3>

                <p>
                    ${escapeHtml(
                        message ||
                        "Unknown error."
                    )}
                </p>

            </div>

        </div>

    `;
}


function showAccessDenied() {

    const content =
        document.getElementById(
            "mainContent"
        );


    content.innerHTML =
        renderError(
            "Only administrators can access this section."
        );
}


/* ================================================================
   UI HELPERS
================================================================ */

function statCard(
    label,
    value,
    note
) {

    return `

        <div class="stat-card">

            <div class="stat-card-label">
                ${escapeHtml(label)}
            </div>

            <div class="stat-card-value">
                ${escapeHtml(
                    String(value ?? "—")
                )}
            </div>

            <div class="stat-card-note">
                ${escapeHtml(note)}
            </div>

        </div>

    `;
}


function scannerInfoCard(
    label,
    value,
    note
) {

    return `

        <div class="scanner-status-card">

            <strong>
                ${escapeHtml(label)}
            </strong>

            <span>
                ${escapeHtml(
                    String(value ?? "—")
                )}
            </span>

            <div
                style="
                    margin-top:5px;
                    color:#98a2b3;
                    font-size:10px;
                "
            >
                ${escapeHtml(note)}
            </div>

        </div>

    `;
}


function infoItem(
    label,
    value
) {

    return `

        <div>

            <div class="form-label">
                ${escapeHtml(label)}
            </div>

            <div>
                ${escapeHtml(
                    value ??
                    "—"
                )}
            </div>

        </div>

    `;
}


/* ================================================================
   MEASUREMENT DISPLAY
================================================================ */

function renderMeasurementMetrics(
    measurement
) {

    return `

        <div class="scan-result-grid">

            ${resultCard(
                "Resonance f0",
                formatNumber(
                    measurement.f0
                ),
                "Hz"
            )}

            ${resultCard(
                "RMS",
                formatNumber(
                    measurement.rms
                ),
                ""
            )}

            ${resultCard(
                "Bandwidth",
                formatNumber(
                    measurement.bandwidth
                ),
                "Hz"
            )}

            ${resultCard(
                "Q-factor",
                formatNumber(
                    measurement.q ??
                    measurement.q_factor
                ),
                ""
            )}

        </div>

    `;
}


function resultCard(
    label,
    value,
    unit
) {

    return `

        <div class="result-card">

            <div class="result-card-label">
                ${escapeHtml(label)}
            </div>

            <div class="result-card-value">
                ${escapeHtml(
                    String(value ?? "—")
                )}
            </div>

            <div class="result-card-unit">
                ${escapeHtml(unit)}
            </div>

        </div>

    `;
}


function renderMeasurementRow(
    measurement
) {

    return `

        <tr>

            <td>
                ${formatDate(
                    measurement.created_at
                )}
            </td>

            <td>
                ${formatNumber(
                    measurement.f0
                )}
                Hz
            </td>

            <td>
                ${formatNumber(
                    measurement.rms
                )}
            </td>

            <td>
                ${formatNumber(
                    measurement.bandwidth
                )}
                Hz
            </td>

            <td>
                ${formatNumber(
                    measurement.q ??
                    measurement.q_factor
                )}
            </td>

        </tr>

    `;
}


/* ================================================================
   DATABASE COUNT
================================================================ */

async function countRows(
    table
) {

    const {
        count,
        error
    } = await db
        .from(table)
        .select(
            "*",
            {
                count: "exact",
                head: true
            }
        );


    if (error) {

        console.error(
            `Count ${table} error:`,
            error
        );

        return 0;
    }


    return count || 0;
}


/* ================================================================
   CONNECTION
================================================================ */

function updateConnectionStatus(
    connected
) {

    const label =
        document.getElementById(
            "connectionLabel"
        );


    if (!label) {
        return;
    }


    label.textContent =
        connected
            ? "Connected"
            : "Offline";
}


/* ================================================================
   FORM MESSAGE
================================================================ */

function setMessage(
    element,
    message,
    type = "error"
) {

    if (!element) {
        return;
    }


    element.textContent =
        message || "";


    element.className =
        "form-message";


    if (type) {

        element.classList.add(
            type
        );
    }
}


function clearMessage(
    element
) {

    if (!element) {
        return;
    }


    element.textContent =
        "";

    element.className =
        "form-message";
}


/* ================================================================
   BUTTON LOADING
================================================================ */

function setButtonLoading(
    button,
    loading,
    text
) {

    if (!button) {
        return;
    }


    if (loading) {

        button.disabled =
            true;


        button.dataset.originalText =
            button.textContent;


        button.textContent =
            text;

    } else {

        button.disabled =
            false;


        button.textContent =
            text ||
            button.dataset.originalText ||
            "Submit";
    }
}


/* ================================================================
   ERROR HELPERS
================================================================ */

function readableAuthError(
    error
) {

    const message =
        String(
            error?.message ||
            ""
        );


    const lower =
        message.toLowerCase();


    if (
        lower.includes(
            "invalid login credentials"
        )
    ) {

        return "Email or password is incorrect.";
    }


    if (
        lower.includes(
            "email not confirmed"
        )
    ) {

        return "Please confirm your email address before signing in.";
    }


    if (
        lower.includes(
            "user not found"
        )
    ) {

        return "No account was found with this email address.";
    }


    if (
        lower.includes(
            "too many requests"
        )
    ) {

        return "Too many attempts. Please wait and try again.";
    }


    return (
        message ||
        "Unable to sign in."
    );
}


function showFatalError(
    message
) {

    document.body.innerHTML = `

        <div
            style="
                min-height:100vh;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:30px;
                font-family:system-ui,sans-serif;
                background:#f4f7fb;
            "
        >

            <div
                style="
                    max-width:520px;
                    padding:30px;
                    background:#fff;
                    border:1px solid #e5e9f0;
                    border-radius:16px;
                    box-shadow:0 15px 40px rgba(0,0,0,.08);
                "
            >

                <h1>
                    Acoustic Bone Scanner
                </h1>

                <p>
                    The application could not start.
                </p>

                <p>
                    ${escapeHtml(message)}
                </p>

            </div>

        </div>

    `;
}


/* ================================================================
   TOAST
================================================================ */

function toast(
    message,
    type = ""
) {

    const container =
        document.getElementById(
            "toastContainer"
        );


    if (!container) {
        return;
    }


    const item =
        document.createElement(
            "div"
        );


    item.className =
        `toast ${type}`;


    item.textContent =
        message;


    container.appendChild(
        item
    );


    setTimeout(
        () => {

            item.remove();

        },
        4000
    );
}


/* ================================================================
   FORMATTERS
================================================================ */

function formatDate(
    value
) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";
    }


    return date.toLocaleString(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function formatNumber(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";
    }


    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return "—";
    }


    if (
        Number.isInteger(number)
    ) {

        return String(number);
    }


    return number.toFixed(
        3
    ).replace(
        /\.?0+$/,
        ""
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


function capitalize(
    value
) {

    if (!value) {
        return "";
    }


    return String(value)
        .charAt(0)
        .toUpperCase() +
        String(value)
            .slice(1);
}


function initials(
    name
) {

    const parts =
        String(name || "U")
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!parts.length) {
        return "U";
    }


    return parts
        .slice(0, 2)
        .map(
            part =>
                part
                    .charAt(0)
                    .toUpperCase()
        )
        .join("");
}


/* ================================================================
   PATIENT CODE
================================================================ */

function generatePatientCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    function block(length) {

        let output = "";

        for (
            let i = 0;
            i < length;
            i++
        ) {

            output +=
                chars.charAt(
                    Math.floor(
                        Math.random() *
                        chars.length
                    )
                );
        }

        return output;
    }


    return `
        ${block(4)}-${block(4)}-${block(2)}
    `.trim();
}


/* ================================================================
   SELECT OPTION
================================================================ */

function selectOption(
    value,
    selected
) {

    const isSelected =
        String(value) ===
        String(selected);


    return `

        <option
            value="${escapeAttribute(value)}"
            ${isSelected ? "selected" : ""}
        >
            ${escapeHtml(
                capitalize(value)
            )}
        </option>

    `;
}


/* ================================================================
   ESCAPING
================================================================ */

function escapeHtml(
    value
) {

    return String(
        value ??
        ""
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


function escapeAttribute(
    value
) {

    return escapeHtml(
        value
    );
}


function escapeJsString(
    value
) {

    return String(
        value ??
        ""
    )
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /"/g,
            '\\"'
        )
        .replace(
            /\r?\n/g,
            "\\n"
        );
}


/* ================================================================
   GLOBAL EXPORTS
================================================================ */

/*
 * Functions called from dynamically generated HTML must be
 * exposed on window.
 */

window.navigate =
    navigate;

window.openPatientForm =
    openPatientForm;

window.savePatient =
    savePatient;

window.viewPatient =
    viewPatient;

window.deletePatient =
    deletePatient;

window.startPatientScan =
    startPatientScan;

window.createScanRequest =
    createScanRequest;

window.openReferenceGroupForm =
    openReferenceGroupForm;

window.saveReferenceGroup =
    saveReferenceGroup;

window.editReferenceGroup =
    editReferenceGroup;

window.deleteReferenceGroup =
    deleteReferenceGroup;

window.openReferenceSamples =
    openReferenceSamples;

window.openReferenceSampleForm =
    openReferenceSampleForm;

window.saveReferenceSample =
    saveReferenceSample;

window.deleteReferenceSample =
    deleteReferenceSample;

window.deleteOperatorAccount =
    deleteOperatorAccount;

window.closeModal =
    closeModal;

window.toggleSidebar =
    toggleSidebar;
