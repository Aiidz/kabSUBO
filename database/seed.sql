-- ============================================================
-- kabSUBO Seed Data
-- 4 demo places matching the frontend's hardcoded data
-- ============================================================

USE kabsubo;

-- ============================================================
-- Profiles (submitters)
-- ============================================================
INSERT IGNORE INTO profiles (id, display_name, email, password_hash) VALUES
    ('user-bongalos', 'Bongalos', 'bongalos@kabsubo.test', '$2y$12$vaLslKUsElwDh.Sx9dpsku4kofEhbPcpNjrKzGr0g26WMAuEbbfFy'),
    ('user-gaano',    'Gaano',    'gaano@kabsubo.test',    '$2y$12$vaLslKUsElwDh.Sx9dpsku4kofEhbPcpNjrKzGr0g26WMAuEbbfFy'),
    ('user-legaspi',  'Legaspi',  'legaspi@kabsubo.test',  '$2y$12$vaLslKUsElwDh.Sx9dpsku4kofEhbPcpNjrKzGr0g26WMAuEbbfFy'),
    ('user-santos',   'Santos',   'santos@kabsubo.test',   '$2y$12$vaLslKUsElwDh.Sx9dpsku4kofEhbPcpNjrKzGr0g26WMAuEbbfFy'),
    ('user-admin',    'Admin',    'admin@kabsubo.test',    '$2y$12$vaLslKUsElwDh.Sx9dpsku4kofEhbPcpNjrKzGr0g26WMAuEbbfFy');

-- ============================================================
-- User roles (all 'user' by default, 'admin' for the admin)
-- ============================================================
INSERT IGNORE INTO user_roles (id, user_id, role) VALUES
    (UUID(), 'user-bongalos', 'user'),
    (UUID(), 'user-gaano',    'user'),
    (UUID(), 'user-legaspi',  'user'),
    (UUID(), 'user-santos',   'user'),
    (UUID(), 'user-admin',    'admin');

-- ============================================================
-- Places
-- ============================================================
INSERT IGNORE INTO places (id, name, slug, type, description, lat, lng, address, hours_json, price_range, photo_urls, contact, submitted_by, status) VALUES
    ('place-main-gate-grill',  'Main Gate Grill',    'main-gate-grill',    'stall',  'Fast rice meals and grilled favorites near the campus gate.',            14.1972, 120.8798, 'Near CvSU Main Gate, Indang',            '"7:00 AM - 8:00 PM"',  'PHP 55-120',  '["https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=240&q=80"]', '0917 555 0148', 'user-bongalos', 'approved'),
    ('place-indang-noodle',    'Indang Noodle House', 'indang-noodle-house', 'diner',  'Warm noodle bowls, siomai, and quick snacks for late classes.',         14.1949, 120.8821, 'Market road, Indang',                     '"9:00 AM - 9:00 PM"',  'PHP 45-100',  '["https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=240&q=80"]', '0918 410 2285', 'user-gaano',    'approved'),
    ('place-green-cup-cafe',   'Green Cup Cafe',      'green-cup-cafe',     'restaurant', 'Coffee, pastries, and quiet tables for group study sessions.',         14.1947, 120.8789, 'Poblacion, Indang',                       '"10:00 AM - 10:00 PM"', 'PHP 80-180',  '["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=240&q=80"]', 'greencup@example.test', 'user-legaspi', 'approved'),
    ('place-campus-burger',    'Campus Burger Stop',  'campus-burger-stop',  'stall',  'Affordable burgers, fries, and drinks for quick cravings.',            14.1978, 120.8818, 'Beside campus tricycle terminal',          '"11:00 AM - 8:30 PM"', 'PHP 35-95',   '["https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=240&q=80"]', '0920 110 7712', 'user-santos',  'approved');

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

-- ============================================================
-- New Restaurants (Added May 2026)
-- ============================================================
INSERT IGNORE INTO places (id, name, slug, type, description, lat, lng, address, hours_json, price_range, photo_urls, contact, submitted_by, status) VALUES
    ('68de0bba-1ddf-4a9a-846f-e6a976908ad6', '7/11', '711', 'Convenience Store', 'Pit stop for snacks, drinks & daily essentials', 14.195928, 120.882102, 'Indang, Cavite', '"Open 24 Hours"', 'PHP 35-49', '["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4mpqgdDjKP6gSgHGmCC5n7A8GO4ZHK_StyA&s"]', 'Pending contact', 'user-gaano', 'approved'),
    ('79d4d290-d0a9-4c61-b03a-b69b210a98b1', 'Saluysoy', 'saluysoy', 'Carinderia', 'CvSU Food Service Facilities', 14.201507, 120.882369, 'Indang, Cavite', '"7:00 AM - 7:00 PM"', 'PHP 20-55', '["https://cvsu.edu.ph/wp-content/uploads/2022/12/IMG-5100-scaled.jpg"]', 'Pending contact', 'user-admin', 'approved'),
    ('7caa992c-795d-4e64-9d10-6f899ffa9966', 'Ar dinners', 'ar-dinners', 'Restaurant', 'Sulit Meal. Sarap Always', 14.195533, 120.881567, 'Indang, Cavite', '"8:00 AM - 8:00 PM"', 'PHP 109-179', '["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8F_nly2Uo0FYkOrlOx-YK0DbExH-6pleysA&s"]', 'Pending contact', 'user-gaano', 'approved'),
    ('85df6687-f3f0-4eff-88a9-7bbf770624d3', 'McDonald\'s', 'mcdonalds', 'Fast Food', 'Classic, long-running fast-food chain known for its burgers & fries.', 14.195090, 120.884046, 'Indang, Cavite', '"Open 24 hours"', 'PHP 59-103', '["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6wPAd4dFK5u62cjD4hI9QQ0lfHV3MLm3fwg&s"]', 'Pending contact', 'user-admin', 'approved'),
    ('926ffa9c-b942-4b7d-864c-80645160526b', 'BigBrew', 'bigbrew', 'Drinks', 'BREW SUCCESS WITH BIGBREW', 14.201028, 120.879341, 'Indang, Cavite', '"8:00 AM - 8:00 PM"', 'PHP 39-49', '["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRRIS-_5IJUukGC8rW4MMI2sQKx60Y9tpv6kQ&s"]', 'Pending contact', 'user-admin', 'approved'),
    ('c252bb5f-fc2c-424f-8ac6-75424da7498b', 'CvSU Marketing', 'cvsu-marketing', 'Carinderia', 'CvSU Food Service Facilities', 14.198892, 120.879439, 'Indang, Cavite', '"7:00 AM - 7:00 PM"', 'PHP 20-50', '["https://scontent.fmnl30-1.fna.fbcdn.net/v/t39.30808-6/480952340_619581057494343_8549995276805973930_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=833d8c&_nc_ohc=q9nKh-I-8hYQ7kNvwEdQBYB&_nc_oc=AdoS2bKnj14IMOObxBcPvUzgZVTw87ImlP6817PZnA9WSfRflplon4oc20jVY5Ts14o&_nc_zt=23&_nc_ht=scontent.fmnl30-1.fna&_nc_gid=-maV-5w49yRfXQQSoK5lPA&_nc_ss=7b2a8&oh=00_Af7asOj2JSqYgdN3dkvBuYF4DL81x0dO82P_jdUH609t7w&oe=6A1C8889"]', 'Pending contact', 'user-admin', 'approved'),
    ('cafd3270-2769-4095-a988-8d60ebd78e0d', 'Bari Cafe', 'bari-cafe', 'Cafe', 'Every table tells a story. Tara kain sa Bari Cafe', 14.195161, 120.880080, 'Indang, Cavite', '"8:00 AM - 9:00 PM"', 'PHP 165-190', '["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQ6dOH5tgXU2tgrtdqvH8qdzKxGmzMUWaBLg&s"]', 'Pending contact', 'user-admin', 'approved'),
    ('kokoks-griddle-grill', 'Kokok\'s Griddle & Grill', 'kokoks-griddle-grill', 'Grill house', 'Chicken inasal, barbecue platters, and group meals submitted for review.', 14.1938, 120.8842, 'Bancod, Indang, Cavite', '"8:00 AM - 11:00 PM"', 'PHP 99-200', '["https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=640&q=80"]', '0919 456 0332', 'user-legaspi', 'pending');

-- Audit entries for new restaurants
INSERT IGNORE INTO submissions_audit (place_id, actor_id, action, notes) VALUES
    ('68de0bba-1ddf-4a9a-846f-e6a976908ad6', 'user-admin', 'approved', 'Submitted via stored procedure.'),
    ('79d4d290-d0a9-4c61-b03a-b69b210a98b1', 'user-admin', 'approved', 'Submitted via stored procedure.'),
    ('7caa992c-795d-4e64-9d10-6f899ffa9966', 'user-admin', 'approved', 'Submitted via stored procedure.'),
    ('85df6687-f3f0-4eff-88a9-7bbf770624d3', 'user-admin', 'approved', 'Submitted via stored procedure.'),
    ('926ffa9c-b942-4b7d-864c-80645160526b', 'user-admin', 'approved', 'Submitted via stored procedure.'),
    ('c252bb5f-fc2c-424f-8ac6-75424da7498b', 'user-admin', 'approved', 'Submitted via stored procedure.'),
    ('cafd3270-2769-4095-a988-8d60ebd78e0d', 'user-admin', 'approved', 'Submitted via stored procedure.'),
    ('kokoks-griddle-grill', 'user-legaspi', 'pending',  'Initial submission.');

-- Menu items for Kokok's Griddle & Grill
INSERT IGNORE INTO menu_items (place_id, name, category, description, price, is_best_seller, tags) VALUES
    ('kokoks-griddle-grill', 'Chicken inasal', 'Grilled', 'Charcoal-grilled chicken served with rice.', 99, TRUE, '["chicken", "grill", "rice meal"]'),
    ('kokoks-griddle-grill', 'Barbecue platter', 'Sharing', 'Skewers for small groups after class.', 199, TRUE, '["barbecue", "sharing", "dinner"]'),
    ('kokoks-griddle-grill', 'Pancit canton', 'Noodles', 'Quick noodle order for merienda.', 85, FALSE, '["noodles", "snack", "merienda"]');

-- Menu items for existing restaurants (Added May 2026)
INSERT IGNORE INTO menu_items (place_id, name, category, description, price, is_best_seller, tags) VALUES
('68de0bba-1ddf-4a9a-846f-e6a976908ad6', 'Big Bite Hotdog', 'Quick Snacks', 'Classic 7/11 hotdog in a bun.', 35.00, 1, '["hotdog", "snack", "quick"]'),
('68de0bba-1ddf-4a9a-846f-e6a976908ad6', 'Slurpee (Medium)', 'Cold Drinks', 'Refreshing frozen carbonated drink.', 39.00, 1, '["drink", "frozen", "sweet"]'),
('68de0bba-1ddf-4a9a-846f-e6a976908ad6', 'Busog Meal', 'Rice Meals', 'Affordable rice bowl with various toppings.', 49.00, 0, '["rice meal", "budget", "lunch"]'),
('79d4d290-d0a9-4c61-b03a-b69b210a98b1', 'Beef Pares', 'Rice Meals', 'Tender beef brisket in sweet soy broth.', 55.00, 1, '["beef", "pares", "rice meal"]'),
('79d4d290-d0a9-4c61-b03a-b69b210a98b1', 'Tokwa’t Baboy', 'Side Dishes', 'Fried tofu and pork in soy-vinegar sauce.', 35.00, 0, '["pork", "tofu", "side"]'),
('79d4d290-d0a9-4c61-b03a-b69b210a98b1', 'Lugaw with Egg', 'Breakfast', 'Warm rice porridge topped with boiled egg.', 25.00, 1, '["breakfast", "lugaw", "budget"]'),
('7caa992c-795d-4e64-9d10-6f899ffa9966', 'Special Tapa Silog', 'Silog Meals', 'Home-style beef tapa with rice and egg.', 115.00, 1, '["tapsilog", "breakfast", "beef"]'),
('7caa992c-795d-4e64-9d10-6f899ffa9966', 'Sizzling Sisig', 'Main Course', 'Crispy chopped pork served on a hot plate.', 149.00, 1, '["sisig", "pork", "dinner"]'),
('7caa992c-795d-4e64-9d10-6f899ffa9966', 'Chicken Wings (6pcs)', 'Snacks/Sharing', 'Crispy wings with choice of sauce.', 179.00, 0, '["chicken", "wings", "sharing"]'),
('85df6687-f3f0-4eff-88a9-7bbf770624d3', 'Cheeseburger Meal', 'Burgers', 'Classic cheeseburger with fries and drink.', 155.00, 1, '["burger", "mcdonalds", "meal"]'),
('85df6687-f3f0-4eff-88a9-7bbf770624d3', '1-pc Chicken McDo', 'Chicken', 'Crispy fried chicken with rice and gravy.', 99.00, 1, '["chicken", "fried", "rice meal"]'),
('85df6687-f3f0-4eff-88a9-7bbf770624d3', 'Hot Fudge Sundae', 'Desserts', 'Creamy soft serve with hot chocolate fudge.', 55.00, 0, '["dessert", "sweet", "ice cream"]'),
('926ffa9c-b942-4b7d-864c-80645160526b', 'Okinawa Milktea', 'Milktea', 'Classic roasted brown sugar milktea.', 39.00, 1, '["milktea", "sweet", "iced"]'),
('926ffa9c-b942-4b7d-864c-80645160526b', 'Dark Chocolate', 'Premium Series', 'Rich and creamy dark chocolate drink.', 49.00, 1, '["chocolate", "iced", "premium"]'),
('926ffa9c-b942-4b7d-864c-80645160526b', 'Matcha Latte', 'Classic Series', 'Smooth and earthy green tea milk drink.', 39.00, 0, '["matcha", "tea", "iced"]'),
('c252bb5f-fc2c-424f-8ac6-75424da7498b', 'Pork Adobo', 'Rice Meals', 'Traditional pork adobo with rice.', 45.00, 1, '["adobo", "pork", "budget"]'),
('c252bb5f-fc2c-424f-8ac6-75424da7498b', 'Ginataang Gulay', 'Vegetables', 'Mixed vegetables in coconut milk.', 30.00, 0, '["veggies", "healthy", "side"]'),
('c252bb5f-fc2c-424f-8ac6-75424da7498b', 'Fried Fish', 'Rice Meals', 'Crispy fried fish with rice.', 40.00, 1, '["fish", "fried", "budget"]'),
('cafd3270-2769-4095-a988-8d60ebd78e0d', 'Spanish Latte', 'Coffee', 'Sweet and creamy espresso-based drink.', 145.00, 1, '["coffee", "latte", "espresso"]'),
('cafd3270-2769-4095-a988-8d60ebd78e0d', 'Carbonara Pasta', 'Pasta', 'Creamy white sauce pasta with bacon bits.', 165.00, 1, '["pasta", "italian", "lunch"]'),
('cafd3270-2769-4095-a988-8d60ebd78e0d', 'Beef Quesadilla', 'Snacks', 'Grilled tortilla filled with beef and cheese.', 130.00, 0, '["mexican", "snack", "cheese"]');

-- Jollibee & Verses (Added May 27)
INSERT IGNORE INTO places (id, name, slug, type, description, lat, lng, address, hours_json, price_range, photo_urls, contact, submitted_by, status) VALUES
('f31b6858-9c73-4712-aaae-eec774758a61', 'Jollibee', 'jollibee', 'Fast Food', 'Langhap-Sarap Bida ang sarap/saya! No. 1 Sa Saya', 14.196159, 120.877898, 'Indang, Cavite', '"Open 24 hours"', 'PHP 40-120', '["https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Indang%2CCavitejf8378_14.JPG/1280px-Indang%2CCavitejf8378_14.JPG"]', 'Pending contact', 'user-admin', 'approved'),
('be5151ee-da8c-47c6-97d5-604f3ef9c817', 'Verses', 'verses', 'Restaurant', 'Verses Restaurant', 14.195398, 120.879955, 'Indang, Cavite', '"8:00 AM - 8:00 PM"', 'PHP 110-120', '["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcST77au9xbqc0xVaeLKvrdJpU4w-jT7I_-y8g&s"]', 'Pending contact', 'user-admin', 'approved');

INSERT IGNORE INTO menu_items (place_id, name, category, description, price, is_best_seller, tags) VALUES
('f31b6858-9c73-4712-aaae-eec774758a61', 'Chickenjoy', 'Chicken', 'Crispy fried chicken.', 85.00, 1, '["chicken", "fried", "jollibee"]'),
('f31b6858-9c73-4712-aaae-eec774758a61', 'Jolly Spaghetti', 'Pasta', 'Sweet-style spaghetti with ham and cheese.', 60.00, 1, '["pasta", "jollibee", "sweet"]'),
('f31b6858-9c73-4712-aaae-eec774758a61', 'Yumburger', 'Burgers', 'The classic Jollibee burger.', 40.00, 0, '["burger", "snack", "budget"]'),
('be5151ee-da8c-47c6-97d5-604f3ef9c817', 'Chicken Leg Quarter', 'Chicken', 'Roasted chicken leg.', 115.00, 1, '["chicken", "roasted", "lunch"]'),
('be5151ee-da8c-47c6-97d5-604f3ef9c817', 'Pork Sinigang', 'Soup/Main', 'Sour tamarind soup with pork and veggies.', 120.00, 1, '["soup", "pork", "lunch"]'),
('be5151ee-da8c-47c6-97d5-604f3ef9c817', 'Liempo (Grilled)', 'Grilled', 'Marinated grilled pork belly.', 110.00, 1, '["grill", "pork", "rice meal"]');

-- CvSU University Mall (Added May 27)
INSERT IGNORE INTO places (id, name, slug, type, description, lat, lng, address, hours_json, price_range, photo_urls, contact, submitted_by, status) VALUES
('89668341-e3df-41a6-84ac-8357a0f4d842', 'CvSU University Mall', 'cvsu-university-mall', 'Food Stall', 'CvSU Food Facilities', 14.196082, 120.882352, 'Indang, Cavite', '"7:00 AM - 7:00 PM"', 'PHP 25-55', '["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSk_GCRuCZ9HnckBEKxY9gMqofetuSc6oh3GA&s"]', '0999 000 0000', 'user-admin', 'approved');

INSERT IGNORE INTO menu_items (place_id, name, category, description, price, is_best_seller, tags) VALUES
('89668341-e3df-41a6-84ac-8357a0f4d842', 'Siomai Rice', 'Rice Meals', 'Pork siomai with rice and chili garlic.', 40.00, 1, '["siomai", "rice", "lunch"]'),
('89668341-e3df-41a6-84ac-8357a0f4d842', 'Hotdog Sandwich', 'Snacks', 'Classic hotdog in a bun with dressing.', 35.00, 1, '["hotdog", "snack", "mall"]'),
('89668341-e3df-41a6-84ac-8357a0f4d842', 'Waffles', 'Snacks', 'Freshly baked waffles with chocolate or cheese.', 25.00, 1, '["waffle", "sweet", "snack"]');
