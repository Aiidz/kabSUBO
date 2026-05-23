USE kabsubo;

DROP PROCEDURE IF EXISTS approve_submission;

DELIMITER //

CREATE PROCEDURE approve_submission(
  IN p_submission_id VARCHAR(140),
  IN p_notes TEXT
)
BEGIN
  DECLARE v_place_id VARCHAR(120);

  START TRANSACTION;

  SELECT place_id INTO v_place_id
  FROM submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  UPDATE submissions
  SET status = 'approved',
      notes = p_notes,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_submission_id;

  UPDATE places
  SET status = 'approved'
  WHERE id = v_place_id;

  COMMIT;
END//

DELIMITER ;

DROP VIEW IF EXISTS place_summary_view;

CREATE VIEW place_summary_view AS
SELECT
  p.id,
  p.name,
  p.type,
  p.status,
  p.longitude,
  p.latitude,
  p.address,
  p.price_range,
  COALESCE(AVG(r.rating), p.rating, 0) AS avg_rating,
  GREATEST(COUNT(r.id), p.reviews_count) AS review_count,
  COUNT(DISTINCT m.id) AS menu_item_count,
  s.id AS submission_id,
  s.status AS submission_status,
  s.updated_at AS submission_updated_at
FROM places p
LEFT JOIN reviews r ON r.place_id = p.id
LEFT JOIN menu_items m ON m.place_id = p.id
LEFT JOIN submissions s ON s.place_id = p.id
GROUP BY
  p.id,
  p.name,
  p.type,
  p.status,
  p.longitude,
  p.latitude,
  p.address,
  p.price_range,
  p.rating,
  p.reviews_count,
  s.id,
  s.status,
  s.updated_at;
