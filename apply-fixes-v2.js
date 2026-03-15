/**
 * Apply foreign key constraint fixes - Version 2
 * Uses line-by-line replacement for reliability
 */

const fs = require('fs');
const path = require('path');

// Fix 1: Update vat-tu DELETE handler
console.log('Applying Fix 1: vat-tu DELETE validation...');
const vatuPath = path.join(__dirname, 'src/app/api/vat-tu/route.js');
let vatuLines = fs.readFileSync(vatuPath, 'utf8').split('\n');

// Find and replace the DELETE function (lines 74-87)
const deleteIdx = vatuLines.findIndex(l => l.includes('export async function DELETE'));
if (deleteIdx !== -1) {
    const newDeleteFn = [
        'export async function DELETE(request) {',
        '    try {',
        '        const db = getDb();',
        '        const { searchParams } = new URL(request.url);',
        '        const id = searchParams.get(\'id\');',
        '',
        '        // Check if material is used in proposals',
        '        const dxCheck = await db.execute({',
        '            sql: \'SELECT COUNT(*) as c FROM de_xuat_chi_tiet WHERE vat_tu_id = ?\',',
        '            args: [id]',
        '        });',
        '        if (dxCheck.rows[0]?.c > 0) {',
        '            return NextResponse.json({',
        '                error: \'Không thể xóa vật tư vì nó đang được sử dụng trong các đề xuất. Vui lòng xóa các đề xuất trước.\'',
        '            }, { status: 400 });',
        '        }',
        '',
        '        // Check if material is used in exports',
        '        const pxCheck = await db.execute({',
        '            sql: \'SELECT COUNT(*) as c FROM phieu_xuat_chi_tiet WHERE vat_tu_id = ?\',',
        '            args: [id]',
        '        });',
        '        if (pxCheck.rows[0]?.c > 0) {',
        '            return NextResponse.json({',
        '                error: \'Không thể xóa vật tư vì nó đã được xuất. Vui lòng xóa các phiếu xuất trước.\'',
        '            }, { status: 400 });',
        '        }',
        '',
        '        await db.execute({',
        '            sql: \'DELETE FROM vat_tu WHERE id = ?\',',
        '            args: [id]',
        '        });',
        '        return NextResponse.json({ message: \'Xóa thành công\' });',
        '    } catch (error) {',
        '        return NextResponse.json({ error: error.message }, { status: 500 });',
        '    }',
        '}'
    ];

    // Replace old DELETE function with new one
    // Find the end of the function (closing brace at same indent level)
    let endIdx = deleteIdx;
    for (let i = deleteIdx + 1; i < vatuLines.length; i++) {
        if (vatuLines[i].match(/^}\s*$/)) {
            endIdx = i;
            break;
        }
    }

    vatuLines.splice(deleteIdx, endIdx - deleteIdx + 1, ...newDeleteFn);
    fs.writeFileSync(vatuPath, vatuLines.join('\n'), 'utf8');
    console.log('✅ Fix 1 applied successfully');
} else {
    console.warn('⚠️  Fix 1: Could not find DELETE function');
}

// Fix 2: Update phieu-xuat POST handler
console.log('Applying Fix 2: phieu-xuat material validation...');
const phieuPath = path.join(__dirname, 'src/app/api/phieu-xuat/route.js');
let phieuLines = fs.readFileSync(phieuPath, 'utf8').split('\n');

// Find POST function
const postIdx = phieuLines.findIndex(l => l.includes('export async function POST'));
if (postIdx !== -1) {
    // Find the validation comment line
    let validationCommentIdx = -1;
    for (let i = postIdx; i < postIdx + 10; i++) {
        if (phieuLines[i].includes('// Validate: check teacher')) {
            validationCommentIdx = i;
            break;
        }
    }

    if (validationCommentIdx !== -1) {
        // Insert material existence check before the validation comment
        const materialCheck = [
            '        // Check if all materials exist (prevent FK constraint errors)',
            '        for (const ct of chi_tiet) {',
            '            const vtCheck = await db.execute({',
            '                sql: \'SELECT id FROM vat_tu WHERE id = ?\',',
            '                args: [ct.vat_tu_id]',
            '            });',
            '            if (vtCheck.rows.length === 0) {',
            '                return NextResponse.json({',
            '                    error: `Vật tư ID ${ct.vat_tu_id} không tồn tại (có thể đã bị xóa). Vui lòng cập nhật lại đề xuất.`',
            '                }, { status: 400 });',
            '            }',
            '        }',
            ''
        ];
        
        phieuLines.splice(validationCommentIdx, 0, ...materialCheck);
        fs.writeFileSync(phieuPath, phieuLines.join('\n'), 'utf8');
        console.log('✅ Fix 2 applied successfully');
    } else {
        console.warn('⚠️  Fix 2: Could not find validation comment');
    }
} else {
    console.warn('⚠️  Fix 2: Could not find POST function');
}

console.log('\n✨ All fixes applied!');
