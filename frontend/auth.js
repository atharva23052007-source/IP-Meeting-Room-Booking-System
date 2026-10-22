
const DEMO_USER = {
    username: "atharva",
    password: "1234",
    name: "Atharva Pawar",
    email: "atharva1234@gmail.com",
    group: "C8",
    role: "Student"
};

function isLoggedIn() {
    return localStorage.getItem("meetingroom_demo_login") === "yes";
}

function showLogin() {
    document.querySelector(".sidebar").style.display = "none";
    document.querySelector(".main").style.marginLeft = "0";

    const topbar = document.querySelector(".topbar");
    topbar.style.display = "none";

    document.getElementById("content").innerHTML = `
        <div style="max-width:400px;margin:70px auto;background:white;
                    padding:35px;border:1px solid #e5ebe7;border-radius:12px">

            <h1 style="font-size:25px;margin-bottom:10px">
                Meeting Room Booking
            </h1>

            <p style="color:#87938c;margin-bottom:30px">
                Sign in to your workspace
            </p>

            <form id="loginForm">
                <label>Username</label>
                <input id="loginUsername" required
                       placeholder="Enter username">

                <label style="margin-top:18px">Password</label>
                <input id="loginPassword" type="password" required
                       placeholder="Enter password">

                <button class="primary-button" type="submit"
                        style="width:100%;margin-top:24px">
                    Login
                </button>
            </form>

            <p id="loginError" style="color:#b33;margin-top:15px"></p>

            <p style="color:#89958e;margin-top:25px;font-size:12px">
                Demo access: atharva / 1234
            </p>
        </div>
    `;

    document.getElementById("loginForm").addEventListener(
        "submit",
        function(event) {
            event.preventDefault();

            const username =
                document.getElementById("loginUsername").value.trim();

            const password =
                document.getElementById("loginPassword").value;

            if (username === DEMO_USER.username &&
                password === DEMO_USER.password) {

                localStorage.setItem("meetingroom_demo_login", "yes");
                showApplication();
            } else {
                document.getElementById("loginError").textContent =
                    "Invalid username or password.";
            }
        }
    );
}

function showApplication() {
    document.querySelector(".sidebar").style.display = "flex";
    document.querySelector(".main").style.marginLeft = "";
    document.querySelector(".topbar").style.display = "flex";

    showPage("dashboard");
}

function logout() {
    localStorage.removeItem("meetingroom_demo_login");
    showLogin();
}

function showProfile() {
    document.getElementById("breadcrumb").textContent = "My Profile";

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.remove("active");
    });

    document.getElementById("content").innerHTML = `
        <h1>My Profile</h1>
        <p class="subtitle">Demo account information</p>

        <div class="room-card" style="max-width:550px;margin-top:25px">
            <h2>${DEMO_USER.name}</h2>

            <p><strong>Username:</strong> ${DEMO_USER.username}</p>
            <p><strong>Email:</strong> ${DEMO_USER.email}</p>
            <p><strong>Role:</strong> ${DEMO_USER.role}</p>
            <p><strong>Group:</strong> ${DEMO_USER.group}</p>

            <button class="primary-button"
                    onclick="showPage('dashboard')">
                Back to Dashboard
            </button>
        </div>
    `;
}

function initializeAuth() {
    if (isLoggedIn()) {
        showApplication();
    } else {
        showLogin();
    }
}
