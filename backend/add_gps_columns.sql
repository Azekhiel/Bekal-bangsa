-- Add GPS columns to supplies table
ALTER TABLE supplies 
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT;

-- Optional: Add index for faster geospatial search later
-- CREATE INDEX idx_supplies_lat_long ON supplies (latitude, longitude);
