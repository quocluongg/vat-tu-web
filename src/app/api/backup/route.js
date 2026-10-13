import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getDb from '@/lib/db';

// GET /api/backup — tải toàn bộ database dạng JSON (chỉ admin)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = getDb();
        const tablesRes = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        );
        const tables = tablesRes.rows.map(r => r.name);

        const dump = {
            _meta: {
                createdAt: new Date().toISOString(),
                tables: {},
            },
        };

        for (const t of tables) {
            const res = await db.execute(`SELECT * FROM "${t}"`);
            dump[t] = res.rows.map(r => ({ ...r }));
            dump._meta.tables[t] = dump[t].length;
        }

        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        return new NextResponse(JSON.stringify(dump), {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Disposition': `attachment; filename="vattu-backup-${stamp}.json"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
