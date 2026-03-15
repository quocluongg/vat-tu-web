# 📋 HƯỚNG DẪN PHIẾU XUẤT VẬT TƯ

## 🎯 Chức Năng Chính

**Phiếu Xuất** là công cụ để giáo viên **xuất vật tư từ kho** dựa trên **đề xuất vật tư** đã được duyệt.

---

## 📊 QUY TRÌNH HOẠT ĐỘNG

### Bước 1: Chọn Kỳ Học & Giáo Viên
```
❶ Chọn "Kỳ học" (mặc định = kỳ mới nhất)
❷ Chọn "Giáo viên" 
→ Hệ thống tự động tải dữ liệu liên quan
```

### Bước 2: Xem Đề Xuất Vật Tư
```
📝 Danh sách "Đề xuất" từ giáo viên đó
   ├─ Các vật tư đã được đề xuất
   ├─ Tổng số vật tư
   └─ Tính năng in phiếu đề xuất

💡 Sau khi xem → Click "Tạo phiếu xuất"
```

### Bước 3: Chọn Vật Tư Để Xuất
```
Chế độ "Tạo" → Hiển thị tất cả vật tư từ đề xuất

Với mỗi lớp (có thể mở rộng ⬇️):
├─ Vật tư 1 [0 → số lượng tối đa]
├─ Vật tư 2 [0 → số lượng tối đa]
├─ Vật tư 3 [0 → số lượng tối đa]
└─ ...

Điều chỉnh số lượng:
- Dùng nút +/- để tăng/giảm
- Hoặc gõ trực tiếp vào ô input
- Mặc định: không chọn (số lượng = 0)
```

### Bước 4: Gửi Phiếu Xuất
```
Click "Gửi phiếu xuất"
↓
✅ Thành công → Phiếu ngay lập tức xuất hiện trong danh sách
❌ Lỗi → Thông báo lỗi (vd: chọn vật tư từ kỳ cũ)
```

### Bước 5: In & Quản Lý
```
📖 Danh sách "Phiếu xuất đã tạo":
├─ In phiếu → Tạo file PDF để in
├─ Xem chi tiết phiếu
└─ Theo dõi trạng thái

Trạng thái phiếu:
🟡 Chờ duyệt     → Chưa được xử lý
🔵 Đã ký          → Được xác nhận
🟢 Đã xuất        → Vật tư đã lấy từ kho
🔴 Từ chối        → Bị từ chối
⏰ (Chưa thực hiện) → Còn chờ
```

---

## 🔧 CÁC THÀNH PHẦN CHÍNH

### 1️⃣ State & Dữ Liệu
```javascript
kiHocs              → Danh sách kỳ học
giaoViens           → Danh sách giáo viên
selectedKi          → Kỳ học được chọn (mặc định = kỳ mới nhất)
selectedGv          → Giáo viên được chọn
phanCongs           → Phân công (GV + môn học + lớp)
deXuats             → Danh sách đề xuất của GV
deXuatDetail        → Chi tiết đề xuất (vật tư, số lượng, ...)
phieuXuats          → Danh sách phiếu xuất đã tạo
exportItems         → Vật tư được chọn để xuất { "lop_id-vat_tu_id": soLuong }
mode                → "view" (xem) hoặc "create" (tạo)
expandedClass       → Quản lý lớp nào được mở rộng
```

### 2️⃣ Tải Dữ Liệu Ban Đầu
```javascript
useEffect(() => {
    // Lần 1 (component mount):
    ✓ Tải tất cả kỳ học → Chọn kỳ hoạt động
    ✓ Tải tất cả giáo viên
    
    // Lần 2 (khi đổi giáo viên/kỳ):
    ✓ Tải phân công (GV + kỳ)
    ✓ Tải danh sách đề xuất (GV + kỳ)
    ✓ Tải chi tiết đề xuất đầu tiên
    ✓ Tải danh sách phiếu xuất đã tạo
})
```

### 3️⃣ Chế độ Tạo Phiếu
```javascript
handleCreatePhieu() {
    mode = "create"  → Chuyển sang chế độ tạo
    exportItems = {} → Xóa lựa chọn cũ
    error = ""       → Xóa lỗi cũ
    expandedClass = {}
}
```

### 4️⃣ Điều Chỉnh Số Lượng

**Tăng/Giảm (nút +/-):**
```javascript
updateExportQty(lopId, vtId, delta, maxQty)
// delta = +1 (tăng) hoặc -1 (giảm)
// Đảm bảo: 0 ≤ số lượng ≤ maxQty
```

**Gõ Trực Tiếp:**
```javascript
setExportQty(lopId, vtId, userValue, maxQty)
// Chuyển đổi giá trị người dùng nhập
// Tự động xóa nếu = 0 hoặc trống
```

### 5️⃣ Gửi Phiếu Xuất

**Logic:**
```
1. Kiểm tra: Phải chọn ít nhất 1 vật tư
2. Gom nhóm theo môn học
   + Cùng môn học → Hợp nhất vào 1 phiếu
   + Khác môn học → Tạo phiếu riêng
3. Gửi API POST /api/phieu-xuat
   ├─ giao_vien_id (bắt buộc kỳ mới nhất)
   ├─ ki_id (bắt buộc kỳ mới nhất)
   ├─ mon_hoc_id
   └─ chi_tiet [ { vat_tu_id, so_luong }, ... ]
4. Nếu thành công → Refresh danh sách phiếu
5. Nếu lỗi → Hiển thị thông báo
```

---

## 📄 IN PHIẾU XUẤT

### Hàm `generatePDF(px)`
```
Đầu vào:  ID phiếu xuất
Xử lý:
├─ Tải chi tiết phiếu từ API
├─ Tạo bảng với: STT, Vật tư, Yêu cầu, ĐVT, Số lượng
├─ Thiết kế HTML (CSS in ấn)
└─ Mở cửa sổ in PDF (window.print)

Thông tin trên phiếu:
✓ Mã phiếu (PX-0001, PX-0002, ...)
✓ Tên giáo viên
✓ Tên môn học
✓ Ngành học
✓ Ngày tạo
✓ Bảng du liệu chi tiết
✓ Ô ký: Người đề xuất, Trưởng khoa, Người phụ trách kho
```

### Hàm `printDeXuatPhieu()`
```
In phiếu "Đề xuất vật tư" (từ chế độ xem)
- Gom nhóm theo môn học
- Mỗi môn 1 phiếu
- Tương tự generatePDF nhưng từ deXuatDetail
```

---

## ⚠️ VALIDATION & LỖI

### Kiểm tra trên Server

**1. Giáo viên tồn tại?**
```
❌ Lỗi:  Giáo viên ID X không tồn tại
```

**2. Kỳ học tồn tại & là mới nhất?**
```
❌ Lỗi:  Phiếu xuất chỉ được phép dùng kỳ học mới nhất (Kỳ 2)
         Hiện tại bạn chọn Kỳ 1
```

**3. Môn học tồn tại?**
```
❌ Lỗi:  Môn học ID X không tồn tại
```

**4. Vật tư tồn tại?**
```
❌ Lỗi:  Vật tư ID X không tồn tại
```

**5. Vật tư thuộc kỳ học này?**
```
❌ Lỗi:  Dòng 1: Vật tư "Giấy cách điện" không thuộc kỳ học này
         (material ki_id=2, expected ki_id=1)
```

**6. Có đề xuất để xuất?**
```
API sẽ query: Vật tư này có trong đề xuất được duyệt không?
   ✓ Được duyệt (trang_thai IN 'da_nop', 'duyet', 'dang_lam')
   ✓ Có số lượng tương ứng
   ✗ Nếu không → Xuất được nhưng không tính vào dự tính
```

---

## 📡 CÁC API ĐƯỢC SỬ DỤNG

```plaintext
GET  /api/ki-hoc
     → Lấy danh sách kỳ học

GET  /api/giao-vien
     → Lấy danh sách giáo viên

GET  /api/phan-cong?ki_id=X&giao_vien_id=Y
     → Lấy phân công (môn học + lớp)

GET  /api/de-xuat?ki_id=X&giao_vien_id=Y
     → Lấy danh sách đề xuất

GET  /api/de-xuat?id=X
     → Lấy chi tiết đề xuất (vật tư, số lượng)

GET  /api/phieu-xuat?ki_id=X&giao_vien_id=Y
     → Lấy danh sách phiếu xuất đã tạo

GET  /api/phieu-xuat?id=X
     → Lấy chi tiết phiếu xuất

POST /api/phieu-xuat
     Body: {
       giao_vien_id: number,
       ki_id: number (bắt buộc = kỳ mới nhất),
       mon_hoc_id: number,
       chi_tiet: [ 
         { vat_tu_id: number, so_luong: number },
         ...
       ]
     }
     → Tạo phiếu xuất mới
```

---

## 🎨 GIAO DIỆN UX

### Chế độ "View" (Xem)
```
┌─────────────────────────────────────┐
│ 🔽 Kỳ học (mặc định = mới nhất)      │
│ 🔽 Giáo viên                         │
└─────────────────────────────────────┘

📝 Đề xuất:
  ID | Trạng thái | Vật tư | Ngày
  
📌 Tạo phiếu xuất [Button]

✅ Phiếu xuất đã tạo:
  ID | Môn | Vật tư | In PDF | Xem detail
```

### Chế độ "Create" (Tạo)
```
🔄 Danh sách vật tư để chọn:

├─ 📦 Lớp A1 (mở rộng ⬇️)
│   ├─ Vật tư 1:  [Số tối đa] [-] [Số lượng] [+]
│   ├─ Vật tư 2:  [Số tối đa] [-] [Số lượng] [+]
│   └─ ...
│
├─ 📦 Lớp A2
│   ├─ Vật tư 1:  ...
│   └─ ...
│
└─ ...

🔘 Gửi phiếu xuất [Button]
```

---

## 💡 ĐIỂM QUAN TRỌNG

| Điểm | Chi tiết |
|------|----------|
| **Kỳ Mới Nhất** | Phiếu xuất CHỈ được tạo từ kỳ học mới nhất |
| **Gom Nhóm** | Cùng môn học → 1 phiếu |
| **Cộng Lũy** | Nếu chọn cùng vật tư từ 2 lớp → Cộng số lượng |
| **Max Qty** | Không được xuất quá số lượng được đề xuất |
| **Trạng Thái** | Phiếu được tạo = "Chờ duyệt" |
| **In PDF** | Tạo file PDF để in, ký tên, lưu trữ |

---

## 🚀 VÍ DỤ USE CASE

**Giáo viên Nguyễn Văn A - Kỳ 2:**

1. Chọn Kỳ 2, GV Nguyễn Văn A
2. Xem đề xuất:
   - Môn Toán, Lớp A1: Bút chì (10), Giấy (20)
   - Môn Toán, Lớp A2: Bút chì (5), Giấy (15)
   - Môn Lý, Lớp B1: Đèn (8)

3. Tạo phiếu xuất - Chọn:
   - Lớp A1: Bút chì (5), Giấy (15)
   - Lớp A2: Bút chì (2)
   - Lớp B1: Đèn (6)

4. Gửi → Hệ thống tạo:
   - **Phiếu 1** (Môn Toán): Bút chì (7), Giấy (15)
   - **Phiếu 2** (Môn Lý): Đèn (6)

5. In 2 phiếu ra PDF, ký tên, lưu lại

---

**Hệ thống sẽ cập nhật kho sau khi phiếu được xác nhận ✅**
