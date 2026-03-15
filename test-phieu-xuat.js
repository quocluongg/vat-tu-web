/**
 * Test script để trigger FK error và xem log chi tiết
 */

const testUrl = 'http://localhost:3000/api/phieu-xuat';

// Mock data - giáo viên 1, kỳ 1, môn 1, vật tư 1
const testData = {
    giao_vien_id: 1,
    ki_id: 1,
    mon_hoc_id: 1,
    chi_tiet: [
        { vat_tu_id: 1, so_luong: 10 },
        { vat_tu_id: 2, so_luong: 5 }
    ]
};

console.log('📤 Sending test request to', testUrl);
console.log('📦 Data:', JSON.stringify(testData, null, 2));

fetch(testUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
})
    .then(r => r.json())
    .then(data => console.log('✅ Response:', JSON.stringify(data, null, 2)))
    .catch(err => console.error('❌ Error:', err.message));
