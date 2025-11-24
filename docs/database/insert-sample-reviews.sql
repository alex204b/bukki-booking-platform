-- Insert sample reviews for testing
-- First, let's get some business IDs and user IDs from the database

-- Sample reviews for businesses (assuming we have businesses with IDs)
INSERT INTO reviews ("businessId", "userId", rating, title, comment, "createdAt", "updatedAt")
SELECT 
    b.id as "businessId",
    u.id as "userId",
    CASE 
        WHEN random() < 0.3 THEN 5
        WHEN random() < 0.5 THEN 4
        WHEN random() < 0.7 THEN 3
        WHEN random() < 0.9 THEN 2
        ELSE 1
    END as rating,
    CASE 
        WHEN random() < 0.2 THEN 'Excellent service!'
        WHEN random() < 0.4 THEN 'Very satisfied with the experience'
        WHEN random() < 0.6 THEN 'Good quality service'
        WHEN random() < 0.8 THEN 'Average experience'
        ELSE 'Could be better'
    END as title,
    CASE 
        WHEN random() < 0.7 THEN 'Great experience overall. The staff was friendly and professional. Would definitely recommend to others.'
        WHEN random() < 0.9 THEN 'Good service, but there is room for improvement. The quality was decent.'
        ELSE 'Not satisfied with the service provided. Expected better quality.'
    END as comment,
    CURRENT_TIMESTAMP - (random() * interval '30 days') as "createdAt",
    CURRENT_TIMESTAMP - (random() * interval '30 days') as "updatedAt"
FROM businesses b
CROSS JOIN (
    SELECT id FROM users WHERE role = 'customer' LIMIT 5
) u
WHERE b.status = 'approved'
LIMIT 15;

-- Insert a few more reviews with different patterns
INSERT INTO reviews ("businessId", "userId", rating, title, comment, "createdAt", "updatedAt")
VALUES 
    -- 5-star reviews
    ((SELECT id FROM businesses WHERE name = 'Elegant Beauty Salon' LIMIT 1), 
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1), 
     5, 'Amazing experience!', 'The staff was incredibly professional and the service exceeded my expectations. Highly recommended!', 
     CURRENT_TIMESTAMP - interval '5 days', CURRENT_TIMESTAMP - interval '5 days'),
    
    ((SELECT id FROM businesses WHERE name = 'Casa Doina Restaurant' LIMIT 1), 
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1), 
     5, 'Delicious food!', 'Authentic Romanian cuisine with excellent presentation. The atmosphere was perfect for a family dinner.', 
     CURRENT_TIMESTAMP - interval '3 days', CURRENT_TIMESTAMP - interval '3 days'),
    
    -- 4-star reviews
    ((SELECT id FROM businesses WHERE name = 'FitLife Gym' LIMIT 1), 
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1), 
     4, 'Great gym facilities', 'Modern equipment and clean environment. The trainers are knowledgeable and helpful.', 
     CURRENT_TIMESTAMP - interval '7 days', CURRENT_TIMESTAMP - interval '7 days'),
    
    ((SELECT id FROM businesses WHERE name = 'AutoFix Service' LIMIT 1), 
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1), 
     4, 'Reliable car service', 'Quick and efficient service. Fixed my car issue in no time. Fair pricing too.', 
     CURRENT_TIMESTAMP - interval '10 days', CURRENT_TIMESTAMP - interval '10 days'),
    
    -- 3-star review
    ((SELECT id FROM businesses WHERE name = 'Master Tailor Studio' LIMIT 1), 
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1), 
     3, 'Decent tailoring work', 'The work was okay, but took longer than expected. Quality was acceptable.', 
     CURRENT_TIMESTAMP - interval '14 days', CURRENT_TIMESTAMP - interval '14 days');

-- Update business ratings based on reviews
UPDATE businesses 
SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM reviews 
    WHERE "businessId" = businesses.id
)
WHERE id IN (SELECT DISTINCT "businessId" FROM reviews);
