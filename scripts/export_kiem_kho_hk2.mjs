import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local');
    process.exit(1);
}

const db = createClient({ url, authToken });

async function run() {
    console.log('Fetching HK2 2025-2026 inventory data from Turso...');

    // 1. Fetch semester info
    const kiResult = await db.execute({
        sql: 'SELECT * FROM ki_hoc WHERE id = 7'
    });
    const ki = kiResult.rows[0];
    console.log(`Semester: ${ki.ten_ki} (${ki.nam_hoc}) - Status: ${ki.trang_thai}`);

    // 2. Fetch all materials with related stats
    const query = `
        SELECT vt.id, vt.ten_vat_tu, vt.yeu_cau_ky_thuat, vt.don_vi_tinh, vt.so_luong_kho, vt.ki_id, vt.nganh_id,
               COALESCE(ndt.ten_nganh, 'Dùng chung') as ten_nganh,
               COALESCE(dx_sum.tong_de_xuat, 0) as tong_de_xuat,
               COALESCE(px_sum.tong_da_xuat, 0) as tong_da_xuat,
               COALESCE(px_pending.tong_dang_cho_xuat, 0) as tong_dang_cho_xuat
        FROM vat_tu vt
        LEFT JOIN nganh ndt ON vt.nganh_id = ndt.id
        LEFT JOIN (
            SELECT dxct.vat_tu_id, SUM(dxct.so_luong) as tong_de_xuat
            FROM de_xuat_chi_tiet dxct
            JOIN de_xuat dx ON dxct.de_xuat_id = dx.id
            WHERE dx.ki_id = 7 AND dx.trang_thai IN ('da_nop', 'duyet', 'dang_lam')
            GROUP BY dxct.vat_tu_id
        ) dx_sum ON vt.id = dx_sum.vat_tu_id
        LEFT JOIN (
            SELECT pxct.vat_tu_id, SUM(pxct.so_luong) as tong_da_xuat
            FROM phieu_xuat_chi_tiet pxct
            JOIN phieu_xuat px ON pxct.phieu_xuat_id = px.id
            WHERE px.ki_id = 7 AND px.trang_thai = 'da_xuat'
            GROUP BY pxct.vat_tu_id
        ) px_sum ON vt.id = px_sum.vat_tu_id
        LEFT JOIN (
            SELECT pxct.vat_tu_id, SUM(pxct.so_luong) as tong_dang_cho_xuat
            FROM phieu_xuat_chi_tiet pxct
            JOIN phieu_xuat px ON pxct.phieu_xuat_id = px.id
            WHERE px.ki_id = 7 AND px.trang_thai IN ('cho_duyet', 'da_ky')
            GROUP BY pxct.vat_tu_id
        ) px_pending ON vt.id = px_pending.vat_tu_id
        WHERE vt.ki_id = 7
        ORDER BY 
            CASE WHEN ndt.ten_nganh IS NULL THEN 99 ELSE vt.nganh_id END,
            vt.ten_vat_tu ASC
    `;

    const result = await db.execute(query);
    const materials = result.rows;
    console.log(`Fetched ${materials.length} materials for HK2 2025-2026.`);

    // 3. Build Excel Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vật Tư Web - VNSC';
    workbook.lastModifiedBy = 'Hệ thống Quản lý Vật tư';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Group materials by nganh
    const nganhGroups = {};
    materials.forEach(m => {
        const nganhName = m.ten_nganh || 'Dùng chung';
        if (!nganhGroups[nganhName]) {
            nganhGroups[nganhName] = [];
        }
        nganhGroups[nganhName].push(m);
    });

    // Helper to build a sheet
    function buildSheet(sheetTitle, items, nganhLabel = null) {
        // Safe sheet title (max 31 chars, no illegal characters)
        const safeTitle = sheetTitle.substring(0, 31).replace(/[\\/*?:\[\]]/g, '');
        const sheet = workbook.addWorksheet(safeTitle, {
            pageSetup: {
                paperSize: 9, // A4
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            },
            views: [{ state: 'frozen', xSplit: 3, ySplit: 9 }] // Freeze STT, Mã, Tên and headers
        });

        // Setup Header Information
        sheet.mergeCells('A1:F1');
        sheet.getCell('A1').value = 'TRƯỜNG CAO ĐẲNG NGHỀ VIỆT NAM - SINGAPORE';
        sheet.getCell('A1').font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1F497D' } };

        sheet.mergeCells('A2:F2');
        sheet.getCell('A2').value = nganhLabel ? `KHOA / BỘ MÔN: ${nganhLabel.toUpperCase()}` : 'PHÒNG QUẢN TRỊ - THIẾT BỊ / BAN KIỂM KHO';
        sheet.getCell('A2').font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF595959' } };

        sheet.mergeCells('L1:O1');
        sheet.getCell('L1').value = 'Mẫu số: KK-VT-02/HK2';
        sheet.getCell('L1').font = { name: 'Times New Roman', size: 10, italic: true };
        sheet.getCell('L1').alignment = { horizontal: 'right' };

        sheet.mergeCells('A4:O4');
        sheet.getCell('A4').value = 'BẢNG KIỂM KÊ VẬT TƯ & ĐỐI SOÁT HIỆU CHỈNH TỒN KHO THỰC HÀNH';
        sheet.getCell('A4').font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FF0F243E' } };
        sheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(4).height = 28;

        sheet.mergeCells('A5:O5');
        sheet.getCell('A5').value = `HỌC KỲ II - NĂM HỌC 2025 - 2026${nganhLabel ? ` - BỘ MÔN: ${nganhLabel.toUpperCase()}` : ' - TOÀN TRƯỜNG'}`;
        sheet.getCell('A5').font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FF0284C7' } };
        sheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(5).height = 20;

        sheet.mergeCells('A6:O6');
        sheet.getCell('A6').value = `(Tổng số danh mục: ${items.length} vật tư | Ngày trích xuất: ${new Date().toLocaleDateString('vi-VN')} | Đơn vị tính số lượng: Theo danh mục vật tư)`;
        sheet.getCell('A6').font = { name: 'Times New Roman', size: 10.5, italic: true, color: { argb: 'FF595959' } };
        sheet.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(6).height = 18;

        // Group Header (Row 8)
        sheet.getRow(8).height = 24;
        sheet.getRow(9).height = 28;

        // Header Group 1: THÔNG TIN VẬT TƯ (A8:F8)
        sheet.mergeCells('A8:F8');
        const hg1 = sheet.getCell('A8');
        hg1.value = 'THÔNG TIN VẬT TƯ';
        hg1.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1F497D' } };
        hg1.alignment = { horizontal: 'center', vertical: 'middle' };
        hg1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

        // Header Group 2: SỐ LIỆU SỔ SÁCH HỆ THỐNG (G8:J8)
        sheet.mergeCells('G8:J8');
        const hg2 = sheet.getCell('G8');
        hg2.value = 'SỐ LIỆU SỔ SÁCH HỆ THỐNG';
        hg2.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1F497D' } };
        hg2.alignment = { horizontal: 'center', vertical: 'middle' };
        hg2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };

        // Header Group 3: KẾT QUẢ KIỂM KÊ THỰC TẾ (K8:L8)
        sheet.mergeCells('K8:L8');
        const hg3 = sheet.getCell('K8');
        hg3.value = 'KIỂM KÊ THỰC TẾ';
        hg3.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFC65911' } };
        hg3.alignment = { horizontal: 'center', vertical: 'middle' };
        hg3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };

        // Header Group 4: HIỆU CHỈNH & XỬ LÝ SAU KIỂM KÊ (M8:O8)
        sheet.mergeCells('M8:O8');
        const hg4 = sheet.getCell('M8');
        hg4.value = 'HIỆU CHỈNH & XỬ LÝ SAU KIỂM KÊ';
        hg4.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF375623' } };
        hg4.alignment = { horizontal: 'center', vertical: 'middle' };
        hg4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };

        // Apply borders for Row 8
        for (let col = 1; col <= 15; col++) {
            sheet.getCell(8, col).border = {
                top: { style: 'medium', color: { argb: 'FF4F81BD' } },
                bottom: { style: 'thin', color: { argb: 'FF4F81BD' } },
                left: { style: 'thin', color: { argb: 'FFB8CCE4' } },
                right: { style: 'thin', color: { argb: 'FFB8CCE4' } }
            };
        }

        // Subheaders (Row 9)
        const columnsDef = [
            { col: 1, header: 'STT', width: 6, fill: 'FFD9E1F2', textColor: 'FF1F497D' },
            { col: 2, header: 'Mã VT\n(ID)', width: 9, fill: 'FFD9E1F2', textColor: 'FF1F497D' },
            { col: 3, header: 'Tên vật tư', width: 36, fill: 'FFD9E1F2', textColor: 'FF1F497D' },
            { col: 4, header: 'Quy cách / Yêu cầu kỹ thuật', width: 30, fill: 'FFD9E1F2', textColor: 'FF1F497D' },
            { col: 5, header: 'Đơn vị\ntính', width: 10, fill: 'FFD9E1F2', textColor: 'FF1F497D' },
            { col: 6, header: 'Ngành / Bộ môn', width: 22, fill: 'FFD9E1F2', textColor: 'FF1F497D' },
            { col: 7, header: 'Tồn kho\nsổ sách', width: 14, fill: 'FFDCE6F1', textColor: 'FF1F497D' },
            { col: 8, header: 'Tổng\nđề xuất', width: 13, fill: 'FFDCE6F1', textColor: 'FF1F497D' },
            { col: 9, header: 'Đã xuất\nthực tế', width: 13, fill: 'FFDCE6F1', textColor: 'FF1F497D' },
            { col: 10, header: 'Đang chờ\nxuất kho', width: 13, fill: 'FFDCE6F1', textColor: 'FF1F497D' },
            { col: 11, header: 'Số lượng\nthực tế đếm', width: 16, fill: 'FFFCE4D6', textColor: 'FFC65911' },
            { col: 12, header: 'Chênh lệch\n(+Thừa / -Thiếu)', width: 16, fill: 'FFFCE4D6', textColor: 'FFC65911' },
            { col: 13, header: 'Số sau\nhiệu chỉnh', width: 16, fill: 'FFE2EFDA', textColor: 'FF375623' },
            { col: 14, header: 'Lý do chênh lệch\n& Phương án xử lý', width: 32, fill: 'FFE2EFDA', textColor: 'FF375623' },
            { col: 15, header: 'Ghi chú', width: 20, fill: 'FFE2EFDA', textColor: 'FF375623' }
        ];

        columnsDef.forEach(c => {
            const cell = sheet.getCell(9, c.col);
            cell.value = c.header;
            cell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: c.textColor } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.fill } };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF4F81BD' } },
                bottom: { style: 'medium', color: { argb: 'FF4F81BD' } },
                left: { style: 'thin', color: { argb: 'FFB8CCE4' } },
                right: { style: 'thin', color: { argb: 'FFB8CCE4' } }
            };
            sheet.getColumn(c.col).width = c.width;
        });

        // Populate Data Rows (Starting at row 10)
        let currentRow = 10;
        const thinBorder = {
            top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
        };

        items.forEach((m, idx) => {
            const row = sheet.getRow(currentRow);
            row.height = 22;

            // 1. STT
            row.getCell(1).value = idx + 1;
            row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

            // 2. Mã VT (ID)
            row.getCell(2).value = m.id;
            row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(2).font = { name: 'Times New Roman', size: 10, color: { argb: 'FF595959' } };

            // 3. Tên vật tư
            row.getCell(3).value = m.ten_vat_tu;
            row.getCell(3).font = { name: 'Times New Roman', size: 11, bold: true };
            row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

            // 4. Quy cách / YCKT
            row.getCell(4).value = m.yeu_cau_ky_thuat || '';
            row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

            // 5. ĐVT
            row.getCell(5).value = m.don_vi_tinh;
            row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

            // 6. Ngành
            row.getCell(6).value = m.ten_nganh;
            row.getCell(6).alignment = { horizontal: 'left', vertical: 'middle' };

            // 7. Tồn kho sổ sách
            row.getCell(7).value = Number(m.so_luong_kho) || 0;
            row.getCell(7).numFmt = '#,##0';
            row.getCell(7).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF0F243E' } };
            row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };

            // 8. Tổng đề xuất
            row.getCell(8).value = Number(m.tong_de_xuat) || 0;
            row.getCell(8).numFmt = '#,##0';
            row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };

            // 9. Đã xuất kho
            row.getCell(9).value = Number(m.tong_da_xuat) || 0;
            row.getCell(9).numFmt = '#,##0';
            row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };

            // 10. Đang chờ xuất
            row.getCell(10).value = Number(m.tong_dang_cho_xuat) || 0;
            row.getCell(10).numFmt = '#,##0';
            row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };

            // 11. Số lượng thực tế kiểm đếm (Blank cell with highlight fill for user input)
            const cellK = row.getCell(11);
            cellK.value = null; // empty for auditor to fill
            cellK.numFmt = '#,##0';
            cellK.alignment = { horizontal: 'right', vertical: 'middle' };
            cellK.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }; // Light pastel yellow
            cellK.border = {
                top: { style: 'thin', color: { argb: 'FFD5A6BD' } },
                bottom: { style: 'thin', color: { argb: 'FFD5A6BD' } },
                left: { style: 'thin', color: { argb: 'FFD5A6BD' } },
                right: { style: 'thin', color: { argb: 'FFD5A6BD' } }
            };

            // 12. Chênh lệch (Formula: K - G)
            const cellL = row.getCell(12);
            cellL.value = { formula: `IF(ISBLANK(K${currentRow}),"",K${currentRow}-G${currentRow})` };
            cellL.numFmt = '+#,##0;-#,##0;0';
            cellL.font = { name: 'Times New Roman', size: 11, bold: true };
            cellL.alignment = { horizontal: 'right', vertical: 'middle' };

            // 13. Số sau hiệu chỉnh (Empty for user)
            const cellM = row.getCell(13);
            cellM.value = null;
            cellM.numFmt = '#,##0';
            cellM.alignment = { horizontal: 'right', vertical: 'middle' };
            cellM.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F9F1' } };

            // 14. Lý do & Phương án
            row.getCell(14).value = '';
            row.getCell(14).alignment = { horizontal: 'left', vertical: 'middle' };

            // 15. Ghi chú
            row.getCell(15).value = '';
            row.getCell(15).alignment = { horizontal: 'left', vertical: 'middle' };

            // Apply standard borders and fonts to non-customized cells
            for (let c = 1; c <= 15; c++) {
                const cell = row.getCell(c);
                if (!cell.font) cell.font = { name: 'Times New Roman', size: 10.5 };
                if (c !== 11) cell.border = thinBorder;
            }

            // Alternating subtle zebra row shading (cols 1-10)
            if (idx % 2 === 1) {
                for (let c = 1; c <= 10; c++) {
                    row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                }
            }

            currentRow++;
        });

        const lastDataRow = currentRow - 1;

        // SUMMARY ROW (DÒNG TỔNG CỘNG)
        const summaryRow = sheet.getRow(currentRow);
        summaryRow.height = 26;

        sheet.mergeCells(`A${currentRow}:F${currentRow}`);
        const sumLabel = summaryRow.getCell(1);
        sumLabel.value = 'TỔNG CỘNG:';
        sumLabel.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1F497D' } };
        sumLabel.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col G: Tồn kho sổ sách
        summaryRow.getCell(7).value = { formula: `SUM(G10:G${lastDataRow})` };
        summaryRow.getCell(7).numFmt = '#,##0';

        // Col H: Tổng đề xuất
        summaryRow.getCell(8).value = { formula: `SUM(H10:H${lastDataRow})` };
        summaryRow.getCell(8).numFmt = '#,##0';

        // Col I: Đã xuất
        summaryRow.getCell(9).value = { formula: `SUM(I10:I${lastDataRow})` };
        summaryRow.getCell(9).numFmt = '#,##0';

        // Col J: Đang chờ xuất
        summaryRow.getCell(10).value = { formula: `SUM(J10:J${lastDataRow})` };
        summaryRow.getCell(10).numFmt = '#,##0';

        // Col K: Thực tế
        summaryRow.getCell(11).value = { formula: `SUM(K10:K${lastDataRow})` };
        summaryRow.getCell(11).numFmt = '#,##0';

        // Col L: Chênh lệch
        summaryRow.getCell(12).value = { formula: `SUM(L10:L${lastDataRow})` };
        summaryRow.getCell(12).numFmt = '+#,##0;-#,##0;0';

        // Col M: Số sau hiệu chỉnh
        summaryRow.getCell(13).value = { formula: `SUM(M10:M${lastDataRow})` };
        summaryRow.getCell(13).numFmt = '#,##0';

        for (let c = 1; c <= 15; c++) {
            const cell = summaryRow.getCell(c);
            if (!cell.font) cell.font = { name: 'Times New Roman', size: 11, bold: true };
            else cell.font.bold = true;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEFEF' } };
            cell.border = {
                top: { style: 'medium', color: { argb: 'FF1F497D' } },
                bottom: { style: 'double', color: { argb: 'FF1F497D' } },
                left: { style: 'thin', color: { argb: 'FFB8CCE4' } },
                right: { style: 'thin', color: { argb: 'FFB8CCE4' } }
            };
        }

        // FOOTER / SIGNATURES SECTION
        currentRow += 2;
        sheet.mergeCells(`K${currentRow}:O${currentRow}`);
        const dateCell = sheet.getCell(`K${currentRow}`);
        dateCell.value = 'Bình Dương, ngày ...... tháng ...... năm 2026';
        dateCell.font = { name: 'Times New Roman', size: 11, italic: true };
        dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

        currentRow += 1;
        sheet.getRow(currentRow).height = 20;

        // 4 Columns of signers
        sheet.mergeCells(`A${currentRow}:C${currentRow}`);
        sheet.getCell(`A${currentRow}`).value = 'NGƯỜI KIỂM KÊ';
        sheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };

        sheet.mergeCells(`D${currentRow}:G${currentRow}`);
        sheet.getCell(`D${currentRow}`).value = 'THỦ KHO VẬT TƯ';
        sheet.getCell(`D${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        sheet.getCell(`D${currentRow}`).alignment = { horizontal: 'center' };

        sheet.mergeCells(`H${currentRow}:J${currentRow}`);
        sheet.getCell(`H${currentRow}`).value = nganhLabel ? `TRƯỞNG KHOA / BỘ MÔN` : 'TRƯỞNG PHÒNG QT-TB';
        sheet.getCell(`H${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        sheet.getCell(`H${currentRow}`).alignment = { horizontal: 'center' };

        sheet.mergeCells(`K${currentRow}:O${currentRow}`);
        sheet.getCell(`K${currentRow}`).value = 'BAN GIÁM HIỆU DUYỆT';
        sheet.getCell(`K${currentRow}`).font = { name: 'Times New Roman', size: 11, bold: true };
        sheet.getCell(`K${currentRow}`).alignment = { horizontal: 'center' };

        currentRow += 1;
        sheet.mergeCells(`A${currentRow}:C${currentRow}`);
        sheet.getCell(`A${currentRow}`).value = '(Ký, ghi rõ họ tên)';
        sheet.getCell(`A${currentRow}`).font = { name: 'Times New Roman', size: 9.5, italic: true, color: { argb: 'FF595959' } };
        sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };

        sheet.mergeCells(`D${currentRow}:G${currentRow}`);
        sheet.getCell(`D${currentRow}`).value = '(Ký, ghi rõ họ tên)';
        sheet.getCell(`D${currentRow}`).font = { name: 'Times New Roman', size: 9.5, italic: true, color: { argb: 'FF595959' } };
        sheet.getCell(`D${currentRow}`).alignment = { horizontal: 'center' };

        sheet.mergeCells(`H${currentRow}:J${currentRow}`);
        sheet.getCell(`H${currentRow}`).value = '(Ký, ghi rõ họ tên)';
        sheet.getCell(`H${currentRow}`).font = { name: 'Times New Roman', size: 9.5, italic: true, color: { argb: 'FF595959' } };
        sheet.getCell(`H${currentRow}`).alignment = { horizontal: 'center' };

        sheet.mergeCells(`K${currentRow}:O${currentRow}`);
        sheet.getCell(`K${currentRow}`).value = '(Ký, đóng dấu)';
        sheet.getCell(`K${currentRow}`).font = { name: 'Times New Roman', size: 9.5, italic: true, color: { argb: 'FF595959' } };
        sheet.getCell(`K${currentRow}`).alignment = { horizontal: 'center' };

        // blank rows for signature spacing
        currentRow += 5;
    }

    // 4. Generate Master Sheet: "Toàn bộ vật tư"
    console.log('Generating Sheet: Toàn bộ vật tư...');
    buildSheet('Toàn bộ vật tư', materials, null);

    // 5. Generate Individual Nganh Sheets
    const orderedNganhs = [
        'Điện công nghiệp',
        'Cơ điện tử',
        'Điện tử',
        'Dùng chung',
        'Kỹ thuật máy lạnh và điều hòa không khí'
    ];

    for (const ngName of orderedNganhs) {
        if (nganhGroups[ngName]) {
            console.log(`Generating Sheet: ${ngName} (${nganhGroups[ngName].length} items)...`);
            // Short tab names for tabs
            let tabName = ngName;
            if (ngName === 'Kỹ thuật máy lạnh và điều hòa không khí') {
                tabName = 'Nhiệt - Lạnh';
            }
            buildSheet(tabName, nganhGroups[ngName], ngName);
        }
    }

    // 6. Save Workbook directly into project root directory
    const outputPath = path.join(__dirname, '..', 'Bang_Kiem_Ke_Vat_Tu_HK2_2025_2026.xlsx');
    console.log(`Writing file to: ${outputPath}...`);
    await workbook.xlsx.writeFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`SUCCESS! File generated: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

run().catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
});
