/* ================================================================
   ACOUSTIC BONE SCANNER
   Main application JavaScript

   Supabase client:
       window.supabaseClient

   No auth.js is required.
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
            () => openPatientManagement()
        );
    }


    const measurementCard =
        document.getElementById("measurementCard");

    if (measurementCard) {
        measurementCard.addEventListener(
            "click",
            () => openMeasurementManagement()
        );
    }


    const referenceCard =
        document.getElementById("referenceCard");

    if (referenceCard) {
        referenceCard.addEventListener(
            "click",
            () => openReferenceManagement()
        );
    }


    const deviceCard =
        document.getElementById("deviceCard");

    if (deviceCard) {
        deviceCard.addEventListener(
            "click",
            () => openDeviceManagement()
        );
    }


    const operatorCard =
        document.getElementById("operatorCard");

    if (operatorCard) {
        operatorCard.addEventListener(
            "click",
            () => openOperatorManagement()
        );
    }


    const adminPatientsButton =
        document.getElementById(
            "adminPatientsButton"
        );

    if (adminPatientsButton) {
        adminPatientsButton.addEventListener(
            "click",
            () => openPatientManagement()
        );
    }


    const adminMeasurementsButton =
        document.getElementById(
            "adminMeasurementsButton"
        );

    if (adminMeasurementsButton) {
        adminMeasurementsButton.addEventListener(
            "click",
            () => openMeasurementManagement()
        );
    }


    const adminReferencesButton =
        document.getElementById(
            "adminReferencesButton"
        );

    if (adminReferencesButton) {
        adminReferencesButton.addEventListener(
            "click",
            () => openReferenceManagement()
        );
    }


    const adminDevicesButton =
        document.getElementById(
            "adminDevicesButton"
        );

    if (adminDevicesButton) {
        adminDevicesButton.addEventListener(
            "click",
            () => openDeviceManagement()
        );
    }


    const adminOperatorsButton =
        document.getElementById(
            "adminOperatorsButton"
        );

    if (adminOperatorsButton) {
        adminOperatorsButton.addEventListener(
            "click",
            () => openOperatorManagement()
        );
    }


    const operatorPatientsButton =
        document.getElementById(
            "operatorPatientsButton"
        );

    if (operatorPatientsButton) {
        operatorPatientsButton.addEventListener(
            "click",
            () => openPatientManagement()
        );
    }


    const operatorMeasurementsButton =
        document.getElementById(
            "operatorMeasurementsButton"
        );

    if (operatorMeasurementsButton) {
        operatorMeasurementsButton.addEventListener(
            "click",
            () => openMeasurementManagement()
        );
    }


    const newPatientScanButton =
        document.getElementById(
            "newPatientScanButton"
        );

    if (newPatientScanButton) {
        newPatientScanButton.addEventListener(
            "click",
            () => openNewPatientScan()
        );
    }


    const operatorPatientCard =
        document.getElementById(
            "operatorPatientCard"
        );

    if (operatorPatientCard) {
        operatorPatientCard.addEventListener(
            "click",
            () => openPatientManagement()
        );
    }


    const operatorMeasurementCard =
        document.getElementById(
            "operatorMeasurementCard"
        );

    if (operatorMeasurementCard) {
        operatorMeasurementCard.addEventListener(
            "click",
            () => openMeasurementManagement()
        );
    }


    const scannerCard =
        document.getElementById("scannerCard");

    if (scannerCard) {
        scannerCard.addEventListener(
            "click",
            () => openNewPatientScan()
        );
    }

}


/* ================================================================
   INITIALIZE APPLICATION
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

    console.log("LOGIN BUTTON CLICKED");


    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");


    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


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


        if (!data || !data.user) {

            throw new Error(
                "Login succeeded but no user was returned."
            );
        }


        currentUser =
            data.user;


        console.log(
            "Logged in user:",
            currentUser
        );


        await loadCurrentProfile();


        if (!currentProfile) {

            await db.auth.signOut();

            currentUser = null;

            throw new Error(
                "No profile was found for this account."
            );
        }


        console.log(
            "User profile:",
            currentProfile
        );


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
        ).value.trim();


    const email =
        document.getElementById(
            "createEmail"
        ).value.trim();


    const password =
        document.getElementById(
            "createPassword"
        ).value;


    const passwordConfirm =
        document.getElementById(
            "createPasswordConfirm"
        ).value;


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
                    name: name,
                    role: "operator"
                }
            }

        });


        if (error) {
            throw error;
        }


        /*
         * If email confirmation is disabled,
         * Supabase returns a session immediately.
         *
         * In that case create the operator profile.
         */

        if (data.session && data.user) {

            const {
                error: profileError
            } = await db
                .from("profiles")
                .upsert({
                    id: data.user.id,
                    name: name,
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


            document.getElementById(
                "createAccountForm"
            ).reset();


        } else {

            message.textContent =
                "Account created. Check your email to confirm your account, then contact the administrator if your operator profile is not created automatically.";

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

    try {

        if (scanMonitorTimer) {
            clearInterval(scanMonitorTimer);
            scanMonitorTimer = null;
        }


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

    const patientCodeInput =
        document.getElementById(
            "patientCode"
        );

    if (patientCodeInput) {
        patientCodeInput.value = "";
    }


    showPatientPortal();

}


/* ================================================================
   PAGE NAVIGATION
================================================================ */

function hideAllPages() {

    const pages = [
        "loginPage",
        "createAccountPage",
        "dashboardPage",
        "patientPage",
        "patientResultsPage"
    ];


    pages.forEach(id => {

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
        message.className = "message";
    }

}


function showCreateAccountPage() {

    hideAllPages();

    document
        .getElementById(
            "createAccountPage"
        )
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


    if (adminDashboard) {
        adminDashboard.classList.add("hidden");
    }


    if (operatorDashboard) {
        operatorDashboard.classList.add("hidden");
    }


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

        if (adminDashboard) {
            adminDashboard.classList.remove("hidden");
        }

    } else if (role === "operator") {

        if (operatorDashboard) {
            operatorDashboard.classList.remove("hidden");
        }

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

        /*
         * Patients
         */

        const {
            count: patientCount,
            error: patientError
        } = await db
            .from("patients")
            .select("*", {
                count: "exact",
                head: true
            });


        if (patientError) {
            throw patientError;
        }


        setText(
            "patientCount",
            patientCount ?? 0
        );


        setText(
            "operatorPatientCount",
            patientCount ?? 0
        );


        /*
         * Measurements
         */

        const {
            count: measurementCount,
            error: measurementError
        } = await db
            .from("measurements")
            .select("*", {
                count: "exact",
                head: true
            });


        if (measurementError) {
            throw measurementError;
        }


        setText(
            "measurementCount",
            measurementCount ?? 0
        );


        setText(
            "operatorMeasurementCount",
            measurementCount ?? 0
        );


        /*
         * Admin-only counts
         */

        if (
            currentProfile &&
            currentProfile.role === "admin"
        ) {

            const {
                count: referenceCount,
                error: referenceError
            } = await db
                .from("reference_samples")
                .select("*", {
                    count: "exact",
                    head: true
                });


            if (referenceError) {
                console.error(
                    "Reference count error:",
                    referenceError
                );
            }


            setText(
                "referenceCount",
                referenceCount ?? 0
            );


            const {
                count: deviceCount,
                error: deviceError
            } = await db
                .from("devices")
                .select("*", {
                    count: "exact",
                    head: true
                });


            if (deviceError) {
                console.error(
                    "Device count error:",
                    deviceError
                );
            }


            setText(
                "deviceCount",
                deviceCount ?? 0
            );


            /*
             * Operators
             */

            const {
                count: operatorCount,
                error: operatorError
            } = await db
                .from("profiles")
                .select("*", {
                    count: "exact",
                    head: true
                })
                .eq("role", "operator");


            if (operatorError) {
                console.error(
                    "Operator count error:",
                    operatorError
                );
            }


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


        if (!patients || patients.length === 0) {

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
                ${escapeHtml(error.message)}
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


    const form =
        document.getElementById(
            "patientForm"
        );


    form.addEventListener(
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
            ).value;


        const name =
            document.getElementById(
                "patientNameInput"
            ).value.trim();


        const ageValue =
            document.getElementById(
                "patientAgeInput"
            ).value;


        const sex =
            document.getElementById(
                "patientSexInput"
            ).value;


        const phone =
            document.getElementById(
                "patientPhoneInput"
            ).value.trim();


        const email =
            document.getElementById(
                "patientEmailInput"
            ).value.trim();


        const heightValue =
            document.getElementById(
                "patientHeightInput"
            ).value;


        const weightValue =
            document.getElementById(
                "patientWeightInput"
            ).value;


        const notes =
            document.getElementById(
                "patientNotesInput"
            ).value.trim();


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

            /*
             * Patient code is generated locally.
             * It is intentionally random enough for
             * the patient portal.
             */

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
                                m.q_factor
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

        /*
         * Soft delete is used if deleted_at exists.
         */

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
                                operator.role || "operator"
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


    if (operatorId === currentUser?.id) {

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

        /*
         * Secure database-side function.
         *
         * The function itself checks that the caller
         * is an administrator and that the target is
         * an operator.
         */

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
                                m.q_factor
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
   REFERENCE SAMPLES
================================================================ */

async function openReferenceManagement() {

    if (!isAdmin()) {

        showContent(`
            <h2>Access Denied</h2>
            <p>Only administrators can manage reference samples.</p>
        `);

        return;
    }


    try {

        const {
            data: references,
            error
        } = await db
            .from("reference_samples")
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
                    <h2>Reference Samples</h2>
                    <p>
                        Device/reference measurements.
                    </p>
                </div>

                <button
                    class="primary-button"
                    onclick="openReferenceForm()"
                >
                    + Add Reference
                </button>

            </div>

        `;


        if (
            !references ||
            references.length === 0
        ) {

            html += `
                <p>No reference samples found.</p>
            `;

        } else {

            html += `

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>
                                <th>Name</th>
                                <th>Material</th>
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


            references.forEach(reference => {

                html += `

                    <tr>

                        <td>
                            ${escapeHtml(
                                reference.name || "—"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                reference.material || "—"
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                reference.f0
                            )} Hz
                        </td>

                        <td>
                            ${formatNumber(
                                reference.rms
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                reference.bandwidth
                            )} Hz
                        </td>

                        <td>
                            ${formatNumber(
                                reference.q_factor ??
                                reference.q
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                reference.created_at
                            )}
                        </td>

                        <td>

                            <button
                                class="danger-button"
                                onclick="deleteReference('${reference.id}')"
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

            <h2>Reference Samples</h2>

            <p class="error-text">
                ${escapeHtml(
                    error.message ||
                    "Unable to load reference samples."
                )}
            </p>

        `);

    }

}


/* ================================================================
   REFERENCE FORM
================================================================ */

function openReferenceForm() {

    if (!isAdmin()) {
        return;
    }


    const html = `

        <h2>Add Reference Sample</h2>

        <form
            id="referenceForm"
            class="app-form"
        >

            <label>
                Reference Name
            </label>

            <input
                type="text"
                id="referenceName"
                required
                placeholder="Example: Bone Phantom 1"
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
                Notes
            </label>

            <textarea
                id="referenceNotes"
                rows="4"
            ></textarea>


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
            "referenceForm"
        )
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await saveReference();

            }
        );

}


async function saveReference() {

    try {

        const reference = {

            name:
                document.getElementById(
                    "referenceName"
                ).value.trim(),

            description:
                document.getElementById(
                    "referenceDescription"
                ).value.trim() || null,

            material:
                document.getElementById(
                    "referenceMaterial"
                ).value.trim() || null,

            f0:
                getNumberOrNull(
                    "referenceF0"
                ),

            rms:
                getNumberOrNull(
                    "referenceRMS"
                ),

            bandwidth:
                getNumberOrNull(
                    "referenceBandwidth"
                ),

            q:
                getNumberOrNull(
                    "referenceQ"
                ),

            notes:
                document.getElementById(
                    "referenceNotes"
                ).value.trim() || null,

            created_by:
                currentUser.id

        };


        if (!reference.name) {

            alert(
                "Reference name is required."
            );

            return;
        }


        const {
            error
        } = await db
            .from("reference_samples")
            .insert(reference);


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
            "Save reference error:",
            error
        );

        alert(
            error.message ||
            "Unable to save reference sample."
        );

    }

}


/* ================================================================
   DELETE REFERENCE
================================================================ */

async function deleteReference(referenceId) {

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


        let selectedDevice =
            onlineDevices[0] ||
            devices[0];


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


        const confirmed =
            confirm(
                `Start acoustic scan for:\n\n` +
                `${patient.name}\n` +
                `Patient Code: ${patient.patient_code}\n\n` +
                `Device: ${selectedDevice.device_code}`
            );


        if (!confirmed) {
            return;
        }


        /*
         * Create scan request.
         *
         * The ESP32 online mode will poll
         * scan_requests for pending requests.
         */

        const {
            data: request,
            error
        } = await db
            .from("scan_requests")
            .insert({

                device_id:
                    selectedDevice.id,

                patient_id:
                    patientId,

                operator_id:
                    currentUser.id,

                status:
                    "pending",

                requested_at:
                    new Date().toISOString()

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
                    Start Scanner Request
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

    if (scanMonitorTimer) {

        clearInterval(
            scanMonitorTimer
        );

        scanMonitorTimer = null;

    }


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
   PATIENT PORTAL
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

        /*
         * Secure RPC.
         *
         * patient_login should return only the
         * patient represented by the supplied code
         * and that patient's measurements.
         */

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


        /*
         * Supabase may return a single object
         * or an array depending on the RPC.
         */

        let patientData =
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
                            m.q_factor
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

function showContent(html) {

    const dashboardContent =
        document.getElementById(
            "dashboardContent"
        );


    const contentArea =
        document.getElementById(
            "contentArea"
        );


    if (!dashboardContent ||
        !contentArea) {
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


    modalTitle.textContent =
        title;


    modalBody.innerHTML =
        `<p>${escapeHtml(
            body
        )}</p>`;


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


    function randomPart(length) {

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
   Required because HTML buttons use onclick.
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

window.openReferenceForm =
    openReferenceForm;

window.saveReference =
    saveReference;

window.deleteReference =
    deleteReference;

window.openDeviceManagement =
    openDeviceManagement;

window.startPatientScan =
    startPatientScan;

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
