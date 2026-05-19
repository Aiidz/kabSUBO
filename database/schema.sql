-- ============================================================
-- kabSUBO Database Schema
-- MariaDB 12.x / MySQL 8.x
-- Based on ADBMS project ERD + frontend data model
-- ============================================================

CREATE DATABASE IF NOT EXISTS kabsupo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kabsupo;

-- ============================================================
-- 1. profiles — user profile linked to authentication
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id           CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    display_name VARCHAR(255) NOT NULL,
    avatar_url   TEXT,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 2. user_roles — role assignment (admin / moderator / user)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
    id      CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    role    ENUM('admin', 'moderator', 'user') NOT NULL DEFAULT 'user',
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. places — food establishments / stalls
-- ============================================================
CREATE TABLE IF NOT EXISTS places (
    id           CHAR(36)      PRIMARY KEY DEFAULT (UUID()),
    name         VARCHAR(255)  NOT NULL,
    slug         VARCHAR(255)  NOT NULL,
    type         ENUM('restaurant', 'shop', 'stall', 'diner') NOT NULL,
    description  TEXT,
    lat          DECIMAL(9,6),
    lng          DECIMAL(9,6),
    address      VARCHAR(500),
    hours_json   JSON,
    price_range  VARCHAR(50),
    photo_urls   JSON,
    contact      VARCHAR(100),
    submitted_by CHAR(36),
    status       ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (submitted_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_places_status ON places(status);
CREATE INDEX idx_places_slug   ON places(slug);

-- Full-text index for craving search
CREATE FULLTEXT INDEX ft_places_search
    ON places(name, description);

-- ============================================================
-- 4. menu_items — individual menu offerings per place
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_items (
    id            CHAR(36)      PRIMARY KEY DEFAULT (UUID()),
    place_id      CHAR(36)      NOT NULL,
    name          VARCHAR(255)  NOT NULL,
    category      VARCHAR(100),
    description   VARCHAR(500),
    price         DECIMAL(10,2),
    is_best_seller BOOLEAN      DEFAULT FALSE,
    tags          JSON,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_menu_items_place ON menu_items(place_id);

-- Full-text index for menu-level search
CREATE FULLTEXT INDEX ft_menu_items_search
    ON menu_items(name);

-- ============================================================
-- 5. reviews — community ratings and feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    id         CHAR(36)   PRIMARY KEY DEFAULT (UUID()),
    place_id   CHAR(36)   NOT NULL,
    user_id    CHAR(36)   NOT NULL,
    rating     TINYINT    NOT NULL CHECK (rating >= 1 AND rating <= 5),
    body       TEXT,
    created_at TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_reviews_place ON reviews(place_id);

-- ============================================================
-- 6. favorites — user bookmarks (junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
    user_id    CHAR(36)  NOT NULL,
    place_id   CHAR(36)  NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, place_id),
    FOREIGN KEY (user_id)  REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 7. submissions_audit — moderation history log
-- ============================================================
CREATE TABLE IF NOT EXISTS submissions_audit (
    id         CHAR(36)   PRIMARY KEY DEFAULT (UUID()),
    place_id   CHAR(36)   NOT NULL,
    actor_id   CHAR(36),
    action     VARCHAR(50) NOT NULL,
    notes      TEXT,
    created_at TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_audit_place ON submissions_audit(place_id);
