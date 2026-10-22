
package com.meetingroom;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class BookingServer {

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(
            new InetSocketAddress(8081), 0
        );

        server.createContext("/api/rooms", exchange -> {
            addCors(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                send(exchange, 204, "");
                return;
            }
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                send(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }

            try (Connection con = DBConnection.getConnection();
                 PreparedStatement ps = con.prepareStatement(
                     "SELECT room_id,room_name,location,capacity,status FROM meeting_rooms");
                 ResultSet rs = ps.executeQuery()) {

                StringBuilder json = new StringBuilder("[");
                while (rs.next()) {
                    if (json.length() > 1) json.append(",");
                    json.append("{")
                        .append("\"room_id\":").append(rs.getInt("room_id")).append(",")
                        .append("\"room_name\":\"").append(escape(rs.getString("room_name"))).append("\",")
                        .append("\"location\":\"").append(escape(rs.getString("location"))).append("\",")
                        .append("\"capacity\":").append(rs.getInt("capacity")).append(",")
                        .append("\"status\":\"").append(escape(rs.getString("status"))).append("\"}");
                }
                json.append("]");
                send(exchange, 200, json.toString());
            } catch (Exception e) {
                e.printStackTrace();
                send(exchange, 500, "{\"error\":\"Could not load rooms\"}");
            }
        });

        server.createContext("/api/bookings", exchange -> {
            addCors(exchange);
            String method = exchange.getRequestMethod();

            if ("OPTIONS".equalsIgnoreCase(method)) {
                send(exchange, 204, "");
                return;
            }

            try {
                if ("GET".equalsIgnoreCase(method)) {
                    try (Connection con = DBConnection.getConnection();
                         PreparedStatement ps = con.prepareStatement(
                             "SELECT b.booking_id,b.room_id,b.booking_date," +
                             "b.start_time,b.end_time,b.meeting_title,b.attendees," +
                             "b.purpose,r.room_name " +
                             "FROM bookings b JOIN meeting_rooms r ON b.room_id=r.room_id " +
                             "ORDER BY b.booking_id DESC");
                         ResultSet rs = ps.executeQuery()) {

                        StringBuilder json = new StringBuilder("[");
                        while (rs.next()) {
                            if (json.length() > 1) json.append(",");
                            json.append("{")
                                .append("\"booking_id\":").append(rs.getInt("booking_id")).append(",")
                                .append("\"room_id\":").append(rs.getInt("room_id")).append(",")
                                .append("\"room_name\":\"").append(escape(rs.getString("room_name"))).append("\",")
                                .append("\"booking_date\":\"").append(rs.getDate("booking_date")).append("\",")
                                .append("\"start_time\":\"").append(rs.getTime("start_time")).append("\",")
                                .append("\"end_time\":\"").append(rs.getTime("end_time")).append("\",")
                                .append("\"meeting_title\":\"").append(escape(rs.getString("meeting_title"))).append("\",")
                                .append("\"attendees\":").append(rs.getInt("attendees")).append(",")
                                .append("\"purpose\":\"").append(escape(rs.getString("purpose"))).append("\"}");
                        }
                        json.append("]");
                        send(exchange, 200, json.toString());
                    }
                } else if ("POST".equalsIgnoreCase(method)) {
                    String body = new String(
                        exchange.getRequestBody().readAllBytes(),
                        StandardCharsets.UTF_8
                    );

                    int roomId = Integer.parseInt(field(body, "room_id"));
                    String date = field(body, "booking_date");
                    String start = field(body, "start_time");
                    String end = field(body, "end_time");
                    String title = field(body, "meeting_title");
                    String attendeesText = field(body, "attendees");
                    String purpose = field(body, "purpose");

                    if (title.isBlank() || date.isBlank() || start.isBlank()
                        || end.isBlank() || attendeesText.isBlank()) {
                        send(exchange, 400, "{\"error\":\"Please fill all required fields\"}");
                        return;
                    }

                    LocalDate bookingDate = LocalDate.parse(date);
                    LocalTime startTime = LocalTime.parse(start);
                    LocalTime endTime = LocalTime.parse(end);
                    int attendees = Integer.parseInt(attendeesText);

                    if (!endTime.isAfter(startTime) || attendees < 1) {
                        send(exchange, 400, "{\"error\":\"Check meeting times and attendee count\"}");
                        return;
                    }

                    try (Connection con = DBConnection.getConnection()) {
                        // Demo user for this project
                        int userId;
                        try (PreparedStatement user = con.prepareStatement(
                            "SELECT user_id FROM users LIMIT 1");
                             ResultSet ur = user.executeQuery()) {
                            if (ur.next()) {
                                userId = ur.getInt("user_id");
                            } else {
                                try (PreparedStatement addUser = con.prepareStatement(
                                    "INSERT INTO users (user_name,email,phone) VALUES (?,?,?)",
                                    Statement.RETURN_GENERATED_KEYS)) {
                                    addUser.setString(1, "Demo User");
                                    addUser.setString(2, "demo@meetingroom.local");
                                    addUser.setString(3, "0000000000");
                                    addUser.executeUpdate();
                                    try (ResultSet keys = addUser.getGeneratedKeys()) {
                                        keys.next();
                                        userId = keys.getInt(1);
                                    }
                                }
                            }
                        }

                        // Reject overlapping bookings for the same room
                        try (PreparedStatement check = con.prepareStatement(
                            "SELECT COUNT(*) FROM bookings WHERE room_id=? AND booking_date=? " +
                            "AND start_time < ? AND end_time > ?")) {
                            check.setInt(1, roomId);
                            check.setDate(2, Date.valueOf(bookingDate));
                            check.setTime(3, Time.valueOf(endTime));
                            check.setTime(4, Time.valueOf(startTime));
                            try (ResultSet cr = check.executeQuery()) {
                                cr.next();
                                if (cr.getInt(1) > 0) {
                                    send(exchange, 409, "{\"error\":\"Room is already booked for that time\"}");
                                    return;
                                }
                            }
                        }

                        try (PreparedStatement ps = con.prepareStatement(
                            "INSERT INTO bookings " +
                            "(user_id,room_id,booking_date,start_time,end_time,meeting_title,attendees,purpose) " +
                            "VALUES (?,?,?,?,?,?,?,?)",
                            Statement.RETURN_GENERATED_KEYS)) {
                            ps.setInt(1, userId);
                            ps.setInt(2, roomId);
                            ps.setDate(3, Date.valueOf(bookingDate));
                            ps.setTime(4, Time.valueOf(startTime));
                            ps.setTime(5, Time.valueOf(endTime));
                            ps.setString(6, title);
                            ps.setInt(7, attendees);
                            ps.setString(8, purpose);
                            ps.executeUpdate();

                            try (ResultSet keys = ps.getGeneratedKeys()) {
                                keys.next();
                                send(exchange, 201,
                                    "{\"message\":\"Booking created\",\"booking_id\":" +
                                    keys.getInt(1) + "}");
                            }
                        }
                    }
                } else {
                    send(exchange, 405, "{\"error\":\"Method not allowed\"}");
                }
            } catch (Exception e) {
                e.printStackTrace();
                send(exchange, 400, "{\"error\":\"Booking request failed. Check fields and database schema.\"}");
            }
        });

        server.start();
        System.out.println("Booking server running at http://localhost:8081");
    }

    private static String field(String json, String key) {
        Matcher m = Pattern.compile(
            "\"" + Pattern.quote(key) + "\"\\s*:\\s*(?:\"([^\"]*)\"|(\\d+))"
        ).matcher(json);
        if (!m.find()) return "";
        return m.group(1) != null ? m.group(1) : m.group(2);
    }

    private static void addCors(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    private static void send(HttpExchange exchange, int status, String body)
        throws IOException {
        addCors(exchange);
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private static String escape(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r");
    }
}
