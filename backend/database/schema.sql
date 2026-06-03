-- ================================================
--  InternUG — Uganda Internship Management System
--  Database Schema
--  Run this in phpMyAdmin SQL tab
-- ================================================

CREATE DATABASE IF NOT EXISTS `internship_management`;
USE `internship_management`;

-- ── Users ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  email         VARCHAR(255)  UNIQUE NOT NULL,
  password      VARCHAR(255)  NOT NULL,
  role          ENUM('student','company','admin') NOT NULL,
  institution   VARCHAR(255)  DEFAULT NULL,
  company_name  VARCHAR(255)  DEFAULT NULL,
  location      VARCHAR(255)  DEFAULT NULL,
  is_active     BOOLEAN       DEFAULT TRUE,
  reset_token   VARCHAR(64)   DEFAULT NULL,
  reset_expires DATETIME      DEFAULT NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ── Password Reset columns (run if upgrading an existing DB) ──
-- ALTER TABLE users ADD COLUMN reset_token   VARCHAR(64) DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN reset_expires DATETIME   DEFAULT NULL;

-- ── Internships ───────────────────────────────────
CREATE TABLE IF NOT EXISTS internships (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(255)  NOT NULL,
  description   TEXT,
  duration      VARCHAR(100),
  stipend       VARCHAR(100),
  requirements  TEXT,
  company_id    INT,
  status        ENUM('open','closed') DEFAULT 'open',
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Applications ──────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  student_id     INT,
  internship_id  INT,
  status         ENUM('pending','approved','rejected') DEFAULT 'pending',
  applied_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id)    REFERENCES users(id)        ON DELETE CASCADE,
  FOREIGN KEY (internship_id) REFERENCES internships(id)  ON DELETE CASCADE
);

-- ── Placements ────────────────────────────────────
CREATE TABLE IF NOT EXISTS placements (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  application_id  INT,
  student_id      INT,
  internship_id   INT,
  company_id      INT,
  start_date      DATE,
  status          ENUM('active','completed','terminated') DEFAULT 'active',
  FOREIGN KEY (application_id) REFERENCES applications(id),
  FOREIGN KEY (student_id)     REFERENCES users(id),
  FOREIGN KEY (internship_id)  REFERENCES internships(id),
  FOREIGN KEY (company_id)     REFERENCES users(id)
);

-- ── Logbooks ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS logbooks (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  placement_id  INT,
  student_id    INT,
  date          DATE          NOT NULL,
  hours_worked  INT           NOT NULL,
  description   TEXT          NOT NULL,
  approved      BOOLEAN       DEFAULT FALSE,
  submitted_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (placement_id) REFERENCES placements(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id)   REFERENCES users(id)      ON DELETE CASCADE
);

-- ── Sample Admin Account ──────────────────────────
-- Password is: admin123
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@internug.ug',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhu8',
 'admin');
