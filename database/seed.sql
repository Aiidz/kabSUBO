USE kabsubo;

-- Demo password for all seed users: password
SET @password_hash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC.og/at2uheWG/igi';

INSERT INTO users (id, name, email, password_hash, role) VALUES
  ('user-demo-student', 'Demo Student', 'student@cvsu.edu.ph', @password_hash, 'user'),
  ('user-demo-admin', 'Demo Admin', 'admin@cvsu.edu.ph', @password_hash, 'admin'),
  ('user-bongalos', 'Bongalos', 'bongalos@cvsu.edu.ph', @password_hash, 'user'),
  ('user-gaano', 'Gaano', 'gaano@cvsu.edu.ph', @password_hash, 'user'),
  ('user-legaspi', 'Legaspi', 'legaspi@cvsu.edu.ph', @password_hash, 'user'),
  ('user-santos', 'Santos', 'santos@cvsu.edu.ph', @password_hash, 'user')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  password_hash = VALUES(password_hash),
  role = VALUES(role);

INSERT INTO places (
  id, name, type, description, longitude, latitude, address, price_range,
  rating, reviews_count, walk_time, hours, tags_json, menu_highlights_json,
  best_seller_name, best_seller_image_url, contact, submitted_by, status
) VALUES
  (
    'main-gate-grill',
    'Main Gate Grill',
    'Carinderia',
    'Fast rice meals and grilled favorites near the campus gate.',
    120.8798,
    14.1972,
    'Near CvSU Main Gate, Indang',
    'PHP 55-120',
    4.6,
    128,
    '4 min walk',
    '7:00 AM - 8:00 PM',
    '["rice meal", "grill", "sisig", "budget", "lunch"]',
    '["Pork sisig", "Chicken barbecue", "Silog meals"]',
    'Pork sisig',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=240&q=80',
    '0917 555 0148',
    'Bongalos',
    'approved'
  ),
  (
    'indang-noodle-house',
    'Indang Noodle House',
    'Diner',
    'Warm noodle bowls, siomai, and quick snacks for late classes.',
    120.8821,
    14.1949,
    'Market road, Indang',
    'PHP 45-100',
    4.3,
    84,
    '7 min walk',
    '9:00 AM - 9:00 PM',
    '["noodles", "mami", "siomai", "snack", "soup"]',
    '["Beef mami", "Siomai rice", "Pancit canton"]',
    'Beef mami',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=240&q=80',
    '0918 410 2285',
    'Gaano',
    'approved'
  ),
  (
    'green-cup-cafe',
    'Green Cup Cafe',
    'Cafe',
    'Coffee, pastries, and quiet tables for group study sessions.',
    120.8789,
    14.1947,
    'Poblacion, Indang',
    'PHP 80-180',
    4.7,
    96,
    '9 min walk',
    '10:00 AM - 10:00 PM',
    '["coffee", "pastry", "dessert", "study", "wifi"]',
    '["Iced latte", "Cheesecake cup", "Tuna melt"]',
    'Iced latte',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=240&q=80',
    'greencup@example.test',
    'Legaspi',
    'approved'
  ),
  (
    'campus-burger-stop',
    'Campus Burger Stop',
    'Food stall',
    'Affordable burgers, fries, and drinks for quick cravings.',
    120.8818,
    14.1978,
    'Beside campus tricycle terminal',
    'PHP 35-95',
    4.2,
    73,
    '5 min walk',
    '11:00 AM - 8:30 PM',
    '["burger", "fries", "snack", "budget", "merienda"]',
    '["Cheese burger", "Loaded fries", "Milktea"]',
    'Cheese burger',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=240&q=80',
    '0920 110 7712',
    'Santos',
    'approved'
  ),
  (
    'kokoks-griddle-grill',
    'Kokok''s Griddle & Grill',
    'Grill house',
    'Chicken inasal, barbecue platters, and group meals submitted for review.',
    120.8842,
    14.1938,
    'Bancod, Indang, Cavite',
    'PHP 99-200',
    0,
    0,
    '10 min walk',
    '8:00 AM - 11:00 PM',
    '["chicken", "barbecue", "grill", "group meal", "dinner"]',
    '["Chicken inasal", "Barbecue platter", "Pancit canton"]',
    'Chicken inasal',
    'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=640&q=80',
    '0919 456 0332',
    'Colleen Legaspi',
    'pending'
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  type = VALUES(type),
  description = VALUES(description),
  longitude = VALUES(longitude),
  latitude = VALUES(latitude),
  address = VALUES(address),
  price_range = VALUES(price_range),
  rating = VALUES(rating),
  reviews_count = VALUES(reviews_count),
  walk_time = VALUES(walk_time),
  hours = VALUES(hours),
  tags_json = VALUES(tags_json),
  menu_highlights_json = VALUES(menu_highlights_json),
  best_seller_name = VALUES(best_seller_name),
  best_seller_image_url = VALUES(best_seller_image_url),
  contact = VALUES(contact),
  submitted_by = VALUES(submitted_by),
  status = VALUES(status);

DELETE FROM menu_items WHERE place_id IN (
  'main-gate-grill',
  'indang-noodle-house',
  'green-cup-cafe',
  'campus-burger-stop',
  'kokoks-griddle-grill'
);

INSERT INTO menu_items (place_id, name, category, price, prep_note, is_best_seller, tags_json) VALUES
  ('main-gate-grill', 'Pork sisig', 'Rice meals', 95, 'Cooked on order and best with plain rice.', TRUE, '["sisig", "rice meal", "lunch"]'),
  ('main-gate-grill', 'Chicken barbecue', 'Grilled', 85, 'Grilled in lunch batches for a short wait.', TRUE, '["grill", "budget", "rice meal"]'),
  ('main-gate-grill', 'Silog meals', 'Breakfast', 70, 'Fast breakfast plate with egg and garlic rice.', FALSE, '["breakfast", "budget", "egg"]'),
  ('indang-noodle-house', 'Beef mami', 'Noodles', 90, 'Served hot and ideal for rainy class breaks.', TRUE, '["noodles", "mami", "soup"]'),
  ('indang-noodle-house', 'Siomai rice', 'Rice meals', 65, 'Quick rice bowl with steamed siomai.', FALSE, '["siomai", "rice meal", "budget"]'),
  ('indang-noodle-house', 'Pancit canton', 'Snacks', 55, 'Made as a quick merienda order.', FALSE, '["noodles", "snack", "merienda"]'),
  ('green-cup-cafe', 'Iced latte', 'Coffee', 120, 'Prepared cold with low wait outside peak hours.', TRUE, '["coffee", "iced", "study"]'),
  ('green-cup-cafe', 'Cheesecake cup', 'Desserts', 110, 'Chilled cup dessert from a limited daily batch.', TRUE, '["dessert", "pastry", "sweet"]'),
  ('green-cup-cafe', 'Tuna melt', 'Sandwiches', 145, 'Toasted after ordering; better for longer breaks.', FALSE, '["sandwich", "snack", "study"]'),
  ('campus-burger-stop', 'Cheese burger', 'Burgers', 55, 'Made to order on the griddle.', TRUE, '["burger", "snack", "budget"]'),
  ('campus-burger-stop', 'Loaded fries', 'Snacks', 75, 'Best for sharing; sauce is added before serving.', TRUE, '["fries", "snack", "sharing"]'),
  ('campus-burger-stop', 'Milktea', 'Drinks', 65, 'Prepared cold and easy to carry between classes.', FALSE, '["drink", "sweet", "merienda"]'),
  ('kokoks-griddle-grill', 'Chicken inasal', 'Grilled', 99, 'Charcoal-grilled chicken served with rice.', TRUE, '["chicken", "grill", "rice meal"]'),
  ('kokoks-griddle-grill', 'Barbecue platter', 'Sharing', 199, 'Skewers for small groups after class.', TRUE, '["barbecue", "sharing", "dinner"]'),
  ('kokoks-griddle-grill', 'Pancit canton', 'Noodles', 85, 'Quick noodle order for merienda.', FALSE, '["noodles", "snack", "merienda"]');

DELETE FROM reviews WHERE place_id IN (
  'main-gate-grill',
  'indang-noodle-house',
  'green-cup-cafe',
  'campus-burger-stop'
);

INSERT INTO reviews (place_id, user_id, author, rating, body, created_at) VALUES
  ('main-gate-grill', 'user-bongalos', 'Mika', 5, 'Reliable lunch spot after lab. Sisig serving is generous.', '2026-05-01 10:00:00'),
  ('main-gate-grill', 'user-bongalos', 'Renz', 4, 'Chicken barbecue is good for the price and quick to serve.', '2026-05-02 10:00:00'),
  ('indang-noodle-house', 'user-gaano', 'Ella', 4, 'Good soup option on rainy days. Siomai rice is filling.', '2026-05-03 10:00:00'),
  ('indang-noodle-house', 'user-gaano', 'Josh', 4, 'Affordable and close enough for short breaks.', '2026-04-08 10:00:00'),
  ('green-cup-cafe', 'user-legaspi', 'Aira', 5, 'Best study cafe nearby. Iced latte is consistent.', '2026-05-04 10:00:00'),
  ('green-cup-cafe', 'user-legaspi', 'Nico', 4, 'Quiet enough for group work and the cheesecake cup is worth it.', '2026-04-10 10:00:00'),
  ('campus-burger-stop', 'user-santos', 'Bea', 4, 'Good burger for merienda. Loaded fries are better shared.', '2026-05-05 10:00:00'),
  ('campus-burger-stop', 'user-santos', 'Carlo', 4, 'Quick stop before commuting. Prices are student-friendly.', '2026-04-12 10:00:00');

INSERT INTO submissions (id, place_id, status, submitted_by, owner_user_id, notes) VALUES
  ('submission-main-gate-grill', 'main-gate-grill', 'approved', 'Bongalos', 'user-bongalos', 'Seed approved place.'),
  ('submission-indang-noodle-house', 'indang-noodle-house', 'approved', 'Gaano', 'user-gaano', 'Seed approved place.'),
  ('submission-green-cup-cafe', 'green-cup-cafe', 'approved', 'Legaspi', 'user-legaspi', 'Seed approved place.'),
  ('submission-campus-burger-stop', 'campus-burger-stop', 'approved', 'Santos', 'user-santos', 'Seed approved place.'),
  ('submission-kokoks-griddle-grill', 'kokoks-griddle-grill', 'pending', 'Colleen Legaspi', 'user-demo-student', 'Pending review.')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  submitted_by = VALUES(submitted_by),
  owner_user_id = VALUES(owner_user_id),
  notes = VALUES(notes);
