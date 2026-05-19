-- ============================================================
-- kabSUBO Seed Data
-- 4 demo places matching the frontend's hardcoded data
-- ============================================================

USE kabsupo;

-- ============================================================
-- Profiles (submitters)
-- ============================================================
INSERT IGNORE INTO profiles (id, display_name) VALUES
    ('user-bongalos', 'Bongalos'),
    ('user-gaano',    'Gaano'),
    ('user-legaspi',  'Legaspi'),
    ('user-santos',   'Santos');

-- ============================================================
-- User roles (all 'user' by default)
-- ============================================================
INSERT IGNORE INTO user_roles (user_id, role) VALUES
    ('user-bongalos', 'user'),
    ('user-gaano',    'user'),
    ('user-legaspi',  'user'),
    ('user-santos',   'user');

-- ============================================================
-- Places
-- ============================================================
INSERT IGNORE INTO places (id, name, slug, type, description, lat, lng, address, hours_json, price_range, photo_urls, contact, submitted_by, status) VALUES
    ('place-main-gate-grill',  'Main Gate Grill',    'main-gate-grill',    'stall',  'Fast rice meals and grilled favorites near the campus gate.',            14.1972, 120.8798, 'Near CvSU Main Gate, Indang',            '"7:00 AM - 8:00 PM"',  'PHP 55-120',  NULL, '0917 555 0148', 'user-bongalos', 'approved'),
    ('place-indang-noodle',    'Indang Noodle House', 'indang-noodle-house', 'diner',  'Warm noodle bowls, siomai, and quick snacks for late classes.',         14.1949, 120.8821, 'Market road, Indang',                     '"9:00 AM - 9:00 PM"',  'PHP 45-100',  NULL, '0918 410 2285', 'user-gaano',    'approved'),
    ('place-green-cup-cafe',   'Green Cup Cafe',      'green-cup-cafe',     'restaurant', 'Coffee, pastries, and quiet tables for group study sessions.',         14.1947, 120.8789, 'Poblacion, Indang',                       '"10:00 AM - 10:00 PM"', 'PHP 80-180',  NULL, 'greencup@example.test', 'user-legaspi', 'approved'),
    ('place-campus-burger',    'Campus Burger Stop',  'campus-burger-stop',  'stall',  'Affordable burgers, fries, and drinks for quick cravings.',            14.1978, 120.8818, 'Beside campus tricycle terminal',          '"11:00 AM - 8:30 PM"', 'PHP 35-95',   NULL, '0920 110 7712', 'user-santos',  'approved');

-- ============================================================
-- Menu Items (3 per place, 12 total)
-- ============================================================
-- Main Gate Grill
INSERT IGNORE INTO menu_items (place_id, name, category, description, price, is_best_seller, tags) VALUES
    ('place-main-gate-grill', 'Pork sisig',        'Rice meals', 'Cooked on order and best with plain rice.',   95,  TRUE,  '["sisig", "rice meal", "lunch"]'),
    ('place-main-gate-grill', 'Chicken barbecue',  'Grilled',    'Grilled in lunch batches for a short wait.',  85,  TRUE,  '["grill", "budget", "rice meal"]'),
    ('place-main-gate-grill', 'Silog meals',       'Breakfast',  'Fast breakfast plate with egg and garlic rice.', 70, FALSE, '["breakfast", "budget", "egg"]'),
    ('place-indang-noodle', 'Beef mami',       'Noodles',    'Served hot and ideal for rainy class breaks.',   90,  TRUE,  '["noodles", "mami", "soup"]'),
    ('place-indang-noodle', 'Siomai rice',     'Rice meals', 'Quick rice bowl with steamed siomai.',           65,  FALSE, '["siomai", "rice meal", "budget"]'),
    ('place-indang-noodle', 'Pancit canton',   'Snacks',     'Made as a quick merienda order.',                55,  FALSE, '["noodles", "snack", "merienda"]'),
    ('place-green-cup-cafe', 'Iced latte',     'Coffee',     'Prepared cold with low wait outside peak hours.', 120, TRUE,  '["coffee", "iced", "study"]'),
    ('place-green-cup-cafe', 'Cheesecake cup', 'Desserts',   'Chilled cup dessert from a limited daily batch.', 110, TRUE,  '["dessert", "pastry", "sweet"]'),
    ('place-green-cup-cafe', 'Tuna melt',      'Sandwiches', 'Toasted after ordering; better for longer breaks.', 145, FALSE, '["sandwich", "snack", "study"]'),
    ('place-campus-burger', 'Cheese burger', 'Burgers', 'Made to order on the griddle.',           55,  TRUE,  '["burger", "snack", "budget"]'),
    ('place-campus-burger', 'Loaded fries',  'Snacks',  'Best for sharing; sauce is added before serving.', 75,  TRUE,  '["fries", "snack", "sharing"]'),
    ('place-campus-burger', 'Milktea',       'Drinks',  'Prepared cold and easy to carry between classes.', 65,  FALSE, '["drink", "sweet", "merienda"]');

-- ============================================================
-- Reviews (2 per place)
-- ============================================================
INSERT IGNORE INTO reviews (place_id, user_id, rating, body) VALUES
    ('place-main-gate-grill', 'user-bongalos', 5, 'Reliable lunch spot after lab. Sisig serving is generous.'),
    ('place-main-gate-grill', 'user-bongalos', 4, 'Chicken barbecue is good for the price and quick to serve.'),
    ('place-indang-noodle',   'user-gaano',    4, 'Good soup option on rainy days. Siomai rice is filling.'),
    ('place-indang-noodle',   'user-gaano',    4, 'Affordable and close enough for short breaks.'),
    ('place-green-cup-cafe',  'user-legaspi',  5, 'Best study cafe nearby. Iced latte is consistent.'),
    ('place-green-cup-cafe',  'user-legaspi',  4, 'Quiet enough for group work and the cheesecake cup is worth it.'),
    ('place-campus-burger',   'user-santos',   4, 'Good burger for merienda. Loaded fries are better shared.'),
    ('place-campus-burger',   'user-santos',   4, 'Quick stop before commuting. Prices are student-friendly.');

-- ============================================================
-- Submissions Audit (initial approval for all 4)
-- ============================================================
INSERT IGNORE INTO submissions_audit (place_id, actor_id, action, notes) VALUES
    ('place-main-gate-grill', 'user-bongalos', 'pending',  'Initial submission.'),
    ('place-main-gate-grill', 'user-bongalos', 'approved', 'Auto-approved during seed.'),
    ('place-indang-noodle',   'user-gaano',    'pending',  'Initial submission.'),
    ('place-indang-noodle',   'user-gaano',    'approved', 'Auto-approved during seed.'),
    ('place-green-cup-cafe',  'user-legaspi',  'pending',  'Initial submission.'),
    ('place-green-cup-cafe',  'user-legaspi',  'approved', 'Auto-approved during seed.'),
    ('place-campus-burger',   'user-santos',   'pending',  'Initial submission.'),
    ('place-campus-burger',   'user-santos',   'approved', 'Auto-approved during seed.');
