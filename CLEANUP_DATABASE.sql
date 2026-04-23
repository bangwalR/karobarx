-- ============================================================================
-- DATABASE CLEANUP SCRIPT
-- Remove all items that don't belong to any user's profile
-- ============================================================================

-- IMPORTANT: Run this in your Supabase SQL Editor
-- This will permanently delete data - make sure you have backups!

-- ============================================================================
-- OPTION 1: Delete ALL phones/items from ALL profiles
-- Use this if you want a completely fresh start
-- ============================================================================

DELETE FROM phones;

-- ============================================================================
-- OPTION 2: Delete phones that have no profile_id (orphaned items)
-- Use this to clean up old data that wasn't properly scoped
-- ============================================================================

DELETE FROM phones WHERE profile_id IS NULL;

-- ============================================================================
-- OPTION 3: Delete phones from a specific profile
-- Replace 'YOUR_PROFILE_ID_HERE' with the actual profile ID
-- ============================================================================

-- First, find your profile ID:
SELECT id, display_name, owner_id FROM business_config;

-- Then delete phones for that profile:
-- DELETE FROM phones WHERE profile_id = 'YOUR_PROFILE_ID_HERE';

-- ============================================================================
-- OPTION 4: Delete ALL data (phones, orders, customers, inquiries)
-- Complete reset - use with caution!
-- ============================================================================

DELETE FROM whatsapp_messages;
DELETE FROM inquiries;
DELETE FROM orders;
DELETE FROM customers;
DELETE FROM phones;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to check what will be deleted before running the DELETE commands
-- ============================================================================

-- Count phones by profile:
SELECT 
  profile_id, 
  COUNT(*) as phone_count 
FROM phones 
GROUP BY profile_id;

-- Count orphaned phones (no profile):
SELECT COUNT(*) as orphaned_phones 
FROM phones 
WHERE profile_id IS NULL;

-- List all profiles:
SELECT 
  id, 
  display_name, 
  owner_id, 
  setup_completed,
  created_at 
FROM business_config 
ORDER BY created_at DESC;

-- ============================================================================
-- AFTER CLEANUP
-- Verify everything is clean
-- ============================================================================

-- Should return 0 or only your profile's data:
SELECT COUNT(*) FROM phones;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM inquiries;
