INSERT IGNORE INTO users (name, email, password_hash, timezone, created_at, updated_at) VALUES 
('Test User 1', 'test1@example.com', '$2b$10$Iq6/dcNIEPoENGri9zKxB.cVzhETyQjSAGs4V1iHq5hHG9N49232S', 'America/New_York', NOW(), NOW()),
('Test User 2', 'test2@example.com', '$2b$10$Iq6/dcNIEPoENGri9zKxB.cVzhETyQjSAGs4V1iHq5hHG9N49232S', 'Europe/London', NOW(), NOW()),
('Test User 3', 'test3@example.com', '$2b$10$Iq6/dcNIEPoENGri9zKxB.cVzhETyQjSAGs4V1iHq5hHG9N49232S', 'Asia/Tokyo', NOW(), NOW());
