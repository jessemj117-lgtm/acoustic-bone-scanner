const db = window.supabaseClient;

console.log("app.js loaded");
console.log("Supabase client:", db);
console.log("loginUser:", typeof loginUser);

document.addEventListener("DOMContentLoaded", () => {

    console.log("DOM loaded");

    // =========================
    // LOGIN
    // =========================

    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");

    if (loginForm) {

        loginForm.addEventListener("submit", async (event) => {

            event.preventDefault();

            console.log("LOGIN BUTTON CLICKED");

            const email =
                document.getElementById("email").value.trim();

            const password =
                document.getElementById("password").value;

            loginMessage.textContent = "Logging in...";
            loginMessage.className = "message";

            try {

                // Use the existing auth.js function
                const user = await loginUser(email, password);

                console.log("Logged in user:", user);

                if (!user) {
                    throw new Error("Login failed. No user returned.");
                }

                // Get the user's profile
                const profile = await getCurrentProfile();

                console.log("User profile:", profile);

                if (!profile) {
                    throw new Error(
                        "Login successful, but no profile was found."
                    );
                }

                loginMessage.textContent = "Login successful.";
                loginMessage.className = "message success";

                // Hide login page
                document
                    .getElementById("loginPage")
                    .classList.add("hidden");

                // Show dashboard
                document
                    .getElementById("dashboardPage")
                    .classList.remove("hidden");

                // Dashboard information
                const dashboardTitle =
                    document.getElementById("dashboardTitle");

                const userInfo =
                    document.getElementById("userInfo");

                if (dashboardTitle) {
                    dashboardTitle.textContent =
                        profile.role === "admin"
                            ? "Admin Dashboard"
                            : "Operator Dashboard";
                }

                if (userInfo) {
                    userInfo.textContent =
                        `${profile.name || profile.email || email} • ${profile.role}`;
                }

                // Hide admin-only elements for operators
                if (profile.role !== "admin") {

                    document
                        .querySelectorAll(".admin-only")
                        .forEach(element => {
                            element.classList.add("hidden");
                        });

                }

            } catch (error) {

                console.error("LOGIN ERROR:", error);

                loginMessage.textContent =
                    error?.message || "Login failed.";

                loginMessage.className = "message error";
            }
        });
    }


    // =========================
    // LOGOUT
    // =========================

    const logoutButton =
        document.getElementById("logoutButton");

    if (logoutButton) {

        logoutButton.addEventListener("click", async () => {

            try {

                await logoutUser();

                document
                    .getElementById("dashboardPage")
                    .classList.add("hidden");

                document
                    .getElementById("loginPage")
                    .classList.remove("hidden");

                document
                    .getElementById("loginForm")
                    .reset();

                document
                    .getElementById("loginMessage")
                    .textContent = "";

            } catch (error) {

                console.error("LOGOUT ERROR:", error);

            }

        });
    }


    // =========================
    // PATIENT PORTAL
    // =========================

    const patientPortalButton =
        document.getElementById("patientPortalButton");

    const backToLoginButton =
        document.getElementById("backToLoginButton");

    if (patientPortalButton) {

        patientPortalButton.addEventListener("click", () => {

            document
                .getElementById("loginPage")
                .classList.add("hidden");

            document
                .getElementById("patientPage")
                .classList.remove("hidden");

        });
    }


    if (backToLoginButton) {

        backToLoginButton.addEventListener("click", () => {

            document
                .getElementById("patientPage")
                .classList.add("hidden");

            document
                .getElementById("loginPage")
                .classList.remove("hidden");

        });
    }


    // =========================
    // PATIENT LOGIN
    // =========================

    const patientLoginForm =
        document.getElementById("patientLoginForm");

    if (patientLoginForm) {

        patientLoginForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                const message =
                    document.getElementById(
                        "patientLoginMessage"
                    );

                const patientCode =
                    document
                        .getElementById("patientCode")
                        .value
                        .trim();

                message.textContent =
                    "Checking patient code...";

                try {

                    const { data, error } =
                        await db.rpc(
                            "patient_login",
                            {
                                p_patient_code: patientCode
                            }
                        );

                    if (error) {
                        throw error;
                    }

                    if (!data || data.length === 0) {

                        message.textContent =
                            "Invalid patient code.";

                        message.className =
                            "message error";

                        return;
                    }

                    const patient = data[0];

                    console.log(
                        "Patient login:",
                        patient
                    );

                    document
                        .getElementById("patientPage")
                        .classList.add("hidden");

                    document
                        .getElementById("patientResultsPage")
                        .classList.remove("hidden");

                    displayPatientResults(patient);

                } catch (error) {

                    console.error(
                        "PATIENT LOGIN ERROR:",
                        error
                    );

                    message.textContent =
                        error?.message ||
                        "Unable to access patient results.";

                    message.className =
                        "message error";
                }
            }
        );
    }


    // =========================
    // PATIENT LOGOUT
    // =========================

    const patientLogoutButton =
        document.getElementById(
            "patientLogoutButton"
        );

    if (patientLogoutButton) {

        patientLogoutButton.addEventListener(
            "click",
            () => {

                document
                    .getElementById("patientResultsPage")
                    .classList.add("hidden");

                document
                    .getElementById("loginPage")
                    .classList.remove("hidden");

                document
                    .getElementById("patientCode")
                    .value = "";

            }
        );
    }

});


function displayPatientResults(patient) {

    const patientName =
        document.getElementById("patientName");

    const patientDetails =
        document.getElementById("patientDetails");

    const patientMeasurements =
        document.getElementById("patientMeasurements");

    if (patientName) {
        patientName.textContent =
            patient.name || "Patient";
    }

    if (patientDetails) {

        patientDetails.innerHTML = `
            <p><strong>Patient Code:</strong>
                ${escapeHtml(patient.patient_code || "")}
            </p>

            <p><strong>Name:</strong>
                ${escapeHtml(patient.name || "")}
            </p>

            <p><strong>Age:</strong>
                ${escapeHtml(patient.age ?? "")}
            </p>

            <p><strong>Sex:</strong>
                ${escapeHtml(patient.sex || "")}
            </p>
        `;
    }

    if (patientMeasurements) {

        const measurements =
            patient.measurements || [];

        if (!measurements.length) {

            patientMeasurements.textContent =
                "No measurements available.";

            return;
        }

        patientMeasurements.innerHTML =
            measurements.map(measurement => `
                <div class="measurement">

                    <p>
                        <strong>Frequency:</strong>
                        ${escapeHtml(measurement.f0 ?? "—")} Hz
                    </p>

                    <p>
                        <strong>RMS:</strong>
                        ${escapeHtml(measurement.rms ?? "—")}
                    </p>

                    <p>
                        <strong>Bandwidth:</strong>
                        ${escapeHtml(measurement.bandwidth ?? "—")} Hz
                    </p>

                    <p>
                        <strong>Q Factor:</strong>
                        ${escapeHtml(measurement.q_factor ?? "—")}
                    </p>

                </div>
            `).join("");
    }
}


function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
