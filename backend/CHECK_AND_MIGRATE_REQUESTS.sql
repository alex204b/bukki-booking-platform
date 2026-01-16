-- Step 1: Check if there are any unsuspension requests in businesses table
SELECT 
  b.id,
  b.name,
  b."unsuspensionRequestedAt",
  b."unsuspensionRequestReason",
  b.status,
  u.email as owner_email
FROM businesses b
LEFT JOIN users u ON b."ownerId" = u.id
WHERE b."unsuspensionRequestedAt" IS NOT NULL;

-- Step 2: If the above query returns rows, run this migration:
-- (Only run if Step 1 shows data exists)

INSERT INTO requests (
  "businessId",
  "requestType",
  status,
  reason,
  "requestedAt",
  metadata,
  "createdAt",
  "updatedAt"
)
SELECT 
  b.id,
  'unsuspension',
  'pending' as status,
  b."unsuspensionRequestReason" as reason,
  COALESCE(b."unsuspensionRequestedAt", CURRENT_TIMESTAMP) as "requestedAt",
  jsonb_build_object(
    'businessName', b.name,
    'ownerEmail', COALESCE(u.email, 'unknown'),
    'ownerId', COALESCE(u.id::text, 'unknown'),
    'migratedFrom', 'businesses_table'
  ) as metadata,
  COALESCE(b."unsuspensionRequestedAt", CURRENT_TIMESTAMP) as "createdAt",
  COALESCE(b."updatedAt", CURRENT_TIMESTAMP) as "updatedAt"
FROM businesses b
LEFT JOIN users u ON b."ownerId" = u.id
WHERE b."unsuspensionRequestedAt" IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM requests r 
  WHERE r."businessId" = b.id 
  AND r."requestType" = 'unsuspension'
)
RETURNING *;

