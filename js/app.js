const loginPage =
    document.getElementById("loginPage");

const dashboardPage =
    document.getElementById("dashboardPage");

const patientPage =
    document.getElementById("patientPage");

const patientResultsPage =
    document.getElementById("patientResultsPage");


function showPage(page) {

    [
        loginPage,
        dashboardPage,
        patientPage,
        patientResultsPage
    ].forEach(p => p.classList.add("hidden"));

    page.classList.remove("hidden");
}


/* =========================================================
   ADMIN / OPERATOR LOGIN
   ========================================================= */

document
    .getElementById("loginForm")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const message =
            document.getElementById("loginMessage");

        message.textContent = "Logging in...";

        try {

            await loginUser(email, password);

            await loadDashboard();

        } catch (error) {

            console.error(error);

            message.textContent =
                "Login failed. Check your email and password.";

        }

    });


/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {

    try {

        const profile =
            await getCurrentProfile();

        if (!profile) {

            showPage(loginPage);

            return;
        }

        document.getElementById("userInfo").textContent =
            `${profile.name || ""} • ${profile.role}`;

        if (profile.role === "admin") {

            document.getElementById("dashboardTitle")
                .textContent = "Admin Dashboard";

            await loadAdminDashboard();

        } else {

            document.getElementById("dashboardTitle")
                .textContent = "Operator Dashboard";

            document
                .querySelectorAll(".admin-only")
                .forEach(element =>
                    element.classList.add("hidden")
                );

            await loadOperatorDashboard();
        }

        showPage(dashboardPage);

    } catch (error) {

        console.error(error);

        alert("Unable to load dashboard.");

    }

}


async function loadAdminDashboard() {

    const [
        patients,
        measurements,
        references,
        devices
    ] = await Promise.all([

        supabaseClient
            .from("patients")
            .select("id", { count: "exact", head: true }),

        supabaseClient
            .from("measurements")
            .select("id", { count: "exact", head: true }),

        supabaseClient
            .from("reference_samples")
            .select("id", { count: "exact", head: true }),

        supabaseClient
            .from("devices")
            .select("id", { count: "exact", head: true })
    ]);

    document.getElementById("patientCount").textContent =
        patients.count ?? 0;

    document.getElementById("measurementCount").textContent =
        measurements.count ?? 0;

    document.getElementById("referenceCount").textContent =
        references.count ?? 0;

    document.getElementById("deviceCount").textContent =
        devices.count ?? 0;

    document.getElementById("systemStatus").textContent =
        "Supabase connection active.";
}


async function loadOperatorDashboard() {

    const patients =
        await supabaseClient
            .from("patients")
            .select("id", { count: "exact", head: true });

    const measurements =
        await supabaseClient
            .from("measurements")
            .select("id", { count: "exact", head: true });

    document.getElementById("patientCount").textContent =
        patients.count ?? 0;

    document.getElementById("measurementCount").textContent =
        measurements.count ?? 0;

    document.getElementById("systemStatus").textContent =
        "Supabase connection active.";
}


/* =========================================================
   LOGOUT
   ========================================================= */

document
    .getElementById("logoutButton")
    .addEventListener("click", async () => {

        try {

            await logoutUser();

            showPage(loginPage);

        } catch (error) {

            console.error(error);

        }

    });


/* =========================================================
   PATIENT PORTAL
   ========================================================= */

document
    .getElementById("patientPortalButton")
    .addEventListener("click", () => {

        showPage(patientPage);

    });


document
    .getElementById("backToLoginButton")
    .addEventListener("click", () => {

        showPage(loginPage);

    });


/* =========================================================
   PATIENT LOGIN
   ========================================================= */

document
    .getElementById("patientLoginForm")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        const code =
            document
                .getElementById("patientCode")
                .value
                .trim()
                .toUpperCase();

        const message =
            document.getElementById(
                "patientLoginMessage"
            );

        message.textContent =
            "Checking patient code...";

        try {

            const { data, error } =
                await supabaseClient.rpc(
                    "patient_login",
                    {
                        p_patient_code: code
                    }
                );

            if (error) {
                throw error;
            }

            if (!data || !data.success) {

                message.textContent =
                    "Invalid patient code.";

                return;
            }

            displayPatientResults(
                data.patient
            );

        } catch (error) {

            console.error(error);

            message.textContent =
                "Unable to access patient portal.";

        }

    });


function displayPatientResults(patient) {

    document.getElementById("patientName")
        .textContent = patient.name;

    document.getElementById("patientDetails")
        .innerHTML = `
            <p><strong>Name:</strong> ${escapeHtml(patient.name || "")}</p>
            <p><strong>Age:</strong> ${escapeHtml(patient.age ?? "")}</p>
            <p><strong>Sex:</strong> ${escapeHtml(patient.sex || "")}</p>
            <p><strong>Height:</strong> ${escapeHtml(patient.height ?? "")}</p>
            <p><strong>Weight:</strong> ${escapeHtml(patient.weight ?? "")}</p>
        `;

    const measurements =
        patient.measurements || [];

    if (measurements.length === 0) {

        document.getElementById(
            "patientMeasurements"
        ).textContent =
            "No measurements available.";

    } else {

        let html = `
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
                    <td>${escapeHtml(m.created_at || "")}</td>
                    <td>${escapeHtml(m.f0 ?? "N/A")}</td>
                    <td>${escapeHtml(m.rms ?? "N/A")}</td>
                    <td>${escapeHtml(m.bandwidth ?? "N/A")}</td>
                    <td>${escapeHtml(m.q_factor ?? "N/A")}</td>
                </tr>
            `;

        });

        html += `
                </tbody>
            </table>
        `;

        document.getElementById(
            "patientMeasurements"
        ).innerHTML = html;
    }

    showPage(patientResultsPage);
}


document
    .getElementById("patientLogoutButton")
    .addEventListener("click", () => {

        showPage(loginPage);

    });


/* =========================================================
   HTML SAFETY
   ========================================================= */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   STARTUP
   ========================================================= */

(async function initialize() {

    try {

        const user =
            await getCurrentUser();

        if (user) {

            await loadDashboard();

        } else {

            showPage(loginPage);

        }

    } catch (error) {

        console.error(error);

        showPage(loginPage);

    }

})();
