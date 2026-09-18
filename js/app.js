/* ================================================================
   ACOUSTIC BONE SCANNER
   Main application JavaScript

   Supabase client:
       window.supabaseClient

   Complete application file.
================================================================ */


/* ================================================================
   GLOBAL STATE
================================================================ */

const db = window.supabaseClient;

let currentUser = null;
let currentProfile = null;
let currentPatientPortalData = null;
let currentScanRequest = null;
let scanMonitorTimer = null;


/* ================================================================
   REFERENCE CONSTANTS
================================================================ */

const REFERENCE_SEXES = [
    {
        value: "male",
        label: "Male"
    },
    {
        value: "female",
        label: "Female"
    },
    {
        value: "other",
        label: "Other"
    }
];

const REFERENCE_BONES = [
    {
        value: "radius",
        label: "Radius"
    },
    {
        value: "ulna",
        label: "Ulna"
    }
];

const REFERENCE_SIDES = [
    {
        value: "left",
        label: "Left"
    },
    {
        value: "right",
        label: "Right"
    }
];


/* ================================================================
   INITIALIZATION
================================================================ */

console.log("Acoustic Bone Scanner app.js loaded.");
console.log("Supabase client:", db);


document.addEventListener("DOMContentLoaded", async () => {

    console.log("DOM loaded.");

    if (!db) {

        console.error("Supabase client was not found.");

        showLoginMessage(
            "Supabase configuration could not be loaded.",
            "error"
        );

        return;
    }

    setupEventListeners();

    setupModal();

    await initializeApplication();

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


    const patientLogoutButton =
        document.getElementById("patientLogoutButton");

    if (patientLogoutButton) {
        patientLogoutButton.addEventListener(
            "click",
            handlePatientLogout
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


    const backToLoginButton =
        document.getElementById("backToLoginButton");

    if (backToLoginButton) {
        backToLoginButton.addEventListener(
            "click",
            showLoginPage
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


    const backFromCreateAccountButton =
        document.getElementById(
            "backFromCreateAccountButton"
        );

    if (backFromCreateAccountButton) {
        backFromCreateAccountButton.addEventListener(
            "click",
            showLoginPage
        );
    }


    const patientCard =
        document.getElementById("patientCard");

    if (patientCard) {
        patientCard.addEventListener(
            "click",
            openPatientManagement
        );
    }


    const measurementCard =
        document.getElementById("measurementCard");

    if (measurementCard) {
        measurementCard.addEventListener(
            "click",
            openMeasurementManagement
        );
    }


    const referenceCard =
        document.getElementById("referenceCard");

    if (referenceCard) {
        referenceCard.addEventListener(
            "click",
            openReferenceManagement
        );
    }


    const deviceCard =
        document.getElementById("deviceCard");

    if (deviceCard) {
        deviceCard.addEventListener(
            "click",
            openDeviceManagement
        );
    }


    const operatorCard =
        document.getElementById("operatorCard");

    if (operatorCard) {
        operatorCard.addEventListener(
            "click",
            openOperatorManagement
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


    const newPatientScanButton =
        document.getElementById(
            "newPatientScanButton"
        );

    if (newPatientScanButton) {
        newPatientScanButton.addEventListener(
            "click",
            openNewPatientScan
        );
    }


    const operatorPatientCard =
        document.getElementById(
            "operatorPatientCard"
        );

    if (operatorPatientCard) {
        operatorPatientCard.addEventListener(
            "click",
            openPatientManagement
        );
    }


    const operatorMeasurementCard =
        document.getElementById(
            "operatorMeasurementCard"
        );

    if (operatorMeasurementCard) {
        operatorMeasurementCard.addEventListener(
            "click",
            openMeasurementManagement
        );
    }


    const scannerCard =
        document.getElementById("scannerCard");

    if (scannerCard) {
        scannerCard.addEventListener(
            "click",
            openNewPatientScan
        );
    }

}


/* ================================================================
   APPLICATION INITIALIZATION
================================================================ */

async function initializeApplication() {

    try {

        const {
            data: {
                session
            }
        } = await db.auth.getSession();


        if (!session || !session.user) {

            showLoginPage();

            updateSystemStatus(
                "Scanner system ready. No user logged in."
            );

            return;
        }


        currentUser = session.user;

        await loadCurrentProfile();


        if (!currentProfile) {

            showLoginMessage(
                "Your account does not have a system profile.",
                "error"
            );

            await db.auth.signOut();

            currentUser = null;

            showLoginPage();

            return;
        }


        showDashboard();


    } catch (error) {

        console.error(
            "Application initialization error:",
            error
        );

        showLoginPage();

        updateSystemStatus(
            "Unable to initialize application."
        );

    }

}


/* ================================================================
   AUTHENTICATION
================================================================ */

async function handleLogin(event) {

    event.preventDefault();

    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");

    const email =
        emailInput?.value.trim() || "";

    const password =
        passwordInput?.value || "";


    if (!email || !password) {

        showLoginMessage(
            "Please enter email and password.",
            "error"
        );

        return;
    }


    showLoginMessage(
        "Logging in...",
        ""
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


        if (!data?.user) {
            throw new Error(
                "Login succeeded but no user was returned."
            );
        }


        currentUser = data.user;

        await loadCurrentProfile();


        if (!currentProfile) {

            await db.auth.signOut();

            currentUser = null;

            throw new Error(
                "No profile was found for this account."
            );
        }


        showDashboard();


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );

        showLoginMessage(
            error.message || "Login failed.",
            "error"
        );

    }

}


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
        .single();


    if (error) {
        throw error;
    }


    currentProfile = data;

    return data;

}


/* ================================================================
   CREATE ACCOUNT
================================================================ */

async function handleCreateAccount(event) {

    event.preventDefault();


    const name =
        document.getElementById(
            "createName"
        )?.value.trim() || "";

    const email =
        document.getElementById(
            "createEmail"
        )?.value.trim() || "";

    const password =
        document.getElementById(
            "createPassword"
        )?.value || "";

    const passwordConfirm =
        document.getElementById(
            "createPasswordConfirm"
        )?.value || "";

    const message =
        document.getElementById(
            "createAccountMessage"
        );


    if (!name || !email || !password) {

        message.textContent =
            "Please fill in all fields.";

        message.className =
            "message error";

        return;
    }


    if (password !== passwordConfirm) {

        message.textContent =
            "Passwords do not match.";

        message.className =
            "message error";

        return;
    }


    if (password.length < 6) {

        message.textContent =
            "Password must contain at least 6 characters.";

        message.className =
            "message error";

        return;
    }


    message.textContent =
        "Creating account...";

    message.className =
        "message";


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


        if (data.session && data.user) {

            const {
                error: profileError
            } = await db
                .from("profiles")
                .upsert({
                    id: data.user.id,
                    name,
                    role: "operator"
                });


            if (profileError) {
                throw profileError;
            }


            await db.auth.signOut();


            message.textContent =
                "Operator account created successfully. You can now log in.";

            message.className =
                "message success";


            document
                .getElementById(
                    "createAccountForm"
                )
                ?.reset();


        } else {

            message.textContent =
                "Account created. Check your email to confirm your account. If your operator profile is not created automatically, the administrator can create or correct it.";

            message.className =
                "message success";

        }


    } catch (error) {

        console.error(
            "Create account error:",
            error
        );

        message.textContent =
            error.message ||
            "Unable to create account.";

        message.className =
            "message error";

    }

}


/* ================================================================
   LOGOUT
================================================================ */

async function handleLogout() {

    stopScanMonitoring();

    try {

        await db.auth.signOut();

        currentUser = null;
        currentProfile = null;
        currentScanRequest = null;

        showLoginPage();

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        alert(
            error.message ||
            "Logout failed."
        );

    }

}


async function handlePatientLogout() {

    currentPatientPortalData = null;

    const input =
        document.getElementById("patientCode");

    if (input) {
        input.value = "";
    }

    showPatientPortal();

}


/* ================================================================
   PAGE NAVIGATION
================================================================ */

function hideAllPages() {

    [
        "loginPage",
        "createAccountPage",
        "dashboardPage",
        "patientPage",
        "patientResultsPage"
    ].forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {
            element.classList.add("hidden");
        }

    });

}


function showLoginPage() {

    hideAllPages();

    document
        .getElementById("loginPage")
        ?.classList.remove("hidden");

    const message =
        document.getElementById(
            "loginMessage"
        );

    if (message) {

        message.textContent = "";

        message.className =
            "message";
    }

}


function showCreateAccountPage() {

    hideAllPages();

    document
        .getElementById("createAccountPage")
        ?.classList.remove("hidden");

}


function showPatientPortal() {

    hideAllPages();

    document
        .getElementById("patientPage")
        ?.classList.remove("hidden");

}


function showDashboard() {

    hideAllPages();

    document
        .getElementById("dashboardPage")
        ?.classList.remove("hidden");

    updateDashboardForRole();

    loadDashboardCounts();

    updateSystemStatus(
        "Scanner system connected. Waiting for scanner activity."
    );

}


function showPatientResults() {

    hideAllPages();

    document
        .getElementById(
            "patientResultsPage"
        )
        ?.classList.remove("hidden");

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

    adminDashboard?.classList.add("hidden");

    operatorDashboard?.classList.add("hidden");


    const dashboardTitle =
        document.getElementById(
            "dashboardTitle"
        );

    const userInfo =
        document.getElementById(
            "userInfo"
        );


    if (!currentProfile) {
        return;
    }


    const role =
        String(
            currentProfile.role || ""
        ).toLowerCase();


    const name =
        currentProfile.name ||
        currentUser?.email ||
        "User";


    if (dashboardTitle) {

        dashboardTitle.textContent =
            role === "admin"
                ? "Administrator Dashboard"
                : "Operator Dashboard";

    }


    if (userInfo) {

        userInfo.textContent =
            `${name} • ${role}`;

    }


    if (role === "admin") {

        adminDashboard?.classList.remove(
            "hidden"
        );

    } else if (role === "operator") {

        operatorDashboard?.classList.remove(
            "hidden"
        );

    } else {

        showLoginMessage(
            "Your account has an invalid system role.",
            "error"
        );

    }

}


/* ================================================================
   DASHBOARD COUNTS
================================================================ */

async function loadDashboardCounts() {

    try {

        const {
            count: patientCount
        } = await db
            .from("patients")
            .select("*", {
                count: "exact",
                head: true
            });


        setText(
            "patientCount",
            patientCount ?? 0
        );

        setText(
            "operatorPatientCount",
            patientCount ?? 0
        );


        const {
            count: measurementCount
        } = await db
            .from("measurements")
            .select("*", {
                count: "exact",
                head: true
            });


        setText(
            "measurementCount",
            measurementCount ?? 0
        );

        setText(
            "operatorMeasurementCount",
            measurementCount ?? 0
        );


        if (isAdmin()) {

            const {
                count: referenceCount
            } = await db
                .from("reference_samples")
                .select("*", {
                    count: "exact",
                    head: true
                });


            setText(
                "referenceCount",
                referenceCount ?? 0
            );


            const {
                count: deviceCount
            } = await db
                .from("devices")
                .select("*", {
                    count: "exact",
                    head: true
                });


            setText(
                "deviceCount",
                deviceCount ?? 0
            );


            const {
                count: operatorCount
            } = await db
                .from("profiles")
                .select("*", {
                    count: "exact",
                    head: true
                })
                .eq("role", "operator");


            setText(
                "operatorCount",
                operatorCount ?? 0
            );

        }

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
                    <h2>Patient Management</h2>
                    <p>Manage patient records and start scans.</p>
                </div>

                <button
                    class="primary-button"
                    onclick="openPatientForm()"
                >
                    + Add Patient
                </button>

            </div>

        `;


        if (!patients?.length) {

            html += `
                <p>No patients found.</p>
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
                                class="secondary-button"
                                onclick="openPatientForm('${patient.id}')"
                            >
                                Edit
                            </button>

                            <button
                                class="primary-button"
                                onclick="startPatientScan('${patient.id}')"
                            >
                                Scan
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
            <h2>Patient Management</h2>
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

async function openPatientForm(patientId = null) {

    if (!isStaff()) {
        return;
    }


    let patient = null;


    if (patientId) {

        const {
            data,
            error
        } = await db
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


    const title =
        patient
            ? "Edit Patient"
            : "Create Patient";


    const html = `

        <h2>${title}</h2>

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
                id="patientAgeInput"
                min="0"
                max="150"
                value="${patient?.age ?? ""}"
            >

            <label>
                Sex
            </label>

            <select id="patientSexInput">

                <option value="">
                    Select
                </option>

                <option
                    value="male"
                    ${isSelectedSex(patient?.sex, "male")}
                >
                    Male
                </option>

                <option
                    value="female"
                    ${isSelectedSex(patient?.sex, "female")}
                >
                    Female
                </option>

                <option
                    value="other"
                    ${isSelectedSex(patient?.sex, "other")}
                >
                    Other
                </option>

            </select>

            <label>
                Phone
            </label>

            <input
                type="text"
                id="patientPhoneInput"
                value="${escapeHtml(
                    patient?.phone || ""
                )}"
            >

            <label>
                Email
            </label>

            <input
                type="email"
                id="patientEmailInput"
                value="${escapeHtml(
                    patient?.email || ""
                )}"
            >

            <label>
                Height
            </label>

            <input
                type="number"
                step="0.1"
                id="patientHeightInput"
                value="${patient?.height ?? ""}"
            >

            <label>
                Weight
            </label>

            <input
                type="number"
                step="0.1"
                id="patientWeightInput"
                value="${patient?.weight ?? ""}"
            >

            <label>
                Notes
            </label>

            <textarea
                id="patientNotesInput"
                rows="4"
            >${escapeHtml(
                patient?.notes || ""
            )}</textarea>

            <div class="button-row">

                <button
                    type="submit"
                    class="primary-button"
                >
                    Save Patient
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
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await savePatient();

            }
        );

}


async function savePatient() {

    try {

        const patientId =
            document.getElementById(
                "patientId"
            )?.value || "";

        const name =
            document.getElementById(
                "patientNameInput"
            )?.value.trim() || "";

        const ageValue =
            document.getElementById(
                "patientAgeInput"
            )?.value || "";

        const sex =
            document.getElementById(
                "patientSexInput"
            )?.value || "";

        const phone =
            document.getElementById(
                "patientPhoneInput"
            )?.value.trim() || "";

        const email =
            document.getElementById(
                "patientEmailInput"
            )?.value.trim() || "";

        const heightValue =
            document.getElementById(
                "patientHeightInput"
            )?.value || "";

        const weightValue =
            document.getElementById(
                "patientWeightInput"
            )?.value || "";

        const notes =
            document.getElementById(
                "patientNotesInput"
            )?.value.trim() || "";


        if (!name) {

            alert(
                "Patient name is required."
            );

            return;
        }


        const patientData = {

            name,

            age:
                ageValue
                    ? Number(ageValue)
                    : null,

            sex:
                sex || null,

            phone:
                phone || null,

            email:
                email || null,

            height:
                heightValue
                    ? Number(heightValue)
                    : null,

            weight:
                weightValue
                    ? Number(weightValue)
                    : null,

            notes:
                notes || null,

            updated_at:
                new Date().toISOString()

        };


        if (patientId) {

            const {
                error
            } = await db
                .from("patients")
                .update(patientData)
                .eq("id", patientId);


            if (error) {
                throw error;
            }


            alert(
                "Patient updated successfully."
            );

        } else {

            patientData.patient_code =
                generatePatientCode();

            patientData.created_by =
                currentUser.id;


            const {
                error
            } = await db
                .from("patients")
                .insert(patientData);


            if (error) {
                throw error;
            }


            alert(
                `Patient created successfully.\n\nPatient Code: ${patientData.patient_code}`
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

            <h2>Patient Details</h2>

            <div class="detail-grid">

                <p>
                    <strong>Patient Code:</strong>
                    ${escapeHtml(
                        patient.patient_code || "—"
                    )}
                </p>

                <p>
                    <strong>Name:</strong>
                    ${escapeHtml(
                        patient.name || "—"
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

                <p>
                    <strong>Phone:</strong>
                    ${escapeHtml(
                        patient.phone || "—"
                    )}
                </p>

                <p>
                    <strong>Email:</strong>
                    ${escapeHtml(
                        patient.email || "—"
                    )}
                </p>

                <p>
                    <strong>Height:</strong>
                    ${escapeHtml(
                        patient.height ?? "—"
                    )}
                </p>

                <p>
                    <strong>Weight:</strong>
                    ${escapeHtml(
                        patient.weight ?? "—"
                    )}
                </p>

            </div>

            <h3>Measurements</h3>

        `;


        if (!measurements?.length) {

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


    if (!confirm(
        "Delete this patient record?\n\nThis action cannot be undone."
    )) {
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


        if (!operators?.length) {

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
                                    '${escapeJsString(operatorName)}'
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


    if (operatorId === currentUser?.id) {

        showModal(
            "Cannot Delete",
            "You cannot delete your own administrator account."
        );

        return;
    }


    if (!confirm(
        `Delete operator "${operatorName}"?\n\nThis will permanently delete the operator's login account and cannot be undone.`
    )) {
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


        if (!measurements?.length) {

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
            error: groupError
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


        if (groupError) {
            throw groupError;
        }


        const {
            data: samples,
            error: sampleError
        } = await db
            .from("reference_samples")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (sampleError) {
            throw sampleError;
        }


        const sampleCounts = {};

        (samples || []).forEach(sample => {

            if (sample.reference_group_id) {

                sampleCounts[
                    sample.reference_group_id
                ] =
                    (sampleCounts[
                        sample.reference_group_id
                    ] || 0) + 1;

            }

        });


        let html = `

            <div class="content-header">

                <div>

                    <h2>Reference Groups</h2>

                    <p>
                        Reference data is organized by age,
                        sex, bone and arm side.
                    </p>

                </div>

                <div class="button-row">

                    <button
                        class="primary-button"
                        onclick="openReferenceGroupForm()"
                    >
                        + Add Reference Group
                    </button>

                    <button
                        class="secondary-button"
                        onclick="openReferenceSampleForm()"
                    >
                        + Add Reference Sample
                    </button>

                </div>

            </div>

        `;


        html += `

            <div class="welcome-panel">

                <h3>Reference Database</h3>

                <p>
                    Each reference group may contain multiple
                    reference samples. Samples can be entered
                    manually or later added from a scanner.
                </p>

            </div>

        `;


        if (!groups?.length) {

            html += `

                <div class="welcome-panel">

                    <h3>No Reference Groups</h3>

                    <p>
                        Create the first reference group using
                        the button above.
                    </p>

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
                                <th>Version</th>
                                <th>Samples</th>
                                <th>Actions</th>
                            </tr>

                        </thead>

                        <tbody>

            `;


            groups.forEach(group => {

                const count =
                    sampleCounts[group.id] || 0;


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
                            ${count}
                        </td>

                        <td>

                            <button
                                class="secondary-button"
                                onclick="viewReferenceGroup('${group.id}')"
                            >
                                View
                            </button>

                            <button
                                class="secondary-button"
                                onclick="openReferenceGroupForm('${group.id}')"
                            >
                                Edit
                            </button>

                            <button
                                class="primary-button"
                                onclick="openReferenceSampleForm('${group.id}')"
                            >
                                Add Sample
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
            "Reference management error:",
            error
        );

        showContent(`

            <h2>Reference Management</h2>

            <p class="error-text">
                ${escapeHtml(
                    error.message ||
                    "Unable to load reference data."
                )}
            </p>

        `);

    }

}


/* ================================================================
   REFERENCE GROUP FORM
================================================================ */

async function openReferenceGroupForm(
    groupId = null
) {

    if (!isAdmin()) {
        return;
    }


    let group = null;


    if (groupId) {

        const {
            data,
            error
        } = await db
            .from("reference_groups")
            .select("*")
            .eq("id", groupId)
            .single();


        if (error) {

            alert(error.message);

            return;
        }


        group = data;

    }


    const title =
        group
            ? "Edit Reference Group"
            : "Create Reference Group";


    const sexOptions =
        REFERENCE_SEXES
            .map(item => `

                <option
                    value="${item.value}"
                    ${group?.sex === item.value ? "selected" : ""}
                >
                    ${item.label}
                </option>

            `)
            .join("");


    const boneOptions =
        REFERENCE_BONES
            .map(item => `

                <option
                    value="${item.value}"
                    ${group?.bone === item.value ? "selected" : ""}
                >
                    ${item.label}
                </option>

            `)
            .join("");


    const sideOptions =
        REFERENCE_SIDES
            .map(item => `

                <option
                    value="${item.value}"
                    ${group?.side === item.value ? "selected" : ""}
                >
                    ${item.label}
                </option>

            `)
            .join("");


    const html = `

        <h2>${title}</h2>

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
                Reference Group Name
            </label>

            <input
                type="text"
                id="referenceGroupName"
                required
                placeholder="Example: Female 30–39 Left Radius"
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
                required
                min="0"
                max="150"
                value="${group?.age_min ?? ""}"
            >

            <label>
                Maximum Age
            </label>

            <input
                type="number"
                id="referenceAgeMax"
                required
                min="0"
                max="150"
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

                ${sexOptions}

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

                ${boneOptions}

            </select>

            <label>
                Arm Side
            </label>

            <select
                id="referenceSide"
                required
            >

                <option value="">
                    Select side
                </option>

                ${sideOptions}

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

            <div class="welcome-panel">

                <p>
                    A group represents one demographic and
                    measurement location combination.
                </p>

                <p>
                    Example:
                    Female, age 30–39, left radius.
                </p>

            </div>

            <div class="button-row">

                <button
                    type="submit"
                    class="primary-button"
                >
                    Save Reference Group
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
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await saveReferenceGroup();

            }
        );

}


async function saveReferenceGroup() {

    try {

        const id =
            document.getElementById(
                "referenceGroupId"
            )?.value || "";

        const name =
            document.getElementById(
                "referenceGroupName"
            )?.value.trim() || "";

        const ageMinValue =
            document.getElementById(
                "referenceAgeMin"
            )?.value || "";

        const ageMaxValue =
            document.getElementById(
                "referenceAgeMax"
            )?.value || "";

        const sex =
            document.getElementById(
                "referenceSex"
            )?.value || "";

        const bone =
            document.getElementById(
                "referenceBone"
            )?.value || "";

        const side =
            document.getElementById(
                "referenceSide"
            )?.value || "";

        const description =
            document.getElementById(
                "referenceGroupDescription"
            )?.value.trim() || "";


        const ageMin =
            Number(ageMinValue);

        const ageMax =
            Number(ageMaxValue);


        if (!name) {

            alert(
                "Reference group name is required."
            );

            return;
        }


        if (
            !Number.isInteger(ageMin) ||
            !Number.isInteger(ageMax)
        ) {

            alert(
                "Age values must be whole numbers."
            );

            return;
        }


        if (
            ageMin < 0 ||
            ageMax < ageMin ||
            ageMax > 150
        ) {

            alert(
                "Please enter a valid age range."
            );

            return;
        }


        if (!REFERENCE_SEXES.some(
            item => item.value === sex
        )) {

            alert(
                "Please select a valid sex."
            );

            return;
        }


        if (!REFERENCE_BONES.some(
            item => item.value === bone
        )) {

            alert(
                "Please select a valid bone."
            );

            return;
        }


        if (!REFERENCE_SIDES.some(
            item => item.value === side
        )) {

            alert(
                "Please select a valid side."
            );

            return;
        }


        const payload = {

            name,

            age_min:
                ageMin,

            age_max:
                ageMax,

            sex,

            bone,

            side,

            description:
                description || null,

            updated_at:
                new Date().toISOString()

        };


        let result;


        if (id) {

            result =
                await db
                    .from("reference_groups")
                    .update(payload)
                    .eq("id", id);

        } else {

            payload.version = 1;

            result =
                await db
                    .from("reference_groups")
                    .insert(payload);

        }


        if (result.error) {

            if (
                result.error.code === "23505"
            ) {

                throw new Error(
                    "A reference group with the same age range, sex, bone and side already exists."
                );

            }

            throw result.error;
        }


        alert(
            id
                ? "Reference group updated successfully."
                : "Reference group created successfully."
        );


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
                        ${escapeHtml(
                            group.name
                        )}
                    </h2>

                    <p>
                        ${escapeHtml(
                            group.age_min
                        )}
                        –
                        ${escapeHtml(
                            group.age_max
                        )}
                        years •
                        ${escapeHtml(
                            capitalize(group.sex)
                        )} •
                        ${escapeHtml(
                            capitalize(group.side)
                        )}
                        ${escapeHtml(
                            capitalize(group.bone)
                        )}
                    </p>

                </div>

                <button
                    class="primary-button"
                    onclick="openReferenceSampleForm('${group.id}')"
                >
                    + Add Sample
                </button>

            </div>

        `;


        if (group.description) {

            html += `

                <div class="welcome-panel">

                    <p>
                        ${escapeHtml(
                            group.description
                        )}
                    </p>

                </div>

            `;

        }


        html += `

            <h3>
                Reference Samples
            </h3>

        `;


        if (!samples?.length) {

            html += `

                <div class="welcome-panel">

                    <p>
                        No samples have been added to this
                        reference group yet.
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
                                <th>Device</th>
                                <th>f0</th>
                                <th>RMS</th>
                                <th>BW</th>
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
                                sample.name ||
                                "Reference Sample"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                sample.source_type ||
                                "manual"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                sample.device_id ||
                                "—"
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
                                onclick="deleteReference('${sample.id}')"
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
   DELETE REFERENCE GROUP
================================================================ */

async function deleteReferenceGroup(
    groupId
) {

    if (!isAdmin()) {
        return;
    }


    if (!confirm(
        "Delete this reference group?\n\nAll reference samples belonging to this group will also be deleted."
    )) {
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


        await loadDashboardCounts();

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
   REFERENCE SAMPLE FORM
================================================================ */

async function openReferenceSampleForm(
    groupId = null
) {

    if (!isAdmin()) {
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

        alert(error.message);

        return;
    }


    if (!groups?.length) {

        alert(
            "Please create a reference group before adding a reference sample."
        );

        await openReferenceGroupForm();

        return;
    }


    let selectedGroup =
        groupId ||
        groups[0].id;


    const groupOptions =
        groups
            .map(group => {

                const label =
                    `${group.name} (${group.age_min}–${group.age_max}, ${capitalize(group.sex)}, ${capitalize(group.side)} ${capitalize(group.bone)})`;

                return `

                    <option
                        value="${group.id}"
                        ${group.id === selectedGroup ? "selected" : ""}
                    >
                        ${escapeHtml(label)}
                    </option>

                `;

            })
            .join("");


    const html = `

        <h2>Add Reference Sample</h2>

        <p>
            Add a measured reference sample to one of the
            demographic/site reference groups.
        </p>

        <form
            id="referenceSampleForm"
            class="app-form"
        >

            <label>
                Reference Group
            </label>

            <select
                id="referenceSampleGroup"
                required
            >

                ${groupOptions}

            </select>

            <label>
                Sample Name
            </label>

            <input
                type="text"
                id="referenceSampleName"
                required
                placeholder="Example: Reference Sample 01"
            >

            <label>
                Material / Sample Description
            </label>

            <input
                type="text"
                id="referenceSampleMaterial"
                placeholder="Bone phantom / test structure"
            >

            <label>
                Resonance Frequency f0 (Hz)
            </label>

            <input
                type="number"
                step="0.01"
                id="referenceSampleF0"
            >

            <label>
                RMS
            </label>

            <input
                type="number"
                step="0.000001"
                id="referenceSampleRMS"
            >

            <label>
                Bandwidth (Hz)
            </label>

            <input
                type="number"
                step="0.01"
                id="referenceSampleBandwidth"
            >

            <label>
                Q Factor
            </label>

            <input
                type="number"
                step="0.01"
                id="referenceSampleQ"
            >

            <label>
                Frequency Response JSON
            </label>

            <textarea
                id="referenceSampleFrequencyResponse"
                rows="6"
                placeholder='Example: [{"frequency":200,"rms":0.01},{"frequency":225,"rms":0.015}]'
            ></textarea>

            <label>
                Scan Settings JSON
            </label>

            <textarea
                id="referenceSampleScanSettings"
                rows="5"
                placeholder='Example: {"start_frequency":200,"end_frequency":1200,"step":25}'
            ></textarea>

            <label>
                Notes
            </label>

            <textarea
                id="referenceSampleNotes"
                rows="4"
            ></textarea>

            <div class="welcome-panel">

                <p>
                    Source type will be recorded as
                    <strong>manual</strong>.
                </p>

                <p>
                    Scanner-generated references will later
                    use source type <strong>scanner</strong>
                    and retain their device and scan metadata.
                </p>

            </div>

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
            "referenceSampleForm"
        )
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await saveReferenceSample();

            }
        );

}


async function saveReferenceSample() {

    try {

        const groupId =
            document.getElementById(
                "referenceSampleGroup"
            )?.value || "";

        const name =
            document.getElementById(
                "referenceSampleName"
            )?.value.trim() || "";

        const material =
            document.getElementById(
                "referenceSampleMaterial"
            )?.value.trim() || "";

        const f0 =
            getNumberOrNull(
                "referenceSampleF0"
            );

        const rms =
            getNumberOrNull(
                "referenceSampleRMS"
            );

        const bandwidth =
            getNumberOrNull(
                "referenceSampleBandwidth"
            );

        const q =
            getNumberOrNull(
                "referenceSampleQ"
            );

        const responseText =
            document.getElementById(
                "referenceSampleFrequencyResponse"
            )?.value.trim() || "";

        const settingsText =
            document.getElementById(
                "referenceSampleScanSettings"
            )?.value.trim() || "";

        const notes =
            document.getElementById(
                "referenceSampleNotes"
            )?.value.trim() || "";


        if (!groupId) {

            alert(
                "Please select a reference group."
            );

            return;
        }


        if (!name) {

            alert(
                "Reference sample name is required."
            );

            return;
        }


        let frequencyResponse = null;

        if (responseText) {

            try {

                frequencyResponse =
                    JSON.parse(
                        responseText
                    );

            } catch {

                alert(
                    "Frequency Response JSON is not valid JSON."
                );

                return;
            }

        }


        let scanSettings = null;

        if (settingsText) {

            try {

                scanSettings =
                    JSON.parse(
                        settingsText
                    );

            } catch {

                alert(
                    "Scan Settings JSON is not valid JSON."
                );

                return;
            }

        }


        const payload = {

            reference_group_id:
                groupId,

            name,

            material:
                material || null,

            description:
                notes || null,

            f0,

            rms,

            bandwidth,

            q,

            source_type:
                "manual",

            device_id:
                null,

            scan_settings:
                scanSettings,

            frequency_response:
                frequencyResponse,

            version:
                1,

            created_by:
                currentUser.id

        };


        const {
            error
        } = await db
            .from("reference_samples")
            .insert(payload);


        if (error) {
            throw error;
        }


        alert(
            "Reference sample saved successfully."
        );


        await loadDashboardCounts();

        await openReferenceManagement();


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
   DELETE REFERENCE SAMPLE
================================================================ */

async function deleteReference(
    referenceId
) {

    if (!isAdmin()) {
        return;
    }


    if (!confirm(
        "Delete this reference sample?\n\nThis action cannot be undone."
    )) {
        return;
    }


    try {

        const {
            error
        } = await db
            .from("reference_samples")
            .delete()
            .eq("id", referenceId);


        if (error) {
            throw error;
        }


        await loadDashboardCounts();

        await openReferenceManagement();


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


        if (!devices?.length) {

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
                ${escapeHtml(
                    error.message ||
                    "Unable to load devices."
                )}
            </p>

        `);

    }

}


/* ================================================================
   PATIENT SCAN
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


        if (!devices?.length) {

            alert(
                "No scanner device is registered."
            );

            return;
        }


        const patientResult =
            await db
                .from("patients")
                .select("*")
                .eq("id", patientId)
                .single();


        if (patientResult.error) {
            throw patientResult.error;
        }


        const patient =
            patientResult.data;


        const onlineDevices =
            devices.filter(
                device =>
                    device.status === "online"
            );


        const selectedDevice =
            onlineDevices[0] ||
            devices[0];


        await openPatientScanConfiguration(
            patient,
            selectedDevice
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
   PATIENT SCAN CONFIGURATION
================================================================ */

async function openPatientScanConfiguration(
    patient,
    selectedDevice
) {

    const html = `

        <h2>Patient Scan</h2>

        <div class="welcome-panel">

            <h3>
                ${escapeHtml(
                    patient.name
                )}
            </h3>

            <p>
                Patient Code:
                <strong>
                    ${escapeHtml(
                        patient.patient_code
                    )}
                </strong>
            </p>

            <p>
                Scanner:
                <strong>
                    ${escapeHtml(
                        selectedDevice.device_code
                    )}
                </strong>
            </p>

        </div>

        <form
            id="patientScanConfigurationForm"
            class="app-form"
        >

            <label>
                Bone
            </label>

            <select
                id="patientScanBone"
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
                id="patientScanSide"
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

            <div class="welcome-panel">

                <p>
                    Select the actual bone and side where
                    the sensor head will be placed.
                </p>

            </div>

            <div class="button-row">

                <button
                    type="submit"
                    class="primary-button"
                >
                    Send Scan Request
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
        .getElementById(
            "patientScanConfigurationForm"
        )
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const bone =
                    document.getElementById(
                        "patientScanBone"
                    )?.value || "";

                const side =
                    document.getElementById(
                        "patientScanSide"
                    )?.value || "";


                await createPatientScanRequest(
                    patient,
                    selectedDevice,
                    bone,
                    side
                );

            }
        );

}


async function createPatientScanRequest(
    patient,
    selectedDevice,
    bone,
    side
) {

    if (!bone || !side) {

        alert(
            "Please select both bone and arm side."
        );

        return;
    }


    try {

        const {
            data: request,
            error
        } = await db
            .from("scan_requests")
            .insert({

                device_id:
                    selectedDevice.id,

                patient_id:
                    patient.id,

                operator_id:
                    currentUser.id,

                status:
                    "pending",

                requested_at:
                    new Date().toISOString(),

                bone,

                side

            })
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
            "Create scan request error:",
            error
        );

        alert(
            error.message ||
            "Unable to create scanner request."
        );

    }

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
            .is("deleted_at", null)
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


        if (!patients?.length) {

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
                    Continue
                </button>

            </form>

        `;


        showContent(html);


        document
            .getElementById("scanForm")
            ?.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    const patientId =
                        document.getElementById(
                            "scanPatientSelect"
                        )?.value;


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
                    error.message ||
                    "Unable to load patients."
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
                onclick="cancelScanRequest('${scanRequestId}')"
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
            .eq("id", scanRequestId)
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
            request.status === "completed"
        ) {

            stopScanMonitoring();


            showContent(`

                <div class="welcome-panel">

                    <h2>Scan Complete</h2>

                    <p>
                        The scanner has completed the measurement.
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
            request.status === "error"
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
            request.status === "cancelled"
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


function stopScanMonitoring() {

    if (scanMonitorTimer) {

        clearInterval(
            scanMonitorTimer
        );

        scanMonitorTimer = null;

    }

}


async function cancelScanRequest(
    scanRequestId
) {

    if (!confirm(
        "Cancel this scan request?"
    )) {
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
   PATIENT PORTAL
================================================================ */

async function handlePatientLogin(
    event
) {

    event.preventDefault();


    const code =
        document.getElementById(
            "patientCode"
        )?.value.trim() || "";


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


    if (!measurements?.length) {

        measurementContainer.innerHTML =
            "<p>No measurements available.</p>";

    } else {

        let html = `

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
            `<p>${escapeHtml(body)}</p>`;

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
        String(
            currentProfile.role
        ).toLowerCase() === "admin"
    );

}


function isOperator() {

    return Boolean(
        currentProfile &&
        String(
            currentProfile.role
        ).toLowerCase() === "operator"
    );

}


function isStaff() {

    return (
        isAdmin() ||
        isOperator()
    );

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

        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "—";
        }


        return date.toLocaleString();

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


function capitalize(
    value
) {

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


function isSelectedSex(
    existing,
    expected
) {

    if (!existing) {
        return "";
    }


    const normalized =
        String(existing)
            .toLowerCase();


    return normalized === expected
        ? "selected"
        : "";

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
================================================================ */

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

window.openOperatorManagement =
    openOperatorManagement;

window.deleteOperatorAccount =
    deleteOperatorAccount;

window.openMeasurementManagement =
    openMeasurementManagement;

window.openReferenceManagement =
    openReferenceManagement;

window.openReferenceGroupForm =
    openReferenceGroupForm;

window.saveReferenceGroup =
    saveReferenceGroup;

window.viewReferenceGroup =
    viewReferenceGroup;

window.deleteReferenceGroup =
    deleteReferenceGroup;

window.openReferenceSampleForm =
    openReferenceSampleForm;

window.saveReferenceSample =
    saveReferenceSample;

window.deleteReference =
    deleteReference;

window.openDeviceManagement =
    openDeviceManagement;

window.startPatientScan =
    startPatientScan;

window.openPatientScanConfiguration =
    openPatientScanConfiguration;

window.createPatientScanRequest =
    createPatientScanRequest;

window.openNewPatientScan =
    openNewPatientScan;

window.monitorScanRequest =
    monitorScanRequest;

window.cancelScanRequest =
    cancelScanRequest;

window.showModal =
    showModal;

window.closeModal =
    closeModal;

window.showDashboard =
    showDashboard;

window.showLoginPage =
    showLoginPage;

window.showPatientPortal =
    showPatientPortal;

window.showCreateAccountPage =
    showCreateAccountPage;
