CREATE DATABASE IF NOT EXISTS kabsubo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kabsubo;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS places (
  id VARCHAR(120) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  description TEXT,
  longitude DECIMAL(10,7) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  address VARCHAR(500),
  price_range VARCHAR(80),
  rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  reviews_count INT NOT NULL DEFAULT 0,
  walk_time VARCHAR(80),
  hours VARCHAR(120),
  tags_json JSON,
  menu_highlights_json JSON,
  best_seller_name VARCHAR(255),
  best_seller_image_url TEXT,
  contact VARCHAR(255),
  submitted_by VARCHAR(255),
  status ENUM('approved', 'pending', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_places_status (status),
  FULLTEXT KEY ft_places_search (name, type, description)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  place_id VARCHAR(120) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(120),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  prep_note VARCHAR(500),
  is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
  tags_json JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_menu_items_place (place_id),
  FULLTEXT KEY ft_menu_items_search (name, category, prep_note),
  CONSTRAINT fk_menu_items_place
    FOREIGN KEY (place_id) REFERENCES places(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  place_id VARCHAR(120) NOT NULL,
  user_id VARCHAR(80) NOT NULL,
  author VARCHAR(255) NOT NULL,
  rating TINYINT NOT NULL,
  body TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reviews_place (place_id),
  INDEX idx_reviews_user (user_id),
  CONSTRAINT fk_reviews_place
    FOREIGN KEY (place_id) REFERENCES places(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS favorites (
  user_id VARCHAR(80) NOT NULL,
  place_id VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, place_id),
  INDEX idx_favorites_place (place_id),
  CONSTRAINT fk_favorites_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_favorites_place
    FOREIGN KEY (place_id) REFERENCES places(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS submissions (
  id VARCHAR(140) PRIMARY KEY,
  place_id VARCHAR(120) NOT NULL,
  status ENUM('approved', 'pending', 'rejected') NOT NULL DEFAULT 'pending',
  submitted_by VARCHAR(255) NOT NULL,
  owner_user_id VARCHAR(80),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_submissions_status (status),
  INDEX idx_submissions_owner (owner_user_id),
  CONSTRAINT fk_submissions_place
    FOREIGN KEY (place_id) REFERENCES places(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_submissions_owner
    FOREIGN KEY (owner_user_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;
