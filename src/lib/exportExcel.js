import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportExcelThucHanh = async (dataList, fileName = 'Du_Tru_Vat_Tu.xlsx') => {
    const workbook = new ExcelJS.Workbook();

    dataList.forEach((data, sheetIndex) => {
        const { kiHocStr, tenMon, soGio, classList, materialList, gvName } = data;
        const soGioTH = soGio || 45; // Default 45

        // Clean sheet title (max 31 chars, no invalid chars)
        let sheetTitle = (tenMon || `Sheet ${sheetIndex + 1}`).substring(0, 31).replace(/[\\/*?:\[\]]/g, '');

        const maxClasses = Math.max(5, classList.length);
        const paddedClasses = [...classList];
        while (paddedClasses.length < maxClasses) {
            paddedClasses.push({ ten_lop: '', si_so: '' });
        }

        const sheet = workbook.addWorksheet(sheetTitle, {
            pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 } // A4 landscape
        });

        // --- Header Format ---
        sheet.mergeCells('A1:E1');
        sheet.getCell('A1').value = 'TRƯỜNG CAO ĐẲNG NGHỀ VIỆT NAM - SINGAPORE';
        sheet.getCell('A1').font = { name: 'Times New Roman', size: 12, bold: true };

        sheet.mergeCells('A2:E2');
        sheet.getCell('A2').value = 'KHOA: ..........................'; // Default, maybe adapt if available
        sheet.getCell('A2').font = { name: 'Times New Roman', size: 12, bold: true };

        const lastColId = 5 + maxClasses + 11 + 4; // stt..donvitinh+tieuhao(5) + maxClasses + TH(11) + 4 extra cols
        const lastColName = sheet.getColumn(lastColId).letter;

        sheet.mergeCells(`A3:${lastColName}3`);
        sheet.getCell('A3').value = 'DỰ TRÙ VÀ XUẤT VẬT TƯ TIÊU HAO CHO THỰC HÀNH';
        sheet.getCell('A3').font = { name: 'Times New Roman', size: 14, bold: true };
        sheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

        sheet.mergeCells(`A4:${lastColName}4`);
        sheet.getCell('A4').value = kiHocStr || 'HỌC KỲ ... NĂM HỌC ...';
        sheet.getCell('A4').font = { name: 'Times New Roman', size: 12, bold: true };
        sheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

        sheet.mergeCells(`A5:${lastColName}5`);
        sheet.getCell('A5').value = `Mô đun: ${tenMon}; Số giờ TH: ${soGioTH} GIỜ`;
        sheet.getCell('A5').font = { name: 'Times New Roman', size: 12, bold: true };
        sheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(5).height = 25;

        // --- Table Headers ---
        const headerRow1 = sheet.getRow(7);
        const headerRow2 = sheet.getRow(8);
        const headerRow3 = sheet.getRow(9);

        headerRow1.height = 25;
        headerRow2.height = 20;
        headerRow3.height = 25;

        // A-E
        sheet.mergeCells('A7:A9');
        sheet.getCell('A7').value = 'STT';
        sheet.mergeCells('B7:B9');
        sheet.getCell('B7').value = 'Tên vật tư';
        sheet.mergeCells('C7:C9');
        sheet.getCell('C7').value = 'Yêu cầu kỹ thuật';
        sheet.mergeCells('D7:D9');
        sheet.getCell('D7').value = 'Đơn vị tính';
        sheet.mergeCells('E7:E9');
        sheet.getCell('E7').value = 'Tiêu hao\n/1HS';
        sheet.getCell('E7').font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFF0000' } };
        sheet.getCell('E7').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // F to F+maxClasses-1
        const classStartCol = 6;
        const classEndCol = 5 + maxClasses;
        sheet.mergeCells(7, classStartCol, 7, classEndCol);
        sheet.getCell(7, classStartCol).value = 'LỚP/SS/GV';

        paddedClasses.forEach((cls, idx) => {
            const col = classStartCol + idx;
            const colLetter = sheet.getColumn(col).letter;

            sheet.mergeCells(`${colLetter}8:${colLetter}8`); // Lớp
            sheet.getCell(8, col).value = cls.ten_lop || '';
            sheet.getCell(8, col).alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 };

            sheet.mergeCells(`${colLetter}9:${colLetter}9`); // SS
            sheet.getCell(9, col).value = cls.si_so ? parseInt(cls.si_so) : '';
            sheet.getCell(9, col).font = { name: 'Times New Roman', size: 11, bold: true };
            sheet.getCell(9, col).alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Số lượng (TH1-11)
        const thStartCol = classEndCol + 1;
        const thEndCol = thStartCol + 10;
        sheet.mergeCells(7, thStartCol, 7, thEndCol);
        sheet.getCell(7, thStartCol).value = 'Số lượng';

        for (let i = 0; i <= 10; i++) {
            const col = thStartCol + i;
            const colLetter = sheet.getColumn(col).letter;
            sheet.mergeCells(`${colLetter}8:${colLetter}9`);
            sheet.getCell(8, col).value = `TH ${i + 1}`;
            sheet.getCell(8, col).alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 };
        }

        // Cuối
        const tcCol = thEndCol + 1;
        sheet.mergeCells(7, tcCol, 9, tcCol);
        sheet.getCell(7, tcCol).value = 'Tổng các\nbài TH';
        sheet.getCell(7, tcCol).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        const sumCol = tcCol + 1;
        sheet.mergeCells(7, sumCol, 9, sumCol);
        sheet.getCell(7, sumCol).value = 'Tổng\ncộng';
        sheet.getCell(7, sumCol).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        const duyetCol = sumCol + 1;
        sheet.mergeCells(7, duyetCol, 9, duyetCol);
        sheet.getCell(7, duyetCol).value = 'Số được\nDuyệt';
        sheet.getCell(7, duyetCol).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        const noteCol = duyetCol + 1;
        sheet.mergeCells(7, noteCol, 9, noteCol);
        sheet.getCell(7, noteCol).value = 'Ghi chú';
        sheet.getCell(7, noteCol).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Apply header styles (borders, alignment, font)
        for (let row = 7; row <= 9; row++) {
            for (let col = 1; col <= lastColId; col++) {
                const cell = sheet.getCell(row, col);
                if (!cell.font) cell.font = { name: 'Times New Roman', size: 11, bold: true };
                if (!cell.alignment) cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        }

        // --- Data Rows ---
        let currentRow = 10;

        // Nhóm "I. VẬT TƯ"
        sheet.mergeCells(currentRow, 1, currentRow, 2);
        sheet.getCell(currentRow, 1).value = 'I';
        sheet.getCell(currentRow, 1).font = { name: 'Times New Roman', size: 11, bold: true };
        sheet.getCell(currentRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };

        sheet.getCell(currentRow, 3).value = 'VẬT TƯ';
        sheet.getCell(currentRow, 3).font = { name: 'Times New Roman', size: 11, bold: true };

        // borders for this row up to lastColId
        for (let c = 1; c <= lastColId; c++) {
            sheet.getCell(currentRow, c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        }
        currentRow++;

        // Items
        materialList.forEach((item, index) => {
            const row = sheet.getRow(currentRow);
            row.getCell(1).value = index + 1; // STT
            row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(2).value = item.ten_vat_tu;
            row.getCell(3).value = item.yeu_cau_ky_thuat || '';
            row.getCell(4).value = item.don_vi_tinh || '';
            row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

            // E: Tiêu hao (Empty for user)
            row.getCell(5).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFF0000' } };
            row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

            // Class sizes fallback from header
            let ssCells = [];
            for (let c = 0; c < maxClasses; c++) {
                const colIdx = classStartCol + c;
                const letter = sheet.getColumn(colIdx).letter;
                ssCells.push(`${letter}$9`); // Fixed row 9 for Sĩ số
                // Formula: Sĩ số * Tiêu hao
                const tieuHaoCell = `E${currentRow}`; // Cell Tiêu hao/1HS
                row.getCell(colIdx).value = { formula: `IF(ISBLANK(${letter}$9), "", ${letter}$9*${tieuHaoCell})` };
            }

            // TH cells empty, center align
            let thCells = [];
            for (let t = 0; t <= 10; t++) {
                const colIdx = thStartCol + t;
                const letter = sheet.getColumn(colIdx).letter;
                row.getCell(colIdx).alignment = { horizontal: 'center', vertical: 'middle' };
                thCells.push(`${letter}${currentRow}`);
            }

            // Tổng bài TH
            const tcLetter = sheet.getColumn(tcCol).letter;
            row.getCell(tcCol).value = { formula: `SUM(${thCells[0]}:${thCells[10]})` };
            row.getCell(tcCol).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFF0000' } };
            row.getCell(tcCol).alignment = { horizontal: 'center', vertical: 'middle' };

            // Tổng cộng
            const classStartLetter = sheet.getColumn(classStartCol).letter;
            const classEndLetter = sheet.getColumn(classEndCol).letter;
            const sumColLetter = sheet.getColumn(sumCol).letter;

            const sumFormula = `ROUND(SUM(${classStartLetter}${currentRow}:${classEndLetter}${currentRow})*(${soGioTH}/45) + ${tcLetter}${currentRow}, 2)`;

            row.getCell(sumCol).value = { formula: sumFormula };
            row.getCell(sumCol).font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFF0000' } };
            row.getCell(sumCol).alignment = { horizontal: 'center', vertical: 'middle' };

            // Default ghi_chu
            row.getCell(noteCol).value = 'Tiêu hao';

            for (let c = 1; c <= lastColId; c++) {
                row.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                if (!row.getCell(c).font) {
                    row.getCell(c).font = { name: 'Times New Roman', size: 11 };
                }
            }

            currentRow++;
        });

        // --- Footer ---
        currentRow += 2;
        sheet.mergeCells(currentRow, tcCol - 2, currentRow, noteCol);
        sheet.getCell(currentRow, tcCol - 2).value = 'Thuận An, Ngày ...... tháng ...... năm ......';
        sheet.getCell(currentRow, tcCol - 2).font = { name: 'Times New Roman', size: 11, italic: true };
        sheet.getCell(currentRow, tcCol - 2).alignment = { horizontal: 'center', vertical: 'middle' };

        currentRow += 1;
        sheet.mergeCells(currentRow, 2, currentRow, 5);
        sheet.getCell(currentRow, 2).value = 'Trưởng khoa';
        sheet.getCell(currentRow, 2).font = { name: 'Times New Roman', size: 11, bold: true };
        sheet.getCell(currentRow, 2).alignment = { horizontal: 'center', vertical: 'middle' };

        sheet.mergeCells(currentRow, tcCol - 2, currentRow, noteCol);
        sheet.getCell(currentRow, tcCol - 2).value = 'Giáo viên';
        sheet.getCell(currentRow, tcCol - 2).font = { name: 'Times New Roman', size: 11, bold: true };
        sheet.getCell(currentRow, tcCol - 2).alignment = { horizontal: 'center', vertical: 'middle' };

        currentRow += 4;
        sheet.mergeCells(currentRow, tcCol - 2, currentRow, noteCol);
        sheet.getCell(currentRow, tcCol - 2).value = gvName || '';
        sheet.getCell(currentRow, tcCol - 2).font = { name: 'Times New Roman', size: 11, bold: true };
        sheet.getCell(currentRow, tcCol - 2).alignment = { horizontal: 'center', vertical: 'middle' };

        // --- Column Widths ---
        sheet.getColumn(1).width = 5;  // STT
        sheet.getColumn(2).width = 25; // Tên VT
        sheet.getColumn(3).width = 20; // YCKT
        sheet.getColumn(4).width = 8;  // ĐVT
        sheet.getColumn(5).width = 10; // Tiêu hao
        // Class columns
        for (let c = 0; c < maxClasses; c++) sheet.getColumn(classStartCol + c).width = 5;
        // TH columns
        for (let t = 0; t <= 10; t++) sheet.getColumn(thStartCol + t).width = 4;
        sheet.getColumn(tcCol).width = 8;
        sheet.getColumn(sumCol).width = 10;
        sheet.getColumn(duyetCol).width = 8;
        sheet.getColumn(noteCol).width = 15;
    });

    // Output
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
};

export const exportExcelTheoNganh = async (nganhData, kiInfo, fileName = 'Du_Tru_Theo_Nganh.xlsx') => {
    const workbook = new ExcelJS.Workbook();
    const { ten_nganh, materialList } = nganhData;
    const kiLabel = kiInfo ? `${kiInfo.ten_ki} NĂM HỌC ${kiInfo.nam_hoc}` : 'HỌC KỲ I NĂM HỌC 2025 - 2026';

    const sheet = workbook.addWorksheet(ten_nganh.substring(0, 31), {
        pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 }
    });

    // --- Header ---
    sheet.getCell('A1').value = 'TRƯỜNG CAO ĐẲNG NGHỀ VIỆT NAM - SINGAPORE';
    sheet.getCell('A1').font = { name: 'Times New Roman', size: 12, bold: true };
    
    sheet.getCell('A2').value = `KHOA: ${ten_nganh.toUpperCase()}`;
    sheet.getCell('A2').font = { name: 'Times New Roman', size: 12, bold: true };

    sheet.mergeCells('A4:F4');
    sheet.getCell('A4').value = `BẢNG DỰ TRÙ VẬT TƯ THỰC HÀNH NGHỀ ${ten_nganh.toUpperCase()}`;
    sheet.getCell('A4').font = { name: 'Times New Roman', size: 14, bold: true };
    sheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('A5:F5');
    sheet.getCell('A5').value = kiLabel;
    sheet.getCell('A5').font = { name: 'Times New Roman', size: 12, bold: true };
    sheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

    // --- Table Headers ---
    const headerRow = sheet.getRow(7);
    const headers = ['STT', 'Tên vật tư', 'Yêu cầu kỹ thuật', 'Đơn vị tính', 'Số lượng', 'Ghi chú'];
    const colWidths = [6, 35, 35, 12, 12, 15];

    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { name: 'Times New Roman', size: 11, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        sheet.getColumn(i + 1).width = colWidths[i];
    });

    // --- Data Rows ---
    let currentRow = 8;
    materialList.forEach((item, index) => {
        const row = sheet.getRow(currentRow);
        row.getCell(1).value = index + 1;
        row.getCell(2).value = item.ten_vat_tu;
        row.getCell(3).value = item.yeu_cau_ky_thuat || '';
        row.getCell(4).value = item.don_vi_tinh;
        row.getCell(5).value = item.tong_de_xuat || item.so_luong || 0;
        row.getCell(6).value = '';

        // Styles
        for (let i = 1; i <= 6; i++) {
            const cell = row.getCell(i);
            cell.font = { name: 'Times New Roman', size: 11 };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            if (i === 1 || i >= 4) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
        }
        currentRow++;
    });

    // --- Footer ---
    currentRow += 2;
    sheet.mergeCells(currentRow, 4, currentRow, 6);
    const today = new Date();
    sheet.getCell(currentRow, 4).value = `Bình Dương, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
    sheet.getCell(currentRow, 4).font = { name: 'Times New Roman', size: 11, italic: true };
    sheet.getCell(currentRow, 4).alignment = { horizontal: 'center' };

    currentRow += 1;
    sheet.getCell(currentRow, 2).value = 'Ban giám hiệu';
    sheet.getCell(currentRow, 2).font = { name: 'Times New Roman', size: 11, bold: true };
    sheet.getCell(currentRow, 2).alignment = { horizontal: 'center' };

    sheet.mergeCells(currentRow, 4, currentRow, 6);
    sheet.getCell(currentRow, 4).value = `Khoa ${ten_nganh}`;
    sheet.getCell(currentRow, 4).font = { name: 'Times New Roman', size: 11, bold: true };
    sheet.getCell(currentRow, 4).alignment = { horizontal: 'center' };

    // Output
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
};
export const exportExcelMultiNganh = async (allNganhData, kiInfo, fileName = 'Tong_Hop_Vat_Tu.xlsx') => {
    const workbook = new ExcelJS.Workbook();
    const kiLabel = kiInfo ? `${kiInfo.ten_ki} NĂM HỌC ${kiInfo.nam_hoc}` : 'HỌC KỲ I NĂM HỌC 2025 - 2026';

    allNganhData.forEach(nganhData => {
        const { ten_nganh, materialList } = nganhData;
        const sheet = workbook.addWorksheet(ten_nganh.substring(0, 31).replace(/[\\/*?:\[\]]/g, ''), {
            pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 }
        });

        // --- Header ---
        sheet.getCell('A1').value = 'TRƯỜNG CAO ĐẲNG NGHỀ VIỆT NAM - SINGAPORE';
        sheet.getCell('A1').font = { name: 'Times New Roman', size: 12, bold: true };
        
        sheet.getCell('A2').value = `KHOA: ${ten_nganh.toUpperCase()}`;
        sheet.getCell('A2').font = { name: 'Times New Roman', size: 12, bold: true };

        sheet.mergeCells('A4:F4');
        sheet.getCell('A4').value = `BẢNG DỰ TRÙ VẬT TƯ THỰC HÀNH NGHỀ ${ten_nganh.toUpperCase()}`;
        sheet.getCell('A4').font = { name: 'Times New Roman', size: 14, bold: true };
        sheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

        sheet.mergeCells('A5:F5');
        sheet.getCell('A5').value = kiLabel;
        sheet.getCell('A5').font = { name: 'Times New Roman', size: 12, bold: true };
        sheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

        // --- Table Headers ---
        const headerRow = sheet.getRow(7);
        const headers = ['STT', 'Tên vật tư', 'Yêu cầu kỹ thuật', 'Đơn vị tính', 'Số lượng', 'Ghi chú'];
        const colWidths = [6, 35, 35, 12, 12, 15];

        headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h;
            cell.font = { name: 'Times New Roman', size: 11, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            sheet.getColumn(i + 1).width = colWidths[i];
        });

        // --- Data Rows ---
        let currentRow = 8;
        materialList.forEach((item, index) => {
            const row = sheet.getRow(currentRow);
            row.getCell(1).value = index + 1;
            row.getCell(2).value = item.ten_vat_tu;
            row.getCell(3).value = item.yeu_cau_ky_thuat || '';
            row.getCell(4).value = item.don_vi_tinh;
            row.getCell(5).value = item.tong_de_xuat || item.so_luong || 0;
            row.getCell(6).value = '';

            // Styles
            for (let i = 1; i <= 6; i++) {
                const cell = row.getCell(i);
                cell.font = { name: 'Times New Roman', size: 11 };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                if (i === 1 || i >= 4) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
            }
            currentRow++;
        });

        // --- Footer ---
        currentRow += 2;
        sheet.mergeCells(currentRow, 4, currentRow, 6);
        const today = new Date();
        sheet.getCell(currentRow, 4).value = `Bình Dương, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
        sheet.getCell(currentRow, 4).font = { name: 'Times New Roman', size: 11, italic: true };
        sheet.getCell(currentRow, 4).alignment = { horizontal: 'center' };

        currentRow += 1;
        sheet.getCell(currentRow, 2).value = 'Ban giám hiệu';
        sheet.getCell(currentRow, 2).font = { name: 'Times New Roman', size: 11, bold: true };
        sheet.getCell(currentRow, 2).alignment = { horizontal: 'center' };

        sheet.mergeCells(currentRow, 4, currentRow, 6);
        sheet.getCell(currentRow, 4).value = `Khoa ${ten_nganh}`;
        sheet.getCell(currentRow, 4).font = { name: 'Times New Roman', size: 11, bold: true };
        sheet.getCell(currentRow, 4).alignment = { horizontal: 'center' };
    });

    // Output
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
};
