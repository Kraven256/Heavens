-- ================================================
--  InternUG — Migration: Add Password Reset Columns
--  Run this in phpMyAdmin if your database already
--  exists and you want to add the password reset
--  feature without re-creating everything.
-- ================================================

USE `internship_management`;

-- Add columns only if they don't already exist
-- (MySQL 8.0+: use IF NOT EXISTS)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token   VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reset_expires DATETIME    DEFAULT NULL;
