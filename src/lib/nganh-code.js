/**
 * Nhận diện ngành (bộ vật tư) từ mã lớp (ten_lop).
 *
 * Quy ước 2 chữ cái giữa mã lớp chỉ ngành:
 *   DC → Điện công nghiệp
 *   DT → Điện tử
 *   CD → Cơ điện tử
 *   DL → Kỹ thuật máy lạnh và điều hòa không khí
 *
 * Mã lạ (BT, OT, MT, A1, B1...) → null, quản trị viên tự gán trong admin.
 */

const normalize = (s) => (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

// match: so khớp tên ngành đã normalize với từ khóa
export const NGANH_CODE_PATTERNS = [
    { code: 'DC', match: (t) => t.includes('cong nghiep') },
    { code: 'DT', match: (t) => t === 'dien tu' },
    { code: 'CD', match: (t) => t.includes('co dien') },
    { code: 'DL', match: (t) => t.includes('may lanh') || t.includes('dieu hoa') },
];

/**
 * Trả về mã code ('DC' | 'DT' | 'CD' | 'DL') nếu nhận diện được từ tên lớp, ngược lại null.
 */
export function detectNganhCode(tenLop) {
    if (!tenLop) return null;
    const upper = tenLop.toString().toUpperCase();
    for (const { code } of NGANH_CODE_PATTERNS) {
        if (upper.includes(code)) return code;
    }
    return null;
}

/**
 * Trả về id của ngành khớp với mã code trong danh sách ngành, ngược lại null.
 * @param {string} tenLop tên lớp (mã lớp)
 * @param {Array<{id: number, ten_nganh: string}>} nganhList danh sách ngành
 * @returns {number|null}
 */
export function detectNganhId(tenLop, nganhList) {
    const code = detectNganhCode(tenLop);
    if (!code || !Array.isArray(nganhList)) return null;
    const pattern = NGANH_CODE_PATTERNS.find(p => p.code === code);
    if (!pattern) return null;
    const nganh = nganhList.find(n => pattern.match(normalize(n.ten_nganh)));
    return nganh ? Number(nganh.id) : null;
}
