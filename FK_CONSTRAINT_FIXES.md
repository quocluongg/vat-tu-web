# 🔧 Foreign Key Constraint Fixes - Implementation Summary

## Problem Identified

**Error:** `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed`

**Root Cause:** Materials (vat_tu) were being deleted from the system while still being referenced in:
- Proposals (de_xuat_chi_tiet) 
- Export slips (phieu_xuat_chi_tiet)

When creating export slips, the API tried to insert deleted material IDs → FK constraint violation.

---

## Solutions Implemented

### Fix 1: Prevent Deletion of In-Use Materials
**File:** [`src/app/api/vat-tu/route.js`](src/app/api/vat-tu/route.js) - DELETE handler

**What it does:**
- Before deleting a material, checks if it exists in any proposals
- Before deleting a material, checks if it exists in any exports
- Returns clear error message if material is in use
- Prevents orphaned foreign key references

**Error Messages:**
```
- "Không thể xóa vật tư vì nó đang được sử dụng trong các đề xuất..."
- "Không thể xóa vật tư vì nó đã được xuất..."
```

### Fix 2: Validate Material Existence Before Export
**File:** [`src/app/api/phieu-xuat/route.js`](src/app/api/phieu-xuat/route.js) - POST handler

**What it does:**
- When creating export slip, verifies ALL materials still exist in database
- Catches deleted materials before FK constraint check
- Returns helpful error message indicating material was deleted

**Error Message:**
```
"Vật tư ID {id} không tồn tại (có thể đã bị xóa). Vui lòng cập nhật lại đề xuất."
```

---

## How to Verify the Fixes

### Test Case 1: Cannot Delete Material in Active Proposal

1. Create a proposal with Material A
2. Try to delete Material A from admin panel
3. **Expected:** Error message "Không thể xóa vật tư vì nó đang được sử dụng trong các đề xuất..."

### Test Case 2: Cannot Delete Material from Completed Export

1. Create export slip with Material B
2. Try to delete Material B from admin panel  
3. **Expected:** Error message "Không thể xóa vật tư vì nó đã được xuất..."

### Test Case 3: Can Create Export from Non-Deleted Materials

1. Create proposal with Material C (still exists)
2. Create export slip from proposal
3. **Expected:** Export slip created successfully

### Test Case 4: Cannot Export If Reference Materials Were Deleted

*Scenario: Data corruption or manual DB edit*

1. Create proposal with Material D
2. Delete Material D directly from database (bypass API)
3. Try to create export slip from the proposal
4. **Expected:** Error message "Vật tư ID {id} không tồn tại (có thể đã bị xóa)..."

---

## Database Integrity Guarantees

After these fixes:

| Scenario | Before | After |
|----------|--------|-------|
| Delete material in use | FK constraint error | Blocked with message |
| Export with deleted materials | FK constraint error | Blocked with message |
| Normal export flow | Works | Works ✓ |
| Delete unused material | Works | Works ✓ |

---

## Files Changed

- `src/app/api/vat-tu/route.js` (DELETE function: +30 lines)
- `src/app/api/phieu-xuat/route.js` (POST function: +15 lines)

---

## Notes

- These are **protective constraints** - they prevent bad operations before they happen
- Error messages guide users to correct their data first
- No breaking changes to existing valid workflows
- All existing exports will continue to work

