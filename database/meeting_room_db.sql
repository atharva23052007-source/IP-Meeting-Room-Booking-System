
CREATE DATABASE IF NOT EXISTS meeting_room_db;
USE meeting_room_db;

CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    user_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS meeting_rooms (
    room_id INT PRIMARY KEY AUTO_INCREMENT,
    room_name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(100),
    capacity INT NOT NULL,
    status VARCHAR(30) DEFAULT 'Available'
);

CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    meeting_title VARCHAR(200) NOT NULL,
    attendees INT NOT NULL,
    purpose VARCHAR(500),
    status VARCHAR(30) DEFAULT 'Booked',
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (room_id) REFERENCES meeting_rooms(room_id),
    CHECK (attendees > 0),
    CHECK (end_time > start_time)
);

INSERT IGNORE INTO meeting_rooms
    (room_name, location, capacity, status)
VALUES
    ('Meeting Room A', 'Floor 1', 6, 'Available'),
    ('Meeting Room B', 'Floor 2', 10, 'Available'),
    ('Meeting Room C', 'Floor 2', 15, 'Available'),
    ('Meeting Room D', 'Floor 3', 20, 'Available');
