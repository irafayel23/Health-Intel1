-- Create database if not exists
CREATE DATABASE IF NOT EXISTS health_intel;
USE health_intel;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  system_id VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  role ENUM('bhw', 'mho', 'admin', 'superadmin') NOT NULL,
  employee_hr_id VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  assigned_barangay VARCHAR(100),
  account_status ENUM('pending', 'approved', 'denied') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Health cases table
CREATE TABLE IF NOT EXISTS health_cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  patient_name VARCHAR(100) NOT NULL,
  age INT,
  purok VARCHAR(50),
  disease VARCHAR(100),
  remarks TEXT,
  sex VARCHAR(10),
  status VARCHAR(20) DEFAULT 'Active',
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Disease registry table
CREATE TABLE IF NOT EXISTS disease_registry (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  classification VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Active',
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- System audit logs table
CREATE TABLE IF NOT EXISTS system_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50),
  role VARCHAR(50),
  action VARCHAR(255),
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);