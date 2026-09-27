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
                "Operator account created successfully.",
                "success"
            );

        } else {

            form.reset();


            setMessage(
                message,
                "Account created. Check your email if confirmation is required, then sign in.",
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
   LOAD CURRENT PROFILE
================================================================ */

async function loadCurrentProfile() {

    if (!currentUser?.id) {

        currentProfile = null;

        return;
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

        console.error(
            "Profile load error:",
            error
        );

        throw error;
    }


    currentProfile =
        data || null;


    updateUserHeader();


    return currentProfile;
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
        .upsert(
            {
                id: userId,
                name:
                    name ||
                    "Operator",
                role: "operator"
            },
            {
                onConflict: "id"
            }
        );


    if (error) {

        console.error(
            "Profile creation error:",
            error
        );

        throw error;
    }
}


/* ================================================================
   PATIENT LOGIN
================================================================ */

async function handlePatientLogin(event) {

    event.preventDefault();


    const form =
        event.currentTarget;


    const formData =
        new FormData(form);


    const code =
        String(
            formData.get("patient_code") ||
            formData.get("code") ||
            ""
        ).trim();


    const message =
        document.getElementById(
            "patientLoginMessage"
        );


    clearMessage(message);


    if (!code) {

        setMessage(
            message,
            "Please enter your patient code.",
            "error"
        );

        return;
    }


    try {

        setMessage(
            message,
            "Loading patient record...",
            "info"
        );


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


        /*
         * patient_login() returns:
         *
         * {
         *     success: true,
         *     patient: {
         *         id: "...",
         *         patient_code: "...",
         *         ...
         *     }
         * }
         */

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


        form.reset();


        await renderPatientPortal(
            patient
        );

    } catch (error) {

        console.error(
            "Patient login error:",
            error
        );


        setMessage(
            message,
            error.message ||
            "Unable to find patient.",
            "error"
        );
    }
}


/* ================================================================
   PATIENT PORTAL
================================================================ */

async function renderPatientPortal(patient) {

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


    container.innerHTML =
        renderLoading(
            "Loading your measurements..."
        );


    try {

        /*
         * The SECURITY DEFINER patient_login()
         * RPC already provides the patient's
         * measurements.
         *
         * Do not query the measurements table
         * directly here because patient portal
         * users may not have direct table access.
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
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;

                    navigate(page);
                }
            );
        });
}


/* ================================================================
   NAVIGATE
================================================================ */

async function navigate(page) {

    if (!page) {
        page = "dashboard";
    }


    currentPage =
        page;


    closeSidebar();


    updateActiveNavigation();


    try {

        switch (page) {

            case "dashboard":

                await renderDashboard();

                break;


            case "patients":

                await renderPatients();

                break;


            case "measurements":

                await openMeasurementManagement();

                break;


            case "scanner":

                await renderScanner();

                break;


            case "references":

                if (isAdmin()) {
                    await renderReferenceGroups();
                }

                break;


            case "devices":

                if (isAdmin()) {
                    await renderDevices();
                }

                break;


            case "operators":

                if (isAdmin()) {
                    await renderOperators();
                }

                break;


            default:

                await renderDashboard();

                break;
        }

    } catch (error) {

        console.error(
            "Navigation error:",
            error
        );


        showContent(`

            <div class="panel">

                <div class="panel-body">

                    <h2>
                        Unable to load page
                    </h2>

                    <p class="error-text">
                        ${escapeHtml(
                            error.message ||
                            "An unexpected error occurred."
                        )}
                    </p>

                </div>

            </div>

        `);
    }
}


/* ================================================================
   UPDATE ACTIVE NAVIGATION
================================================================ */

function updateActiveNavigation() {

    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page ===
                    currentPage
            );
        });
}


/* ================================================================
   SHOW APPLICATION
================================================================ */

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


    buildNavigation();


    updateUserHeader();


    navigate(
        currentPage || "dashboard"
    );
}


/* ================================================================
   SHOW AUTH SCREEN
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


/* ================================================================
   SHOW STAFF LOGIN
================================================================ */

function showStaffLogin() {

    patientPortalPatient =
        null;


    document
        .getElementById("patientPortalScreen")
        ?.classList.add("hidden");


    document
        .getElementById("appScreen")
        ?.classList.add("hidden");


    document
        .getElementById("authScreen")
        ?.classList.remove("hidden");


    hideAuthViews();


    document
        .getElementById("loginView")
        ?.classList.remove("hidden");
}


/* ================================================================
   SHOW PATIENT LOGIN
================================================================ */

function showPatientLogin() {

    hideAuthViews();


    document
        .getElementById("patientLoginView")
        ?.classList.remove("hidden");


    const input =
        document.querySelector(
            '#patientLoginForm input[name="patient_code"], #patientLoginForm #patientCode, #patientLoginCode'
        );


    input?.focus();
}


/* ================================================================
   SHOW CREATE ACCOUNT
===============================================================================

function showCreateAccount() {

    hideAuthViews();


    document
        .getElementById("createAccountView")
        ?.classList.remove("hidden");
}


/* ================================================================
   HIDE AUTH VIEWS
================================================================ */

function hideAuthViews() {

    document
        .querySelectorAll(
            ".auth-view"
        )
        .forEach(view => {

            view.classList.add(
                "hidden"
            );
        });
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


    showAuthScreen();


    toast(
        "Signed out.",
        "info"
    );
}


/* ================================================================
   DASHBOARD
================================================================ */

async function renderDashboard() {

    const content =
        document.getElementById(
            "mainContent"
        );


    if (!content) {
        return;
    }


    const [
        patients,
        measurements,
        references,
        devices
    ] = await Promise.all([

        countRows(
            "patients"
        ),

        countRows(
            "measurements"
        ),

        isAdmin()
            ? countRows(
                "reference_samples"
            )
            : Promise.resolve(null),

        isAdmin()
            ? countRows(
                "devices"
            )
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
        .is(
            "deleted_at",
            null
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
                        ${
                            patients.length === 1
                                ? ""
                                : "s"
                        }
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
                                        <th>Patient</th>
                                        <th>Code</th>
                                        <th>Age</th>
                                        <th>Sex</th>
                                        <th>Measurements</th>
                                        <th>Actions</th>
                                    </tr>

                                </thead>

                                <tbody>

                                    ${patients
                                        .map(
                                            patient =>
                                                renderPatientRow(
                                                    patient
                                                )
                                        )
                                        .join("")}

                                </tbody>

                            </table>

                        </div>
                    `
                    : renderEmpty(
                        "No patients",
                        "No active patient records have been created yet.",
                        "👤"
                    )
            }

        </section>

    `;
}


/* ================================================================
   PATIENT ROW
================================================================ */

function renderPatientRow(patient) {

    const patientName =
        patient.name ||
        "Unnamed patient";


    return `

        <tr>

            <td>
                <strong>
                    ${escapeHtml(
                        patientName
                    )}
                </strong>
            </td>

            <td>
                ${escapeHtml(
                    patient.patient_code ||
                    "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    patient.age ??
                    "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    patient.sex ||
                    "—"
                )}
            </td>

            <td>
                <span
                    class="badge neutral"
                    id="measurement-count-${escapeHtml(
                        patient.id
                    )}"
                >
                    —
                </span>
            </td>

            <td>

                <div class="button-row">

                    <button
                        class="button small primary"
                        onclick="openPatientRecord('${escapeJsString(patient.id)}')"
                    >
                        Open
                    </button>

                    <button
                        class="button small secondary"
                        onclick="startPatientScan('${escapeJsString(patient.id)}')"
                    >
                        Scan
                    </button>

                    <button
                        class="button small danger"
                        onclick="deletePatient('${escapeJsString(patient.id)}', '${escapeJsString(patientName)}')"
                    >
                        Delete
                    </button>

                </div>

            </td>

        </tr>

    `;
}


/* ================================================================
   OPEN PATIENT RECORD
================================================================ */

async function openPatientRecord(
    patientId,
    openScanner = false
) {

    if (!patientId) {
        return;
    }


    selectedPatientId =
        patientId;


    try {

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
            .maybeSingle();


        if (error) {
            throw error;
        }


        if (!patient) {

            throw new Error(
                "Patient record not found."
            );
        }


        await renderPatientRecord(
            patient,
            {
                openScanner
            }
        );

    } catch (error) {

        console.error(
            "Patient record error:",
            error
        );


        toast(
            error.message ||
            "Unable to open patient record.",
            "error"
        );
    }
}


/* ================================================================
   START PATIENT SCAN
================================================================ */

async function startPatientScan(
    patientId
) {

    selectedPatientId =
        patientId;


    await openPatientRecord(
        patientId,
        true
    );
}


/* ================================================================
   PATIENT RECORD
================================================================ */

async function renderPatientRecord(
    patient,
    options = {}
) {

    const content =
        document.getElementById(
            "mainContent"
        );


    if (!content) {
        return;
    }


    selectedPatientId =
        patient.id;


    const {
        data: measurements,
        error: measurementError
    } = await db
        .from("measurements")
        .select("*")
        .eq(
            "patient_id",
            patient.id
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


    const savedSelection =
        getPatientScanSelection(
            patient.id
        );


    content.innerHTML = `

        <div class="page-header">

            <div>

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
                    Patient code:
                    <strong>
                        ${escapeHtml(
                            patient.patient_code ||
                            "—"
                        )}
                    </strong>
                </p>

            </div>

            <div class="actions">

                <button
                    class="button secondary"
                    onclick="navigate('patients')"
                >
                    ← Back to Patients
                </button>

            </div>

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Patient information
                    </h3>

                    <p>
                        Current demographic information.
                    </p>

                </div>

            </div>

            <div class="panel-body">

                <div class="stats-grid">

                    ${scannerInfoCard(
                        "Age",
                        patient.age ?? "—",
                        "Years"
                    )}

                    ${scannerInfoCard(
                        "Sex",
                        patient.sex || "—",
                        "Recorded sex"
                    )}

                    ${scannerInfoCard(
                        "Height",
                        patient.height != null
                            ? `${patient.height} cm`
                            : "—",
                        "Height"
                    )}

                    ${scannerInfoCard(
                        "Weight",
                        patient.weight != null
                            ? `${patient.weight} kg`
                            : "—",
                        "Weight"
                    )}

                </div>

            </div>

        </section>


        <section
            class="panel"
            id="patientScannerPanel"
        >

            <div class="panel-header">

                <div>

                    <h3>
                        Patient Scanner
                    </h3>

                    <p>
                        Start an acoustic measurement for
                        this patient.
                    </p>

                </div>

                <span
                    class="badge primary"
                    id="patientScannerStatus"
                >
                    Ready
                </span>

            </div>

            <div class="panel-body">

                <div class="form-grid">

                    <div class="form-group">

                        <label for="patientScanBone">
                            Bone
                        </label>

                        <select
                            id="patientScanBone"
                            onchange="savePatientScanSelection('${escapeJsString(patient.id)}')"
                        >

                            <option
                                value="radius"
                                ${
                                    savedSelection.bone ===
                                    "radius"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Radius
                            </option>

                            <option
                                value="ulna"
                                ${
                                    savedSelection.bone ===
                                    "ulna"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Ulna
                            </option>

                        </select>

                    </div>


                    <div class="form-group">

                        <label for="patientScanSide">
                            Side
                        </label>

                        <select
                            id="patientScanSide"
                            onchange="savePatientScanSelection('${escapeJsString(patient.id)}')"
                        >

                            <option
                                value="left"
                                ${
                                    savedSelection.side ===
                                    "left"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Left
                            </option>

                            <option
                                value="right"
                                ${
                                    savedSelection.side ===
                                    "right"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Right
                            </option>

                        </select>

                    </div>

                </div>


                <div class="button-row">

                    <button
                        class="button primary"
                        type="button"
                        onclick="submitPatientScanRequest('${escapeJsString(patient.id)}')"
                    >
                        Start Scan
                    </button>

                    <button
                        class="button secondary"
                        type="button"
                        onclick="navigate('scanner')"
                    >
                        Open Scanner
                    </button>

                </div>


                <div
                    id="patientScanRequestStatus"
                    class="scan-request-status"
                ></div>

            </div>

        </section>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Previous Measurements
                    </h3>

                    <p>
                        ${measurements.length}
                        recorded measurement
                        ${
                            measurements.length === 1
                                ? ""
                                : "s"
                        }
                        for this patient.
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
                                        <th>Bone</th>
                                        <th>Side</th>
                                        <th>f0</th>
                                        <th>RMS</th>
                                        <th>Bandwidth</th>
                                        <th>Q</th>
                                        <th>Action</th>
                                    </tr>

                                </thead>

                                <tbody>

                                    ${measurements
                                        .map(
                                            measurement =>
                                                renderPatientMeasurementRow(
                                                    measurement
                                                )
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
                                Start a scan above to record
                                the first measurement for this
                                patient.
                            </p>

                        </div>

                    `
            }

        </section>


        <div class="research-note">

            <strong>
                Experimental use
            </strong>

            <p>
                Acoustic measurements shown here are
                experimental research data and are not a
                clinical diagnosis or a direct clinical
                bone mineral density measurement.
            </p>

        </div>

    `;


    if (options.openScanner) {

        setTimeout(
            () => {

                document
                    .getElementById(
                        "patientScannerPanel"
                    )
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

            },
            50
        );
    }
}


/* ================================================================
   PATIENT SCAN SELECTION
================================================================ */

function getPatientScanSelection(
    patientId
) {

    const defaultSelection = {

        bone: "radius",

        side: "left"

    };


    if (!patientId) {
        return defaultSelection;
    }


    try {

        const stored =
            localStorage.getItem(
                `abs_scan_selection_${patientId}`
            );


        if (!stored) {
            return defaultSelection;
        }


        const parsed =
            JSON.parse(stored);


        return {

            bone:
                parsed?.bone === "ulna"
                    ? "ulna"
                    : "radius",

            side:
                parsed?.side === "right"
                    ? "right"
                    : "left"

        };

    } catch (error) {

        console.warn(
            "Unable to restore patient scan selection:",
            error
        );


        return defaultSelection;
    }
}


function savePatientScanSelection(
    patientId
) {

    if (!patientId) {
        return;
    }


    const bone =
        document.getElementById(
            "patientScanBone"
        )?.value ||
        "radius";


    const side =
        document.getElementById(
            "patientScanSide"
        )?.value ||
        "left";


    try {

        localStorage.setItem(

            `abs_scan_selection_${patientId}`,

            JSON.stringify({

                bone,
                side

            })

        );

    } catch (error) {

        console.warn(
            "Unable to save patient scan selection:",
            error
        );
    }
}


/* ================================================================
   SUBMIT PATIENT SCAN REQUEST
================================================================ */

async function submitPatientScanRequest(
    patientId
) {

    if (!patientId) {

        toast(
            "Patient ID is missing.",
            "error"
        );

        return;
    }


    savePatientScanSelection(
        patientId
    );


    const bone =
        document.getElementById(
            "patientScanBone"
        )?.value ||
        "radius";


    const side =
        document.getElementById(
            "patientScanSide"
        )?.value ||
        "left";


    const status =
        document.getElementById(
            "patientScanRequestStatus"
        );


    try {

        if (status) {

            status.innerHTML = `
                <div class="info-message">
                    Checking scanner status...
                </div>
            `;
        }


        const device =
            await getScannerDevice();


        if (!device) {

            throw new Error(
                "Scanner ABS-001 could not be found."
            );
        }


        const online =
            isScannerOnline(
                device
            );


        if (!online) {

            if (status) {

                status.innerHTML = `

                    <div class="error-message">

                        <strong>
                            Scanner offline
                        </strong>

                        <br>

                        ABS-001 is not currently connected.
                        Turn on the scanner and connect it
                        to Wi-Fi, then try again.

                    </div>

                `;
            }


            toast(
                "ABS-001 is offline. Turn on the scanner and connect it to Wi-Fi before starting a scan.",
                "error"
            );


            return;
        }


        if (status) {

            status.innerHTML = `
                <div class="info-message">
                    Sending scan request to ABS-001...
                </div>
            `;
        }


        const {
            data,
            error
        } = await db
            .from("scan_requests")
            .insert({

                patient_id:
                    patientId,

                operator_id:
                    currentUser?.id ||
                    null,

                device_id:
                    device.id,

                status:
                    "pending",

                requested_bone:
                    bone,

                requested_side:
                    side

            })
            .select()
            .single();


        if (error) {
            throw error;
        }


        if (!data) {

            throw new Error(
                "Scan request was not created."
            );
        }


        if (status) {

            status.innerHTML = `

                <div class="success-message">

                    <strong>
                        Scan request sent.
                    </strong>

                    <br>

                    Patient:
                    ${escapeHtml(
                        patientId
                    )}

                    <br>

                    ${escapeHtml(
                        capitalize(bone)
                    )}
                    /
                    ${escapeHtml(
                        capitalize(side)
                    )}

                    <br>

                    Waiting for ABS-001...

                </div>

            `;
        }


        toast(
            "Scan request sent to ABS-001.",
            "success"
        );


        startPatientScanPolling(
            patientId,
            data.id
        );

    } catch (error) {

        console.error(
            "Patient scan request error:",
            error
        );


        if (status) {

            status.innerHTML = `

                <div class="error-message">

                    ${escapeHtml(
                        error.message ||
                        "Unable to start scan."
                    )}

                </div>

            `;
        }


        toast(
            error.message ||
            "Unable to start scan.",
            "error"
        );
    }
}


/* ================================================================
   PATIENT SCAN POLLING
================================================================ */

function startPatientScanPolling(
    patientId,
    requestId
) {

    if (scanPollTimer) {

        clearInterval(
            scanPollTimer
        );
    }


    scanPollTimer =
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
                        .maybeSingle();


                    if (error) {
                        throw error;
                    }


                    if (!data) {
                        return;
                    }


                    const status =
                        document.getElementById(
                            "patientScanRequestStatus"
                        );


                    if (
                        data.status ===
                        "completed"
                    ) {

                        clearInterval(
                            scanPollTimer
                        );

                        scanPollTimer =
                            null;


                        if (status) {

                            status.innerHTML = `

                                <div class="success-message">

                                    <strong>
                                        Scan completed.
                                    </strong>

                                    <br>

                                    Loading updated patient measurements...

                                </div>

                            `;
                        }


                        await openPatientRecord(
                            patientId,
                            false
                        );


                        toast(
                            "Patient scan completed.",
                            "success"
                        );


                        return;
                    }


                    if (
                        data.status ===
                            "failed" ||
                        data.status ===
                            "cancelled"
                    ) {

                        clearInterval(
                            scanPollTimer
                        );

                        scanPollTimer =
                            null;


                        if (status) {

                            status.innerHTML = `

                                <div class="error-message">

                                    Scan request:
                                    ${escapeHtml(
                                        data.status
                                    )}

                                    ${
                                        data.error_message
                                            ? `<br>${escapeHtml(
                                                data.error_message
                                            )}`
                                            : ""
                                    }

                                </div>

                            `;
                        }

                        return;
                    }


                    if (status) {

                        status.innerHTML = `

                            <div class="info-message">

                                Scanner status:
                                <strong>
                                    ${escapeHtml(
                                        data.status ||
                                        "pending"
                                    )}
                                </strong>

                            </div>

                        `;
                    }

                } catch (error) {

                    console.error(
                        "Patient scan polling error:",
                        error
                    );

                }

            },
            3000
        );
}


/* ================================================================
   DELETE PATIENT
================================================================ */

async function deletePatient(
    patientId,
    patientName
) {

    if (!patientId) {

        toast(
            "Patient ID is missing.",
            "error"
        );

        return;
    }


    if (
        !confirm(
            `Delete patient "${patientName || "this patient"}"?\n\nThe patient will be removed from the active patient list.`
        )
    ) {

        return;
    }


    try {

        const {
            data,
            error
        } = await db.rpc(
            "delete_patient",
            {
                p_patient_id:
                    patientId
            }
        );


        if (error) {
            throw error;
        }


        if (
            data &&
            data.success === false
        ) {

            throw new Error(
                data.message ||
                "Patient could not be deleted."
            );
        }


        if (
            selectedPatientId ===
            patientId
        ) {

            selectedPatientId =
                null;
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
   DELETE INDIVIDUAL MEASUREMENT
================================================================ */

async function deleteMeasurement(
    measurementId,
    patientId
) {

    if (!measurementId) {

        toast(
            "Measurement ID is missing.",
            "error"
        );

        return;
    }


    if (
        !confirm(
            "Delete this measurement?\n\nThis action cannot be undone."
        )
    ) {

        return;
    }


    try {

        const {
            error
        } = await db
            .from("measurements")
            .delete()
            .eq(
                "id",
                measurementId
            );


        if (error) {
            throw error;
        }


        toast(
            "Measurement deleted.",
            "success"
        );


        if (patientId) {

            await openPatientRecord(
                patientId,
                false
            );

        } else {

            await openMeasurementManagement();

        }

    } catch (error) {

        console.error(
            "Delete measurement error:",
            error
        );


        toast(
            error.message ||
            "Unable to delete measurement.",
            "error"
        );
    }
}


/* ================================================================
   PATIENT MEASUREMENT ROW
================================================================ */

function renderPatientMeasurementRow(
    measurement
) {

    const qValue =
        measurement.q_factor;


    return `

        <tr>

            <td>
                ${formatDate(
                    measurement.created_at
                )}
            </td>

            <td>
                ${escapeHtml(
                    measurement.profile_bone ||
                    measurement.bone ||
                    "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    measurement.profile_side ||
                    measurement.side ||
                    "—"
                )}
            </td>

            <td>
                ${formatMetric(
                    measurement.f0,
                    "Hz"
                )}
            </td>

            <td>
                ${formatMetric(
                    measurement.rms,
                    ""
                )}
            </td>

            <td>
                ${formatMetric(
                    measurement.bandwidth,
                    "Hz"
                )}
            </td>

            <td>
                ${
                    qValue == null ||
                    qValue === "" ||
                    Number.isNaN(
                        Number(qValue)
                    )
                        ? "—"
                        : Number(qValue).toFixed(3)
                }
            </td>

            <td>

                <button
                    class="button small danger"
                    type="button"
                    onclick="deleteMeasurement(
                        '${escapeJsString(measurement.id)}',
                        '${escapeJsString(measurement.patient_id || "")}'
                    )"
                >
                    Delete
                </button>

            </td>

        </tr>

    `;
}


/* ================================================================
   MEASUREMENT ROW
================================================================ */

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
                ${formatMetric(
                    measurement.f0,
                    "Hz"
                )}
            </td>

            <td>
                ${formatMetric(
                    measurement.rms,
                    ""
                )}
            </td>

            <td>
                ${formatMetric(
                    measurement.bandwidth,
                    "Hz"
                )}
            </td>

            <td>
                ${
                    measurement.q_factor == null
                        ? "—"
                        : Number(
                            measurement.q_factor
                        ).toFixed(3)
                }
            </td>

        </tr>

    `;
}


/* ================================================================
   MEASUREMENT MANAGEMENT
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
            )
            .limit(200);


        if (error) {
            throw error;
        }


        let html = `

            <div class="content-header">

                <div>

                    <h2>
                        Measurements
                    </h2>

                    <p>
                        Scanner measurement results.
                    </p>

                </div>

            </div>

        `;


        if (
            !measurements ||
            measurements.length === 0
        ) {

            html += `

                <p>
                    No measurements available.
                </p>

            `;

        } else {

            html += `

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Date
                                </th>

                                <th>
                                    Patient ID
                                </th>

                                <th>
                                    Bone
                                </th>

                                <th>
                                    Side
                                </th>

                                <th>
                                    Device
                                </th>

                                <th>
                                    f0
                                </th>

                                <th>
                                    RMS
                                </th>

                                <th>
                                    BW
                                </th>

                                <th>
                                    Q
                                </th>

                                <th>
                                    Action
                                </th>

                            </tr>

                        </thead>

                        <tbody>

            `;


            measurements.forEach(
                measurement => {

                    html += `

                        <tr>

                            <td>
                                ${formatDate(
                                    measurement.created_at
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    measurement.patient_id ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    measurement.profile_bone ||
                                    measurement.bone ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    measurement.profile_side ||
                                    measurement.side ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    measurement.device_code ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${formatMetric(
                                    measurement.f0,
                                    "Hz"
                                )}
                            </td>

                            <td>
                                ${formatMetric(
                                    measurement.rms,
                                    ""
                                )}
                            </td>

                            <td>
                                ${formatMetric(
                                    measurement.bandwidth,
                                    "Hz"
                                )}
                            </td>

                            <td>
                                ${
                                    measurement.q_factor == null
                                        ? "—"
                                        : Number(
                                            measurement.q_factor
                                        ).toFixed(3)
                                }
                            </td>

                            <td>

                                <button
                                    class="button small danger"
                                    type="button"
                                    onclick="deleteMeasurement(
                                        '${escapeJsString(measurement.id)}',
                                        '${escapeJsString(measurement.patient_id || "")}'
                                    )"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>

                    `;
                }
            );


            html += `

                        </tbody>

                    </table>

                </div>

            `;
        }


        showContent(
            html
        );


    } catch (error) {

        console.error(
            "Measurement management error:",
            error
        );


        showContent(`

            <h2>
                Measurements
            </h2>

            <p class="error-text">
                ${escapeHtml(
                    error.message ||
                    "Unable to load measurements."
                )}
            </p>

        `);
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


    if (!data) {
        return null;
    }


    return data;
}


/* ================================================================
   LIVE SCANNER STATUS
================================================================ */

function isScannerOnline(
    device
) {

    if (
        !device?.last_seen
    ) {

        return false;
    }


    const lastSeen =
        new Date(
            device.last_seen
        ).getTime();


    if (
        !Number.isFinite(
            lastSeen
        )
    ) {

        return false;
    }


    const age =
        Date.now() -
        lastSeen;


    /*
     * Allow a small clock difference between
     * the browser and Supabase server.
     *
     * A negative age means the server timestamp
     * is slightly ahead of the browser clock.
     */

    return age <= 45000;
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

function updateUserHeader() {

    const name =
        currentProfile?.name ||
        currentUser?.email ||
        "User";


    const role =
        currentProfile?.role ||
        "operator";


    const nameElement =
        document.getElementById(
            "currentUserName"
        );


    if (nameElement) {

        nameElement.textContent =
            name;
    }


    const roleElement =
        document.getElementById(
            "currentUserRole"
        );


    if (roleElement) {

        roleElement.textContent =
            capitalize(
                role
            );
    }
}


/* ================================================================
   SCANNER
================================================================ */

async function renderScanner() {

    if (!isStaff()) {
        return;
    }


    const content =
        document.getElementById(
            "mainContent"
        );


    content.innerHTML =
        renderLoading(
            "Loading scanner..."
        );


    try {

        const device =
            await getScannerDevice();


        const online =
            isScannerOnline(
                device
            );


        content.innerHTML = `

            <div class="page-header">

                <div>

                    <div class="section-kicker">
                        ACOUSTIC SCANNER
                    </div>

                    <h2>
                        Scanner
                    </h2>

                    <p>
                        Manage the ABS-001 scanner and
                        patient scan requests.
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
                            Live status based on the latest
                            device heartbeat.
                        </p>

                    </div>

                    <span
                        class="badge ${
                            online
                                ? "success"
                                : "danger"
                        }"
                    >
                        ${
                            online
                                ? "Online"
                                : "Offline"
                        }
                    </span>

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
                            online
                                ? "Online"
                                : "Offline",
                            "Live heartbeat"
                        )}

                        ${scannerInfoCard(
                            "Last seen",
                            device?.last_seen
                                ? formatDate(
                                    device.last_seen
                                )
                                : "Never",
                            "Latest heartbeat"
                        )}

                        ${scannerInfoCard(
                            "Firmware",
                            device?.firmware_version ||
                            "—",
                            "Reported firmware"
                        )}

                    </div>

                </div>

            </section>


            <section class="panel">

                <div class="panel-header">

                    <div>

                        <h3>
                            Scan requests
                        </h3>

                        <p>
                            Requests sent to the scanner
                            from patient records.
                        </p>

                    </div>

                </div>

                <div
                    id="scannerRequestList"
                    class="panel-body"
                >

                    Loading requests...

                </div>

            </section>

        `;


        await renderScannerRequests();

    } catch (error) {

        console.error(
            "Scanner render error:",
            error
        );


        content.innerHTML = `

            <div class="panel">

                <div class="panel-body">

                    <h2>
                        Scanner
                    </h2>

                    <p class="error-text">
                        ${escapeHtml(
                            error.message ||
                            "Unable to load scanner."
                        )}
                    </p>

                </div>

            </div>

        `;
    }
}


/* ================================================================
   SCANNER REQUESTS
================================================================ */

async function renderScannerRequests() {

    const container =
        document.getElementById(
            "scannerRequestList"
        );


    if (!container) {
        return;
    }


    const {
        data,
        error
    } = await db
        .from("scan_requests")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        )
        .limit(50);


    if (error) {

        container.innerHTML = `

            <p class="error-text">
                ${escapeHtml(
                    error.message ||
                    "Unable to load scan requests."
                )}
            </p>

        `;

        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-icon">
                    📡
                </div>

                <h3>
                    No scan requests
                </h3>

                <p>
                    Scan requests created from patient
                    records will appear here.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML = `

        <div class="table-wrap">

            <table>

                <thead>

                    <tr>

                        <th>
                            Created
                        </th>

                        <th>
                            Patient
                        </th>

                        <th>
                            Bone
                        </th>

                        <th>
                            Side
                        </th>

                        <th>
                            Status
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${
                        data
                            .map(
                                request =>
                                    `

                                        <tr>

                                            <td>
                                                ${formatDate(
                                                    request.created_at
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    request.patient_id ||
                                                    "—"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    request.requested_bone ||
                                                    "—"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    request.requested_side ||
                                                    "—"
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    class="badge ${
                                                        request.status ===
                                                        "completed"
                                                            ? "success"
                                                            : request.status ===
                                                                "failed"
                                                                ? "danger"
                                                                : "neutral"
                                                    }"
                                                >
                                                    ${escapeHtml(
                                                        request.status ||
                                                        "pending"
                                                    )}
                                                </span>
                                            </td>

                                        </tr>

                                    `
                            )
                            .join("")
                    }

                </tbody>

            </table>

        </div>

    `;
}


/* ================================================================
   REFERENCE GROUPS
================================================================ */

async function renderReferenceGroups() {

    if (!isAdmin()) {
        return;
    }


    const content =
        document.getElementById(
            "mainContent"
        );


    content.innerHTML =
        renderLoading(
            "Loading reference groups..."
        );


    try {

        const {
            data,
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
            data || [];


        content.innerHTML = `

            <div class="page-header">

                <div>

                    <div class="section-kicker">
                        REFERENCE DATABASE
                    </div>

                    <h2>
                        Reference Groups
                    </h2>

                    <p>
                        Manage demographic and anatomical
                        reference groups used by the scanner.
                    </p>

                </div>

            </div>


            <section class="panel">

                <div class="panel-header">

                    <div>

                        <h3>
                            Reference groups
                        </h3>

                        <p>
                            ${
                                referenceGroupsCache.length
                            }
                            configured group
                            ${
                                referenceGroupsCache.length === 1
                                    ? ""
                                    : "s"
                            }
                        </p>

                    </div>

                    <button
                        class="button primary"
                        type="button"
                        onclick="openReferenceGroupForm()"
                    >
                        + Add Group
                    </button>

                </div>


                ${
                    referenceGroupsCache.length
                        ? `

                            <div class="table-wrap">

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                Name
                                            </th>

                                            <th>
                                                Age
                                            </th>

                                            <th>
                                                Sex
                                            </th>

                                            <th>
                                                Bone
                                            </th>

                                            <th>
                                                Side
                                            </th>

                                            <th>
                                                Version
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        ${
                                            referenceGroupsCache
                                                .map(
                                                    group =>
                                                        `

                                                            <tr>

                                                                <td>
                                                                    ${escapeHtml(
                                                                        group.name ||
                                                                        "—"
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    ${escapeHtml(
                                                                        `${group.age_min ?? "—"}–${group.age_max ?? "—"}`
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    ${escapeHtml(
                                                                        group.sex ||
                                                                        "—"
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    ${escapeHtml(
                                                                        group.bone ||
                                                                        "—"
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    ${escapeHtml(
                                                                        group.side ||
                                                                        "—"
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    ${escapeHtml(
                                                                        group.version ||
                                                                        "—"
                                                                    )}
                                                                </td>

                                                            </tr>

                                                        `
                                                )
                                                .join("")
                                        }

                                    </tbody>

                                </table>

                            </div>

                        `
                        : renderEmpty(
                            "No reference groups",
                            "Create a reference group before adding reference samples.",
                            "🧪"
                        )
                }

            </section>

        `;

    } catch (error) {

        console.error(
            "Reference groups error:",
            error
        );


        content.innerHTML = `

            <div class="panel">

                <div class="panel-body">

                    <h2>
                        Reference Groups
                    </h2>

                    <p class="error-text">
                        ${escapeHtml(
                            error.message ||
                            "Unable to load reference groups."
                        )}
                    </p>

                </div>

            </div>

        `;
    }
}


/* ================================================================
   ADD REFERENCE GROUP
================================================================ */

function openReferenceGroupForm() {

    showModal(
        "Reference Group",
        `

            <form
                id="referenceGroupForm"
                onsubmit="submitReferenceGroup(event)"
            >

                <div class="form-grid">

                    <div class="form-group">

                        <label>
                            Name
                        </label>

                        <input
                            name="name"
                            required
                        >

                    </div>

                    <div class="form-group">

                        <label>
                            Minimum age
                        </label>

                        <input
                            name="age_min"
                            type="number"
                            min="0"
                            required
                        >

                    </div>

                    <div class="form-group">

                        <label>
                            Maximum age
                        </label>

                        <input
                            name="age_max"
                            type="number"
                            min="0"
                            required
                        >

                    </div>

                    <div class="form-group">

                        <label>
                            Sex
                        </label>

                        <select
                            name="sex"
                            required
                        >

                            <option value="">
                                Select
                            </option>

                            <option value="male">
                                Male
                            </option>

                            <option value="female">
                                Female
                            </option>

                        </select>

                    </div>

                    <div class="form-group">

                        <label>
                            Bone
                        </label>

                        <select
                            name="bone"
                            required
                        >

                            <option value="radius">
                                Radius
                            </option>

                            <option value="ulna">
                                Ulna
                            </option>

                        </select>

                    </div>

                    <div class="form-group">

                        <label>
                            Side
                        </label>

                        <select
                            name="side"
                            required
                        >

                            <option value="left">
                                Left
                            </option>

                            <option value="right">
                                Right
                            </option>

                        </select>

                    </div>

                </div>


                <div class="button-row">

                    <button
                        class="button primary"
                        type="submit"
                    >
                        Save Group
                    </button>

                    <button
                        class="button secondary"
                        type="button"
                        onclick="closeModal()"
                    >
                        Cancel
                    </button>

                </div>

            </form>

        `
    );
}
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


    container.innerHTML =
        renderLoading(
            "Loading your measurements..."
        );


    try {

        const {
            data: measurements,
            error
        } = await db
            .from("measurements")
            .select("*")
            .eq(
                "patient_id",
                patient.id
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


        container.innerHTML =
            renderPatientResults(
                patient,
                measurements || []
            );

    } catch (error) {

        console.error(
            "Patient results error:",
            error
        );


        container.innerHTML = `

            <div class="panel">

                <div class="panel-body">

                    <h2>Unable to load results</h2>

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


    const scanPreferences =
        getPatientScanPreferences(
            patientId
        );


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
                    Scanner
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


        <section
            class="panel"
            id="patientScannerPanel"
        >

            <div class="panel-header">

                <div>

                    <h3>
                        Patient Scanner
                    </h3>

                    <p>
                        Scan this patient without leaving the patient record.
                        Your previous bone and side selection is remembered.
                    </p>

                </div>

                <span class="badge neutral">
                    ABS-001
                </span>

            </div>

            <div class="panel-body">

                <form
                    id="patientScannerForm"
                    onsubmit="createScanRequest(event)"
                >

                    <input
                        type="hidden"
                        name="patient_id"
                        value="${escapeAttribute(patient.id)}"
                    >

                    <div class="form-grid">

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

                                <option
                                    value="radius"
                                    ${scanPreferences.bone === "radius" ? "selected" : ""}
                                >
                                    Radius
                                </option>

                                <option
                                    value="ulna"
                                    ${scanPreferences.bone === "ulna" ? "selected" : ""}
                                >
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

                                <option
                                    value="left"
                                    ${scanPreferences.side === "left" ? "selected" : ""}
                                >
                                    Left
                                </option>

                                <option
                                    value="right"
                                    ${scanPreferences.side === "right" ? "selected" : ""}
                                >
                                    Right
                                </option>

                            </select>

                        </div>

                    </div>


                    <div class="form-actions">

                        <button
                            class="button primary"
                            type="submit"
                        >
                            Start scan for this patient
                        </button>

                    </div>

                </form>

                <div id="scanRequestStatus"></div>

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
                                        <th>Bone</th>
                                        <th>Side</th>
                                        <th>Action</th>
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


function getPatientScanPreferences(
    patientId
) {

    if (!patientId) {
        return {
            bone: "",
            side: ""
        };
    }


    try {

        const stored =
            localStorage.getItem(
                `abs_scan_preferences_${patientId}`
            );


        if (!stored) {
            return {
                bone: "",
                side: ""
            };
        }


        const parsed =
            JSON.parse(stored);


        return {
            bone:
                parsed?.bone ||
                "",
            side:
                parsed?.side ||
                ""
        };

    } catch (error) {

        console.warn(
            "Unable to load patient scan preferences:",
            error
        );

        return {
            bone: "",
            side: ""
        };
    }
}


function savePatientScanPreferences(
    patientId,
    bone,
    side
) {

    if (!patientId) {
        return;
    }


    try {

        localStorage.setItem(
            `abs_scan_preferences_${patientId}`,
            JSON.stringify({
                bone: bone || "",
                side: side || ""
            })
        );

    } catch (error) {

        console.warn(
            "Unable to save patient scan preferences:",
            error
        );
    }
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
            "Delete this patient record?\n\nThe patient will be removed from the active patient list."
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            data,
            error
        } = await db.rpc(
            "delete_patient_record",
            {
                p_patient_id:
                    patientId
            }
        );


        if (error) {
            throw error;
        }


        if (data?.success === false) {
            throw new Error(
                data.message ||
                "Unable to delete patient."
            );
        }


        toast(
            "Patient deleted.",
            "success"
        );


        if (selectedPatientId === patientId) {
            selectedPatientId = null;
        }


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
        );


    if (error) {
        throw error;
    }


    const device =
        devices?.[0] || null;


    const online =
        isScannerOnline(
            device
        );


    content.innerHTML = `

        <div class="page-header">

            <div>

                <div class="section-kicker">
                    SCANNER
                </div>

                <h2>
                    Acoustic Bone Scanner
                </h2>

                <p>
                    Device control and scan requests.
                </p>

            </div>

            <div>

                <span class="status-pill ${online ? "online" : "offline"}">

                    <span class="status-dot"></span>

                    ${online
                        ? "Online"
                        : "Offline"}

                </span>

            </div>

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Scanner status
                    </h3>

                    <p>
                        ${escapeHtml(
                            device?.device_name ||
                            "ABS-001"
                        )}
                    </p>

                </div>

                <div>

                    <span class="badge neutral">
                        ${escapeHtml(
                            device?.device_code ||
                            "ABS-001"
                        )}
                    </span>

                </div>

            </div>


            <div class="panel-body">

                <div class="stats-grid">

                    ${statCard(
                        "Status",
                        online
                            ? "Online"
                            : "Offline"
                    )}

                    ${statCard(
                        "Firmware",
                        device?.firmware_version ||
                        "—"
                    )}

                    ${statCard(
                        "Last seen",
                        device?.last_seen
                            ? formatDate(
                                device.last_seen
                            )
                            : "Never"
                    )}

                </div>

            </div>

        </section>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Start a scan
                    </h3>

                    <p>
                        Select a patient and measurement site.
                    </p>

                </div>

            </div>


            <div class="panel-body">

                <form
                    id="scannerRequestForm"
                    onsubmit="createScanRequest(event)"
                >

                    <div class="form-grid">

                        <div class="full-width">

                            <label class="form-label">
                                Patient
                            </label>

                            <select
                                name="patient_id"
                                id="scannerPatientSelect"
                                required
                            >

                                <option value="">
                                    Select patient
                                </option>

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

                    </div>


                    <div
                        id="scanRequestStatus"
                        class="form-status"
                    ></div>


                    <div class="form-actions">

                        <button
                            type="submit"
                            class="button primary"
                            ${online
                                ? ""
                                : "disabled"}
                        >
                            Start scan
                        </button>

                    </div>

                </form>

            </div>

        </section>

    `;


    await loadScannerPatients();


    startScannerStatusRefresh();
}


async function loadScannerPatients() {

    const select =
        document.getElementById(
            "scannerPatientSelect"
        );


    if (!select) {
        return;
    }


    const {
        data,
        error
    } = await db
        .from("patients")
        .select(
            "id, name, patient_code"
        )
        .order(
            "name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Patient list error:",
            error
        );

        return;
    }


    select.innerHTML = `

        <option value="">
            Select patient
        </option>

        ${(data || [])
            .map(
                patient => `

                    <option
                        value="${escapeAttribute(
                            patient.id
                        )}"
                    >
                        ${escapeHtml(
                            patient.name ||
                            "Unnamed"
                        )}
                        —
                        ${escapeHtml(
                            patient.patient_code ||
                            ""
                        )}
                    </option>

                `
            )
            .join("")}

    `;


    select.addEventListener(
        "change",
        () => {

            const patientId =
                select.value;


            if (!patientId) {
                return;
            }


            const preferences =
                getPatientScanPreferences(
                    patientId
                );


            const form =
                document.getElementById(
                    "scannerRequestForm"
                );


            if (!form) {
                return;
            }


            const bone =
                form.querySelector(
                    '[name="bone"]'
                );

            const side =
                form.querySelector(
                    '[name="side"]'
                );


            if (bone) {
                bone.value =
                    preferences.bone || "";
            }


            if (side) {
                side.value =
                    preferences.side || "";
            }

        }
    );
}


/* ================================================================
   SCANNER STATUS REFRESH
================================================================ */

function startScannerStatusRefresh() {

    stopScannerStatusRefresh();


    scanPollTimer =
        setInterval(
            async () => {

                if (
                    currentPage !==
                    "scanner"
                ) {
                    stopScannerStatusRefresh();
                    return;
                }


                try {

                    await refreshScannerStatus();

                } catch (error) {

                    console.error(
                        "Scanner status refresh error:",
                        error
                    );
                }

            },
            15000
        );
}


function stopScannerStatusRefresh() {

    if (scanPollTimer) {

        clearInterval(
            scanPollTimer
        );

        scanPollTimer = null;
    }
}


async function refreshScannerStatus() {

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
        throw error;
    }


    const online =
        isScannerOnline(
            data
        );


    const statusPill =
        document.querySelector(
            ".status-pill"
        );


    if (statusPill) {

        statusPill.className =
            `status-pill ${
                online
                    ? "online"
                    : "offline"
            }`;


        statusPill.innerHTML = `

            <span class="status-dot"></span>

            ${online
                ? "Online"
                : "Offline"}

        `;
    }


    const startButton =
        document.querySelector(
            '#scannerRequestForm button[type="submit"]'
        );


    if (startButton) {
        startButton.disabled =
            !online;
    }
}


/* ================================================================
   SCAN REQUEST
================================================================ */

async function startPatientScan(
    patientId
) {

    selectedPatientId =
        patientId;


    await viewPatient(
        patientId
    );


    const scannerPanel =
        document.getElementById(
            "patientScannerPanel"
        );


    if (scannerPanel) {

        scannerPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }
}


async function createScanRequest(
    event
) {

    event.preventDefault();


    if (!isStaff()) {
        return;
    }


    const form =
        event.currentTarget;


    const formData =
        new FormData(form);


    const patientId =
        String(
            formData.get(
                "patient_id"
            ) || ""
        ).trim();


    const bone =
        String(
            formData.get(
                "bone"
            ) || ""
        ).trim()
        .toLowerCase();


    const side =
        String(
            formData.get(
                "side"
            ) || ""
        ).trim()
        .toLowerCase();


    if (!patientId) {

        toast(
            "Please select a patient.",
            "error"
        );

        return;
    }


    if (!bone) {

        toast(
            "Please select a bone.",
            "error"
        );

        return;
    }


    if (!side) {

        toast(
            "Please select a side.",
            "error"
        );

        return;
    }


    const device =
        await getScannerDevice();


    if (!device) {

        toast(
            "Scanner device ABS-001 was not found.",
            "error"
        );

        return;
    }


    if (!device.is_online) {

        const status =
            document.getElementById(
                "scanRequestStatus"
            );


        if (status) {

            status.innerHTML = `

                <div class="error-message">

                    <strong>
                        Scanner offline
                    </strong>

                    <br>

                    ABS-001 is not currently connected.

                    Turn on the scanner and connect it
                    to Wi-Fi, then try again.

                </div>

            `;
        }


        toast(
            "ABS-001 is offline. Turn on the scanner and connect it to Wi-Fi before starting a scan.",
            "error"
        );


        return;
    }


    savePatientScanPreferences(
        patientId,
        bone,
        side
    );


    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "Sending request...";

    }


    const status =
        document.getElementById(
            "scanRequestStatus"
        );


    if (status) {

        status.innerHTML = `

            <div class="info-message">

                Sending scan request
                to ABS-001...

            </div>

        `;
    }


    try {

        const payload = {

            patient_id:
                patientId,

            operator_id:
                currentProfile?.id ||
                currentUser?.id ||
                null,

            device_id:
                device.id,

            bone:
                bone,

            side:
                side,

            status:
                "pending",

            requested_at:
                new Date().toISOString()

        };


        const {
            data,
            error
        } = await db
            .from("scan_requests")
            .insert(
                payload
            )
            .select()
            .single();


        if (error) {
            throw error;
        }


        if (status) {

            status.innerHTML = `

                <div class="success-message">

                    <strong>
                        Scan request sent.
                    </strong>

                    <br>

                    Keep the scanner connected
                    while the measurement is running.

                </div>

            `;
        }


        toast(
            "Scan request sent to ABS-001.",
            "success"
        );


        if (
            selectedPatientId ===
            patientId
        ) {

            /*
             * Keep the patient record open.
             * Do not navigate back to the
             * general scanner page.
             */

            await waitForPatientMeasurement(
                patientId,
                data?.id
            );

        }


    } catch (error) {

        console.error(
            "Create scan request error:",
            error
        );


        if (status) {

            status.innerHTML = `

                <div class="error-message">

                    ${escapeHtml(
                        error.message ||
                        "Unable to create scan request."
                    )}

                </div>

            `;
        }


        toast(
            error.message ||
            "Unable to create scan request.",
            "error"
        );

    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "Start scan for this patient";

        }
    }
}


/* ================================================================
   GET SCANNER DEVICE
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


    if (!data) {
        return null;
    }


    if (!data.last_seen) {

        return {
            ...data,
            is_online: false
        };
    }


    const lastSeen =
        new Date(
            data.last_seen
        ).getTime();


    if (
        !Number.isFinite(
            lastSeen
        )
    ) {

        return {
            ...data,
            is_online: false
        };
    }


    const age =
        Date.now() -
        lastSeen;


    return {

        ...data,

        is_online:
            age >= 0 &&
            age <= 45000

    };
}


/* ================================================================
   WAIT FOR MEASUREMENT
================================================================ */

async function waitForPatientMeasurement(
    patientId,
    requestId
) {

    const status =
        document.getElementById(
            "scanRequestStatus"
        );


    let attempts = 0;


    const maxAttempts =
        240;


    while (
        attempts <
        maxAttempts
    ) {

        attempts++;


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    2500
                )
        );


        try {

            const {
                data: request,
                error:
                    requestError
            } = await db
                .from("scan_requests")
                .select("*")
                .eq(
                    "id",
                    requestId
                )
                .maybeSingle();


            if (requestError) {
                throw requestError;
            }


            if (!request) {
                continue;
            }


            if (
                request.status ===
                "completed"
            ) {

                if (status) {

                    status.innerHTML = `

                        <div class="success-message">

                            <strong>
                                Scan completed.
                            </strong>

                            <br>

                            The measurement has been
                            added to this patient record.

                        </div>

                    `;
                }


                await viewPatient(
                    patientId
                );


                return true;
            }


            if (
                request.status ===
                "failed"
            ) {

                if (status) {

                    status.innerHTML = `

                        <div class="error-message">

                            <strong>
                                Scan failed.
                            </strong>

                            <br>

                            ${escapeHtml(
                                request.error_message ||
                                "The scanner reported a failure."
                            )}

                        </div>

                    `;
                }


                return false;
            }


            if (status) {

                status.innerHTML = `

                    <div class="info-message">

                        Scanner is processing the request...

                        <br>

                        <small>
                            ${escapeHtml(
                                request.status ||
                                "pending"
                            )}
                        </small>

                    </div>

                `;
            }


        } catch (error) {

            console.error(
                "Scan polling error:",
                error
            );
        }
    }


    if (status) {

        status.innerHTML = `

            <div class="warning-message">

                The scan is still processing.

                You can remain on this patient record
                and refresh later to see the result.

            </div>

        `;
    }


    return false;
}


/* ================================================================
   MEASUREMENT ROW
================================================================ */

function renderMeasurementRow(
    measurement
) {

    const q =
        measurement.q_factor ??
        measurement.q;


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
                ${
                    q === null ||
                    q === undefined ||
                    !Number.isFinite(
                        Number(q)
                    )
                        ? "—"
                        : formatNumber(
                            q
                        )
                }
            </td>

            <td>
                ${escapeHtml(
                    measurement.bone ||
                    "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    measurement.side ||
                    "—"
                )}
            </td>

            <td>

                <button
                    type="button"
                    class="button small danger"
                    onclick="deleteMeasurement('${measurement.id}', '${measurement.patient_id || ""}')"
                >
                    Delete
                </button>

            </td>

        </tr>

    `;
}


/* ================================================================
   DELETE MEASUREMENT
================================================================ */

async function deleteMeasurement(
    measurementId,
    patientId
) {

    if (!isStaff()) {
        return;
    }


    if (!measurementId) {

        toast(
            "Measurement ID is missing.",
            "error"
        );

        return;
    }


    const confirmed =
        confirm(
            "Delete this measurement?\n\nThis action cannot be undone."
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            data,
            error
        } = await db.rpc(
            "delete_measurement_record",
            {
                p_measurement_id:
                    measurementId
            }
        );


        if (error) {
            throw error;
        }


        if (data?.success === false) {

            throw new Error(
                data.message ||
                "Unable to delete measurement."
            );
        }


        toast(
            "Measurement deleted.",
            "success"
        );


        if (
            patientId &&
            selectedPatientId ===
            patientId
        ) {

            await viewPatient(
                patientId
            );

        } else {

            await renderMeasurements();

        }


    } catch (error) {

        console.error(
            "Delete measurement error:",
            error
        );


        toast(
            error.message ||
            "Unable to delete measurement.",
            "error"
        );
    }
}


/* ================================================================
   REFERENCE GROUPS
================================================================ */

async function renderReferenceGroups() {

    const content =
        document.getElementById(
            "mainContent"
        );


    const {
        data,
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
        data || [];


    content.innerHTML = `

        <div class="page-header">

            <div>

                <div class="section-kicker">
                    CALIBRATION
                </div>

                <h2>
                    Reference Groups
                </h2>

                <p>
                    Manage age, sex, bone and side
                    reference groups.
                </p>

            </div>

            <button
                class="button primary"
                onclick="openReferenceGroupForm()"
            >
                Add reference group
            </button>

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Reference groups
                    </h3>

                </div>

            </div>


            ${
                data?.length
                    ? `

                        <div class="table-wrap">

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

                                    ${data
                                        .map(
                                            renderReferenceGroupRow
                                        )
                                        .join("")}

                                </tbody>

                            </table>

                        </div>

                    `
                    : renderEmpty(
                        "No reference groups",
                        "Create a reference group to begin calibration.",
                        "🧪"
                    )
            }

        </section>

    `;
}
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
                    class="button secondary"
                    onclick="openReferenceGroupForm(${JSON.stringify(
                        group
                    ).replace(/"/g, "&quot;")})"
                >
                    Edit group
                </button>

                <button
                    class="button primary"
                    onclick="openReferenceSampleForm('${group.id}')"
                >
                    Add sample
                </button>

            </div>

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Reference group
                    </h3>

                    <p>
                        ${escapeHtml(
                            group.description ||
                            "No description."
                        )}
                    </p>

                </div>

                <span class="badge neutral">
                    Version
                    ${escapeHtml(
                        group.version ??
                        "1"
                    )}
                </span>

            </div>


            <div class="panel-body">

                <div class="stats-grid">

                    ${statCard(
                        "Age range",
                        `${group.age_min}–${group.age_max}`
                    )}

                    ${statCard(
                        "Sex",
                        capitalize(
                            group.sex
                        )
                    )}

                    ${statCard(
                        "Bone",
                        capitalize(
                            group.bone
                        )
                    )}

                    ${statCard(
                        "Side",
                        capitalize(
                            group.side
                        )
                    )}

                </div>

            </div>

        </section>


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
function showAccessDenied() {

    const content =
        document.getElementById(
            "mainContent"
        );


    if (!content) {
        return;
    }


    content.innerHTML = `

        <div class="empty-state">

            <div class="empty-icon">
                🔒
            </div>

            <h3>
                Access denied
            </h3>

            <p>
                You do not have permission to view this section.
            </p>

            <button
                class="button primary"
                onclick="navigate('dashboard')"
            >
                Return to dashboard
            </button>

        </div>

    `;
}


/* ================================================================
   AUTH / LOGIN
================================================================ */

async function handleStaffLogin(
    event
) {

    event.preventDefault();


    const form =
        event.currentTarget;


    const emailInput =
        form.querySelector(
            'input[name="email"]'
        );


    const passwordInput =
        form.querySelector(
            'input[name="password"]'
        );


    const email =
        emailInput?.value
            ?.trim();


    const password =
        passwordInput?.value ||
        "";


    if (!email || !password) {

        toast(
            "Please enter your email and password.",
            "error"
        );

        return;
    }


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


        currentUser =
            data.user;


        await loadCurrentProfile();


        if (!currentProfile) {

            throw new Error(
                "No staff profile is associated with this account."
            );
        }


        showApp();


    } catch (error) {

        console.error(
            "Staff login error:",
            error
        );


        toast(
            error.message ||
            "Unable to sign in.",
            "error"
        );
    }
}


/* ================================================================
   PATIENT LOGIN
================================================================ */

async function handlePatientLogin() {

    try {

        const form =
            document.getElementById(
                "patientLoginForm"
            );


        if (!form) {

            throw new Error(
                "Patient login form not found."
            );
        }


        const codeInput =
            form.querySelector(
                'input[name="patient_code"], #patientCode, #patientLoginCode'
            );


        const code =
            codeInput
                ?.value
                ?.trim();


        if (!code) {

            throw new Error(
                "Please enter your patient code."
            );
        }


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


        if (
            !data ||
            data.success !== true ||
            !data.patient
        ) {

            throw new Error(
                data?.message ||
                "Invalid patient code."
            );
        }


        const patient =
            data.patient;


        if (!patient.id) {

            throw new Error(
                "Patient login succeeded, but no patient UUID was returned."
            );
        }


        patientPortalPatient =
            patient;


        form.reset();


        await renderPatientPortal(
            patient
        );


    } catch (error) {

        console.error(
            "Patient login error:",
            error
        );


        alert(
            error?.message ||
            "Unable to load patient portal."
        );
    }
}


/* ================================================================
   PATIENT PORTAL
================================================================ */

async function renderPatientPortal(
    patient
) {

    patientPortalPatient =
        patient;


    const authScreen =
        document.getElementById(
            "authScreen"
        );


    const appScreen =
        document.getElementById(
            "appScreen"
        );


    const patientPortalScreen =
        document.getElementById(
            "patientPortalScreen"
        );


    authScreen
        ?.classList
        .add("hidden");


    appScreen
        ?.classList
        .add("hidden");


    patientPortalScreen
        ?.classList
        .remove("hidden");


    const container =
        document.getElementById(
            "patientPortalContent"
        );


    if (!container) {

        throw new Error(
            "Patient portal container not found."
        );
    }


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
}


/* ================================================================
   PATIENT RESULTS
================================================================ */

function renderPatientResults(
    patient,
    measurements
) {

    return `

        <div class="patient-portal-header">

            <div>

                <div class="section-kicker">
                    PATIENT PORTAL
                </div>

                <h2>
                    ${escapeHtml(
                        patient.name ||
                        "Patient"
                    )}
                </h2>

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


            <button
                id="patientPortalLogout"
                type="button"
                class="secondary-button"
                onclick="showStaffLogin()"
            >
                Exit
            </button>

        </div>


        <section class="portal-card">

            <div class="portal-card-header">

                <div>

                    <h3>
                        Patient information
                    </h3>

                </div>

            </div>


            <div class="portal-card-body">

                <div class="portal-stats">

                    ${portalStat(
                        "Age",
                        patient.age ??
                        "—"
                    )}

                    ${portalStat(
                        "Sex",
                        patient.sex ||
                        "—"
                    )}

                    ${portalStat(
                        "Height",
                        patient.height
                            ? `${patient.height} cm`
                            : "—"
                    )}

                    ${portalStat(
                        "Weight",
                        patient.weight
                            ? `${patient.weight} kg`
                            : "—"
                    )}

                </div>

            </div>

        </section>


        <section class="portal-card">

            <div class="portal-card-header">

                <div>

                    <h3>
                        Measurement history
                    </h3>

                    <p>
                        Your recorded acoustic scan results.
                    </p>

                </div>

            </div>


            ${
                measurements.length
                    ? `

                        <div class="portal-table-wrap">

                            <table>

                                <thead>

                                    <tr>

                                        <th>
                                            Date
                                        </th>

                                        <th>
                                            Bone
                                        </th>

                                        <th>
                                            Side
                                        </th>

                                        <th>
                                            Resonance
                                        </th>

                                        <th>
                                            RMS
                                        </th>

                                        <th>
                                            Bandwidth
                                        </th>

                                        <th>
                                            Q
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    ${measurements
                                        .map(
                                            measurement =>
                                                renderPatientMeasurementRow(
                                                    measurement
                                                )
                                        )
                                        .join("")}

                                </tbody>

                            </table>

                        </div>

                    `
                    : `

                        <div class="empty-state">

                            <div class="empty-icon">
                                📊
                            </div>

                            <h3>
                                No measurements yet
                            </h3>

                            <p>
                                Your scan results will appear here
                                after a measurement has been completed.
                            </p>

                        </div>

                    `
            }

        </section>

    `;
}


function renderPatientMeasurementRow(
    measurement
) {

    const q =
        measurement.q_factor ??
        measurement.q;


    return `

        <tr>

            <td>
                ${formatDate(
                    measurement.created_at
                )}
            </td>

            <td>
                ${escapeHtml(
                    measurement.bone ||
                    "—"
                )}
            </td>

            <td>
                ${escapeHtml(
                    measurement.side ||
                    "—"
                )}
            </td>

            <td>
                ${
                    measurement.f0 !== null &&
                    measurement.f0 !== undefined
                        ? `${formatNumber(
                            measurement.f0
                        )} Hz`
                        : "—"
                }
            </td>

            <td>
                ${formatNumber(
                    measurement.rms
                )}
            </td>

            <td>
                ${
                    measurement.bandwidth !== null &&
                    measurement.bandwidth !== undefined
                        ? `${formatNumber(
                            measurement.bandwidth
                        )} Hz`
                        : "—"
                }
            </td>

            <td>
                ${
                    q === null ||
                    q === undefined ||
                    !Number.isFinite(
                        Number(q)
                    )
                        ? "—"
                        : formatNumber(q)
                }
            </td>

        </tr>

    `;
}


/* ================================================================
   SHOW STAFF LOGIN
================================================================ */

function showStaffLogin() {

    patientPortalPatient =
        null;


    document
        .getElementById(
            "patientPortalScreen"
        )
        ?.classList
        .add("hidden");


    document
        .getElementById(
            "appScreen"
        )
        ?.classList
        .add("hidden");


    document
        .getElementById(
            "authScreen"
        )
        ?.classList
        .remove("hidden");


    hideAuthViews();


    document
        .getElementById(
            "loginView"
        )
        ?.classList
        .remove("hidden");
}


/* ================================================================
   SHOW AUTH SCREEN
================================================================ */

function showAuthScreen() {

    document
        .getElementById(
            "authScreen"
        )
        ?.classList
        .remove("hidden");


    document
        .getElementById(
            "appScreen"
        )
        ?.classList
        .add("hidden");


    document
        .getElementById(
            "patientPortalScreen"
        )
        ?.classList
        .add("hidden");


    showStaffLogin();
}


/* ================================================================
   AUTH VIEW HELPERS
================================================================ */

function hideAuthViews() {

    document
        .querySelectorAll(
            ".auth-view"
        )
        .forEach(
            element =>
                element.classList.add(
                    "hidden"
                )
        );
}


function showPatientLogin() {

    hideAuthViews();


    document
        .getElementById(
            "patientLoginView"
        )
        ?.classList
        .remove("hidden");
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


    currentUser =
        null;


    currentProfile =
        null;


    patientPortalPatient =
        null;


    selectedPatientId =
        null;


    stopScannerStatusRefresh();


    showAuthScreen();
}


/* ================================================================
   INITIALIZATION
================================================================ */

async function initializeApp() {

    try {

        const {
            data: {
                session
            }
        } = await db.auth.getSession();


        if (
            session?.user
        ) {

            currentUser =
                session.user;


            await loadCurrentProfile();


            if (
                currentProfile
            ) {

                showApp();

                return;

            }
        }


        showAuthScreen();


    } catch (error) {

        console.error(
            "Initialization error:",
            error
        );


        showAuthScreen();
    }
}


/* ================================================================
   LOAD PROFILE
================================================================ */

async function loadCurrentProfile() {

    if (!currentUser) {
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

        console.error(
            "Profile lookup error:",
            error
        );

        throw error;
    }


    currentProfile =
        data || null;


    return currentProfile;
}


/* ================================================================
   SHOW APPLICATION
================================================================ */

function showApp() {

    document
        .getElementById(
            "authScreen"
        )
        ?.classList
        .add("hidden");


    document
        .getElementById(
            "patientPortalScreen"
        )
        ?.classList
        .add("hidden");


    document
        .getElementById(
            "appScreen"
        )
        ?.classList
        .remove("hidden");


    updateUserDisplay();


    navigate(
        "dashboard"
    );
}


/* ================================================================
   USER DISPLAY
================================================================ */

function updateUserDisplay() {

    const nameElements =
        document.querySelectorAll(
            "[data-user-name]"
        );


    nameElements.forEach(
        element => {

            element.textContent =
                currentProfile?.name ||
                currentUser?.email ||
                "User";

        }
    );


    const roleElements =
        document.querySelectorAll(
            "[data-user-role]"
        );


    roleElements.forEach(
        element => {

            element.textContent =
                currentProfile?.role ||
                "staff";

        }
    );
}


/* ================================================================
   NAVIGATION
================================================================ */

async function navigate(
    page
) {

    stopScannerStatusRefresh();


    currentPage =
        page;


    updateNavigationState(
        page
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

                break;

        }

    } catch (error) {

        console.error(
            `Navigation error for ${page}:`,
            error
        );


        showPageError(
            error
        );
    }
}


/* ================================================================
   NAVIGATION STATE
================================================================ */

function updateNavigationState(
    page
) {

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(
            element => {

                element.classList.toggle(
                    "active",
                    element.dataset.page ===
                        page
                );

            }
        );
}


/* ================================================================
   PAGE ERROR
================================================================ */

function showPageError(
    error
) {

    const content =
        document.getElementById(
            "mainContent"
        );


    if (!content) {
        return;
    }


    content.innerHTML = `

        <div class="empty-state">

            <div class="empty-icon">
                ⚠️
            </div>

            <h3>
                Unable to load this page
            </h3>

            <p>
                ${escapeHtml(
                    error?.message ||
                    "An unexpected error occurred."
                )}
            </p>

            <button
                class="button primary"
                onclick="navigate('dashboard')"
            >
                Return to dashboard
            </button>

        </div>

    `;
}


/* ================================================================
   MODAL
================================================================ */

function openModal(
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


    modal
        ?.classList
        .add("hidden");
}


/* ================================================================
   SIDEBAR
================================================================ */

function toggleSidebar() {

    const sidebar =
        document.getElementById(
            "sidebar"
        );


    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );


    sidebar
        ?.classList
        .toggle(
            "open"
        );


    overlay
        ?.classList
        .toggle(
            "open"
        );
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
        patientsResult,
        measurementsResult,
        devicesResult
    ] = await Promise.all([

        db
            .from("patients")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            ),

        db
            .from("measurements")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            ),

        db
            .from("devices")
            .select("*")

    ]);


    if (
        patientsResult.error
    ) {
        throw patientsResult.error;
    }


    if (
        measurementsResult.error
    ) {
        throw measurementsResult.error;
    }


    if (
        devicesResult.error
    ) {
        throw devicesResult.error;
    }


    const devices =
        devicesResult.data ||
        [];


    const onlineDevices =
        devices.filter(
            isScannerOnline
        );


    content.innerHTML = `

        <div class="page-header">

            <div>

                <div class="section-kicker">
                    OVERVIEW
                </div>

                <h2>
                    Dashboard
                </h2>

                <p>
                    Acoustic Bone Scanner management console.
                </p>

            </div>

        </div>


        <div class="stats-grid dashboard-stats">

            ${statCard(
                "Patients",
                patientsResult.count ??
                0
            )}

            ${statCard(
                "Measurements",
                measurementsResult.count ??
                0
            )}

            ${statCard(
                "Scanners online",
                onlineDevices.length
            )}

            ${statCard(
                "Your role",
                currentProfile?.role ||
                "—"
            )}

        </div>


        <section class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Scanner status
                    </h3>

                    <p>
                        Live device connectivity.
                    </p>

                </div>

            </div>


            ${
                devices.length
                    ? `

                        <div class="table-wrap">

                            <table>

                                <thead>

                                    <tr>
                                        <th>Device</th>
                                        <th>Status</th>
                                        <th>Last seen</th>
                                    </tr>

                                </thead>

                                <tbody>

                                    ${devices
                                        .map(
                                            device => `

                                                <tr>

                                                    <td>
                                                        <strong>
                                                            ${escapeHtml(
                                                                device.device_code ||
                                                                "—"
                                                            )}
                                                        </strong>

                                                        <br>

                                                        <small>
                                                            ${escapeHtml(
                                                                device.device_name ||
                                                                device.name ||
                                                                "Acoustic Scanner"
                                                            )}
                                                        </small>

                                                    </td>

                                                    <td>

                                                        <span class="status-pill ${
                                                            isScannerOnline(
                                                                device
                                                            )
                                                                ? "online"
                                                                : "offline"
                                                        }">

                                                            <span class="status-dot"></span>

                                                            ${
                                                                isScannerOnline(
                                                                    device
                                                                )
                                                                    ? "Online"
                                                                    : "Offline"
                                                            }

                                                        </span>

                                                    </td>

                                                    <td>
                                                        ${
                                                            device.last_seen
                                                                ? formatDate(
                                                                    device.last_seen
                                                                )
                                                                : "Never"
                                                        }
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
                        "No scanners",
                        "No scanner devices have been registered.",
                        "📡"
                    )
            }

        </section>

    `;
}
            </td>

        </tr>

    `;
}


async function deleteMeasurement(
    measurementId
) {

    if (!isStaff()) {
        return;
    }


    if (!measurementId) {
        toast(
            "Measurement ID is missing.",
            "error"
        );
        return;
    }


    if (
        !confirm(
            "Delete this measurement?\n\nThis action cannot be undone."
        )
    ) {
        return;
    }


    try {

        const {
            data,
            error
        } = await db.rpc(
            "delete_measurement_record",
            {
                p_measurement_id:
                    measurementId
            }
        );


        if (error) {
            throw error;
        }


        if (data?.success === false) {
            throw new Error(
                data.message ||
                "Unable to delete measurement."
            );
        }


        toast(
            "Measurement deleted.",
            "success"
        );


        if (selectedPatientId) {

            await viewPatient(
                selectedPatientId
            );

        } else {

            await openMeasurementManagement();
        }

    } catch (error) {

        console.error(
            "Delete measurement error:",
            error
        );

        toast(
            error.message ||
            "Unable to delete measurement.",
            "error"
        );
    }
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
