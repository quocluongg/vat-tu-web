/**
 * This script applies fixes for foreign key constraint errors
 * Run: node apply-fixes.js
 */

const fs = require('fs');
const path = require('path');

// Fix 1: Update vat-tu DELETE handler
console.log('Applying Fix 1: vat-tu DELETE validation...');
const vatuRoutePath = path.join(__dirname, 'src/app/api/vat-tu/route.js');
let vatuContent = fs.readFileSync(vatuRoutePath, 'utf8');

const vatuOld = `export async function DELETE(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        await db.execute({
            sql: 'DELETE FROM vat_tu WHERE id = ?',
            args: [id]
        });
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}`;

const vatuNew = `export async function DELETE(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        // Check if material is used in proposals
        const dxCheck = await db.execute({
            sql: 'SELECT COUNT(*) as c FROM de_xuat_chi_tiet WHERE vat_tu_id = ?',
            args: [id]
        });
        if (dxCheck.rows[0]?.c > 0) {
            return NextResponse.json({
                error: 'Không thể xóa vật tư vì nó đang được sử dụng trong các đề xuất. Vui lòng xóa các đề xuất trước.'
            }, { status: 400 });
        }

        // Check if material is used in exports
        const pxCheck = await db.execute({
            sql: 'SELECT COUNT(*) as c FROM phieu_xuat_chi_tiet WHERE vat_tu_id = ?',
            args: [id]
        });
        if (pxCheck.rows[0]?.c > 0) {
            return NextResponse.json({
                error: 'Không thể xóa vật tư vì nó đã được xuất. Vui lòng xóa các phiếu xuất trước.'
            }, { status: 400 });
        }

        await db.execute({
            sql: 'DELETE FROM vat_tu WHERE id = ?',
            args: [id]
        });
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}`;

if (vatuContent.includes(vatuOld)) {
    vatuContent = vatuContent.replace(vatuOld, vatuNew);
    fs.writeFileSync(vatuRoutePath, vatuContent, 'utf8');
    console.log('✅ Fix 1 applied successfully');
} else {
    console.warn('⚠️  Fix 1: Could not find exact match in vat-tu/route.js');
}

// Fix 2: Update phieu-xuat POST handler
console.log('Applying Fix 2: phieu-xuat material validation...');
const phieuXuatRoutePath = path.join(__dirname, 'src/app/api/phieu-xuat/route.js');
let phieuXuatContent = fs.readFileSync(phieuXuatRoutePath, 'utf8');

const phieuXuatOld = `export async function POST(request) {
    try {
        const db = getDb();
        const { giao_vien_id, ki_id, mon_hoc_id, chi_tiet } = await request.json();

        // Validate: check teacher's proposal for this subject for quantity limits`;

const phieuXuatNew = `export async function POST(request) {
    try {
        const db = getDb();
        const { giao_vien_id, ki_id, mon_hoc_id, chi_tiet } = await request.json();

        // Check if all materials exist (prevent FK constraint errors)
        for (const ct of chi_tiet) {
            const vtCheck = await db.execute({
                sql: 'SELECT id FROM vat_tu WHERE id = ?',
                args: [ct.vat_tu_id]
            });
            if (vtCheck.rows.length === 0) {
                return NextResponse.json({
                    error: \`Vật tư ID \${ct.vat_tu_id} không tồn tại (có thể đã bị xóa). Vui lòng cập nhật lại đề xuất.\`
                }, { status: 400 });
            }
        }

        // Validate: check teacher's proposal for this subject for quantity limits`;

if (phieuXuatContent.includes(phieuXuatOld)) {
    phieuXuatContent = phieuXuatContent.replace(phieuXuatOld, phieuXuatNew);
    fs.writeFileSync(phieuXuatRoutePath, phieuXuatContent, 'utf8');
    console.log('✅ Fix 2 applied successfully');
} else {
    console.warn('⚠️  Fix 2: Could not find exact match in phieu-xuat/route.js');
}

console.log('\n✨ All fixes applied!');
