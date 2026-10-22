
const API = "http://localhost:8081/api";

let rooms = [];
let bookings = [];
let selectedRoom = null;

const content = document.getElementById("content");

async function getData(endpoint) {
    const response = await fetch(`${API}/${endpoint}`);

    if (!response.ok) {
        throw new Error("Server request failed");
    }

    return response.json();
}

async function loadData() {
    try {
        rooms = await getData("rooms");
        bookings = await getData("bookings");
    } catch (error) {
        console.error("Unable to load data:", error);
        rooms = [];
        bookings = [];
    }
}

function showPage(page) {
    const titles = {
        dashboard: "Dashboard",
        rooms: "Rooms",
        book: "Book a Room",
        bookings: "My Bookings",
        history: "Booking History"
    };

    document.getElementById("breadcrumb").textContent =
        titles[page] || "Dashboard";

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === page
        );
    });

    if (page === "dashboard") renderDashboard();
    else if (page === "rooms") renderRooms();
    else if (page === "book") renderBookingForm();
    else if (page === "bookings") renderBookings(false);
    else if (page === "history") renderBookings(true);
}

function renderDashboard() {
    const today = new Date().toLocaleDateString("en-CA");

    const todaysBookings = bookings.filter(b =>
        String(b.booking_date).slice(0, 10) === today
    );

    const upcoming = bookings.filter(b =>
        String(b.booking_date).slice(0, 10) >= today &&
        String(b.status || "").toLowerCase() !== "cancelled"
    );

    content.innerHTML = `
        <h1>Dashboard</h1>
        <p>A clear view of your meeting spaces and plans.</p>

        <div class="room-grid">
            <div class="room-card">
                <h2>Total rooms</h2>
                <h1>${rooms.length}</h1>
                <p>Meeting spaces</p>
            </div>

            <div class="room-card">
                <h2>Available now</h2>
                <h1>${rooms.filter(r =>
                    String(r.status).toLowerCase() === "available"
                ).length}</h1>
                <p>Ready to reserve</p>
            </div>

            <div class="room-card">
                <h2>Today's bookings</h2>
                <h1>${todaysBookings.length}</h1>
                <p>Reservations for today</p>
            </div>

            <div class="room-card">
                <h2>Upcoming</h2>
                <h1>${upcoming.length}</h1>
                <p>Future reservations</p>
            </div>
        </div>

        <h2>Coming up</h2>

        ${upcoming.length
            ? upcoming.slice(0, 3).map(b => bookingCard(b)).join("")
            : "<p>No upcoming meetings.</p>"
        }

        <button onclick="showPage('rooms')">View Rooms</button>
        <button onclick="showPage('book')">+ Book a Room</button>
    `;
}

function renderRooms() {
    content.innerHTML = `
        <h1>Meeting Rooms</h1>
        <p>Choose a space for your next meeting.</p>

        <div class="room-grid">
            ${rooms.map(room => `
                <div class="room-card">
                    <h2>${escapeHTML(room.room_name)}</h2>
                    <p>${escapeHTML(room.location || "")}</p>
                    <p>Capacity: ${room.capacity}</p>
                    <p>Status: ${escapeHTML(room.status || "Available")}</p>

                    <button
                        onclick="startBooking(${Number(room.room_id)})"
                        ${String(room.status).toLowerCase() !== "available"
                            ? "disabled" : ""}>
                        Book this room
                    </button>
                </div>
            `).join("")}
        </div>
    `;
}

function startBooking(roomId) {
    selectedRoom = Number(roomId);
    showPage("book");
}

function renderBookingForm() {
    content.innerHTML = `
        <h1>Book a Meeting Room</h1>

        <form id="bookingForm" class="room-card">
            <label>Meeting title</label>
            <input name="meeting_title"
                   required maxlength="100"
                   placeholder="Project Discussion">

            <label>Room</label>
            <select name="room_id" id="roomSelect" required>
                ${rooms.map(r => `
                    <option value="${r.room_id}"
                        ${Number(selectedRoom) === Number(r.room_id)
                            ? "selected" : ""}
                        ${String(r.status).toLowerCase() !== "available"
                            ? "disabled" : ""}>
                        ${escapeHTML(r.room_name)}
                        — Capacity: ${r.capacity}
                    </option>
                `).join("")}
            </select>

            <p id="capacityInfo"></p>

            <label>Date</label>
            <input type="date" name="booking_date"
                   min="${new Date().toLocaleDateString("en-CA")}"
                   required>

            <label>Start time</label>
            <input type="time" name="start_time" required>

            <label>End time</label>
            <input type="time" name="end_time" required>

            <label>Number of attendees</label>
            <input type="number" name="attendees"
                   min="1" step="1" required>

            <label>Purpose</label>
            <textarea name="purpose"
                      maxlength="250"
                      placeholder="Meeting purpose"></textarea>

            <button type="submit">Confirm Booking</button>
        </form>

        <p id="bookingMessage"></p>
    `;

    const roomSelect = document.getElementById("roomSelect");
    const attendeesInput =
        document.querySelector('[name="attendees"]');

    function checkCapacity() {
        const room = rooms.find(r =>
            Number(r.room_id) === Number(roomSelect.value)
        );

        const info = document.getElementById("capacityInfo");

        if (!room) {
            info.textContent = "Please select a valid room.";
            return;
        }

        info.textContent =
            `Selected room capacity: ${room.capacity} people.`;

        if (attendeesInput.value &&
            Number(attendeesInput.value) > Number(room.capacity)) {
            info.textContent +=
                ` Too many attendees! Choose a larger room.`;
        }
    }

    roomSelect.addEventListener("change", checkCapacity);
    attendeesInput.addEventListener("input", checkCapacity);
    checkCapacity();

    document.getElementById("bookingForm").addEventListener(
        "submit", submitBooking
    );
}

async function submitBooking(event) {
    event.preventDefault();

    const form = new FormData(event.target);
    const data = Object.fromEntries(form.entries());

    data.room_id = Number(data.room_id);
    data.attendees = Number(data.attendees);
    data.user_id = 1;

    const message = document.getElementById("bookingMessage");

    // Validate selected room.
    const room = rooms.find(r =>
        Number(r.room_id) === data.room_id
    );

    if (!room) {
        message.textContent = "Please select a valid meeting room.";
        return;
    }

    // Validate room availability.
    if (String(room.status).toLowerCase() !== "available") {
        message.textContent =
            "This room is currently unavailable. Select another room.";
        return;
    }

    // Validate attendee count against room capacity.
    if (!Number.isInteger(data.attendees) || data.attendees < 1) {
        message.textContent =
            "Enter a valid attendee count of at least 1.";
        return;
    }

    if (data.attendees > Number(room.capacity)) {
        message.textContent =
            `Booking rejected! ${room.room_name} accommodates only ` +
            `${room.capacity} people. You entered ${data.attendees}. ` +
            "Please select a larger room or reduce the attendees.";
        return;
    }

    // Validate meeting times.
    if (data.end_time <= data.start_time) {
        message.textContent =
            "End time must be later than start time.";
        return;
    }

    // Validate booking date.
    const today = new Date().toLocaleDateString("en-CA");

    if (data.booking_date < today) {
        message.textContent = "Please select today or a future date.";
        return;
    }

    try {
        message.textContent = "Saving booking...";

        const response = await fetch(`${API}/bookings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "The server rejected the booking."
            );
        }

        await loadData();
        showPage("bookings");
    } catch (error) {
        message.textContent = "Booking failed: " + error.message;
    }
}

function bookingCard(b) {
    return `
        <div class="room-card">
            <h2>${escapeHTML(b.meeting_title || "Meeting")}</h2>
            <p>Room: ${escapeHTML(
                b.room_name || "Room " + b.room_id
            )}</p>
            <p>Date: ${escapeHTML(
                String(b.booking_date || "").slice(0, 10)
            )}</p>
            <p>Time: ${escapeHTML(String(b.start_time || ""))}
                - ${escapeHTML(String(b.end_time || ""))}</p>
            <p>Attendees: ${escapeHTML(b.attendees ?? "")}</p>
            <p>Purpose: ${escapeHTML(b.purpose || "")}</p>
            <p>Status: ${escapeHTML(b.status || "Booked")}
                | ID: ${escapeHTML(b.booking_id)}</p>
        </div>
    `;
}

function renderBookings(history) {
    const list = history
        ? bookings
        : bookings.filter(b =>
            String(b.status || "").toLowerCase() !== "cancelled"
        );

    content.innerHTML = `
        <h1>${history ? "Booking History" : "My Bookings"}</h1>

        <p>${history
            ? "View all recorded meeting reservations."
            : "View your meeting reservations."
        }</p>

        ${list.length
            ? list.map(b => bookingCard(b)).join("")
            : "<p>No bookings found.</p>"
        }

        <button onclick="showPage('book')">Book a Room</button>
    `;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function initialize() {
    await loadData();
    showPage("dashboard");
}

// Login is initialized by auth.js after the page loads.
loadData();
