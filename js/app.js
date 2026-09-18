/* ============================================================
   ACOUSTIC BONE SCANNER
   MAIN APPLICATION

   All website logic is contained in this file.

   Requires:
   - config.js
   - Supabase JS CDN

   config.js must create:

   window.supabaseClient
   ============================================================ */


/* ============================================================
   SUPABASE
   ============================================================ */

const db = window.supabaseClient;

if (!db) {
    console.error(
        "Supabase client was not found."
    );
}


/* ============================================================
   GLOBAL STATE
   ============================================================ */

let currentUser = null;
let currentProfile = null;
let patientPortalData = null;
let scanMonitorTimer = null;


/* ============================================================
   BASIC HELPERS
   ============================================================ */

function $(id) {
    return document.getElementById(id);
}


function showPage(pageId) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.add("hidden");

        });


    const page = $(pageId);

    if (page) {
        page.classList.remove("hidden");
    }

}


function showMessage(
    elementId,
    message,
    type = ""
) {

    const element = $(elementId);

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className = "message";

    if (type) {
        element.classList.add(type);
    }

}


function escapeHtml(value) {

    if (value === null ||
        value === undefined) {

        return "";

    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatDate(value) {

    if (!value) {
        return "—";
    }

    try {

        return new Date(value)
            .toLocaleString();

    } catch {

        return value;

    }

}


function isAdmin() {

    return currentProfile?.role === "admin";

}


function isOperator() {

    return currentProfile?.role === "operator";

}


/* ============================================================
   AUTHENTICATION
   ============================================================ */

async function loginUser(
    email,
    password
) {

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


    return data.user;

}


async function logoutUser() {

    const {
        error
    } = await db.auth.signOut();


    if (error) {
        throw error;
    }

}


async function getCurrentUser() {

    const {
        data: {
            user
        }
    } = await db.auth.getUser();


    return user;

}


async function getCurrentProfile() {

    const user =
        await getCurrentUser();


    if (!user) {
        return null;
    }


    const {
        data,
        error
    } = await db
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();


    if (error) {
        throw error;
    }


    return data;

}


/* ============================================================
   CREATE ACCOUNT
   ============================================================ */

async function createAccount(
    name,
    email,
    password
) {

    const {
        data,
        error
    } = await db.auth.signUp({

        email,
        password,

        options: {

            data: {
                name: name
            }

        }

    });


    if (error) {
        throw error;
    }


    return data;

}


/* ============================================================
   LOGIN HANDLER
   ============================================================ */

async function handleLogin(event) {

    event.preventDefault();


    const email =
        $("email")?.value.trim();

    const password =
        $("password")?.value;


    if (!email || !password) {

        showMessage(
            "loginMessage",
            "Please enter email and password.",
            "error"
        );

        return;

    }


    showMessage(
        "loginMessage",
        "Logging in..."
    );


    try {

        currentUser =
            await loginUser(
                email,
                password
            );


        currentProfile =
            await getCurrentProfile();


        if (!currentProfile) {

            showMessage(
                "loginMessage",
                "Account exists but no profile was found. Please contact the administrator.",
                "error"
            );

            await logoutUser();

            currentUser = null;

            return;

        }


        showMessage(
            "loginMessage",
            "Login successful.",
            "success"
        );


        await openDashboard();


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        showMessage(
            "loginMessage",
            error?.message ||
            "Login failed.",
            "error"
        );

    }

}


/* ============================================================
   CREATE ACCOUNT HANDLER
   ============================================================ */

async function handleCreateAccount(event) {

    event.preventDefault();


    const name =
        $("createName")?.value.trim();

    const email =
        $("createEmail")?.value.trim();

    const password =
        $("createPassword")?.value;

    const confirmPassword =
        $("createPasswordConfirm")?.value;


    if (!name ||
        !email ||
        !password ||
        !confirmPassword) {

        showMessage(
            "createAccountMessage",
            "Please complete all fields.",
            "error"
        );

        return;

    }


    if (password !== confirmPassword) {

        showMessage(
            "createAccountMessage",
            "Passwords do not match.",
            "error"
        );

        return;

    }


    if (password.length < 6) {

        showMessage(
            "createAccountMessage",
            "Password must contain at least 6 characters.",
            "error"
        );

        return;

    }


    showMessage(
        "createAccountMessage",
        "Creating account..."
    );


    try {

        const data =
            await createAccount(
                name,
                email,
                password
            );


        /*
         * If Supabase email confirmation is enabled,
         * the user must confirm the email first.
         */

        if (
            data.user &&
            !data.session
        ) {

            showMessage(
                "createAccountMessage",
                "Account created. Please check your email and confirm your account before logging in.",
                "success"
            );

            return;

        }


        /*
         * If email confirmation is disabled,
         * we can create a profile.
         *
         * New accounts are deliberately not
         * automatically made admin.
         */

        if (data.user) {

            const {
                error
            } = await db
                .from("profiles")
                .insert({

                    id: data.user.id,

                    name: name,

                    role: "operator"

                });


            if (error) {

                console.error(
                    "PROFILE CREATION ERROR:",
                    error
                );

                showMessage(
                    "createAccountMessage",
                    "Account was created, but the profile could not be created. Contact the administrator.",
                    "error"
                );

                return;

            }

        }


        showMessage(
            "createAccountMessage",
            "Account created successfully. You can now log in.",
            "success"
        );


        setTimeout(() => {

            showPage("loginPage");

            $("email").value =
                email;

        }, 1200);


    } catch (error) {

        console.error(
            "CREATE ACCOUNT ERROR:",
            error
        );


        showMessage(
            "createAccountMessage",
            error?.message ||
            "Unable to create account.",
            "error"
        );

    }

}


/* ============================================================
   DASHBOARD
   ============================================================ */

async function openDashboard() {

    showPage(
        "dashboardPage"
    );


    updateDashboardForRole();


    await loadDashboardCounts();


    setupDashboardCards();


    updateSystemStatus();

}


/* ============================================================
   ROLE DISPLAY
   ============================================================ */

function updateDashboardForRole() {

    const title =
        $("dashboardTitle");

    const userInfo =
        $("userInfo");


    if (title) {

        if (isAdmin()) {

            title.textContent =
                "Administrator Dashboard";

        } else if (isOperator()) {

            title.textContent =
                "Operator Dashboard";

        } else {

            title.textContent =
                "Dashboard";

        }

    }


    if (userInfo) {

        const name =
            currentProfile?.name ||
            currentUser?.email ||
            "";

        const role =
            currentProfile?.role ||
            "unknown";


        userInfo.textContent =
            `${name} • ${role}`;

    }


    /*
     * Admin-only elements
     */

    document
        .querySelectorAll(".admin-only")
        .forEach(element => {

            if (isAdmin()) {

                element.classList.remove(
                    "hidden"
                );

            } else {

                element.classList.add(
                    "hidden"
                );

            }

        });

}


/* ============================================================
   DASHBOARD COUNTS
   ============================================================ */

async function loadDashboardCounts() {

    try {

        const patients =
            await db
                .from("patients")
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true
                    }
                );


        const measurements =
            await db
                .from("measurements")
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true
                    }
                );


        if ($("patientCount")) {

            $("patientCount").textContent =
                patients.count ?? 0;

        }


        if ($("measurementCount")) {

            $("measurementCount").textContent =
                measurements.count ?? 0;

        }


        if (isAdmin()) {

            const references =
                await db
                    .from("reference_samples")
                    .select(
                        "id",
                        {
                            count: "exact",
                            head: true
                        }
                    );


            const devices =
                await db
                    .from("devices")
                    .select(
                        "id",
                        {
                            count: "exact",
                            head: true
                        }
                    );


            if ($("referenceCount")) {

                $("referenceCount").textContent =
                    references.count ?? 0;

            }


            if ($("deviceCount")) {

                $("deviceCount").textContent =
                    devices.count ?? 0;

            }

        }


    } catch (error) {

        console.error(
            "DASHBOARD COUNT ERROR:",
            error
        );

    }

}


/* ============================================================
   SYSTEM STATUS
   ============================================================ */

function updateSystemStatus() {

    const status =
        $("systemStatus");


    if (!status) {
        return;
    }


    if (db) {

        status.textContent =
            "Connected to Supabase.";

    } else {

        status.textContent =
            "Supabase connection unavailable.";

    }

}


/* ============================================================
   DASHBOARD CARD EVENTS
   ============================================================ */

function setupDashboardCards() {

    const patientCard =
        $("patientCard");

    const measurementCard =
        $("measurementCard");

    const referenceCard =
        $("referenceCard");

    const deviceCard =
        $("deviceCard");


    if (patientCard) {

        patientCard.onclick =
            openPatientManagement;

        patientCard.style.cursor =
            "pointer";

    }


    if (measurementCard) {

        measurementCard.onclick =
            openMeasurementManagement;

        measurementCard.style.cursor =
            "pointer";

    }


    if (referenceCard &&
        isAdmin()) {

        referenceCard.onclick =
            openReferenceManagement;

        referenceCard.style.cursor =
            "pointer";

    }


    if (deviceCard &&
        isAdmin()) {

        deviceCard.onclick =
            openDeviceManagement;

        deviceCard.style.cursor =
            "pointer";

    }


    const newPatientButton =
        $("newPatientButton");

    if (newPatientButton) {

        newPatientButton.onclick =
            openNewPatientForm;

    }


    const scanPatientButton =
        $("scanPatientButton");

    if (scanPatientButton) {

        scanPatientButton.onclick =
            openPatientScan;

    }


    const viewMeasurementsButton =
        $("viewMeasurementsButton");

    if (viewMeasurementsButton) {

        viewMeasurementsButton.onclick =
            openMeasurementManagement;

    }


    const referenceButton =
        $("referenceButton");

    if (referenceButton &&
        isAdmin()) {

        referenceButton.onclick =
            openReferenceManagement;

    }


    const deviceButton =
        $("deviceButton");

    if (deviceButton &&
        isAdmin()) {

        deviceButton.onclick =
            openDeviceManagement;

    }

}


/* ============================================================
   PATIENT MANAGEMENT
   ============================================================ */

async function openPatientManagement() {

    showContentArea(
        "Loading patients..."
    );


    try {

        const {
            data,
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

                <h3>
                    Patient Management
                </h3>

                <button
                    class="primary-button"
                    onclick="openNewPatientForm()">

                    + New Patient

                </button>

            </div>

        `;


        if (!data ||
            data.length === 0) {

            html += `
                <p>
                    No patients found.
                </p>
            `;

            showContentArea(html);

            return;

        }


        html += `

            <div class="table-container">

            <table>

                <thead>

                    <tr>

                        <th>
                            Code
                        </th>

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
                            Created
                        </th>

                        <th>
                            Actions
                        </th>

                    </tr>

                </thead>

                <tbody>

        `;


        data.forEach(patient => {

            html += `

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
                            patient.age
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            patient.sex
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            patient.created_at
                        )}
                    </td>

                    <td>

                        <button
                            class="secondary-button small"
                            onclick="viewPatient('${patient.id}')">

                            View

                        </button>

                        <button
                            class="secondary-button small"
                            onclick="editPatient('${patient.id}')">

                            Edit

                        </button>

                        <button
                            class="danger-button small"
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


        showContentArea(html);


    } catch (error) {

        console.error(
            "PATIENT LOAD ERROR:",
            error
        );


        showContentArea(`

            <p class="error-text">

                Unable to load patients:
                ${escapeHtml(
                    error.message
                )}

            </p>

        `);

    }

}


/* ============================================================
   NEW PATIENT
   ============================================================ */

function openNewPatientForm() {

    openModal(`

        <h2>
            Create New Patient
        </h2>


        <form id="newPatientForm">

            <label>
                Patient Code
            </label>

            <input
                id="newPatientCode"
                placeholder="K7F9-X2PQ-81"
                required>


            <label>
                Name
            </label>

            <input
                id="newPatientName"
                required>


            <label>
                Age
            </label>

            <input
                type="number"
                id="newPatientAge"
                min="0"
                max="150">


            <label>
                Sex
            </label>

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


            <label>
                Phone
            </label>

            <input
                id="newPatientPhone">


            <label>
                Email
            </label>

            <input
                type="email"
                id="newPatientEmail">


            <label>
                Height
            </label>

            <input
                type="number"
                id="newPatientHeight">


            <label>
                Weight
            </label>

            <input
                type="number"
                id="newPatientWeight">


            <label>
                Notes
            </label>

            <textarea
                id="newPatientNotes">
            </textarea>


            <button
                type="submit"
                class="primary-button">

                Create Patient

            </button>

        </form>

    `);


    const form =
        $("newPatientForm");


    if (form) {

        form.addEventListener(
            "submit",
            createPatient
        );

    }

}


/* ============================================================
   CREATE PATIENT
   ============================================================ */

async function createPatient(event) {

    event.preventDefault();


    try {

        const patient = {

            patient_code:
                $("newPatientCode").value.trim(),

            name:
                $("newPatientName").value.trim(),

            age:
                $("newPatientAge").value
                    ? Number(
                        $("newPatientAge").value
                    )
                    : null,

            sex:
                $("newPatientSex").value ||
                null,

            phone:
                $("newPatientPhone").value.trim() ||
                null,

            email:
                $("newPatientEmail").value.trim() ||
                null,

            height:
                $("newPatientHeight").value
                    ? Number(
                        $("newPatientHeight").value
                    )
                    : null,

            weight:
                $("newPatientWeight").value
                    ? Number(
                        $("newPatientWeight").value
                    )
                    : null,

            notes:
                $("newPatientNotes").value.trim() ||
                null,

            created_by:
                currentUser.id

        };


        const {
            error
        } = await db
            .from("patients")
            .insert(patient);


        if (error) {
            throw error;
        }


        closeModal();

        await loadDashboardCounts();

        await openPatientManagement();


    } catch (error) {

        alert(
            "Unable to create patient: " +
            error.message
        );

    }

}


/* ============================================================
   VIEW PATIENT
   ============================================================ */

async function viewPatient(id) {

    try {

        const {
            data,
            error
        } = await db
            .from("patients")
            .select("*")
            .eq("id", id)
            .single();


        if (error) {
            throw error;
        }


        openModal(`

            <h2>
                Patient Details
            </h2>

            <p>
                <strong>Patient Code:</strong>
                ${escapeHtml(
                    data.patient_code
                )}
            </p>

            <p>
                <strong>Name:</strong>
                ${escapeHtml(
                    data.name
                )}
            </p>

            <p>
                <strong>Age:</strong>
                ${escapeHtml(
                    data.age
                )}
            </p>

            <p>
                <strong>Sex:</strong>
                ${escapeHtml(
                    data.sex
                )}
            </p>

            <p>
                <strong>Phone:</strong>
                ${escapeHtml(
                    data.phone
                )}
            </p>

            <p>
                <strong>Email:</strong>
                ${escapeHtml(
                    data.email
                )}
            </p>

            <p>
                <strong>Height:</strong>
                ${escapeHtml(
                    data.height
                )}
            </p>

            <p>
                <strong>Weight:</strong>
                ${escapeHtml(
                    data.weight
                )}
            </p>

            <p>
                <strong>Notes:</strong>
                ${escapeHtml(
                    data.notes
                )}
            </p>

        `);


    } catch (error) {

        alert(
            "Unable to load patient: " +
            error.message
        );

    }

}


/* ============================================================
   EDIT PATIENT
   ============================================================ */

async function editPatient(id) {

    try {

        const {
            data,
            error
        } = await db
            .from("patients")
            .select("*")
            .eq("id", id)
            .single();


        if (error) {
            throw error;
        }


        openModal(`

            <h2>
                Edit Patient
            </h2>


            <form id="editPatientForm">

                <label>
                    Patient Code
                </label>

                <input
                    id="editPatientCode"
                    value="${escapeHtml(
                        data.patient_code
                    )}"
                    required>


                <label>
                    Name
                </label>

                <input
                    id="editPatientName"
                    value="${escapeHtml(
                        data.name
                    )}"
                    required>


                <label>
                    Age
                </label>

                <input
                    type="number"
                    id="editPatientAge"
                    value="${escapeHtml(
                        data.age ?? ""
                    )}">


                <label>
                    Sex
                </label>

                <input
                    id="editPatientSex"
                    value="${escapeHtml(
                        data.sex ?? ""
                    )}">


                <label>
                    Phone
                </label>

                <input
                    id="editPatientPhone"
                    value="${escapeHtml(
                        data.phone ?? ""
                    )}">


                <label>
                    Email
                </label>

                <input
                    type="email"
                    id="editPatientEmail"
                    value="${escapeHtml(
                        data.email ?? ""
                    )}">


                <label>
                    Height
                </label>

                <input
                    type="number"
                    id="editPatientHeight"
                    value="${escapeHtml(
                        data.height ?? ""
                    )}">


                <label>
                    Weight
                </label>

                <input
                    type="number"
                    id="editPatientWeight"
                    value="${escapeHtml(
                        data.weight ?? ""
                    )}">


                <label>
                    Notes
                </label>

                <textarea
                    id="editPatientNotes">${escapeHtml(
                        data.notes ?? ""
                    )}</textarea>


                <button
                    type="submit"
                    class="primary-button">

                    Save Changes

                </button>

            </form>

        `);


        $("editPatientForm")
            .addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    const updates = {

                        patient_code:
                            $("editPatientCode")
                                .value.trim(),

                        name:
                            $("editPatientName")
                                .value.trim(),

                        age:
                            $("editPatientAge")
                                .value
                                ? Number(
                                    $("editPatientAge")
                                        .value
                                )
                                : null,

                        sex:
                            $("editPatientSex")
                                .value.trim() ||
                            null,

                        phone:
                            $("editPatientPhone")
                                .value.trim() ||
                            null,

                        email:
                            $("editPatientEmail")
                                .value.trim() ||
                            null,

                        height:
                            $("editPatientHeight")
                                .value
                                ? Number(
                                    $("editPatientHeight")
                                        .value
                                )
                                : null,

                        weight:
                            $("editPatientWeight")
                                .value
                                ? Number(
                                    $("editPatientWeight")
                                        .value
                                )
                                : null,

                        notes:
                            $("editPatientNotes")
                                .value.trim() ||
                            null

                    };


                    const {
                        error
                    } = await db
                        .from("patients")
                        .update(updates)
                        .eq("id", id);


                    if (error) {

                        alert(
                            "Update failed: " +
                            error.message
                        );

                        return;

                    }


                    closeModal();

                    await openPatientManagement();

                    await loadDashboardCounts();

                }

            );


    } catch (error) {

        alert(
            "Unable to edit patient: " +
            error.message
        );

    }

}


/* ============================================================
   DELETE PATIENT
   ============================================================ */

async function deletePatient(id) {

    if (
        !confirm(
            "Delete this patient and their stored information?"
        )
    ) {

        return;

    }


    try {

        const {
            error
        } = await db
            .from("patients")
            .delete()
            .eq("id", id);


        if (error) {
            throw error;
        }


        await openPatientManagement();

        await loadDashboardCounts();


    } catch (error) {

        alert(
            "Unable to delete patient: " +
            error.message
        );

    }

}


/* ============================================================
   MEASUREMENTS
   ============================================================ */

async function openMeasurementManagement() {

    showContentArea(
        "Loading measurements..."
    );


    try {

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
            );


        if (error) {
            throw error;
        }


        let html = `

            <div class="content-header">

                <h3>
                    Measurements
                </h3>

            </div>

        `;


        if (!data ||
            data.length === 0) {

            html += `
                <p>
                    No measurements available.
                </p>
            `;

            showContentArea(html);

            return;

        }


        html += `

            <div class="table-container">

            <table>

                <thead>

                    <tr>

                        <th>
                            Frequency
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

                        <th>
                            Device
                        </th>

                        <th>
                            Date
                        </th>

                    </tr>

                </thead>

                <tbody>

        `;


        data.forEach(row => {

            html += `

                <tr>

                    <td>
                        ${escapeHtml(
                            row.f0
                        )} Hz
                    </td>

                    <td>
                        ${escapeHtml(
                            row.rms
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            row.bandwidth
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            row.q_factor
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            row.device_id
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            row.created_at
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


        showContentArea(html);


    } catch (error) {

        showContentArea(`

            <p class="error-text">

                Unable to load measurements:
                ${escapeHtml(
                    error.message
                )}

            </p>

        `);

    }

}


/* ============================================================
   REFERENCE MANAGEMENT
   ============================================================ */

async function openReferenceManagement() {

    if (!isAdmin()) {

        alert(
            "Administrator access required."
        );

        return;

    }


    showContentArea(
        "Loading reference samples..."
    );


    try {

        const {
            data,
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

                <h3>
                    Reference Samples
                </h3>

                <button
                    class="primary-button"
                    onclick="openReferenceForm()">

                    + Add Reference

                </button>

            </div>

        `;


        if (!data ||
            data.length === 0) {

            html += `
                <p>
                    No reference samples found.
                </p>
            `;

        } else {

            html += `

                <div class="table-container">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Name
                            </th>

                            <th>
                                Material
                            </th>

                            <th>
                                f0
                            </th>

                            <th>
                                RMS
                            </th>

                            <th>
                                Q
                            </th>

                            <th>
                                BW
                            </th>

                            <th>
                                Actions
                            </th>

                        </tr>

                    </thead>

                    <tbody>

            `;


            data.forEach(row => {

                html += `

                    <tr>

                        <td>
                            ${escapeHtml(
                                row.name
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                row.material
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                row.f0
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                row.rms
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                row.q_factor
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                row.bandwidth
                            )}
                        </td>

                        <td>

                            <button
                                class="danger-button small"
                                onclick="deleteReference('${row.id}')">

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


        showContentArea(html);


    } catch (error) {

        showContentArea(`

            <p class="error-text">

                Unable to load reference samples:
                ${escapeHtml(
                    error.message
                )}

            </p>

        `);

    }

}


/* ============================================================
   MANUAL REFERENCE
   ============================================================ */

function openReferenceForm() {

    if (!isAdmin()) {
        return;
    }


    openModal(`

        <h2>
            Add Reference Sample
        </h2>


        <form id="referenceForm">

            <label>
                Name
            </label>

            <input
                id="referenceName"
                required>


            <label>
                Description
            </label>

            <textarea
                id="referenceDescription">
            </textarea>


            <label>
                Material
            </label>

            <input
                id="referenceMaterial">


            <label>
                Resonance Frequency (f0)
            </label>

            <input
                type="number"
                id="referenceF0">


            <label>
                RMS
            </label>

            <input
                type="number"
                step="any"
                id="referenceRms">


            <label>
                Bandwidth
            </label>

            <input
                type="number"
                step="any"
                id="referenceBandwidth">


            <label>
                Q Factor
            </label>

            <input
                type="number"
                step="any"
                id="referenceQ">


            <label>
                Notes
            </label>

            <textarea
                id="referenceNotes">
            </textarea>


            <button
                type="submit"
                class="primary-button">

                Save Reference

            </button>

        </form>

    `);


    $("referenceForm")
        .addEventListener(
            "submit",
            saveReference
        );

}


/* ============================================================
   SAVE REFERENCE
   ============================================================ */

async function saveReference(event) {

    event.preventDefault();


    try {

        const reference = {

            name:
                $("referenceName")
                    .value.trim(),

            description:
                $("referenceDescription")
                    .value.trim() ||
                null,

            material:
                $("referenceMaterial")
                    .value.trim() ||
                null,

            f0:
                $("referenceF0").value
                    ? Number(
                        $("referenceF0").value
                    )
                    : null,

            rms:
                $("referenceRms").value
                    ? Number(
                        $("referenceRms").value
                    )
                    : null,

            bandwidth:
                $("referenceBandwidth").value
                    ? Number(
                        $("referenceBandwidth").value
                    )
                    : null,

            q_factor:
                $("referenceQ").value
                    ? Number(
                        $("referenceQ").value
                    )
                    : null,

            notes:
                $("referenceNotes")
                    .value.trim() ||
                null,

            created_by:
                currentUser.id

        };


        const {
            error
        } = await db
            .from("reference_samples")
            .insert(reference);


        if (error) {
            throw error;
        }


        closeModal();

        await openReferenceManagement();

        await loadDashboardCounts();


    } catch (error) {

        alert(
            "Unable to save reference: " +
            error.message
        );

    }

}


/* ============================================================
   DELETE REFERENCE
   ============================================================ */

async function deleteReference(id) {

    if (!isAdmin()) {
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

        const {
            error
        } = await db
            .from("reference_samples")
            .delete()
            .eq("id", id);


        if (error) {
            throw error;
        }


        await openReferenceManagement();

        await loadDashboardCounts();


    } catch (error) {

        alert(
            "Unable to delete reference: " +
            error.message
        );

    }

}


/* ============================================================
   DEVICE MANAGEMENT
   ============================================================ */

async function openDeviceManagement() {

    if (!isAdmin()) {
        return;
    }


    showContentArea(
        "Loading devices..."
    );


    try {

        const {
            data,
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

                <h3>
                    Scanner Devices
                </h3>

            </div>

        `;


        if (!data ||
            data.length === 0) {

            html += `
                <p>
                    No scanner devices registered.
                </p>
            `;

        } else {

            html += `

                <div class="table-container">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Device Code
                            </th>

                            <th>
                                Name
                            </th>

                            <th>
                                Status
                            </th>

                            <th>
                                Firmware
                            </th>

                            <th>
                                Last Seen
                            </th>

                        </tr>

                    </thead>

                    <tbody>

            `;


            data.forEach(device => {

                html += `

                    <tr>

                        <td>
                            ${escapeHtml(
                                device.device_code
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                device.device_name
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                device.status
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                device.firmware_version
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


        showContentArea(html);


    } catch (error) {

        showContentArea(`

            <p class="error-text">

                Unable to load devices:
                ${escapeHtml(
                    error.message
                )}

            </p>

        `);

    }

}


/* ============================================================
   PATIENT SCAN
   ============================================================ */

async function openPatientScan() {

    showContentArea(
        "Loading patients..."
    );


    try {

        const {
            data,
            error
        } = await db
            .from("patients")
            .select(
                "id, patient_code, name"
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

            <h3>
                Start Patient Scan
            </h3>

            <p>
                Select a patient and scanner device.
            </p>


            <label>
                Patient
            </label>

            <select id="scanPatientSelect">

                <option value="">
                    Select patient
                </option>

        `;


        data.forEach(patient => {

            html += `

                <option
                    value="${escapeHtml(
                        patient.id
                    )}">

                    ${escapeHtml(
                        patient.name
                    )}
                    —
                    ${escapeHtml(
                        patient.patient_code
                    )}

                </option>

            `;

        });


        html += `

            </select>


            <br><br>


            <label>
                Scanner Device
            </label>

            <select id="scanDeviceSelect">

                <option value="">
                    Select device
                </option>

        `;


        const devices =
            await db
                .from("devices")
                .select(
                    "id, device_code, device_name, status"
                );


        if (!devices.error) {

            devices.data.forEach(device => {

                html += `

                    <option
                        value="${escapeHtml(
                            device.id
                        )}">

                        ${escapeHtml(
                            device.device_code
                        )}
                        —
                        ${escapeHtml(
                            device.device_name
                        )}

                    </option>

                `;

            });

        }


        html += `

            </select>


            <br><br>


            <button
                class="primary-button"
                onclick="createPatientScanRequest()">

                Start Scan

            </button>


            <div
                id="scanStatus"
                class="message">

            </div>

        `;


        showContentArea(html);


    } catch (error) {

        showContentArea(`

            <p class="error-text">

                Unable to prepare scan:
                ${escapeHtml(
                    error.message
                )}

            </p>

        `);

    }

}


/* ============================================================
   CREATE PATIENT SCAN REQUEST
   ============================================================ */

async function createPatientScanRequest() {

    const patientId =
        $("scanPatientSelect")?.value;

    const deviceId =
        $("scanDeviceSelect")?.value;


    if (!patientId ||
        !deviceId) {

        alert(
            "Select both patient and scanner device."
        );

        return;

    }


    try {

        const {
            data,
            error
        } = await db
            .from("scan_requests")
            .insert({

                device_id:
                    deviceId,

                patient_id:
                    patientId,

                operator_id:
                    currentUser.id,

                status:
                    "pending",

                requested_at:
                    new Date().toISOString()

            })
            .select()
            .single();


        if (error) {
            throw error;
        }


        showContentArea(`

            <h3>
                Scan Requested
            </h3>

            <p>
                Scan request created successfully.
            </p>

            <p>
                Request ID:
                <strong>
                    ${escapeHtml(
                        data.id
                    )}
                </strong>
            </p>

            <p id="scanMonitorText">
                Waiting for scanner...
            </p>

            <button
                class="secondary-button"
                onclick="openPatientScan()">

                Back

            </button>

        `);


        monitorScanRequest(
            data.id
        );


    } catch (error) {

        alert(
            "Unable to create scan request: " +
            error.message
        );

    }

}


/* ============================================================
   SCAN MONITOR
   ============================================================ */

function monitorScanRequest(
    requestId
) {

    if (scanMonitorTimer) {

        clearInterval(
            scanMonitorTimer
        );

    }


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
                        .eq("id", requestId)
                        .single();


                    if (error) {
                        throw error;
                    }


                    const statusText =
                        $("scanMonitorText");


                    if (statusText) {

                        statusText.textContent =
                            `Scanner status: ${data.status}`;

                    }


                    if (
                        data.status ===
                            "completed" ||
                        data.status ===
                            "error" ||
                        data.status ===
                            "cancelled"
                    ) {

                        clearInterval(
                            scanMonitorTimer
                        );

                        scanMonitorTimer =
                            null;


                        if (
                            data.status ===
                            "completed"
                        ) {

                            if (statusText) {

                                statusText.textContent =
                                    "Scan completed successfully.";

                            }

                        }

                    }


                } catch (error) {

                    console.error(
                        "SCAN MONITOR ERROR:",
                        error
                    );

                }

            },

            1000

        );

}


/* ============================================================
   PATIENT PORTAL
   ============================================================ */

async function handlePatientLogin(event) {

    event.preventDefault();


    const code =
        $("patientCode")
            ?.value
            .trim()
            .toUpperCase();


    if (!code) {

        showMessage(
            "patientLoginMessage",
            "Please enter your patient code.",
            "error"
        );

        return;

    }


    showMessage(
        "patientLoginMessage",
        "Checking patient code..."
    );


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


        if (!data) {

            showMessage(
                "patientLoginMessage",
                "Patient code not found.",
                "error"
            );

            return;

        }


        patientPortalData =
            data;


        showPatientResults(
            data
        );


    } catch (error) {

        console.error(
            "PATIENT LOGIN ERROR:",
            error
        );


        showMessage(
            "patientLoginMessage",
            error.message ||
            "Unable to access patient portal.",
            "error"
        );

    }

}


/* ============================================================
   PATIENT RESULTS
   ============================================================ */

function showPatientResults(data) {

    showPage(
        "patientResultsPage"
    );


    const patient =
        data.patient ||
        data;


    const measurements =
        data.measurements ||
        [];


    if ($("patientName")) {

        $("patientName").textContent =
            patient.name ||
            "";

    }


    if ($("patientDetails")) {

        $("patientDetails").innerHTML = `

            <p>
                <strong>
                    Patient Code:
                </strong>

                ${escapeHtml(
                    patient.patient_code
                )}

            </p>


            <p>
                <strong>
                    Name:
                </strong>

                ${escapeHtml(
                    patient.name
                )}

            </p>


            <p>
                <strong>
                    Age:
                </strong>

                ${escapeHtml(
                    patient.age
                )}

            </p>


            <p>
                <strong>
                    Sex:
                </strong>

                ${escapeHtml(
                    patient.sex
                )}

            </p>

        `;

    }


    if ($("patientMeasurements")) {

        if (
            !measurements ||
            measurements.length === 0
        ) {

            $("patientMeasurements")
                .innerHTML =
                    "<p>No measurements available.</p>";

            return;

        }


        let html = `

            <div class="table-container">

            <table>

                <thead>

                    <tr>

                        <th>
                            f0
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

                        <th>
                            Date
                        </th>

                    </tr>

                </thead>

                <tbody>

        `;


        measurements.forEach(row => {

            html += `

                <tr>

                    <td>
                        ${escapeHtml(
                            row.f0
                        )} Hz
                    </td>

                    <td>
                        ${escapeHtml(
                            row.rms
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            row.bandwidth
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            row.q_factor
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            row.created_at
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


        $("patientMeasurements")
            .innerHTML = html;

    }

}


/* ============================================================
   CONTENT AREA
   ============================================================ */

function showContentArea(html) {

    const panel =
        $("dashboardContent");

    const area =
        $("contentArea");


    if (!panel ||
        !area) {

        return;

    }


    panel.classList.remove(
        "hidden"
    );


    area.innerHTML = html;


    panel.scrollIntoView({
        behavior: "smooth"
    });

}


/* ============================================================
   MODAL
   ============================================================ */

function openModal(html) {

    const modal =
        $("modal");

    const body =
        $("modalBody");


    if (!modal ||
        !body) {

        return;

    }


    body.innerHTML =
        html;


    modal.classList.remove(
        "hidden"
    );

}


function closeModal() {

    const modal =
        $("modal");


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


/* ============================================================
   LOGOUT
   ============================================================ */

async function handleLogout() {

    try {

        await logoutUser();

    } catch (error) {

        console.error(
            "LOGOUT ERROR:",
            error
        );

    }


    currentUser = null;
    currentProfile = null;


    if (scanMonitorTimer) {

        clearInterval(
            scanMonitorTimer
        );

        scanMonitorTimer =
            null;

    }


    showPage(
        "loginPage"
    );


    const loginMessage =
        $("loginMessage");


    if (loginMessage) {

        loginMessage.textContent =
            "";

        loginMessage.className =
            "message";

    }

}


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Acoustic Bone Scanner app.js loaded."
        );


        /*
         * Login
         */

        const loginForm =
            $("loginForm");


        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                handleLogin
            );

        }


        /*
         * Create account
         */

        const createAccountButton =
            $("createAccountButton");


        if (createAccountButton) {

            createAccountButton.onclick =
                () => {

                    showPage(
                        "createAccountPage"
                    );

                };

        }


        const createAccountForm =
            $("createAccountForm");


        if (createAccountForm) {

            createAccountForm.addEventListener(
                "submit",
                handleCreateAccount
            );

        }


        const backFromCreateButton =
            $("backFromCreateButton");


        if (backFromCreateButton) {

            backFromCreateButton.onclick =
                () => {

                    showPage(
                        "loginPage"
                    );

                };

        }


        /*
         * Patient portal
         */

        const patientPortalButton =
            $("patientPortalButton");


        if (patientPortalButton) {

            patientPortalButton.onclick =
                () => {

                    showPage(
                        "patientPage"
                    );

                };

        }


        const patientLoginForm =
            $("patientLoginForm");


        if (patientLoginForm) {

            patientLoginForm.addEventListener(
                "submit",
                handlePatientLogin
            );

        }


        const backToLoginButton =
            $("backToLoginButton");


        if (backToLoginButton) {

            backToLoginButton.onclick =
                () => {

                    showPage(
                        "loginPage"
                    );

                };

        }


        /*
         * Logout
         */

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
                () => {

                    patientPortalData =
                        null;

                    showPage(
                        "patientPage"
                    );

                };

        }


        /*
         * Modal close
         */

        const modalClose =
            $("modalClose");


        if (modalClose) {

            modalClose.onclick =
                closeModal;

        }


        const modal =
            $("modal");


        if (modal) {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        modal
                    ) {

                        closeModal();

                    }

                }
            );

        }


        /*
         * Check existing session
         */

        try {

            currentUser =
                await getCurrentUser();


            if (currentUser) {

                try {

                    currentProfile =
                        await getCurrentProfile();


                    if (
                        currentProfile
                    ) {

                        await openDashboard();

                    }

                } catch (error) {

                    console.error(
                        "PROFILE LOAD ERROR:",
                        error
                    );

                }

            }

        } catch (error) {

            console.error(
                "SESSION CHECK ERROR:",
                error
            );

        }

    }
);


/* ============================================================
   SUPABASE AUTH STATE
   ============================================================ */

if (db) {

    db.auth.onAuthStateChange(
        async (
            event,
            session
        ) => {

            console.log(
                "AUTH EVENT:",
                event
            );


            if (
                event ===
                "SIGNED_OUT"
            ) {

                currentUser =
                    null;

                currentProfile =
                    null;

                showPage(
                    "loginPage"
                );

            }

        }
    );

}


/* ============================================================
   GLOBAL FUNCTIONS
   ============================================================ */

window.loginUser =
    loginUser;

window.logoutUser =
    logoutUser;

window.getCurrentUser =
    getCurrentUser;

window.getCurrentProfile =
    getCurrentProfile;

window.handleLogin =
    handleLogin;

window.handleCreateAccount =
    handleCreateAccount;

window.openDashboard =
    openDashboard;

window.openPatientManagement =
    openPatientManagement;

window.openNewPatientForm =
    openNewPatientForm;

window.viewPatient =
    viewPatient;

window.editPatient =
    editPatient;

window.deletePatient =
    deletePatient;

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

window.openPatientScan =
    openPatientScan;

window.createPatientScanRequest =
    createPatientScanRequest;

window.monitorScanRequest =
    monitorScanRequest;

window.closeModal =
    closeModal;
