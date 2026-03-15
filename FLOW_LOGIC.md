# 📋 Flow Logic: Đề Xuất → Xuất Vật Tư

## ⚠️ UPDATE: Không cần phê duyệt đề xuất
Kể từ bản cập nhật này, **bạn có thể tạo phiếu xuất từ bất kỳ đề xuất nào**, không cần phải duyệt trước. Điều này giúp quy trình nhanh hơn và linh hoạt hơn.

## 1. Tổng Quan Quy Trình

```
Giáo viên → Đề Xuất Vật Tư (Theo Lớp) → Xuất Vật Tư (Gộp Theo Môn) → Kho
```
*(Duyệt/Phê duyệt đề xuất không còn là bước bắt buộc)*

## 2. Tầng Dữ Liệu (Database)

### 2.1 Bảng `de_xuat` (Đề Xuất Tổng)
- `id`: ID đề xuất
- `giao_vien_id`: Giáo viên
- `ki_id`: Kỳ học
- `trang_thai`: Trạng thái (da_nop, duyet, tu_choi) - *Chỉ mang tính theo dõi, không ảnh hưởng đến khả năng xuất*
- `ngay_nop, ngay_duyet`

### 2.2 Bảng `de_xuat_chi_tiet` (Chi Tiết Đề Xuất - **THEO LỚP**)
```
| id | de_xuat_id | mon_hoc_id | lop_id | vat_tu_id | so_luong |
|----|------------|-----------|--------|-----------|----------|
| 1  | 1          | 5         | 10     | 20        | 100      |
| 2  | 1          | 5         | 11     | 20        | 50       |
```
- Mỗi hàng = 1 lớp + 1 vật tư của môn học
- Cùng vật tư có thể appear nhiều hàng (từ các lớp khác nhau)

### 2.3 Bảng `phieu_xuat` (Phiếu Xuất - **GỘP LẠI THEO MÔN**)
- `id`: ID phiếu xuất
- `giao_vien_id`: Giáo viên 
- `ki_id`: Kỳ học
- `mon_hoc_id`: **Môn học** (không lưu lớp)
- `trang_thai, ngay_tao, ngay_xuat`

### 2.4 Bảng `phieu_xuat_chi_tiet` (Chi Tiết Phiếu Xuất - **GỘP TẤT CẢ LỚP**)
```
| id | phieu_xuat_id | vat_tu_id | so_luong |
|----|---------------|-----------|----------|
| 1  | 1             | 20        | 150      |
```
- ❌ **KHÔNG CÓ** `lop_id` (=> Gộp tất cả lớp của môn)
- `so_luong` = Tổng từ tất cả lớp (100 + 50 = 150)

---

## 3. Frontend Flow (Trang Xuất Vật Tư)

### 3.1 UI Hiển Thị
```
[Chọn Giáo Viên]
    ↓
[Hiển Thị Đề Xuất - THEO LỚP]
    ├─ Lớp 10A
    │   ├─ Vật tư X: Đề xuất 100 → Xuất [input: 0-100]
    │   └─ Vật tư Y: Đề xuất 50  → Xuất [input: 0-50]
    │
    └─ Lớp 10B
        ├─ Vật tư X: Đề xuất 100 → Xuất [input: 0-100]
        └─ Vật tư Z: Đề xuất 30  → Xuất [input: 0-30]

[Tạo Phiếu Xuất]
```

### 3.2 Logic Gộp Dữ Liệu (Frontend)
Khi user nhấn "Tạo phiếu xuất":

```javascript
Input: 
  {
    "10A-20": 60,    // Lớp 10A, Vật tư 20: xuất 60
    "10A-21": 40,    // Lớp 10A, Vật tư 21: xuất 40
    "10B-20": 90,    // Lớp 10B, Vật tư 20: xuất 90
  }

Grouping theo Môn Học (Vì phiếu xuất = 1 môn):
  {
    5: [                    // mon_hoc_id = 5
      { vat_tu_id: 20, so_luong: 60 },   // TỪ LỚP 10A
      { vat_tu_id: 21, so_luong: 40 },   // TỪ LỚP 10A
      { vat_tu_id: 20, so_luong: 90 },   // TỪ LỚP 10B - CÙNG VẬT TƯ!
    ]
  }

=> CẦN MERGE:
  {
    5: [
      { vat_tu_id: 20, so_luong: 150 },  // 60 + 90 = 150 ✓
      { vat_tu_id: 21, so_luong: 40 },
    ]
  }
```

### 3.3 ❌ LỖI CÒN Ở FRONTEND
Hiện tại code gửi `lop_id` lên, nhưng database không cần:

```javascript
// ❌ SAI - Gửi lop_id
{
  vat_tu_id: 20,
  so_luong: 150,
  lop_id: 10  // <- Backend không biết làm gì với cái này
}

// ✓ ĐÚNG - Chỉ gửi total
{
  vat_tu_id: 20,
  so_luong: 150
}
```

---

## 4. Backend Validation Logic

### 4.1 Khi POST /api/phieu-xuat
```javascript
// Lấy đề xuất của giáo viên cho môn này (tất cả lớp)
SELECT dxct.vat_tu_id, dxct.so_luong 
FROM de_xuat_chi_tiet dxct
WHERE giao_vien_id = ? 
  AND ki_id = ? 
  AND mon_hoc_id = ?

// Kết quả: { vat_tu_id: 20, so_luong: 100 } + { vat_tu_id: 20, so_luong: 50 }
// => Total: vat_tu_id 20 được đề xuất 150 (gộp từ 2 lớp)

// Check đã xuất bao nhiêu rồi
SELECT vat_tu_id, SUM(so_luong) as da_xuat 
FROM phieu_xuat_chi_tiet
WHERE giao_vien_id = ? AND ki_id = ? AND mon_hoc_id = ?

// Kiểm tra: xuất_mới <= (đề_xuất_total - đã_xuất)
```

### 4.2 ⚠️ HIỆN TẠI CÓ BUG
Backend gộp `de_xuat_chi_tiet` bằng cách loop:
```javascript
const proposalMap = {};
for (const d of deXuatResult.rows) {
    proposalMap[d.vat_tu_id] = d.so_luong;  // ❌ CHỈ LƯU CUỐI CÙNG!
}
```

**Vấn đề**: Nếu vật tư 20 được đề xuất từ lớp A (100) và lớp B (50):
- Dòng 1: `proposalMap[20] = 100`
- Dòng 2: `proposalMap[20] = 50` ← **OVERWRITE!**
- Kết quả: Chỉ thấy 50, thay vì 150

=> Lỗi này gây ra "còn lại: 20" dù kho có 190!

---

## 5. ✅ FIX CẦN LÀM

### 5.1 FIX BACKEND (API)
```javascript
// ✓ ĐÚNG: SUM tất cả
const proposalMap = {};
for (const d of deXuatResult.rows) {
    proposalMap[d.vat_tu_id] = (proposalMap[d.vat_tu_id] || 0) + d.so_luong;
}
```

### 5.2 FIX FRONTEND (UI)
**Loại bỏ `lop_id` khi gửi lên:**
```javascript
// ❌ SAI
groupedByMon[ct.mon_hoc_id].push({
    vat_tu_id: parseInt(vtId),
    so_luong: qty,
    lop_id: parseInt(lopId)  // ← XÓA CÓI NÀY
});

// ✓ ĐÚNG - Nhưng cần MERGE cùng vật tư
const existing = groupedByMon[ct.mon_hoc_id]
    .find(it => it.vat_tu_id === parseInt(vtId));
if (existing) {
    existing.so_luong += qty;  // Cộng dồn
} else {
    groupedByMon[ct.mon_hoc_id].push({
        vat_tu_id: parseInt(vtId),
        so_luong: qty
    });
}
```

### 5.3 Schema Database
**Xác nhận**: `phieu_xuat_chi_tiet` cột:
- ✓ `phieu_xuat_id` 
- ✓ `vat_tu_id`
- ✓ `so_luong`
- ❌ `lop_id` (không cần thêm)

---

## 6. Ví Dụ Chạy Chi Tiết

### Scenario
- Môn Toán (id=5): 2 lớp
  - Lớp 10A: Vật tư Pen (20) - Đề xuất 100
  - Lớp 10B: Vật tư Pen (20) - Đề xuất 50
- User xuất: 10A-20: 80, 10B-20: 70

### Quá Trình
```
1. Frontend nhóm theo môn:
   { 5: [
       { vat_tu_id: 20, so_luong: 80 },   // từ 10A
       { vat_tu_id: 20, so_luong: 70 }    // từ 10B
     ]
   }

2. Nên MERGE thành:
   { 5: [
       { vat_tu_id: 20, so_luong: 150 }   // 80 + 70
     ]
   }

3. Backend kiểm tra:
   - Đề xuất Pen: 100 + 50 = 150 ✓
   - Đã xuất trước: 0
   - Cho phép xuất: 150 - 0 = 150
   - User xuất: 150 ✓ OK!

4. Insert vào DB:
   INSERT INTO phieu_xuat_chi_tiet (phieu_xuat_id, vat_tu_id, so_luong)
   VALUES (1, 20, 150)
```

---

## 7. Tóm Tắt

| Bảng | Có `lop_id`? | Vì Sao |
|------|-------------|--------|
| `de_xuat_chi_tiet` | ✓ YES | Ghi từng lớp riêng |
| `phieu_xuat` | ❌ NO | Chỉ cần `mon_hoc_id` |
| `phieu_xuat_chi_tiet` | ❌ NO | **GỘP tất cả lớp → không cần lop_id** |

**Lỗi của tôi**: Gửi `lop_id` lên API khi backend không cần.
**Cách sửa**: 
1. Frontend: MERGE cùng `vat_tu_id` (cộng dồn `so_luong`) trước khi gửi
2. Backend: SUM tất cả proposal cho mỗi vật tư
