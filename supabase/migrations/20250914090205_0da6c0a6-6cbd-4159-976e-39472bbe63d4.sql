-- Fix incorrectly assigned party names based on document titles
UPDATE documents 
SET party = 'Volt'
WHERE title ILIKE '%volt%' AND party = 'SP';

UPDATE documents 
SET party = 'ChristenUnie'
WHERE title ILIKE '%christenunie%' AND party = 'SP';

UPDATE documents 
SET party = 'JA21'
WHERE title ILIKE '%ja21%' AND party = 'SP';

UPDATE documents 
SET party = 'FvD'
WHERE title ILIKE '%fvd%' AND party = 'SP';

UPDATE documents 
SET party = 'BVNL'
WHERE title ILIKE '%bvnl%' AND party = 'SP';