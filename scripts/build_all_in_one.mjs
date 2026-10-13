import fs from 'fs';
import path from 'path';

const gasDir = path.resolve('gas');

// Read Backend Files
const repoCode = fs.readFileSync(path.join(gasDir, 'Repo.gs'), 'utf8');
const apiCode = fs.readFileSync(path.join(gasDir, 'Api.gs'), 'utf8');
const setupCode = fs.readFileSync(path.join(gasDir, 'SetupSpreadsheet.gs'), 'utf8');
const configCode = fs.readFileSync(path.join(gasDir, 'Config.gs'), 'utf8');
const serviceAdminCode = fs.readFileSync(path.join(gasDir, 'ServiceAdmin.gs'), 'utf8');
const serviceXuatKhoCode = fs.readFileSync(path.join(gasDir, 'ServiceXuatKho.gs'), 'utf8');

// Read Frontend Files
const stylesContent = fs.readFileSync(path.join(gasDir, 'Styles.html'), 'utf8');
const appContent = fs.readFileSync(path.join(gasDir, 'App.html'), 'utf8');
const teacherViewsContent = fs.readFileSync(path.join(gasDir, 'TeacherViews.html'), 'utf8');
const adminViewsContent = fs.readFileSync(path.join(gasDir, 'AdminViews.html'), 'utf8');
let indexContent = fs.readFileSync(path.join(gasDir, 'Index.html'), 'utf8');

// Inline Includes into Index.html
indexContent = indexContent.replace("<?!= include('Styles'); ?>", stylesContent);
indexContent = indexContent.replace("<?!= include('App'); ?>", appContent);
indexContent = indexContent.replace("<?!= include('TeacherViews'); ?>", teacherViewsContent);
indexContent = indexContent.replace("<?!= include('AdminViews'); ?>", adminViewsContent);

// Build AllInOne_Code.gs
const allInOne = `/**
 * @OnlyCurrentDoc
 * ==============================================================================
 * HỆ THỐNG QUẢN LÝ VẬT TƯ THỰC HÀNH - TRƯỜNG CĐN VIỆT NAM - SINGAPORE (VSVC)
 * BẢN NÂNG CẤP V2: ĐẦY ĐỦ CỔNG GIÁO VIÊN (G1-G4) & CỔNG QUẢN TRỊ ADMIN (A1-A7)
 * ==============================================================================
 * 1 FILE DUY NHẤT - TỰ ĐỘNG KHỞI TẠO & CHẠY NGAY
 * 1. Mở Google Sheet -> Tiện ích mở rộng -> Apps Script.
 * 2. Xóa code cũ trong 'Mã.gs', dán toàn bộ file này vào và bấm Lưu (Ctrl + S).
 * 3. Ở thanh công cụ, chọn hàm 'setupNewSpreadsheet' -> bấm Chạy (Run).
 * 4. Bấm 'Triển khai' -> 'Triển khai mới' -> 'Ứng dụng web' để lấy link sử dụng!
 * ==============================================================================
 */

// ==========================================
// 1. WEB APP ENTRYPOINT (DOGET)
// ==========================================
function doGet(e) {
  try {
    const user = apiGetCurrentUser();
    const activeKy = repoGetActiveSemester();

    const template = HtmlService.createTemplate(APP_HTML_TEMPLATE);
    template.user = user;
    template.activeKy = activeKy;

    return template.evaluate()
      .setTitle('Hệ Thống Quản Lý Vật Tư Thực Hành - VSVC')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:30px;max-width:600px;margin:40px auto;border:1px solid #fee2e2;border-radius:12px;background:#fef2f2;color:#991b1b;">' +
      '<h2 style="margin-top:0">⚠️ Lỗi Truy Cập Hệ Thống</h2>' +
      '<p>' + err.message + '</p>' +
      '<hr style="border:none;border-top:1px solid #fecaca;margin:15px 0;">' +
      '<small>Vui lòng đăng nhập bằng email trường (@vsvc.edu.vn hoặc tài khoản được cấp quyền) và liên hệ Ban quản trị để được thêm vào danh sách giáo viên.</small>' +
      '</div>'
    );
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==========================================
// 2. REPOSITORY - DATA ACCESS LAYER (REPO.GS)
// ==========================================
${repoCode}

// ==========================================
// 3. API CONTROLLER (API.GS)
// ==========================================
${apiCode}

// ==========================================
// 4. CONFIG & HELPERS (CONFIG.GS)
// ==========================================
${configCode}

// ==========================================
// 5. KHỞI TẠO BẢNG TÍNH & MENU (SETUPSPREADSHEET.GS)
// ==========================================
${setupCode}

// ==========================================
// 6. CÁC HÀM XUẤT KHO & QUẢN TRỊ BỔ SUNG
// ==========================================
${serviceAdminCode}
${serviceXuatKhoCode}

// ==========================================
// 7. GIAO DIỆN SPA WEB APP (HTML + TAILWIND + JS)
// ==========================================
const APP_HTML_TEMPLATE = ${JSON.stringify(indexContent)};
`;

fs.writeFileSync(path.join(gasDir, 'AllInOne_Code.gs'), allInOne, 'utf8');
console.log('✅ Generated gas/AllInOne_Code.gs successfully! Size:', allInOne.length, 'bytes');
