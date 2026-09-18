/* ================================================================
   GROUP 4 ACOUSTIC BONE DENSITY SCANNER
   app.js

   Supabase client:
   window.supabaseClient

   Roles:
   - admin
   - operator
   - patient portal via patient code

   Reference system:
   - Reference Groups
   - Age range
   - Sex
   - Bone: radius / ulna
   - Side: left / right
   - Multiple reference samples per group
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

document.addEventListener("DOMContentLoaded", async () => {

    setupModal();
    setupEventListeners();

    updateSystemStatus("Connecting to Supabase...");

    await restoreSession();

});


/* ================================================================
   EVENT LISTENERS
================================================================ */

function setupEventListeners() {

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }


    const createAccountForm =
        document.getElementById("createAccountForm");

    if (createAccountForm) {
        createAccountForm.addEventListener(
            "submit",
            handleCreateAccount
        );
    }


    const patientLoginForm =
        document.getElementById("patientLoginForm");

    if (patientLoginForm) {
        patientLoginForm.addEventListener(
            "submit",
            handlePatientLogin
        );
    }


    const logoutButton =
        document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            handleLogout
        );
    }


    const patientPortalButton =
        document.getElementById("patientPortalButton");

    if (patientPortalButton) {
        patientPortalButton.addEventListener(
            "click",
            showPatientPortal
        );
    }


    const createAccountButton =
        document.getElementById("createAccountButton");

    if (createAccountButton) {
        createAccountButton.addEventListener(
            "click",
            showCreateAccountPage
        );
    }


    const backToLoginButton =
        document.getElementById("backToLoginButton");

    if (backToLoginButton) {
        backToLoginButton.addEventListener(
            "click",
            showLoginPage
        );
    }


    const patientPortalBackButton =
        document.getElementById("patientPortalBackButton");

    if (patientPortalBackButton) {
        patientPortalBackButton.addEventListener(
            "click",
            showLoginPage
        );
    }


    const patientResultsLogoutButton =
        document.getElementById(
            "patientResultsLogoutButton"
        );

    if (patientResultsLogoutButton) {
        patientResultsLogoutButton.addEventListener(
            "click",
            showLoginPage
        );
    }


    const adminPatientsButton =
        document.getElementById("adminPatientsButton");

    if (adminPatientsButton) {
        adminPatientsButton.addEventListener(
            "click",
            openPatientManagement
        );
    }


    const adminMeasurementsButton =
        document.getElementById(
            "adminMeasurementsButton"
        );

    if (adminMeasurementsButton) {
        adminMeasurementsButton.addEventListener(
            "click",
            openMeasurementManagement
        );
    }


    const adminReferencesButton =
        document.getElementById(
            "adminReferencesButton"
        );

    if (adminReferencesButton) {
        adminReferencesButton.addEventListener(
            "click",
            openReferenceManagement
        );
    }


    const adminDevicesButton =
        document.getElementById("adminDevicesButton");

    if (adminDevicesButton) {
        adminDevicesButton.addEventListener(
            "click",
            openDeviceManagement
        );
    }


    const adminOperatorsButton =
        document.getElementById(
            "adminOperatorsButton"
        );

    if (adminOperatorsButton) {
        adminOperatorsButton.addEventListener(
            "click",
            openOperatorManagement
        );
    }


    const operatorPatientsButton =
        document.getElementById(
            "operatorPatientsButton"
        );

    if (operatorPatientsButton) {
        operatorPatientsButton.addEventListener(
            "click",
            openPatientManagement
        );
    }


    const operatorMeasurementsButton =
        document.getElementById(
            "operatorMeasurementsButton"
        );

    if (operatorMeasurementsButton) {
        operatorMeasurementsButton.addEventListener(
            "click",
            openMeasurementManagement
        );
    }


    const operatorScannerButton =
        document.getElementById(
            "operatorScannerButton"
        );

    if (operatorScannerButton) {
        operatorScannerButton.addEventListener(
            "click",
            openNewPatientScan
        );
    }


    const adminReferenceCard =
        document.getElementById("referenceCard");

    if (adminReferenceCard) {
        adminReferenceCard.addEventListener(
            "click",
            openReferenceManagement
        );
    }

}


/* ================================================================
   AUTH SESSION
================================================================ */

async function restoreSession() {

    try {

        const {
            data,
            error
        } = await db.auth.getSession();

        if (error) {
            throw error;
        }


        if (data && data.session) {

            currentUser =
                data.session.user;

            await loadCurrentProfile();

            if (currentProfile) {
                await showDashboard();
            } else {
                await showLoginPage();
            }

        } else {

            await showLoginPage();

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

    const emailElement =
        document.getElementById("loginEmail");

    const passwordElement =
        document.getElementById("loginPassword");


    const email =
        emailElement
            ? emailElement.value.trim()
            : "";

    const password =
        passwordElement
            ? passwordElement.value
            : "";


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

            await db.auth.signOut();

            currentUser = null;

            throw new Error(
                "Your account does not have a profile."
            );

        }


        showLoginMessage(
            ""
        );


        await showDashboard();


    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        showLoginMessage(
            error.message ||
            "Unable to sign in.",
            "error"
        );

    }

}


/* ================================================================
   LOAD CURRENT PROFILE
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
        .eq("id", currentUser.id)
        .maybeSingle();


    if (error) {
        throw error;
    }


    currentProfile = data || null;

    return currentProfile;

}


/* ================================================================
   CREATE ACCOUNT
================================================================ */

async function handleCreateAccount(event) {

    event.preventDefault();


    const nameElement =
        document.getElementById("createName");

    const emailElement =
        document.getElementById("createEmail");

    const passwordElement =
        document.getElementById("createPassword");


    const name =
        nameElement
            ? nameElement.value.trim()
            : "";

    const email =
        emailElement
            ? emailElement.value.trim()
            : "";

    const password =
        passwordElement
            ? passwordElement.value
            : "";


    const message =
        document.getElementById(
            "createAccountMessage"
        );


    if (!name || !email || !password) {

        if (message) {
            message.textContent =
                "Please complete all fields.";
            message.className =
                "message error";
        }

        return;
    }


    if (password.length < 6) {

        if (message) {
            message.textContent =
                "Password must contain at least 6 characters.";
            message.className =
                "message error";
        }

        return;
    }


    if (message) {
        message.textContent =
            "Creating account...";
        message.className =
            "message";
    }


    try {

        const {
            data,
            error
        } = await db.auth.signUp({
            email,
            password
        });


        if (error) {
            throw error;
        }


        /*
         * If email confirmation is disabled,
         * Supabase normally returns a session.
         *
         * If confirmation is enabled, the database
         * trigger / profile creation workflow should
         * create the profile after confirmation.
         */

        if (data.session && data.user) {

            await db
                .from("profiles")
                .upsert({
                    id: data.user.id,
                    name: name,
                    role: "operator"
                });


            currentUser =
                data.user;


            await loadCurrentProfile();


            if (message) {
                message.textContent =
                    "Account created successfully.";
                message.className =
                    "message success";
            }


            await showDashboard();

        } else {

            if (message) {
                message.textContent =
                    "Account created. Please check your email if confirmation is required, then sign in.";
                message.className =
                    "message success";
            }

        }


    } catch (error) {

        console.error(
            "Create account error:",
            error
        );

        if (message) {
            message.textContent =
                error.message ||
                "Unable to create account.";
            message.className =
                "message error";
        }

    }

}


/* ================================================================
   LOGOUT
================================================================ */

async function handleLogout() {

    try {

        stopScanMonitoring();

        await db.auth.signOut();

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }


    currentUser = null;
    currentProfile = null;
    currentScanRequest = null;


    showLoginPage();

}


/* ================================================================
   LOGIN PAGE
================================================================ */

function showLoginPage() {

    stopScanMonitoring();


    const loginPage =
        document.getElementById("loginPage");

    const createAccountPage =
        document.getElementById(
            "createAccountPage"
        );

    const dashboardPage =
        document.getElementById("dashboardPage");

    const patientPortal =
        document.getElementById("patientPortal");

    const patientResults =
        document.getElementById(
            "patientResults"
        );


    if (loginPage) {
        loginPage.classList.remove("hidden");
    }

    if (createAccountPage) {
        createAccountPage.classList.add("hidden");
    }

    if (dashboardPage) {
        dashboardPage.classList.add("hidden");
    }

    if (patientPortal) {
        patientPortal.classList.add("hidden");
    }

    if (patientResults) {
        patientResults.classList.add("hidden");
    }


    showLoginMessage("");

}


/* ================================================================
   CREATE ACCOUNT PAGE
================================================================ */

function showCreateAccountPage() {

    const loginPage =
        document.getElementById("loginPage");

    const createAccountPage =
        document.getElementById(
            "createAccountPage"
        );

    const dashboardPage =
        document.getElementById("dashboardPage");

    const patientPortal =
        document.getElementById("patientPortal");

    const patientResults =
        document.getElementById(
            "patientResults"
        );


    if (loginPage) {
        loginPage.classList.add("hidden");
    }

    if (createAccountPage) {
        createAccountPage.classList.remove(
            "hidden"
        );
    }

    if (dashboardPage) {
        dashboardPage.classList.add("hidden");
    }

    if (patientPortal) {
        patientPortal.classList.add("hidden");
    }

    if (patientResults) {
        patientResults.classList.add("hidden");
    }

}


/* ================================================================
   PATIENT PORTAL PAGE
================================================================ */

function showPatientPortal() {

    const loginPage =
        document.getElementById("loginPage");

    const createAccountPage =
        document.getElementById(
            "createAccountPage"
        );

    const dashboardPage =
        document.getElementById("dashboardPage");

    const patientPortal =
        document.getElementById("patientPortal");

    const patientResults =
        document.getElementById(
            "patientResults"
        );


    if (loginPage) {
        loginPage.classList.add("hidden");
    }

    if (createAccountPage) {
        createAccountPage.classList.add(
            "hidden"
        );
    }

    if (dashboardPage) {
        dashboardPage.classList.add("hidden");
    }

    if (patientPortal) {
        patientPortal.classList.remove(
            "hidden"
        );
    }

    if (patientResults) {
        patientResults.classList.add(
            "hidden"
        );
    }


    const code =
        document.getElementById(
            "patientCode"
        );

    if (code) {
        code.focus();
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


    const loginPage =
        document.getElementById("loginPage");

    const createAccountPage =
        document.getElementById(
            "createAccountPage"
        );

    const dashboardPage =
        document.getElementById("dashboardPage");

    const patientPortal =
        document.getElementById("patientPortal");

    const patientResults =
        document.getElementById(
            "patientResults"
        );


    if (loginPage) {
        loginPage.classList.add("hidden");
    }

    if (createAccountPage) {
        createAccountPage.classList.add(
            "hidden"
        );
    }

    if (dashboardPage) {
        dashboardPage.classList.remove(
            "hidden"
        );
    }

    if (patientPortal) {
        patientPortal.classList.add(
            "hidden"
        );
    }

    if (patientResults) {
        patientResults.classList.add(
            "hidden"
        );
    }


    updateDashboardForRole();

    await loadDashboardCounts();

    hideContent();

}


/* ================================================================
   ROLE DASHBOARD
================================================================ */

function updateDashboardForRole() {

    const adminDashboard =
        document.getElementById(
            "adminDashboard"
        );

    const operatorDashboard =
        document.getElementById(
            "operatorDashboard"
        );

    const dashboardUserName =
        document.getElementById(
            "dashboardUserName"
        );

    const dashboardRole =
        document.getElementById(
            "dashboardRole"
        );


    if (dashboardUserName) {
        dashboardUserName.textContent =
            currentProfile?.name ||
            currentUser?.email ||
            "User";
    }


    if (dashboardRole) {
        dashboardRole.textContent =
            currentProfile?.role ||
            "";
    }


    if (adminDashboard) {

        adminDashboard.classList.toggle(
            "hidden",
            !isAdmin()
        );

    }


    if (operatorDashboard) {

        operatorDashboard.classList.toggle(
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


    const countQueries = [];


    countQueries.push(
        db
            .from("patients")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .is("deleted_at", null)
    );


    countQueries.push(
        db
            .from("measurements")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
    );


    countQueries.push(
        db
            .from("reference_samples")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
    );


    countQueries.push(
        db
            .from("devices")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
    );


    if (isAdmin()) {

        countQueries.push(
            db
                .from("profiles")
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true
                    }
                )
                .eq("role", "operator")
        );

    }


    try {

        const results =
            await Promise.all(
                countQueries
            );


        const patientsCount =
            results[0]?.count ?? 0;

        const measurementsCount =
            results[1]?.count ?? 0;

        const referencesCount =
            results[2]?.count ?? 0;

        const devicesCount =
            results[3]?.count ?? 0;

        const operatorsCount =
            isAdmin()
                ? results[4]?.count ?? 0
                : 0;


        setText(
            "patientCount",
            patientsCount
        );

        setText(
            "measurementCount",
            measurementsCount
        );

        setText(
            "referenceCount",
            referencesCount
        );

        setText(
            "deviceCount",
            devicesCount
        );

        setText(
            "operatorCount",
            operatorsCount
        );


    } catch (error) {

        console.error(
            "Dashboard count error:",
            error
        );

    }

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


        let html = `

            <div class="content-header">

                <div>
                    <h2>Patients</h2>
                    <p>
                        Manage patient records and scanner measurements.
                    </p>
                </div>

                <button
                    class="primary-button"
                    onclick="openPatientForm()"
                >
                    + Add Patient
                </button>

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
                        No patient records are currently available.
                    </p>

                    <button
                        class="primary-button"
                        onclick="openPatientForm()"
                    >
                        Create First Patient
                    </button>

                </div>

            `;

        } else {

            html += `

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>
                                <th>Patient Code</th>
                                <th>Name</th>
                                <th>Age</th>
                                <th>Sex</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>

                        </thead>

                        <tbody>

            `;


            patients.forEach(patient => {

                html += `

                    <tr>

                        <td>
                            ${escapeHtml(
                                patient.patient_code || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                patient.name || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                patient.age ?? "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                patient.sex || "—"
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                patient.created_at
                            )}
                        </td>

                        <td>

                            <button
                                class="secondary-button"
                                onclick="viewPatient('${patient.id}')"
                            >
                                View
                            </button>

                            <button
                                class="danger-button"
                                onclick="deletePatient('${patient.id}')"
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
            "Patient management error:",
            error
        );


        showContent(`

            <h2>Patients</h2>

            <p class="error-text">
                ${escapeHtml(
                    error.message ||
                    "Unable to load patients."
                )}
            </p>

        `);

    }

}


/* ================================================================
   PATIENT FORM
================================================================ */

function openPatientForm(
    patient = null
) {

    if (!isStaff()) {
        return;
    }


    const editing =
        Boolean(patient);


    const title =
        editing
            ? "Edit Patient"
            : "Add Patient";


    const html = `

        <div class="content-header">

            <div>
                <h2>${title}</h2>
                <p>
                    Enter patient information.
                </p>
            </div>

        </div>


        <form
            id="patientForm"
            class="app-form"
        >

            <input
                type="hidden"
                id="patientId"
                value="${patient?.id || ""}"
            >


            <label>
                Patient Name
            </label>

            <input
                type="text"
                id="patientNameInput"
                required
                value="${escapeHtml(
                    patient?.name || ""
                )}"
            >


            <label>
                Age
            </label>

            <input
                type="number"
                id="patientAge"
                min="0"
                max="150"
                required
                value="${patient?.age ?? ""}"
            >


            <label>
                Sex
            </label>

            <select
                id="patientSex"
                required
            >

                <option value="">
                    Select sex
                </option>

                <option
                    value="Male"
                    ${patient?.sex === "Male" ? "selected" : ""}
                >
                    Male
                </option>

                <option
                    value="Female"
                    ${patient?.sex === "Female" ? "selected" : ""}
                >
                    Female
                </option>

                <option
                    value="Other"
                    ${patient?.sex === "Other" ? "selected" : ""}
                >
                    Other
                </option>

            </select>


            <label>
                Patient Code
            </label>

            <input
                type="text"
                id="patientCodeInput"
                readonly
                value="${escapeHtml(
                    patient?.patient_code ||
                    generatePatientCode()
                )}"
            >


            <div class="button-row">

                <button
                    type="submit"
                    class="primary-button"
                >
                    ${editing
                        ? "Update Patient"
                        : "Save Patient"}
                </button>

                <button
                    type="button"
                    class="secondary-button"
                    onclick="openPatientManagement()"
                >
                    Cancel
                </button>

            </div>

        </form>

    `;


    showContent(html);


    document
        .getElementById("patientForm")
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await savePatient();

            }
        );

}


/* ================================================================
   SAVE PATIENT
================================================================ */

async function savePatient() {

    if (!isStaff()) {
        return;
    }


    try {

        const id =
            document.getElementById(
                "patientId"
            ).value.trim();


        const name =
            document.getElementById(
                "patientNameInput"
            ).value.trim();


        const age =
            Number(
                document.getElementById(
                    "patientAge"
                ).value
            );


        const sex =
            document.getElementById(
                "patientSex"
            ).value;


        const patientCode =
            document.getElementById(
                "patientCodeInput"
            ).value.trim();


        if (!name) {
            throw new Error(
                "Patient name is required."
            );
        }


        if (
            !Number.isFinite(age) ||
            age < 0
        ) {
            throw new Error(
                "Please enter a valid age."
            );
        }


        if (!sex) {
            throw new Error(
                "Please select sex."
            );
        }


        const patientData = {

            name,

            age,

            sex,

            patient_code:
                patientCode

        };


        if (id) {

            const {
                error
            } = await db
                .from("patients")
                .update(patientData)
                .eq("id", id);


            if (error) {
                throw error;
            }


            alert(
                "Patient updated successfully."
            );

        } else {

            const {
                error
            } = await db
                .from("patients")
                .insert(patientData);


            if (error) {
                throw error;
            }


            alert(
                "Patient created successfully."
            );

        }


        await loadDashboardCounts();

        await openPatientManagement();


    } catch (error) {

        console.error(
            "Save patient error:",
            error
        );

        alert(
            error.message ||
            "Unable to save patient."
        );

    }

}


/* ================================================================
   VIEW PATIENT
================================================================ */

async function viewPatient(patientId) {

    if (!isStaff()) {
        return;
    }


    try {

        const {
            data: patient,
            error
        } = await db
            .from("patients")
            .select("*")
            .eq("id", patientId)
            .single();


        if (error) {
            throw error;
        }


        const {
            data: measurements,
            error: measurementError
        } = await db
            .from("measurements")
            .select("*")
            .eq("patient_id", patientId)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (measurementError) {
            throw measurementError;
        }


        let html = `

            <div class="content-header">

                <div>

                    <h2>
                        ${escapeHtml(
                            patient.name ||
                            "Patient"
                        )}
                    </h2>

                    <p>
                        Patient Code:
                        ${escapeHtml(
                            patient.patient_code ||
                            "—"
                        )}
                    </p>

                </div>

            </div>


            <div class="welcome-panel">

                <div class="detail-grid">

                    <p>
                        <strong>Name:</strong>
                        ${escapeHtml(
                            patient.name || "—"
                        )}
                    </p>

                    <p>
                        <strong>Patient Code:</strong>
                        ${escapeHtml(
                            patient.patient_code || "—"
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

            </div>


            <h3>Measurements</h3>

        `;


        if (
            !measurements ||
            measurements.length === 0
        ) {

            html += `
                <p>No measurements available.</p>
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
                                <th>BW</th>
                                <th>Q</th>
                            </tr>

                        </thead>

                        <tbody>

            `;


            measurements.forEach(m => {

                html += `

                    <tr>

                        <td>
                            ${formatDate(
                                m.created_at
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                m.bone || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                m.side || "—"
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                m.f0
                            )} Hz
                        </td>

                        <td>
                            ${formatNumber(
                                m.rms
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                m.bandwidth
                            )} Hz
                        </td>

                        <td>
                            ${formatNumber(
                                m.q_factor ??
                                m.q
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


        html += `

            <div class="button-row">

                <button
                    class="primary-button"
                    onclick="startPatientScan('${patient.id}')"
                >
                    Start Scan
                </button>

                <button
                    class="secondary-button"
                    onclick="openPatientManagement()"
                >
                    Back
                </button>

            </div>

        `;


        showContent(html);


    } catch (error) {

        console.error(
            "View patient error:",
            error
        );

        alert(
            error.message ||
            "Unable to load patient."
        );

    }

}


/* ================================================================
   DELETE PATIENT
================================================================ */

async function deletePatient(patientId) {

    if (!isStaff()) {
        return;
    }


    const confirmed =
        confirm(
            "Delete this patient record?\n\n" +
            "This action cannot be undone."
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            error
        } = await db
            .from("patients")
            .update({
                deleted_at:
                    new Date().toISOString()
            })
            .eq("id", patientId);


        if (error) {
            throw error;
        }


        await loadDashboardCounts();

        await openPatientManagement();


    } catch (error) {

        console.error(
            "Delete patient error:",
            error
        );

        alert(
            error.message ||
            "Unable to delete patient."
        );

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
            .eq("role", "operator")
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
                        There are currently no operator
                        profiles registered.
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

                const operatorName =
                    operator.name ||
                    "Unnamed Operator";


                html += `

                    <tr>

                        <td>
                            ${escapeHtml(
                                operatorName
                            )}
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
                                    '${escapeJsString(
                                        operatorName
                                    )}'
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


        html += `

            <div class="welcome-panel">

                <h3>Important</h3>

                <p>
                    Deleting an operator permanently removes
                    the operator's Supabase login account when
                    the secure administrator deletion function
                    is configured.
                </p>

            </div>

        `;


        showContent(html);


    } catch (error) {

        console.error(
            "Operator management error:",
            error
        );


        showContent(`

            <h2>Operator Management</h2>

            <p class="error-text">
                ${escapeHtml(
                    error.message ||
                    "Unable to load operators."
                )}
            </p>

        `);

    }

}


/* ================================================================
   DELETE OPERATOR ACCOUNT
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
        operatorId === currentUser?.id
    ) {

        showModal(
            "Cannot Delete",
            "You cannot delete your own administrator account."
        );

        return;
    }


    const confirmed =
        confirm(
            `Delete operator "${operatorName}"?\n\n` +
            "This will permanently delete the operator's " +
            "login account and cannot be undone."
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


        showModal(
            "Operator Deleted",
            `Operator "${operatorName}" was deleted successfully.`
        );


        await loadDashboardCounts();

        await openOperatorManagement();


    } catch (error) {

        console.error(
            "Delete operator error:",
            error
        );


        showModal(
            "Delete Failed",
            error.message ||
            "Unable to delete the operator account."
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
            )
            .limit(200);


        if (error) {
            throw error;
        }


        let html = `

            <div class="content-header">

                <div>

                    <h2>Measurements</h2>

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
                <p>No measurements available.</p>
            `;

        } else {

            html += `

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>
                                <th>Date</th>
                                <th>Patient ID</th>
                                <th>Bone</th>
                                <th>Side</th>
                                <th>Device</th>
                                <th>f0</th>
                                <th>RMS</th>
                                <th>BW</th>
                                <th>Q</th>
                            </tr>

                        </thead>

                        <tbody>

            `;


            measurements.forEach(m => {

                html += `

                    <tr>

                        <td>
                            ${formatDate(
                                m.created_at
                            )}
                        </td>

                        <td>
                            <small>
                                ${escapeHtml(
                                    m.patient_id || "—"
                                )}
                            </small>
                        </td>

                        <td>
                            ${escapeHtml(
                                m.bone || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                m.side || "—"
                            )}
                        </td>

                        <td>
                            <small>
                                ${escapeHtml(
                                    m.device_id || "—"
                                )}
                            </small>
                        </td>

                        <td>
                            ${formatNumber(
                                m.f0
                            )} Hz
                        </td>

                        <td>
                            ${formatNumber(
                                m.rms
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                m.bandwidth
                            )} Hz
                        </td>

                        <td>
                            ${formatNumber(
                                m.q_factor ??
                                m.q
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
                ${escapeHtml(
                    error.message ||
                    "Unable to load measurements."
                )}
            </p>

        `);

    }

}


/* ================================================================
   REFERENCE MANAGEMENT
================================================================ */

/*
 * Reference structure:
 *
 * Reference Group
 *   ├── age_min
 *   ├── age_max
 *   ├── sex
 *   ├── bone
 *   ├── side
 *   └── multiple reference samples
 *
 * Example:
 *
 * Female / 30-39 / Left / Radius
 *
 * may contain several reference samples.
 */


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
            )
            .order(
                "sex",
                {
                    ascending: true
                }
            )
            .order(
                "bone",
                {
                    ascending: true
                }
            )
            .order(
                "side",
                {
                    ascending: true
                }
            );


        if (error) {
            throw error;
        }


        const {
            data: samples,
            error: sampleError
        } = await db
            .from("reference_samples")
            .select(
                "id, reference_group_id, name, material, f0, rms, bandwidth, q_factor, q, source_type, device_id, version, created_at"
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


        const sampleList =
            samples || [];


        let html = `

            <div class="content-header">

                <div>

                    <h2>Reference Database</h2>

                    <p>
                        Reference groups and reference measurements
                        used for age, sex, bone and side comparison.
                    </p>

                </div>

                <button
                    class="primary-button"
                    onclick="openReferenceGroupForm()"
                >
                    + Add Reference Group
                </button>

            </div>


            <div class="welcome-panel">

                <h3>Reference Matching</h3>

                <p>
                    Each reference group is defined by an age range,
                    sex, bone and arm side. Multiple reference samples
                    can belong to the same group.
                </p>

                <p>
                    Example:
                    Female, age 30–39, Left Radius.
                </p>

            </div>

        `;


        if (
            !groups ||
            groups.length === 0
        ) {

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
                        Create Reference Group
                    </button>

                </div>

            `;

        } else {

            html += `

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>Group</th>
                                <th>Age</th>
                                <th>Sex</th>
                                <th>Bone</th>
                                <th>Side</th>
                                <th>Samples</th>
                                <th>Version</th>
                                <th>Actions</th>

                            </tr>

                        </thead>

                        <tbody>

            `;


            groups.forEach(group => {

                const count =
                    sampleList.filter(
                        sample =>
                            sample.reference_group_id ===
                            group.id
                    ).length;


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
                                formatSex(
                                    group.sex
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                capitalize(
                                    group.bone
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                capitalize(
                                    group.side
                                )
                            )}
                        </td>

                        <td>
                            ${count}
                        </td>

                        <td>
                            ${escapeHtml(
                                group.version ??
                                1
                            )}
                        </td>

                        <td>

                            <button
                                class="primary-button"
                                onclick="openReferenceSampleForm(
                                    '${group.id}'
                                )"
                            >
                                + Sample
                            </button>

                            <button
                                class="secondary-button"
                                onclick="viewReferenceGroup(
                                    '${group.id}'
                                )"
                            >
                                View
                            </button>

                            <button
                                class="secondary-button"
                                onclick="editReferenceGroup(
                                    '${group.id}'
                                )"
                            >
                                Edit
                            </button>

                            <button
                                class="danger-button"
                                onclick="deleteReferenceGroup(
                                    '${group.id}'
                                )"
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


        html += `

            <div class="welcome-panel">

                <h3>Scanner Reference</h3>

                <p>
                    A reference sample can be entered manually or
                    captured using the Acoustic Bone Scanner.
                </p>

                <button
                    class="primary-button"
                    onclick="openReferenceScannerInfo()"
                >
                    Scanner Reference Workflow
                </button>

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
                ${escapeHtml(
                    error.message ||
                    "Unable to load reference database."
                )}
            </p>

        `);

    }

}


/* ================================================================
   REFERENCE GROUP FORM
================================================================ */

function openReferenceGroupForm(
    group = null
) {

    if (!isAdmin()) {
        return;
    }


    const editing =
        Boolean(group);


    const html = `

        <div class="content-header">

            <div>

                <h2>
                    ${editing
                        ? "Edit Reference Group"
                        : "Add Reference Group"}
                </h2>

                <p>
                    Define the demographic and anatomical
                    matching criteria.
                </p>

            </div>

        </div>


        <form
            id="referenceGroupForm"
            class="app-form"
        >

            <input
                type="hidden"
                id="referenceGroupId"
                value="${group?.id || ""}"
            >


            <label>
                Group Name
            </label>

            <input
                type="text"
                id="referenceGroupName"
                required
                placeholder="Example: Female 30-39 Left Radius"
                value="${escapeHtml(
                    group?.name || ""
                )}"
            >


            <label>
                Minimum Age
            </label>

            <input
                type="number"
                id="referenceAgeMin"
                min="0"
                max="150"
                required
                value="${group?.age_min ?? ""}"
            >


            <label>
                Maximum Age
            </label>

            <input
                type="number"
                id="referenceAgeMax"
                min="0"
                max="150"
                required
                value="${group?.age_max ?? ""}"
            >


            <label>
                Sex
            </label>

            <select
                id="referenceSex"
                required
            >

                <option value="">
                    Select sex
                </option>

                <option
                    value="female"
                    ${group?.sex === "female" ? "selected" : ""}
                >
                    Female
                </option>

                <option
                    value="male"
                    ${group?.sex === "male" ? "selected" : ""}
                >
                    Male
                </option>

                <option
                    value="other"
                    ${group?.sex === "other" ? "selected" : ""}
                >
                    Other
                </option>

            </select>


            <label>
                Bone
            </label>

            <select
                id="referenceBone"
                required
            >

                <option value="">
                    Select bone
                </option>

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


            <label>
                Side
            </label>

            <select
                id="referenceSide"
                required
            >

                <option value="">
                    Select side
                </option>

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


            <label>
                Description
            </label>

            <textarea
                id="referenceGroupDescription"
                rows="4"
                placeholder="Optional description"
            >${escapeHtml(
                group?.description || ""
            )}</textarea>


            <div class="button-row">

                <button
                    type="submit"
                    class="primary-button"
                >
                    ${editing
                        ? "Update Group"
                        : "Create Group"}
                </button>

                <button
                    type="button"
                    class="secondary-button"
                    onclick="openReferenceManagement()"
                >
                    Cancel
                </button>

            </div>

        </form>

    `;


    showContent(html);


    document
        .getElementById(
            "referenceGroupForm"
        )
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await saveReferenceGroup();

            }
        );

}


/* ================================================================
   SAVE REFERENCE GROUP
================================================================ */

async function saveReferenceGroup() {

    if (!isAdmin()) {
        return;
    }


    try {

        const id =
            document.getElementById(
                "referenceGroupId"
            ).value.trim();


        const name =
            document.getElementById(
                "referenceGroupName"
            ).value.trim();


        const ageMin =
            Number(
                document.getElementById(
                    "referenceAgeMin"
                ).value
            );


        const ageMax =
            Number(
                document.getElementById(
                    "referenceAgeMax"
                ).value
            );


        const sex =
            document.getElementById(
                "referenceSex"
            ).value;


        const bone =
            document.getElementById(
                "referenceBone"
            ).value;


        const side =
            document.getElementById(
                "referenceSide"
            ).value;


        const description =
            document.getElementById(
                "referenceGroupDescription"
            ).value.trim() ||
            null;


        if (!name) {
            throw new Error(
                "Reference group name is required."
            );
        }


        if (
            !Number.isFinite(ageMin) ||
            !Number.isFinite(ageMax)
        ) {
            throw new Error(
                "Please enter a valid age range."
            );
        }


        if (ageMin < 0 || ageMax < ageMin) {
            throw new Error(
                "Maximum age must be greater than or equal to minimum age."
            );
        }


        if (!sex) {
            throw new Error(
                "Please select sex."
            );
        }


        if (!bone) {
            throw new Error(
                "Please select bone."
            );
        }


        if (!side) {
            throw new Error(
                "Please select side."
            );
        }


        const groupData = {

            name,

            age_min:
                ageMin,

            age_max:
                ageMax,

            sex,

            bone,

            side,

            description

        };


        if (id) {

            /*
             * Increment the version whenever an existing
             * reference group definition is changed.
             */

            const {
                data: existing,
                error: existingError
            } = await db
                .from("reference_groups")
                .select("version")
                .eq("id", id)
                .single();


            if (existingError) {
                throw existingError;
            }


            groupData.version =
                Number(
                    existing?.version || 1
                ) + 1;


            const {
                error
            } = await db
                .from("reference_groups")
                .update(groupData)
                .eq("id", id);


            if (error) {
                throw error;
            }


            alert(
                "Reference group updated successfully."
            );

        } else {

            const {
                error
            } = await db
                .from("reference_groups")
                .insert(groupData);


            if (error) {
                throw error;
            }


            alert(
                "Reference group created successfully."
            );

        }


        await openReferenceManagement();


    } catch (error) {

        console.error(
            "Save reference group error:",
            error
        );


        alert(
            error.message ||
            "Unable to save reference group."
        );

    }

}


/* ================================================================
   EDIT REFERENCE GROUP
================================================================ */

async function editReferenceGroup(
    groupId
) {

    if (!isAdmin()) {
        return;
    }


    try {

        const {
            data: group,
            error
        } = await db
            .from("reference_groups")
            .select("*")
            .eq("id", groupId)
            .single();


        if (error) {
            throw error;
        }


        openReferenceGroupForm(group);


    } catch (error) {

        console.error(
            "Edit reference group error:",
            error
        );

        alert(
            error.message ||
            "Unable to load reference group."
        );

    }

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
            "Delete this reference group?\n\n" +
            "All reference samples belonging to this group " +
            "will also be deleted."
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
            .eq("id", groupId);


        if (error) {
            throw error;
        }


        await openReferenceManagement();


    } catch (error) {

        console.error(
            "Delete reference group error:",
            error
        );


        alert(
            error.message ||
            "Unable to delete reference group."
        );

    }

}


/* ================================================================
   VIEW REFERENCE GROUP
================================================================ */

async function viewReferenceGroup(
    groupId
) {

    if (!isAdmin()) {
        return;
    }


    try {

        const {
            data: group,
            error
        } = await db
            .from("reference_groups")
            .select("*")
            .eq("id", groupId)
            .single();


        if (error) {
            throw error;
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
                        ${escapeHtml(
                            group.name
                        )}
                    </h2>

                    <p>
                        ${escapeHtml(
                            group.description ||
                            "Reference group"
                        )}
                    </p>

                </div>

                <button
                    class="primary-button"
                    onclick="openReferenceSampleForm(
                        '${group.id}'
                    )"
                >
                    + Add Sample
                </button>

            </div>


            <div class="welcome-panel">

                <div class="detail-grid">

                    <p>
                        <strong>Age:</strong>
                        ${group.age_min}–${group.age_max}
                    </p>

                    <p>
                        <strong>Sex:</strong>
                        ${escapeHtml(
                            formatSex(group.sex)
                        )}
                    </p>

                    <p>
                        <strong>Bone:</strong>
                        ${escapeHtml(
                            capitalize(group.bone)
                        )}
                    </p>

                    <p>
                        <strong>Side:</strong>
                        ${escapeHtml(
                            capitalize(group.side)
                        )}
                    </p>

                    <p>
                        <strong>Version:</strong>
                        ${escapeHtml(
                            group.version ?? 1
                        )}
                    </p>

                </div>

            </div>


            <h3>Reference Samples</h3>

        `;


        if (
            !samples ||
            samples.length === 0
        ) {

            html += `

                <div class="welcome-panel">

                    <p>
                        No reference samples are stored
                        in this group.
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
                                <th>BW</th>
                                <th>Q</th>
                                <th>Created</th>
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
                                sample.name ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                sample.source_type ||
                                "manual"
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                sample.f0
                            )} Hz
                        </td>

                        <td>
                            ${formatNumber(
                                sample.rms
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                sample.bandwidth
                            )} Hz
                        </td>

                        <td>
                            ${formatNumber(
                                sample.q_factor ??
                                sample.q
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
                                onclick="deleteReference(
                                    '${sample.id}',
                                    '${group.id}'
                                )"
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


        html += `

            <div class="button-row">

                <button
                    class="secondary-button"
                    onclick="openReferenceManagement()"
                >
                    Back to Reference Groups
                </button>

            </div>

        `;


        showContent(html);


    } catch (error) {

        console.error(
            "View reference group error:",
            error
        );


        alert(
            error.message ||
            "Unable to load reference group."
        );

    }

}


/* ================================================================
   REFERENCE SAMPLE FORM
================================================================ */

async function openReferenceSampleForm(
    groupId
) {

    if (!isAdmin()) {
        return;
    }


    try {

        const {
            data: group,
            error
        } = await db
            .from("reference_groups")
            .select("*")
            .eq("id", groupId)
            .single();


        if (error) {
            throw error;
        }


        const html = `

            <div class="content-header">

                <div>

                    <h2>Add Reference Sample</h2>

                    <p>
                        Group:
                        <strong>
                            ${escapeHtml(
                                group.name
                            )}
                        </strong>
                    </p>

                </div>

            </div>


            <div class="welcome-panel">

                <p>
                    ${group.age_min}–${group.age_max} years,
                    ${escapeHtml(
                        formatSex(group.sex)
                    )},
                    ${escapeHtml(
                        capitalize(group.bone)
                    )},
                    ${escapeHtml(
                        capitalize(group.side)
                    )}
                </p>

            </div>


            <form
                id="referenceSampleForm"
                class="app-form"
            >

                <input
                    type="hidden"
                    id="referenceSampleGroupId"
                    value="${group.id}"
                >


                <label>
                    Reference Sample Name
                </label>

                <input
                    type="text"
                    id="referenceName"
                    required
                    placeholder="Example: Phantom Sample 01"
                >


                <label>
                    Description
                </label>

                <textarea
                    id="referenceDescription"
                    rows="3"
                ></textarea>


                <label>
                    Material
                </label>

                <input
                    type="text"
                    id="referenceMaterial"
                    placeholder="Material / phantom type"
                >


                <label>
                    Source
                </label>

                <select
                    id="referenceSourceType"
                >

                    <option value="manual">
                        Manual Entry
                    </option>

                    <option value="scanner">
                        Scanner Measurement
                    </option>

                </select>


                <label>
                    Resonance Frequency f0 (Hz)
                </label>

                <input
                    type="number"
                    step="0.01"
                    id="referenceF0"
                >


                <label>
                    RMS
                </label>

                <input
                    type="number"
                    step="0.000001"
                    id="referenceRMS"
                >


                <label>
                    Bandwidth (Hz)
                </label>

                <input
                    type="number"
                    step="0.01"
                    id="referenceBandwidth"
                >


                <label>
                    Q Factor
                </label>

                <input
                    type="number"
                    step="0.01"
                    id="referenceQ"
                >


                <label>
                    Device ID
                </label>

                <input
                    type="text"
                    id="referenceDeviceId"
                    placeholder="Optional Supabase device UUID"
                >


                <label>
                    Scan Settings / Notes
                </label>

                <textarea
                    id="referenceNotes"
                    rows="5"
                    placeholder="Sweep range, steps, sampling settings, observations, etc."
                ></textarea>


                <div class="button-row">

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Save Reference Sample
                    </button>

                    <button
                        type="button"
                        class="secondary-button"
                        onclick="viewReferenceGroup(
                            '${group.id}'
                        )"
                    >
                        Cancel
                    </button>

                </div>

            </form>

        `;


        showContent(html);


        document
            .getElementById(
                "referenceSampleForm"
            )
            .addEventListener(
                "submit",
                async event => {

                    event.preventDefault();

                    await saveReferenceSample();

                }
            );


    } catch (error) {

        console.error(
            "Reference sample form error:",
            error
        );

        alert(
            error.message ||
            "Unable to open reference sample form."
        );

    }

}


/* ================================================================
   SAVE REFERENCE SAMPLE
================================================================ */

async function saveReferenceSample() {

    if (!isAdmin()) {
        return;
    }


    try {

        const groupId =
            document.getElementById(
                "referenceSampleGroupId"
            ).value.trim();


        const name =
            document.getElementById(
                "referenceName"
            ).value.trim();


        const description =
            document.getElementById(
                "referenceDescription"
            ).value.trim() ||
            null;


        const material =
            document.getElementById(
                "referenceMaterial"
            ).value.trim() ||
            null;


        const sourceType =
            document.getElementById(
                "referenceSourceType"
            ).value;


        const f0 =
            getNumberOrNull(
                "referenceF0"
            );


        const rms =
            getNumberOrNull(
                "referenceRMS"
            );


        const bandwidth =
            getNumberOrNull(
                "referenceBandwidth"
            );


        const q =
            getNumberOrNull(
                "referenceQ"
            );


        const deviceId =
            document.getElementById(
                "referenceDeviceId"
            ).value.trim() ||
            null;


        const notes =
            document.getElementById(
                "referenceNotes"
            ).value.trim() ||
            null;


        if (!groupId) {
            throw new Error(
                "Reference group is missing."
            );
        }


        if (!name) {
            throw new Error(
                "Reference sample name is required."
            );
        }


        /*
         * q_factor is the current measurement naming used
         * by the application. We also retain q compatibility
         * where the database supports it.
         */

        const sample = {

            reference_group_id:
                groupId,

            name,

            description,

            material,

            f0,

            rms,

            bandwidth,

            q_factor:
                q,

            source_type:
                sourceType,

            device_id:
                deviceId,

            scan_settings:
                notes
                    ? {
                        notes
                    }
                    : null,

            created_by:
                currentUser.id

        };


        const {
            error
        } = await db
            .from("reference_samples")
            .insert(sample);


        if (error) {
            throw error;
        }


        /*
         * Increment reference-group version so the
         * ESP32 can later detect that its local copy
         * is out of date.
         */

        const {
            data: group,
            error: groupError
        } = await db
            .from("reference_groups")
            .select("version")
            .eq("id", groupId)
            .single();


        if (!groupError && group) {

            await db
                .from("reference_groups")
                .update({
                    version:
                        Number(
                            group.version || 1
                        ) + 1
                })
                .eq(
                    "id",
                    groupId
                );

        }


        alert(
            "Reference sample saved successfully."
        );


        await viewReferenceGroup(
            groupId
        );


    } catch (error) {

        console.error(
            "Save reference sample error:",
            error
        );


        alert(
            error.message ||
            "Unable to save reference sample."
        );

    }

}


/* ================================================================
   OLD REFERENCE FORM COMPATIBILITY
================================================================ */

function openReferenceForm() {

    if (!isAdmin()) {
        return;
    }


    /*
     * The old button remains supported.
     *
     * Reference data should now belong to a group,
     * so we first ask the administrator to choose/create
     * the appropriate group.
     */

    showContent(`

        <div class="content-header">

            <div>

                <h2>Add Reference Sample</h2>

                <p>
                    Reference samples must belong to a
                    reference group.
                </p>

            </div>

        </div>


        <div class="welcome-panel">

            <h3>Reference Group Required</h3>

            <p>
                Create or select a group based on age,
                sex, bone and arm side before entering
                the reference measurement.
            </p>

            <div class="button-row">

                <button
                    class="primary-button"
                    onclick="openReferenceGroupForm()"
                >
                    Create Reference Group
                </button>

                <button
                    class="secondary-button"
                    onclick="openReferenceManagement()"
                >
                    Select Existing Group
                </button>

            </div>

        </div>

    `);

}


/* ================================================================
   DELETE REFERENCE SAMPLE
================================================================ */

async function deleteReference(
    referenceId,
    groupId = null
) {

    if (!isAdmin()) {
        return;
    }


    const confirmed =
        confirm(
            "Delete this reference sample?\n\n" +
            "This action cannot be undone."
        );


    if (!confirmed) {
        return;
    }


    try {

        let actualGroupId =
            groupId;


        /*
         * If the group wasn't supplied by the button,
         * retrieve it before deletion.
         */

        if (!actualGroupId) {

            const {
                data: sample
            } = await db
                .from("reference_samples")
                .select(
                    "reference_group_id"
                )
                .eq(
                    "id",
                    referenceId
                )
                .maybeSingle();


            actualGroupId =
                sample?.reference_group_id ||
                null;

        }


        const {
            error
        } = await db
            .from("reference_samples")
            .delete()
            .eq(
                "id",
                referenceId
            );


        if (error) {
            throw error;
        }


        /*
         * Increment group version after reference
         * database changes.
         */

        if (actualGroupId) {

            const {
                data: group
            } = await db
                .from("reference_groups")
                .select("version")
                .eq(
                    "id",
                    actualGroupId
                )
                .maybeSingle();


            if (group) {

                await db
                    .from("reference_groups")
                    .update({
                        version:
                            Number(
                                group.version || 1
                            ) + 1
                    })
                    .eq(
                        "id",
                        actualGroupId
                    );

            }

        }


        if (actualGroupId) {

            await viewReferenceGroup(
                actualGroupId
            );

        } else {

            await openReferenceManagement();

        }


    } catch (error) {

        console.error(
            "Delete reference error:",
            error
        );

        alert(
            error.message ||
            "Unable to delete reference."
        );

    }

}


/* ================================================================
   REFERENCE SCANNER WORKFLOW
================================================================ */

function openReferenceScannerInfo() {

    if (!isAdmin()) {
        return;
    }


    showContent(`

        <div class="content-header">

            <div>

                <h2>Scanner Reference Workflow</h2>

                <p>
                    Create a reference value using the physical
                    Acoustic Bone Scanner.
                </p>

            </div>

        </div>


        <div class="welcome-panel">

            <h3>Workflow</h3>

            <ol>

                <li>
                    Create the appropriate reference group.
                </li>

                <li>
                    Place the reference sample in the scanner
                    using the fixed sensor position.
                </li>

                <li>
                    Run the normal 200–1200 Hz acoustic sweep.
                </li>

                <li>
                    Record f0, RMS, bandwidth and Q.
                </li>

                <li>
                    Save the complete frequency response when
                    available.
                </li>

                <li>
                    Store the resulting measurement as a
                    scanner-generated reference sample.
                </li>

            </ol>

            <p>
                Scanner-generated reference data should retain
                the scanner/device ID, scan settings and
                measurement date.
            </p>

        </div>


        <div class="welcome-panel">

            <h3>Current Website Status</h3>

            <p>
                The website reference database is ready to store
                scanner-generated reference samples. The actual
                ESP32 scanner-reference capture workflow will use
                the same scan-request mechanism as an online scan.
            </p>

            <button
                class="secondary-button"
                onclick="openReferenceManagement()"
            >
                Back to Reference Database
            </button>

        </div>

    `);

}


/* ================================================================
   DEVICES
================================================================ */

async function openDeviceManagement() {

    if (!isAdmin()) {

        showContent(`
            <h2>Access Denied</h2>
            <p>Only administrators can manage devices.</p>
        `);

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
                <p>No scanner devices registered.</p>
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
                            ${escapeHtml(
                                device.status ||
                                "unknown"
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
                ${escapeHtml(
                    error.message ||
                    "Unable to load devices."
                )}
            </p>

        `);

    }

}


/* ================================================================
   START PATIENT SCAN
================================================================ */

async function startPatientScan(
    patientId
) {

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


        /*
         * Ask operator which bone and side are being scanned.
         */

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
         * Current scan_requests implementation.
         *
         * The additional bone and side fields are included.
         * If the database has not yet been extended with these
         * columns, Supabase will report the missing-column error.
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
            error.message ||
            "Unable to start patient scan."
        );

    }

}


/* ================================================================
   SCAN OPTIONS
================================================================ */

function openScanOptions(
    patient
) {

    return new Promise(resolve => {

        const html = `

            <h2>Select Scan Location</h2>

            <p>
                Patient:
                <strong>
                    ${escapeHtml(
                        patient.name
                    )}
                </strong>
            </p>


            <form
                id="scanOptionsForm"
                class="app-form"
            >

                <label>
                    Bone
                </label>

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


                <label>
                    Arm Side
                </label>

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


                <div class="button-row">

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Continue
                    </button>

                    <button
                        type="button"
                        id="scanOptionsCancel"
                        class="secondary-button"
                    >
                        Cancel
                    </button>

                </div>

            </form>

        `;


        showContent(html);


        const form =
            document.getElementById(
                "scanOptionsForm"
            );


        const cancelButton =
            document.getElementById(
                "scanOptionsCancel"
            );


        if (form) {

            form.addEventListener(
                "submit",
                event => {

                    event.preventDefault();


                    const bone =
                        document.getElementById(
                            "scanBone"
                        ).value;


                    const side =
                        document.getElementById(
                            "scanSide"
                        ).value;


                    if (!bone || !side) {

                        alert(
                            "Please select both bone and side."
                        );

                        return;
                    }


                    resolve({
                        bone,
                        side
                    });

                }
            );

        }


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                () => {

                    openPatientManagement();

                    resolve(null);

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
            .select(
                "id, patient_code, name"
            )
            .is(
                "deleted_at",
                null
            )
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

            <h2>New Patient Scan</h2>

            <p>
                Select a patient to create a scanner request.
            </p>

        `;


        if (
            !patients ||
            patients.length === 0
        ) {

            html += `

                <p>
                    No patients are available.
                </p>

                <button
                    class="primary-button"
                    onclick="openPatientForm()"
                >
                    Create Patient
                </button>

            `;


            showContent(html);

            return;
        }


        html += `

            <form
                id="scanForm"
                class="app-form"
            >

                <label>
                    Patient
                </label>

                <select
                    id="scanPatientSelect"
                    required
                >

                    <option value="">
                        Select patient
                    </option>

        `;


        patients.forEach(patient => {

            html += `

                <option value="${patient.id}">
                    ${escapeHtml(
                        patient.name
                    )}
                    -
                    ${escapeHtml(
                        patient.patient_code
                    )}
                </option>

            `;

        });


        html += `

                </select>


                <button
                    type="submit"
                    class="primary-button"
                >
                    Select Scan Location
                </button>

            </form>

        `;


        showContent(html);


        document
            .getElementById(
                "scanForm"
            )
            .addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    const patientId =
                        document.getElementById(
                            "scanPatientSelect"
                        ).value;


                    if (patientId) {

                        await startPatientScan(
                            patientId
                        );

                    }

                }
            );


    } catch (error) {

        console.error(
            "New patient scan error:",
            error
        );


        showContent(`

            <h2>New Patient Scan</h2>

            <p class="error-text">
                ${escapeHtml(
                    error.message
                )}
            </p>

        `);

    }

}


/* ================================================================
   SCAN MONITOR
================================================================ */

async function monitorScanRequest(
    scanRequestId
) {

    stopScanMonitoring();


    showContent(`

        <div class="welcome-panel">

            <h2>Scanner Request</h2>

            <p>
                Waiting for the Acoustic Bone Scanner...
            </p>

            <p id="scanStatus">
                Status: pending
            </p>

            <p>
                Keep the scanner connected and ready.
            </p>

            <button
                class="danger-button"
                onclick="cancelScanRequest(
                    '${scanRequestId}'
                )"
            >
                Cancel Scan
            </button>

        </div>

    `);


    await checkScanRequest(
        scanRequestId
    );


    scanMonitorTimer =
        setInterval(
            async () => {

                await checkScanRequest(
                    scanRequestId
                );

            },
            1500
        );

}


/* ================================================================
   CHECK SCAN REQUEST
================================================================ */

async function checkScanRequest(
    scanRequestId
) {

    try {

        const {
            data: request,
            error
        } = await db
            .from("scan_requests")
            .select("*")
            .eq(
                "id",
                scanRequestId
            )
            .single();


        if (error) {
            throw error;
        }


        currentScanRequest =
            request;


        const statusElement =
            document.getElementById(
                "scanStatus"
            );


        if (statusElement) {

            statusElement.textContent =
                `Status: ${request.status}`;

        }


        if (
            request.status ===
            "completed"
        ) {

            stopScanMonitoring();


            showContent(`

                <div class="welcome-panel">

                    <h2>Scan Complete</h2>

                    <p>
                        The scanner has completed the measurement.
                    </p>

                    <p>
                        Bone:
                        ${escapeHtml(
                            request.bone ||
                            "—"
                        )}
                    </p>

                    <p>
                        Side:
                        ${escapeHtml(
                            request.side ||
                            "—"
                        )}
                    </p>

                    <button
                        class="primary-button"
                        onclick="openMeasurementManagement()"
                    >
                        View Measurements
                    </button>

                </div>

            `);


            await loadDashboardCounts();


        } else if (
            request.status ===
            "error"
        ) {

            stopScanMonitoring();


            showContent(`

                <div class="welcome-panel">

                    <h2>Scan Error</h2>

                    <p>
                        The scanner reported an error.
                    </p>

                    <button
                        class="secondary-button"
                        onclick="openPatientManagement()"
                    >
                        Back to Patients
                    </button>

                </div>

            `);


        } else if (
            request.status ===
            "cancelled"
        ) {

            stopScanMonitoring();


            showContent(`

                <div class="welcome-panel">

                    <h2>Scan Cancelled</h2>

                    <p>
                        The scan request was cancelled.
                    </p>

                    <button
                        class="secondary-button"
                        onclick="openPatientManagement()"
                    >
                        Back to Patients
                    </button>

                </div>

            `);

        }

    } catch (error) {

        console.error(
            "Scan monitoring error:",
            error
        );

    }

}


/* ================================================================
   STOP SCAN MONITORING
================================================================ */

function stopScanMonitoring() {

    if (scanMonitorTimer) {

        clearInterval(
            scanMonitorTimer
        );

        scanMonitorTimer = null;

    }

}


/* ================================================================
   CANCEL SCAN
================================================================ */

async function cancelScanRequest(
    scanRequestId
) {

    const confirmed =
        confirm(
            "Cancel this scan request?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            error
        } = await db
            .from("scan_requests")
            .update({

                status:
                    "cancelled",

                cancelled_at:
                    new Date().toISOString()

            })
            .eq(
                "id",
                scanRequestId
            );


        if (error) {
            throw error;
        }


        stopScanMonitoring();


        await openPatientManagement();


    } catch (error) {

        console.error(
            "Cancel scan error:",
            error
        );


        alert(
            error.message ||
            "Unable to cancel scan."
        );

    }

}


/* ================================================================
   PATIENT PORTAL LOGIN
================================================================ */

async function handlePatientLogin(
    event
) {

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
                p_patient_code:
                    code
            }
        );


        if (error) {
            throw error;
        }


        if (
            !data ||
            (
                Array.isArray(data) &&
                data.length === 0
            )
        ) {

            throw new Error(
                "Patient code not found."
            );

        }


        const patientData =
            Array.isArray(data)
                ? data[0]
                : data;


        currentPatientPortalData =
            patientData;


        displayPatientPortal(
            patientData
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
   DISPLAY PATIENT PORTAL
================================================================ */

function displayPatientPortal(
    patientData
) {

    if (!patientData) {
        return;
    }


    const patient =
        patientData.patient ||
        patientData;


    const measurements =
        patientData.measurements ||
        [];


    setText(
        "patientName",
        patient.name ||
        "Patient"
    );


    const patientDetails =
        document.getElementById(
            "patientDetails"
        );


    if (patientDetails) {

        patientDetails.innerHTML = `

            <div class="detail-grid">

                <p>
                    <strong>Patient Code:</strong>
                    ${escapeHtml(
                        patient.patient_code ||
                        "—"
                    )}
                </p>

                <p>
                    <strong>Name:</strong>
                    ${escapeHtml(
                        patient.name ||
                        "—"
                    )}
                </p>

                <p>
                    <strong>Age:</strong>
                    ${escapeHtml(
                        patient.age ??
                        "—"
                    )}
                </p>

                <p>
                    <strong>Sex:</strong>
                    ${escapeHtml(
                        patient.sex ||
                        "—"
                    )}
                </p>

            </div>

        `;

    }


    const measurementContainer =
        document.getElementById(
            "patientMeasurements"
        );


    if (!measurementContainer) {
        return;
    }


    if (
        !measurements ||
        measurements.length === 0
    ) {

        measurementContainer.innerHTML =
            "<p>No measurements available.</p>";

    } else {

        let html = `

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


        measurements.forEach(m => {

            html += `

                <tr>

                    <td>
                        ${formatDate(
                            m.created_at
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            m.bone ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            m.side ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            m.f0
                        )} Hz
                    </td>

                    <td>
                        ${formatNumber(
                            m.rms
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            m.bandwidth
                        )} Hz
                    </td>

                    <td>
                        ${formatNumber(
                            m.q_factor ??
                            m.q
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


        measurementContainer.innerHTML =
            html;

    }


    showPatientResults();

}


/* ================================================================
   SHOW PATIENT RESULTS
================================================================ */

function showPatientResults() {

    const patientPortal =
        document.getElementById(
            "patientPortal"
        );

    const patientResults =
        document.getElementById(
            "patientResults"
        );


    if (patientPortal) {
        patientPortal.classList.add(
            "hidden"
        );
    }


    if (patientResults) {
        patientResults.classList.remove(
            "hidden"
        );
    }

}


/* ================================================================
   CONTENT AREA
================================================================ */

function showContent(
    html
) {

    const dashboardContent =
        document.getElementById(
            "dashboardContent"
        );


    const contentArea =
        document.getElementById(
            "contentArea"
        );


    if (
        !dashboardContent ||
        !contentArea
    ) {
        return;
    }


    contentArea.innerHTML =
        html;


    dashboardContent.classList.remove(
        "hidden"
    );


    dashboardContent.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


function hideContent() {

    const dashboardContent =
        document.getElementById(
            "dashboardContent"
        );


    if (dashboardContent) {

        dashboardContent.classList.add(
            "hidden"
        );

    }

}


/* ================================================================
   MODAL
================================================================ */

function setupModal() {

    const closeButton =
        document.getElementById(
            "modalCloseButton"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeModal
        );

    }


    const modal =
        document.getElementById(
            "modal"
        );


    if (modal) {

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

}


function showModal(
    title,
    body
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

        alert(
            `${title}\n\n${body}`
        );

        return;
    }


    if (modalTitle) {
        modalTitle.textContent =
            title;
    }


    if (modalBody) {

        modalBody.innerHTML =
            `<p>${escapeHtml(
                body
            )}</p>`;

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
   PERMISSION HELPERS
================================================================ */

function isAdmin() {

    return Boolean(
        currentProfile &&
        currentProfile.role === "admin"
    );

}


function isOperator() {

    return Boolean(
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
   REFERENCE MATCHING
================================================================ */

/*
 * Finds the appropriate reference group for:
 *
 * patient age
 * patient sex
 * selected bone
 * selected side
 *
 * Example:
 *
 * age = 34
 * sex = Female
 * bone = radius
 * side = left
 *
 * -> Female 30-39 Left Radius
 */

async function findReferenceGroup(
    age,
    sex,
    bone,
    side
) {

    const normalizedSex =
        normalizeSex(sex);

    const normalizedBone =
        normalizeBone(bone);

    const normalizedSide =
        normalizeSide(side);


    if (
        !Number.isFinite(
            Number(age)
        ) ||
        !normalizedSex ||
        !normalizedBone ||
        !normalizedSide
    ) {

        return null;

    }


    const {
        data,
        error
    } = await db
        .from("reference_groups")
        .select("*")
        .lte(
            "age_min",
            Number(age)
        )
        .gte(
            "age_max",
            Number(age)
        )
        .eq(
            "sex",
            normalizedSex
        )
        .eq(
            "bone",
            normalizedBone
        )
        .eq(
            "side",
            normalizedSide
        )
        .limit(1)
        .maybeSingle();


    if (error) {
        throw error;
    }


    return data || null;

}


/* ================================================================
   LOAD REFERENCE SAMPLES FOR PATIENT
================================================================ */

async function loadMatchingReferenceSamples(
    age,
    sex,
    bone,
    side
) {

    const group =
        await findReferenceGroup(
            age,
            sex,
            bone,
            side
        );


    if (!group) {

        return {
            group: null,
            samples: []
        };

    }


    const {
        data,
        error
    } = await db
        .from("reference_samples")
        .select("*")
        .eq(
            "reference_group_id",
            group.id
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


    return {
        group,
        samples: data || []
    };

}


/* ================================================================
   REFERENCE GROUP LIST FOR ADMIN
================================================================ */

async function loadReferenceGroups() {

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


    return data || [];

}


/* ================================================================
   UTILITY FUNCTIONS
================================================================ */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


function formatDate(
    value
) {

    if (!value) {
        return "—";
    }


    try {

        return new Date(
            value
        ).toLocaleString();

    } catch {

        return "—";

    }

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


    if (!Number.isFinite(number)) {
        return "—";
    }


    return number.toFixed(3);

}


function getNumberOrNull(
    id
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return null;
    }


    const value =
        element.value.trim();


    if (!value) {
        return null;
    }


    const number =
        Number(value);


    return Number.isFinite(number)
        ? number
        : null;

}


/* ================================================================
   PATIENT CODE GENERATOR
================================================================ */

function generatePatientCode() {

    const alphabet =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    function randomPart(
        length
    ) {

        let result = "";


        for (
            let i = 0;
            i < length;
            i++
        ) {

            const index =
                Math.floor(
                    Math.random() *
                    alphabet.length
                );


            result +=
                alphabet[index];

        }


        return result;

    }


    return [

        randomPart(4),

        randomPart(4),

        randomPart(2)

    ].join("-");

}


/* ================================================================
   SEX NORMALIZATION
================================================================ */

function normalizeSex(
    value
) {

    if (!value) {
        return null;
    }


    const normalized =
        String(value)
            .trim()
            .toLowerCase();


    if (
        normalized === "female" ||
        normalized === "f"
    ) {
        return "female";
    }


    if (
        normalized === "male" ||
        normalized === "m"
    ) {
        return "male";
    }


    if (
        normalized === "other" ||
        normalized === "o"
    ) {
        return "other";
    }


    return null;

}


function formatSex(
    value
) {

    const normalized =
        normalizeSex(value);


    if (normalized === "female") {
        return "Female";
    }


    if (normalized === "male") {
        return "Male";
    }


    if (normalized === "other") {
        return "Other";
    }


    return value || "—";

}


/* ================================================================
   BONE NORMALIZATION
================================================================ */

function normalizeBone(
    value
) {

    if (!value) {
        return null;
    }


    const normalized =
        String(value)
            .trim()
            .toLowerCase();


    if (
        normalized === "radius"
    ) {
        return "radius";
    }


    if (
        normalized === "ulna"
    ) {
        return "ulna";
    }


    return null;

}


/* ================================================================
   SIDE NORMALIZATION
================================================================ */

function normalizeSide(
    value
) {

    if (!value) {
        return null;
    }


    const normalized =
        String(value)
            .trim()
            .toLowerCase();


    if (
        normalized === "left" ||
        normalized === "l"
    ) {
        return "left";
    }


    if (
        normalized === "right" ||
        normalized === "r"
    ) {
        return "right";
    }


    return null;

}


/* ================================================================
   CAPITALIZE
================================================================ */

function capitalize(
    value
) {

    if (!value) {
        return "—";
    }


    const text =
        String(value);


    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );

}


/* ================================================================
   HTML ESCAPING
================================================================ */

function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

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


/* ================================================================
   JAVASCRIPT STRING ESCAPING
================================================================ */

function escapeJsString(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /\\/g,
            "\\\\"
        )

        .replace(
            /'/g,
            "\\'"
        )

        .replace(
            /\r/g,
            "\\r"
        )

        .replace(
            /\n/g,
            "\\n"
        );

}


/* ================================================================
   LOGIN MESSAGE
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
        message;


    element.className =
        `message ${type}`.trim();

}


/* ================================================================
   WINDOW EXPORTS
   Required because HTML buttons use onclick.
================================================================ */


/* Patients */

window.openPatientManagement =
    openPatientManagement;

window.openPatientForm =
    openPatientForm;

window.savePatient =
    savePatient;

window.viewPatient =
    viewPatient;

window.deletePatient =
    deletePatient;


/* Operators */

window.openOperatorManagement =
    openOperatorManagement;

window.deleteOperatorAccount =
    deleteOperatorAccount;


/* Measurements */

window.openMeasurementManagement =
    openMeasurementManagement;


/* Reference groups */

window.openReferenceManagement =
    openReferenceManagement;

window.openReferenceForm =
    openReferenceForm;

window.openReferenceGroupForm =
    openReferenceGroupForm;

window.saveReferenceGroup =
    saveReferenceGroup;

window.editReferenceGroup =
    editReferenceGroup;

window.deleteReferenceGroup =
    deleteReferenceGroup;

window.viewReferenceGroup =
    viewReferenceGroup;


/* Reference samples */

window.openReferenceSampleForm =
    openReferenceSampleForm;

window.saveReferenceSample =
    saveReferenceSample;

window.deleteReference =
    deleteReference;

window.openReferenceScannerInfo =
    openReferenceScannerInfo;


/* Reference matching */

window.findReferenceGroup =
    findReferenceGroup;

window.loadMatchingReferenceSamples =
    loadMatchingReferenceSamples;

window.loadReferenceGroups =
    loadReferenceGroups;


/* Devices */

window.openDeviceManagement =
    openDeviceManagement;


/* Scanner */

window.startPatientScan =
    startPatientScan;

window.openNewPatientScan =
    openNewPatientScan;

window.monitorScanRequest =
    monitorScanRequest;

window.cancelScanRequest =
    cancelScanRequest;


/* Pages */

window.showDashboard =
    showDashboard;

window.showLoginPage =
    showLoginPage;

window.showPatientPortal =
    showPatientPortal;

window.showCreateAccountPage =
    showCreateAccountPage;


/* Modal */

window.showModal =
    showModal;

window.closeModal =
    closeModal;
