
package com.meetingroom;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DBConnection {

    private static final String URL =
            "jdbc:mysql://localhost:3306/meeting_room_db";

    private static final String USER = "root";

    // Replace this with the password you set for MySQL.
  private static final String PASSWORD = System.getenv("DB_PASSWORD");

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }

    public static void main(String[] args) {
        try (Connection connection = getConnection()) {
            System.out.println("MySQL connection successful!");
        } catch (SQLException e) {
            System.out.println("MySQL connection failed!");
            e.printStackTrace();
        }
    }
}
