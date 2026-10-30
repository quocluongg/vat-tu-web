// Template in BM01 — bám đúng file gốc docs/BM01-Biên bản hư hỏng.docx (mã biểu mẫu BM/P.TCHC6/01)
//
// ĐỊNH DẠNG THỰC TẾ CỦA FILE GỐC (đã đối chiếu trực tiếp trong XML của .docx):
// - Giấy Letter 8.5x11in; lề trên/dưới ~1cm (header cách mép trên 0.5in), lề trái/phải 0.5in (1.27cm)
// - Font Times New Roman 13pt toàn bài; tiêu đề 16pt; bảng F: tiêu đề cột 12pt, dữ liệu 13pt
// - Giãn dòng 1.08 (≈16.1pt/dòng ở cỡ 13pt), khoảng cách đoạn = 0 (các đoạn dính sát nhau)
// - Đầu MỖI TRANG, góc phải: "BM/P.TCHC6/01" (12pt, căn phải; đã bỏ dòng "Ban hành lần: 02" theo yêu cầu)
//
// Thứ tự mẫu gốc:
// Header trang: BM/P.TCHC6/01 (lặp lại mọi trang)
// P1: dòng trống; P2-P3: header 2 cột (Trường ... / Cộng hòa ...)
// P4: "Số:..... BB-TCĐNVS" (thụt vào ~7 dấu cách, cách trên 18pt)
// P5: dòng trống; P6-P7: tiêu đề 2 dòng 16pt bold căn giữa; P8: dòng trống
// P9: "Vào lúc ... giờ ... phút, Ngày ... tháng ... năm ..." (+ chấm đến cuối dòng) + P10: 1 dòng chấm
// A/ + 4 dòng "- Ông (bà) ... Chức vụ:..."
// B/ + 7 mục
// C/ (bold kèm chấm) + (1/Tình hình + 1 dòng chấm) + (2/Nguyên nhân + 1 dòng chấm)
// D/ (bold kèm chấm) + 1 dòng chấm (bold)
// Cách trên 12pt + 4 chữ ký (nhãn căn trái theo tab) + 3 dòng trống ký + dòng chấm tên (bold)
// 1 dòng trống + Ý KIẾN LÃNH ĐẠO / TRƯỞNG PHÒNG (KHOA) + 1 dòng trống + 4 dòng chấm 2 cột (bold)
// 1 dòng trống + E/ + "1./ Kết quả:" (bold gạch chân) + 4 dòng chấm + (cách 8pt)
//   + "2. Phương án:" (bold gạch chân) + 5 dòng chấm + (cách 8pt)
// 3 chữ ký (nhãn tại tab 0 / 2.36in / 5.51in) + 3 dòng trống ký (KHÔNG dòng chấm tên)
// F/ + bảng 7 cột (1 dòng tiêu đề + 5 dòng trống)
// G/ (cách trên/dưới 6pt) + "1. Tên công việc" (3 dòng chấm) + "2. Ngày hoàn thành" + 1 dòng trống
// 3 chữ ký (nhãn tại tab 0 / 2.36in / 4.82in)
// Quy ước in: dữ liệu điền vào in ĐẬM trên dòng chấm; trống thì để dòng chấm viết tay.

const esc = (s) =>
    String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

const escInline = (s) => esc(s).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

const hasVal = (v) => v !== undefined && v !== null && String(v).trim() !== '';

// Giá trị nhỏ lồng trong câu (giờ/phút/ngày/tháng/năm). Mẫu gốc chỉ để khoảng trắng
// (không có chấm) nên trống = khoảng trắng, có dữ liệu = in đậm.
const IV = (v, w = 16) => {
    const t = hasVal(v) ? `<b>${escInline(v)}</b>` : '&nbsp;';
    return `<span class="iv" style="min-width:${w}pt">${t}</span>`;
};

// Phần giá trị trên dòng chấm. flex = tỉ lệ chiều dài khi có 2 phần trên cùng 1 dòng.
const FV = (v, flex = 1, bold = false) => {
    const t = hasVal(v) ? `<b>${escInline(v)}</b>` : '&nbsp;';
    return `<span class="fval${bold ? ' fval-b' : ''}" style="flex:${flex}">${t}</span>`;
};

// Một dòng "nhãn + chấm đến cuối dòng". Trống -> dòng chấm viết tay.
const L = (label, v) =>
    `<div class="frow"><span class="lab">${label}</span>${FV(v)}</div>`;

// Dòng chấm trống viết tay.
const BLANK = `<div class="frow">${FV('')}</div>`;
const BLANK_B = `<div class="frow">${FV('', 1, true)}</div>`;

// Dòng trống (không chấm) cao đúng 1 dòng văn bản như mẫu gốc.
const SP = (n = 1) => `<div class="bl" style="height:calc(var(--lh) * ${n})"></div>`;

// Tiêu đề mục kèm chấm trên cùng dòng (C/, D/ — chữ và chấm đều đậm như mẫu gốc).
const HBLANK = (title) =>
    `<div class="frow keep-next"><span class="lab"><b>${title}</b></span>${FV('', 1, true)}</div>`;

// Trường dài: dòng đầu có nhãn, các dòng sau tràn xuống dòng chấm tiếp theo.
// minLines: tổng số dòng chấm tối thiểu theo mẫu (kể cả dòng nhãn).
// bold: dòng chấm bold (D/ trong mẫu gốc).
const ML = (label, v, minLines = 1, bold = false) => {
    const lines = hasVal(v)
        ? String(v).split('\n').map((s) => s.trim()).filter(Boolean)
        : [];
    const first = lines[0] ?? '';
    let html = label
        ? `<div class="frow"><span class="lab">${label}</span>${FV(first, 1, bold)}</div>`
        : `<div class="frow">${FV(first, 1, bold)}</div>`;
    html += lines.slice(1).map((line) => `<div class="frow">${FV(line, 1, bold)}</div>`).join('');
    const cur = Math.max(lines.length, 1);
    for (let i = cur; i < minLines; i++) html += bold ? BLANK_B : BLANK;
    return html;
};

function splitDate(ngay_lap) {
    if (!ngay_lap) return { d: '', m: '', y: '' };
    // Nhận yyyy-mm-dd (input date) hoặc dd/mm/yyyy
    const s = String(ngay_lap).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-');
        return { d, m, y };
    }
    const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m2) return { d: m2[1], m: m2[2], y: m2[3] };
    return { d: '', m: '', y: '' };
}

function splitTime(gio_lap) {
    if (!gio_lap) return { h: '', mi: '' };
    const parts = String(gio_lap).split(':');
    return { h: parts[0] || '', mi: (parts[1] || '').slice(0, 2) };
}

function fmtDateVN(v) {
    if (!hasVal(v)) return '';
    const s = String(v).trim().slice(0, 10);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return s;
}

// Tỉ lệ chiều dài 2 phần chấm trên dòng "- Ông (bà) ..... Chức vụ:....." (đo từ mẫu gốc)
const TP_NAME = 1.28;

// Dựng khối A/ Thành phần: giữ đúng 4 dòng "- Ông (bà) ... Chức vụ:..." của mẫu gốc.
// CHỈ ĐIỀN DÒNG ĐẦU (người lập biên bản): tên in ĐẬM, chức vụ mặc định "Giảng viên" (chữ thường, căn trái).
// 3 dòng còn lại để trống chấm cho viết tay. Các dòng sau trong `thanh_phan` (đại diện khoa, người sử dụng...) bị bỏ qua.
// Chức vụ lấy theo thứ tự: "Chức vụ: ..." ghi rõ trong dòng đầu -> b.chuc_vu_nguoi_lap -> "Giảng viên".
const CHUC_VU_MAC_DINH = 'Giảng viên';

function parseNguoiLap(thanh_phan, ten_gv, chuc_vu) {
    const first = hasVal(thanh_phan)
        ? String(thanh_phan).split('\n').map((s) => s.trim()).filter(Boolean)[0] || ''
        : '';
    let name = '';
    let role = '';
    if (first) {
        let clean = first.replace(/^[-–•\d.)\s]+/, '').replace(/^(ông\s*\(bà\)|ông|bà)\s+/i, '').trim();
        const idx = clean.search(/chức\s*vụ\s*:/i);
        if (idx >= 0) {
            role = clean.slice(idx).replace(/^chức\s*vụ\s*:/i, '').trim();
            clean = clean.slice(0, idx);
        }
        // "Trần Thị Thúy Hằng — Người lập biên bản (Giáo viên)" -> chỉ lấy phần tên
        name = clean.split(/\s+[—–-]\s+|\s*\(/)[0].trim();
    }
    if (!name && hasVal(ten_gv)) name = String(ten_gv).trim();
    if (!name) return { name: '', role: '' };
    return { name, role: role || (hasVal(chuc_vu) ? String(chuc_vu).trim() : CHUC_VU_MAC_DINH) };
}

function buildThanhPhan(thanh_phan, ten_gv, chuc_vu) {
    const row = (name, role) =>
        `<div class="frow"><span class="lab">- Ông (bà)</span>${FV(name, TP_NAME)}<span class="lab">Chức vụ:</span>` +
        `<span class="fval fval-left" style="flex:1">${hasVal(role) ? escInline(role) : '&nbsp;'}</span></div>`;
    const { name, role } = parseNguoiLap(thanh_phan, ten_gv, chuc_vu);
    return row(name, role) + row('', '').repeat(3);
}

// Hàng chữ ký: nhãn căn TRÁI tại các vị trí tab của mẫu gốc (không căn giữa).
// cols: chiều rộng từng cột (vị trí bắt đầu = tổng các cột trước).
const SIGROW = (cols, items, cls = '') =>
    `<div class="sigrow ${cls}" style="grid-template-columns:${cols.join(' ')}">${items
        .map((t) => `<div>${t}</div>`)
        .join('')}</div>`;

// Ô tên dưới chữ ký (dòng chấm đậm, rộng w)
const SIGNAME = (v, w) =>
    `<div class="sig-name" style="width:${w}">${hasVal(v) ? escInline(v) : '&nbsp;'}</div>`;

export function buildBienBanHTML(bb) {
    const b = bb || {};
    const vtList = Array.isArray(b.vat_tu_list) ? b.vat_tu_list : [];
    const rows = vtList.map((v, i) => {
        const sl = v.so_luong ?? '';
        const dg = v.don_gia ? Number(v.don_gia).toLocaleString('vi-VN') : '';
        const ttRaw = v.thanh_tien ?? ((Number(v.so_luong) || 0) * (Number(v.don_gia) || 0));
        const tt = ttRaw ? Number(ttRaw).toLocaleString('vi-VN') : '';
        return `
        <tr>
            <td class="c">${i + 1}</td>
            <td>${esc(v.ten)}</td>
            <td class="c">${esc(v.dvt)}</td>
            <td class="c">${esc(sl)}</td>
            <td class="r">${esc(dg)}</td>
            <td class="r">${esc(tt)}</td>
            <td>${esc(v.ghi_chu)}</td>
        </tr>`;
    }).join('');
    // Mẫu gốc: bảng 6 dòng (1 header + 5 dòng trống viết tay)
    const emptyRows = Array.from({ length: Math.max(0, 5 - vtList.length) })
        .map(() => `<tr class="e"><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('');

    const { d, m, y } = splitDate(b.ngay_lap);
    const { h, mi } = splitTime(b.gio_lap);

    // Mẫu gốc: "Số:..... BB-TCĐNVS" (không có dấu cách sau dấu hai chấm)
    const soBB = hasVal(b.so_bien_ban) ? ` <b>${escInline(b.so_bien_ban)}</b> ` : '..... ';
    const ngayHT = fmtDateVN(b.ngay_hoan_thanh);

    // Chữ ký khối 1 (4 cột): nhãn bắt đầu tại 0 / 1.6in / 3.77in / 6.0in; chấm tên rộng theo mẫu
    const SIG1_COLS = ['1.6in', '2.17in', '2.23in', '1fr'];
    const sig1Names = [
        SIGNAME('', '1.26in'),
        SIGNAME(b.nguoi_phat_hien, '1.63in'),
        SIGNAME('', '1.63in'),
        SIGNAME(b.ten_gv, '1.46in'),
    ];

    // 4 dòng chấm 2 cột của "Ý KIẾN LÃNH ĐẠO / TRƯỞNG PHÒNG (KHOA)" (chấm đậm như mẫu gốc)
    const ykRows = `<div class="yk">${BLANK_B}${BLANK_B}</div>`.repeat(4);

    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>Biên bản ${escInline(b.so_bien_ban || b.id || '')}</title>
<style>
  :root { --lh: 16.1pt; } /* 1 dòng 13pt, giãn dòng 1.08 như Word */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { background: #fff; }
  body {
    font-family: 'Times New Roman', Times, 'Liberation Serif', serif;
    font-size: 13pt; line-height: var(--lh); color: #000;
    width: 7.5in; margin: 0 auto; padding: 0.5in 0 0.4in;
  }
  b { font-weight: 700; }

  /* Khung 1 bảng để thead (header BM/P.TCHC6/01) lặp lại ở đầu MỖI trang in */
  table.page { width: 100%; border-collapse: collapse; }
  table.page > thead { display: table-header-group; }
  table.page > thead > tr > td, table.page > tbody > tr > td { padding: 0; border: none; vertical-align: top; }
  .mh { text-align: right; font-size: 12pt; line-height: 13.8pt; }

  .bl { display: block; }
  .head-table { width: 100%; border-collapse: collapse; }
  .head-table td { border: none; padding: 0; vertical-align: top; text-align: center; font-size: 13pt; }
  .so-line { margin-top: 18pt; padding-left: 22.75pt; }  /* 7 dấu cách như mẫu */
  h2 { text-align: center; font-size: 16pt; line-height: 19.85pt; font-weight: 700; margin: 0; }

  /* Dòng chấm: nhãn thường, giá trị đậm nằm trên dòng chấm kéo đến cuối dòng */
  .frow { display: flex; align-items: flex-end; break-inside: avoid; }
  .frow .lab { white-space: nowrap; }
  .frow .fval { flex: 1; border-bottom: 1.2px dotted #000; min-width: 24pt; min-height: var(--lh); padding: 0 3px; line-height: calc(var(--lh) - 2px); }
  .frow .fval { text-align: left; }
  .frow .fval-left { font-weight: 400; text-align: left; white-space: nowrap; overflow: visible; }
  .frow .fval-b { border-bottom-width: 1.6px; font-weight: 700; }
  .frow > .fval:first-child { padding-left: 0; }
  .iv { display: inline-block; text-align: center; }
  .u { text-decoration: underline; }
  .keep-next, .hd { break-after: avoid; page-break-after: avoid; }
  .sigrow.keep-next { break-after: avoid; page-break-after: avoid; }
  .gap8 { height: 8pt; }

  /* Khối chữ ký: nhãn căn trái theo vị trí tab của mẫu */
  .sigrow { display: grid; font-weight: 700; white-space: nowrap; break-inside: avoid; page-break-inside: avoid; }
  .sigrow.names { font-weight: 700; white-space: normal; }
  .sig-name { border-bottom: 1.6px dotted #000; font-weight: 700; min-height: var(--lh); line-height: calc(var(--lh) - 2px); padding: 0 3px; word-break: break-word; }
  .keep { break-inside: avoid; page-break-inside: avoid; }
  .yk { display: grid; grid-template-columns: 3.17in 3.01in; column-gap: 0.22in; break-inside: avoid; page-break-inside: avoid; }

  /* Bảng F: rộng hết khổ chữ (mẫu gốc 10790 twips ≈ 7.49in) */
  .vtable { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .vtable th, .vtable td { border: 0.75pt solid #000; padding: 0 5.4pt; font-size: 13pt; vertical-align: middle; word-break: break-word; }
  .vtable th { font-size: 12pt; font-weight: 700; text-align: center; height: 23.65pt; padding-top: 6pt; line-height: 14.9pt; vertical-align: top; }
  .vtable td { height: 22.5pt; }
  .vtable tr.e td { height: 28pt; }
  .vtable tr { break-inside: avoid; }
  .vtable thead { display: table-header-group; }
  .vtable .c { text-align: center; }
  .vtable .r { text-align: right; }

  @media print {
    @page { size: 8.5in 11in; margin: 0.5in 0.5in 0.4in; }
    body { width: auto; padding: 0; margin: 0; }
  }
</style>
</head>
<body>
<table class="page">
<thead><tr><td>
  <!-- Header trang (lặp mọi trang): mã biểu mẫu -->
  <div class="mh">BM/P.TCHC6/01</div>
</td></tr></thead>
<tbody><tr><td>
  ${SP()}

  <!-- P2-P3: cột trái 2.4in, cột phải phần còn lại (căn giữa theo vị trí chữ trong mẫu gốc) -->
  <table class="head-table">
    <tr>
      <td style="width:2.4in; white-space:nowrap">
        <div><b>TRƯỜNG CAO ĐẲNG NGHỀ</b></div>
        <div><b>VIỆT NAM-SINGAPORE</b></div>
      </td>
      <td style="white-space:nowrap">
        <div><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b></div>
        <div><b>Độc lập – Tự do – Hạnh phúc</b></div>
      </td>
    </tr>
  </table>
  <!-- P4 -->
  <div class="so-line">Số:${soBB}BB-TCĐNVS</div>
  ${SP()}

  <!-- P6-P7 -->
  <h2>BIÊN BẢN GHI NHẬN TÌNH HÌNH<br/>HƯ HỎNG THIẾT BỊ</h2>
  ${SP()}

  <!-- P9-P10: "Vào lúc ... giờ ... phút, Ngày ... tháng ... năm ..." rồi chấm đến cuối dòng -->
  <div class="frow"><span class="lab">Vào lúc ${IV(h)} giờ ${IV(mi)} phút, Ngày ${IV(d)} tháng ${IV(m)} năm ${IV(y, 17)}</span>${FV('')}</div>
  ${BLANK}

  <!-- A/ -->
  <div class="hd"><b>A/ Thành phần tham gia lập biên bản:</b></div>
  ${buildThanhPhan(b.thanh_phan, b.ten_gv, b.chuc_vu_nguoi_lap)}

  <!-- B/ -->
  <div class="hd"><b>B/ Cùng lập biên bản ghi nhận sự việc như sau:</b></div>
  ${L('1/ Tên máy móc thiết bị:', b.ten_thiet_bi)}
  ${L('2/ Mã số ( ký hiệu):', b.ma_so)}
  <div class="frow"><span class="lab">3/ Phòng (khoa) quản lý:</span>${FV(b.phong_khoa, 1.25)}<span class="lab">Địa điểm:</span>${FV(b.dia_diem, 1)}</div>
  ${L('4/ Người sử dụng:', b.nguoi_su_dung)}
  ${L('5/ Thời gian phát hiện hư hỏng:', b.thoi_gian_phat_hien)}
  ${L('6/ Người phát hiện:', b.nguoi_phat_hien)}
  ${ML('7/ Hiện tượng hư hỏng:', b.hien_tuong_hu_hong, 1)}

  <!-- C/ -->
  ${HBLANK('C/ Tạm kết luận sơ bộ:')}
  ${ML('1/Tình hình:', hasVal(b.tinh_hinh) ? b.tinh_hinh : b.tinh_trang, 2)} <!-- tình trạng thiết bị ghi vào C/ mục 1 -->
  ${ML('2/ Nguyên nhân:', b.nguyen_nhan, 2)}

  <!-- D/ : dòng chấm của mục D đậm như mẫu gốc -->
  ${HBLANK('D/ Đề nghị khắc phục, sửa chữa:')}
  ${ML('', b.de_nghi_khac_phuc, 1, true)}

  <!-- 4 chữ ký: cách trên 12pt, 3 dòng trống để ký, rồi dòng chấm tên -->
  <div class="keep" style="margin-top:12pt">
    ${SIGROW(SIG1_COLS, ['TỔ TRƯỞNG', 'NGƯỜI PHÁT HIỆN', 'KỸ THUẬT VIÊN', 'NGƯỜI LẬP'])}
    ${SP(3)}
    ${SIGROW(SIG1_COLS, sig1Names, 'names')}
  </div>
  ${SP()}

  <!-- Ý KIẾN LÃNH ĐẠO / TRƯỞNG PHÒNG (KHOA): nguyên 1 cụm nhãn + dòng trống + 4 dòng chấm đi chung, không ngắt đôi khi sang trang -->
  <div class="keep">
    ${SIGROW(['3.5in', '1fr'], ['Ý KIẾN LÃNH ĐẠO', 'TRƯỞNG PHÒNG (KHOA)'])}
    ${SP()}
    ${ykRows}
  </div>
  ${SP()}

  <!-- E/ : 4 dòng chấm cho Kết quả, 5 dòng cho Phương án, mỗi khối cách 8pt như mẫu -->
  <div class="hd"><b>E/ Kết quả kiểm tra và phương án thực hiện.</b></div>
  <div class="hd"><b class="u">1./ Kết quả:</b></div>
  ${ML('', b.ket_qua_kiem_tra, 4)}
  <div class="gap8"></div>
  <div class="hd"><b class="u">2. Phương án:</b></div>
  ${ML('', b.phuong_an, 5)}
  <div class="gap8"></div>

  <!-- 3 chữ ký (tab 0 / 2.36in / 5.51in): chỉ khoảng trống ký, KHÔNG dòng chấm tên. Mẫu: 3 dòng trống (mỗi dòng cách sau 8pt) -->
  <div class="keep">
    ${SIGROW(['2.36in', '3.15in', '1fr'], ['KỸ THUẬT VIÊN', 'TRƯỞNG PHÒNG (KHOA)', 'Ý KIẾN LÃNH ĐẠO'])}
    <div style="height:calc(var(--lh) * 3 + 24pt + 8pt)"></div>
  </div>

  <!-- F/ + bảng (rộng 10790 twips: 562/3119/1134/1276/1275/1882/1542) -->
  <div class="hd" style="margin-bottom:8pt"><b>F / Vật tư phát sinh (nếu có):</b></div>
  <table class="vtable">
    <colgroup>
      <col style="width:5.21%"><col style="width:28.91%"><col style="width:10.51%"><col style="width:11.83%">
      <col style="width:11.82%"><col style="width:17.44%"><col style="width:14.29%">
    </colgroup>
    <thead>
      <tr>
        <th>TT</th>
        <th>Tên vật tư</th>
        <th>Đơn vị</th>
        <th>Số lượng</th>
        <th>Đơn giá</th>
        <th>Thành Tiền</th>
        <th>Ghi Chú</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${emptyRows}
    </tbody>
  </table>

  <!-- G/ : cách trên và dưới 6pt; "Tên công việc" 3 dòng chấm; các mục cách nhau 8pt -->
  <div class="hd" style="margin:6pt 0"><b>G / Nghiệm thu:</b></div>
  ${ML('1. Tên công việc :', b.cong_viec_nghiem_thu, 3)}
  <div class="gap8"></div>
  ${L('2. Ngày hoàn thành:', ngayHT)}
  <div class="gap8"></div>
  ${SP()}
  <div class="gap8"></div>

  <!-- 3 chữ ký (tab 0 / 2.36in / 4.82in); mẫu gốc kết thúc ngay tại dòng nhãn, phần dưới để trống cho người ký -->
  <div class="keep">
    ${SIGROW(['2.36in', '2.46in', '1fr'], ['NGƯỜI THỰC HIỆN', 'TRƯỞNG PHÒNG (KHOA)', 'XÁC NHẬN CỦA LÃNH ĐẠO'])}
  </div>
</td></tr></tbody>
</table>
</body>
</html>`;
}