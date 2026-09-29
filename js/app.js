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


    html += `

        <div class="panel">

            <div class="panel-header">

                <div>

                    <h3>
                        Measurement history
                    </h3>

                    <p>
                        Each measurement has its own graph tab.
                        Open a tab to view that scan's frequency response.
                    </p>

                </div>

            </div>

            <div class="panel-body">

                ${
                    measurements.length
                        ? measurements
                            .map(
                                renderPatientMeasurementCard
                            )
                            .join("")
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
================================================================ */

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

                bone:
                    bone,

                side:
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

    if (!patientId || !requestId) {
        return;
    }

    if (scanPollTimer) {
        clearTimeout(scanPollTimer);
        scanPollTimer = null;
    }

    let attempts = 0;
    const intervalMs = 3000;
    const maxAttempts = 300; // 15 minutes

    const poll = async () => {

        attempts++;

        try {

            const {
                data,
                error
            } = await db
                .from("scan_requests")
                .select("id,status,error_message")
                .eq(
                    "id",
                    requestId
                )
                .maybeSingle();

            if (error) {
                throw error;
            }

            const status =
                document.getElementById(
                    "patientScanRequestStatus"
                );

            if (!data) {

                if (attempts < maxAttempts) {
                    scanPollTimer =
                        setTimeout(
                            poll,
                            intervalMs
                        );
                }

                return;
            }

            if (
                data.status ===
                "completed"
            ) {

                scanPollTimer = null;

                if (status) {
                    status.innerHTML = `
                        <div class="success-message">
                            <strong>Scan completed.</strong>
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
                data.status === "failed" ||
                data.status === "cancelled"
            ) {

                scanPollTimer = null;

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

        if (attempts >= maxAttempts) {

            scanPollTimer = null;

            const status =
                document.getElementById(
                    "patientScanRequestStatus"
                );

            if (status) {
                status.innerHTML = `
                    <div class="warning-message">
                        The scan is still processing.
                        You can remain on this patient record
                        and refresh later to see the result.
                    </div>
                `;
            }

            return;
        }

        scanPollTimer =
            setTimeout(
                poll,
                intervalMs
            );
    };

    poll();
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
    measurement,
    index
) {

    const measurementId =
        String(
            measurement?.id ||
            `measurement-${index || 0}`
        );

    const graphId =
        `staffMeasurementGraph-${measurementId}`;

    const buttonId =
        `staffMeasurementGraphButton-${measurementId}`;

    const qValue =
        measurement?.q_factor ??
        measurement?.q;

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
                <div
                    style="
                        display:flex;
                        flex-direction:column;
                        gap:8px;
                        min-width:180px;
                    "
                >

                    <button
                        id="${buttonId}"
                        class="button small secondary"
                        type="button"
                        onclick="toggleStaffMeasurementGraph('${escapeJsString(measurementId)}')"
                    >
                        View frequency-response graph
                    </button>

                    <div
                        id="${graphId}"
                        class="hidden"
                        style="margin-top:6px;"
                    >
                        ${renderFrequencyResponseGraph(
                            measurement
                        )}
                    </div>

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

                </div>
            </td>

        </tr>

    `;
}


function toggleStaffMeasurementGraph(
    measurementId
) {

    if (!measurementId) {
        return;
    }

    const panel =
        document.getElementById(
            `staffMeasurementGraph-${measurementId}`
        );

    const button =
        document.getElementById(
            `staffMeasurementGraphButton-${measurementId}`
        );

    if (!panel) {
        return;
    }

    const isHidden =
        panel.classList.contains("hidden");

    panel.classList.toggle(
        "hidden",
        !isHidden
    );

    if (button) {
        button.textContent =
            isHidden
                ? "Hide frequency-response graph"
                : "View frequency-response graph";
    }
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
                                                    request.bone ||
                                                    "—"
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    request.side ||
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

function openReferenceGroupForm() {

    openModal(
        "Reference Group",
        `

            <form
                id="referenceGroupForm"
                onsubmit="saveReferenceGroup(event)"
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
                        recorded measurements.
                        Each measurement includes its own frequency-response graph.
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
                                            (measurement, index) =>
                                                renderMeasurementRow(
                                                    measurement,
                                                    index
                                                )
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

            scan_type:
                "patient",

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


function setupModal() {

    const closeButton =
        document.getElementById("modalCloseButton");

    closeButton?.addEventListener(
        "click",
        closeModal
    );

    const backdrop =
        document.getElementById("modalBackdrop") ||
        document.getElementById("modal");

    backdrop?.addEventListener(
        "click",
        event => {
            if (
                event.target === backdrop ||
                event.target.id === "modalBackdrop"
            ) {
                closeModal();
            }
        }
    );
}


function openModal(
    title,
    body
) {

    const modal =
        document.getElementById("modal") ||
        document.getElementById("modalBackdrop");

    const modalTitle =
        document.getElementById("modalTitle");

    const modalBody =
        document.getElementById("modalBody");

    if (!modal) {
        return;
    }

    if (modalTitle) {
        modalTitle.textContent =
            title || "Information";
    }

    if (modalBody) {
        modalBody.innerHTML =
            body || "";
    }

    modal.classList.remove("hidden");
}


function closeModal() {

    document
        .getElementById("modal")
        ?.classList.add("hidden");

    document
        .getElementById("modalBackdrop")
        ?.classList.add("hidden");
}


function toggleSidebar() {

    document
        .getElementById("sidebar")
        ?.classList.toggle("open");

    document
        .getElementById("sidebarOverlay")
        ?.classList.toggle("open");
}


function closeSidebar() {

    document
        .getElementById("sidebar")
        ?.classList.remove("open");

    document
        .getElementById("sidebarOverlay")
        ?.classList.remove("open");
}


function formatMetric(
    value,
    unit = ""
) {

    const formatted =
        formatNumber(value);

    if (
        formatted === "—" ||
        !unit
    ) {
        return formatted;
    }

    return `${formatted} ${escapeHtml(unit)}`;
}


async function deleteReferenceSample(
    sampleId,
    sampleName = "sample"
) {

    if (!isAdmin() || !sampleId) {
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

        const { error } =
            await db
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

        await renderReferenceGroups();

    } catch (error) {

        console.error(
            "Delete reference sample error:",
            error
        );

        toast(
            error.message ||
            "Unable to delete reference sample.",
            "error"
        );
    }
}


function escapeHtml(
    value
) {
    return String(
        value ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}



/* ================================================================
   PATIENT FREQUENCY-RESPONSE GRAPH
================================================================ */

function togglePatientMeasurementGraph(measurementId) {

    if (!measurementId) {
        return;
    }

    const panel =
        document.getElementById(
            `patientMeasurementGraph-${measurementId}`
        );

    const button =
        document.getElementById(
            `patientMeasurementGraphButton-${measurementId}`
        );

    if (!panel) {
        return;
    }

    const isHidden =
        panel.classList.contains("hidden");

    panel.classList.toggle("hidden", !isHidden);

    if (button) {
        button.textContent =
            isHidden
                ? "Hide frequency-response graph"
                : "View frequency-response graph";
    }
}


function renderPatientMeasurementCard(
    measurement,
    index
) {

    const q =
        measurement.q_factor ??
        measurement.q;

    const measurementId =
        String(
            measurement.id ||
            `measurement-${index}`
        );

    const graphId =
        `patientMeasurementGraph-${measurementId}`;

    const buttonId =
        `patientMeasurementGraphButton-${measurementId}`;

    return `

        <div
            class="panel"
            style="margin-bottom:16px;"
        >

            <div class="panel-header">

                <div>

                    <div class="section-kicker">
                        MEASUREMENT ${index + 1}
                    </div>

                    <h3>
                        ${formatDate(
                            measurement.created_at
                        )}
                    </h3>

                    <p>
                        ${escapeHtml(
                            measurement.bone ||
                            "Bone not specified"
                        )}
                        ·
                        ${escapeHtml(
                            measurement.side ||
                            "Side not specified"
                        )}
                    </p>

                </div>

                <span class="badge primary">
                    Experimental result
                </span>

            </div>

            <div class="panel-body">

                ${renderMeasurementMetrics(
                    measurement
                )}

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:12px;
                        margin-top:18px;
                        padding-top:14px;
                        border-top:1px solid rgba(128,128,128,.18);
                    "
                >

                    <div>
                        <strong>
                            Frequency-response graph
                        </strong>
                        <div
                            style="
                                margin-top:4px;
                                font-size:13px;
                                opacity:.72;
                            "
                        >
                            Open this tab to see how the scanner
                            responded across the measured frequencies.
                        </div>
                    </div>

                    <button
                        id="${buttonId}"
                        type="button"
                        class="button secondary"
                        onclick="togglePatientMeasurementGraph('${escapeHtml(measurementId)}')"
                    >
                        View frequency-response graph
                    </button>

                </div>

                <div
                    id="${graphId}"
                    class="hidden"
                    style="margin-top:16px;"
                >

                    ${renderFrequencyResponseGraph(
                        measurement
                    )}

                </div>

                <div
                    style="
                        display:flex;
                        justify-content:flex-end;
                        margin-top:14px;
                    "
                >

                    <button
                        type="button"
                        class="button small danger"
                        onclick="deleteMeasurement('${escapeHtml(measurement.id || "")}', '${escapeHtml(measurement.patient_id || "")}')"
                    >
                        Delete measurement
                    </button>

                </div>

            </div>

        </div>

    `;
}


function renderFrequencyResponseGraph(measurement) {

    const rawPoints =
        Array.isArray(measurement?.frequency_response)
            ? measurement.frequency_response
            : [];

    const points = rawPoints
        .map(point => ({
            frequency: Number(
                point?.frequency ??
                point?.freq
            ),
            rms: Number(
                point?.rms ??
                point?.response ??
                point?.value
            )
        }))
        .filter(point =>
            Number.isFinite(point.frequency) &&
            Number.isFinite(point.rms)
        )
        .sort((a, b) =>
            a.frequency - b.frequency
        );

    if (!points.length) {
        return `
            <div class="scan-visualization-panel">
                <div class="scan-visualization-header">
                    <div>
                        <div class="section-kicker">
                            ACOUSTIC RESPONSE
                        </div>
                        <h3>
                            Frequency response
                        </h3>
                    </div>
                </div>
                <div class="empty-state">
                    <div class="empty-state-icon">📈</div>
                    <p>
                        Frequency-response data is not available for this measurement.
                    </p>
                </div>
            </div>
        `;
    }

    const width = 900;
    const height = 430;
    const left = 78;
    const right = 28;
    const top = 42;
    const bottom = 70;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    const minFrequency = Math.min(
        ...points.map(point => point.frequency)
    );
    const maxFrequency = Math.max(
        ...points.map(point => point.frequency)
    );

    const maxRms = Math.max(
        ...points.map(point => point.rms),
        0
    );

    const frequencySpan =
        maxFrequency - minFrequency || 1;

    const responseMax =
        maxRms > 0
            ? maxRms * 1.12
            : 1;

    const x = frequency =>
        left +
        ((frequency - minFrequency) / frequencySpan) *
        plotWidth;

    const y = rms =>
        top +
        plotHeight -
        (rms / responseMax) *
        plotHeight;

    const path = points
        .map((point, index) =>
            `${index === 0 ? "M" : "L"} ${x(point.frequency).toFixed(2)} ${y(point.rms).toFixed(2)}`
        )
        .join(" ");

    const areaPath =
        `${path} L ${x(points[points.length - 1].frequency).toFixed(2)} ${y(0).toFixed(2)} L ${x(points[0].frequency).toFixed(2)} ${y(0).toFixed(2)} Z`;

    const peakPoint =
        points.reduce(
            (best, point) =>
                point.rms > best.rms
                    ? point
                    : best,
            points[0]
        );

    const resonance = Number(measurement?.f0);
    const resonancePoint =
        Number.isFinite(resonance)
            ? points.reduce(
                (best, point) =>
                    Math.abs(point.frequency - resonance) <
                    Math.abs(best.frequency - resonance)
                        ? point
                        : best,
                points[0]
            )
            : peakPoint;

    const resonanceX =
        x(resonancePoint.frequency);
    const resonanceY =
        y(resonancePoint.rms);

    const bandwidth = Number(
        measurement?.bandwidth
    );
    const hasBandwidth =
        Number.isFinite(bandwidth) &&
        bandwidth > 0;

    const halfPowerY =
        peakPoint.rms / Math.sqrt(2);

    const halfPowerLineY = y(halfPowerY);

    const xTicks = 5;
    const yTicks = 4;

    let grid = "";

    for (let i = 0; i <= xTicks; i++) {
        const frequency =
            minFrequency +
            (frequencySpan * i) / xTicks;
        const tickX = x(frequency);

        grid += `
            <line
                x1="${tickX.toFixed(2)}"
                y1="${top}"
                x2="${tickX.toFixed(2)}"
                y2="${top + plotHeight}"
                class="scan-chart-grid"
            />
            <text
                x="${tickX.toFixed(2)}"
                y="${top + plotHeight + 30}"
                text-anchor="middle"
                class="scan-chart-axis-label"
            >${Math.round(frequency)} Hz</text>
        `;
    }

    for (let i = 0; i <= yTicks; i++) {
        const value =
            (responseMax * i) / yTicks;
        const tickY = y(value);

        grid += `
            <line
                x1="${left}"
                y1="${tickY.toFixed(2)}"
                x2="${left + plotWidth}"
                y2="${tickY.toFixed(2)}"
                class="scan-chart-grid"
            />
            <text
                x="${left - 12}"
                y="${(tickY + 4).toFixed(2)}"
                text-anchor="end"
                class="scan-chart-axis-label"
            >${value.toFixed(3)}</text>
        `;
    }

    const qualityGood =
        measurement?.result_valid !== false &&
        measurement?.signal_valid !== false &&
        measurement?.clear_peak !== false;

    const qualityText = qualityGood
        ? "The scanner detected a usable response curve and a clear measured peak."
        : "The scan contains a response curve, but its quality flags indicate that the result should be interpreted cautiously.";

    return `
        <div class="scan-visualization-panel">
            <style>
                .scan-visualization-panel {
                    margin-top: 24px;
                    padding: 22px;
                    border: 1px solid rgba(100, 116, 139, 0.22);
                    border-radius: 18px;
                    background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98));
                }
                .scan-visualization-header {
                    display: flex;
                    justify-content: space-between;
                    gap: 20px;
                    align-items: flex-start;
                    margin-bottom: 14px;
                }
                .scan-visualization-header h3 {
                    margin: 4px 0 6px;
                }
                .scan-visualization-header p {
                    margin: 0;
                    max-width: 720px;
                }
                .scan-peak-badge {
                    min-width: 190px;
                    padding: 12px 14px;
                    border-radius: 12px;
                    background: rgba(15, 23, 42, 0.05);
                    text-align: center;
                }
                .scan-peak-badge span {
                    display: block;
                    font-size: 12px;
                    margin-bottom: 5px;
                }
                .scan-peak-badge strong {
                    font-size: 22px;
                }
                .scan-chart-wrap {
                    width: 100%;
                    overflow-x: auto;
                    border-radius: 14px;
                    background: #ffffff;
                    border: 1px solid rgba(100, 116, 139, 0.18);
                }
                .scan-frequency-chart {
                    display: block;
                    width: 100%;
                    min-width: 680px;
                    height: auto;
                }
                .scan-chart-grid {
                    stroke: rgba(100, 116, 139, 0.16);
                    stroke-width: 1;
                }
                .scan-chart-axis {
                    stroke: rgba(15, 23, 42, 0.55);
                    stroke-width: 1.5;
                }
                .scan-chart-axis-label {
                    fill: #64748b;
                    font-size: 12px;
                }
                .scan-chart-axis-title {
                    fill: #334155;
                    font-size: 13px;
                    font-weight: 600;
                }
                .scan-chart-area {
                    fill: rgba(59, 130, 246, 0.10);
                    stroke: none;
                }
                .scan-chart-line {
                    fill: none;
                    stroke: #2563eb;
                    stroke-width: 3;
                    stroke-linejoin: round;
                    stroke-linecap: round;
                }
                .scan-chart-point {
                    fill: #2563eb;
                    stroke: #ffffff;
                    stroke-width: 1.5;
                }
                .scan-chart-resonance {
                    stroke: #dc2626;
                    stroke-width: 2;
                    stroke-dasharray: 7 6;
                }
                .scan-chart-peak {
                    fill: #dc2626;
                    stroke: #ffffff;
                    stroke-width: 3;
                }
                .scan-chart-peak-label {
                    fill: #991b1b;
                    font-size: 14px;
                    font-weight: 700;
                }
                .scan-chart-half-power {
                    stroke: #64748b;
                    stroke-width: 1.5;
                    stroke-dasharray: 4 5;
                }
                .scan-chart-annotation {
                    fill: #475569;
                    font-size: 12px;
                    font-weight: 600;
                }
                .scan-explanation-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 12px;
                    margin-top: 16px;
                }
                .scan-explanation-card {
                    padding: 14px;
                    border-radius: 12px;
                    background: rgba(241, 245, 249, 0.8);
                }
                .scan-explanation-card strong {
                    display: block;
                    margin-bottom: 6px;
                    font-size: 14px;
                }
                .scan-explanation-card p {
                    margin: 0;
                    font-size: 13px;
                    line-height: 1.5;
                }
                .scan-quality-note {
                    margin-top: 16px;
                    padding: 14px 16px;
                    border-radius: 12px;
                }
                .scan-quality-note.good {
                    background: rgba(22, 163, 74, 0.08);
                }
                .scan-quality-note.attention {
                    background: rgba(234, 88, 12, 0.09);
                }
                .scan-quality-note p {
                    margin: 4px 0 0;
                }
                .scan-technical-details {
                    margin-top: 16px;
                    border-top: 1px solid rgba(100, 116, 139, 0.18);
                    padding-top: 14px;
                }
                .scan-technical-details summary {
                    cursor: pointer;
                    font-weight: 700;
                }
                .scan-technical-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 10px;
                    margin-top: 12px;
                }
                .scan-visualization-disclaimer {
                    margin: 16px 0 0;
                    font-size: 12px;
                    line-height: 1.5;
                    color: #64748b;
                }
                @media (max-width: 800px) {
                    .scan-visualization-header,
                    .scan-explanation-grid,
                    .scan-technical-grid {
                        grid-template-columns: 1fr;
                    }
                    .scan-visualization-header {
                        display: block;
                    }
                    .scan-peak-badge {
                        margin-top: 12px;
                    }
                }
            </style>

            <div class="scan-visualization-header">
                <div>
                    <div class="section-kicker">
                        HOW THE BONE RESPONDED
                    </div>
                    <h3>
                        Acoustic frequency response
                    </h3>
                    <p>
                        The scanner changes the input frequency and measures the strength of the detected response.
                    </p>
                </div>

                <div class="scan-peak-badge">
                    <span>Strongest measured response</span>
                    <strong>
                        ${Number.isFinite(resonance)
                            ? `${formatNumber(resonance)} Hz`
                            : "Not available"}
                    </strong>
                </div>
            </div>

            <div class="scan-chart-wrap">
                <svg
                    class="scan-frequency-chart"
                    viewBox="0 0 ${width} ${height}"
                    role="img"
                    aria-label="Acoustic frequency response graph"
                    preserveAspectRatio="xMidYMid meet"
                >
                    ${grid}

                    <line
                        x1="${left}"
                        y1="${top + plotHeight}"
                        x2="${left + plotWidth}"
                        y2="${top + plotHeight}"
                        class="scan-chart-axis"
                    />

                    <line
                        x1="${left}"
                        y1="${top}"
                        x2="${left}"
                        y2="${top + plotHeight}"
                        class="scan-chart-axis"
                    />

                    <path
                        d="${areaPath}"
                        class="scan-chart-area"
                    />

                    ${hasBandwidth
                        ? `
                            <line
                                x1="${left}"
                                y1="${halfPowerLineY.toFixed(2)}"
                                x2="${left + plotWidth}"
                                y2="${halfPowerLineY.toFixed(2)}"
                                class="scan-chart-half-power"
                            />
                            <text
                                x="${left + 8}"
                                y="${Math.max(top + 16, halfPowerLineY - 8).toFixed(2)}"
                                class="scan-chart-annotation"
                            >Half-power level</text>
                        `
                        : ""}

                    ${hasBandwidth
                        ? `
                            <text
                                x="${left + plotWidth - 8}"
                                y="${Math.max(top + 18, halfPowerLineY - 8).toFixed(2)}"
                                text-anchor="end"
                                class="scan-chart-annotation"
                            >Measured bandwidth: ${formatNumber(bandwidth)} Hz</text>
                        `
                        : ""}

                    <path
                        d="${path}"
                        class="scan-chart-line"
                    />

                    ${points.map(point => `
                        <circle
                            cx="${x(point.frequency).toFixed(2)}"
                            cy="${y(point.rms).toFixed(2)}"
                            r="3.2"
                            class="scan-chart-point"
                        />
                    `).join("")}

                    <line
                        x1="${resonanceX.toFixed(2)}"
                        y1="${top}"
                        x2="${resonanceX.toFixed(2)}"
                        y2="${top + plotHeight}"
                        class="scan-chart-resonance"
                    />

                    <circle
                        cx="${resonanceX.toFixed(2)}"
                        cy="${resonanceY.toFixed(2)}"
                        r="8"
                        class="scan-chart-peak"
                    />

                    <text
                        x="${resonanceX.toFixed(2)}"
                        y="${Math.max(20, resonanceY - 18).toFixed(2)}"
                        text-anchor="middle"
                        class="scan-chart-peak-label"
                    >★ ${Number.isFinite(resonance) ? `${formatNumber(resonance)} Hz` : "Peak"}</text>

                    <text
                        x="${left + plotWidth / 2}"
                        y="${height - 12}"
                        text-anchor="middle"
                        class="scan-chart-axis-title"
                    >Input / excitation frequency</text>

                    <text
                        x="18"
                        y="${top + plotHeight / 2}"
                        text-anchor="middle"
                        transform="rotate(-90 18 ${top + plotHeight / 2})"
                        class="scan-chart-axis-title"
                    >Measured response strength (RMS)</text>
                </svg>
            </div>

            <div class="scan-explanation-grid">
                <div class="scan-explanation-card">
                    <strong>① The scanner sends different frequencies</strong>
                    <p>
                        The input frequency is swept across the measurement range.
                    </p>
                </div>

                <div class="scan-explanation-card">
                    <strong>② The receiver measures the response</strong>
                    <p>
                        Each point on the graph represents the measured response at that frequency.
                    </p>
                </div>

                <div class="scan-explanation-card">
                    <strong>③ The peak shows the strongest measured response</strong>
                    <p>
                        The marked peak is the measured resonance frequency used by the experimental analysis.
                    </p>
                </div>
            </div>

            <div class="scan-quality-note ${qualityGood ? "good" : "attention"}">
                <strong>${qualityGood ? "✓ Scan quality" : "⚠ Scan quality"}</strong>
                <p>${escapeHtml(qualityText)}</p>
            </div>

            <details class="scan-technical-details">
                <summary>Technical measurements</summary>
                <div class="scan-technical-grid">
                    ${resultCard(
                        "Resonance f0",
                        formatNumber(measurement.f0),
                        "Hz"
                    )}
                    ${resultCard(
                        "RMS",
                        formatNumber(measurement.rms),
                        ""
                    )}
                    ${resultCard(
                        "Bandwidth",
                        formatNumber(measurement.bandwidth),
                        "Hz"
                    )}
                    ${resultCard(
                        "Q factor",
                        measurement.q_available === false
                            ? "N/A"
                            : formatNumber(measurement.q ?? measurement.q_factor),
                        ""
                    )}
                </div>
            </details>

            <p class="scan-visualization-disclaimer">
                This graph shows the acoustic response measured during the scan. It is experimental research data and is not a DEXA measurement or a clinical diagnosis.
            </p>

        </div>
    `;
}


/* ================================================================
   GLOBAL EXPORTS
================================================================ */

window.navigate = navigate;
window.openPatientForm = openPatientForm;
window.savePatient = savePatient;
window.viewPatient = viewPatient;
window.deletePatient = deletePatient;
window.startPatientScan = startPatientScan;
window.createScanRequest = createScanRequest;
window.openReferenceGroupForm = openReferenceGroupForm;
window.saveReferenceGroup = saveReferenceGroup;
window.editReferenceGroup = editReferenceGroup;
window.deleteReferenceGroup = deleteReferenceGroup;
window.openReferenceSamples = openReferenceSamples;
window.openReferenceSampleForm = openReferenceSampleForm;
window.saveReferenceSample = saveReferenceSample;
window.deleteReferenceSample = deleteReferenceSample;
window.closeModal = closeModal;
window.toggleSidebar = toggleSidebar;
window.togglePatientMeasurementGraph = togglePatientMeasurementGraph;
window.toggleStaffMeasurementGraph = toggleStaffMeasurementGraph;
