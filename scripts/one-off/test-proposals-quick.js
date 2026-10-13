#!/usr/bin/env node
/**
 * Test script to create proposals (đề xuất) for all teachers with random materials
 * with random quantities - IMPROVED VERSION with sampling
 */

const http = require('http');

// Configuration
const HOST = 'localhost';
const PORT = 3000;
const DELAY_BETWEEN_REQUESTS = 100; // ms
const MATERIALS_PER_PROPOSAL = 20; // Random sample of materials per proposal

// Helper functions
function getRandomQuantity(min = 1, max = 20) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItems(arr, count) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, arr.length));
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiCall(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: endpoint,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    if (res.statusCode !== 200) {
                        reject(new Error(`${jsonData.error || res.statusMessage}`));
                    } else {
                        resolve(jsonData);
                    }
                } catch (e) {
                    reject(new Error(`Invalid JSON: ${data.substring(0, 100)}`));
                }
            });
        });

        req.on('error', reject);
        
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTest() {
    console.log('🧪 Proposal Creation Test - All Teachers with Random Materials\n');
    console.log(`📋 Configuration:`);
    console.log(`   - Materials per proposal: ${MATERIALS_PER_PROPOSAL}`);
    console.log(`   - Request delay: ${DELAY_BETWEEN_REQUESTS}ms\n`);

    try {
        // Fetch all required data
        console.log('📡 Fetching data...');
        const [teachers, materials, allSemesters, assignments] = await Promise.all([
            apiCall('/api/giao-vien'),
            apiCall('/api/vat-tu'),
            apiCall('/api/ki-hoc'),
            apiCall('/api/phan-cong')
        ]);

        if (teachers.length === 0) throw new Error('No teachers found');
        if (materials.length === 0) throw new Error('No materials found');
        if (allSemesters.length === 0) throw new Error('No semesters found');
        if (assignments.length === 0) throw new Error('No assignments found');

        // Filter only active semesters
        const semesters = allSemesters.filter(s => s.trang_thai === 'hoat_dong');
        const activeKiIds = new Set(semesters.map(s => s.id));
        const activeAssignments = assignments.filter(a => activeKiIds.has(a.ki_id));

        if (semesters.length === 0) throw new Error('No active semesters found');
        if (activeAssignments.length === 0) throw new Error('No assignments for active semesters');

        console.log(`✅ Teachers: ${teachers.length}`);
        console.log(`✅ Materials: ${materials.length}`);
        console.log(`✅ Active Semesters: ${semesters.length}/${allSemesters.length}`);
        console.log(`✅ Assignments (active semesters): ${activeAssignments.length}/${assignments.length}\n`);

        // Group assignments by (teacher, semester)
        const proposalMap = new Map();
        activeAssignments.forEach(pc => {
            const key = `${pc.giao_vien_id}_${pc.ki_id}`;
            if (!proposalMap.has(key)) {
                proposalMap.set(key, {
                    giao_vien_id: pc.giao_vien_id,
                    ki_id: pc.ki_id,
                    subjects: []
                });
            }
            const existing = proposalMap.get(key);
            if (!existing.subjects.find(s => s.mon_hoc_id === pc.mon_hoc_id && s.lop_id === pc.lop_id)) {
                existing.subjects.push({ mon_hoc_id: pc.mon_hoc_id, lop_id: pc.lop_id });
            }
        });

        console.log(`📋 Total proposals to create: ${proposalMap.size}\n`);

        let successCount = 0;
        let errorCount = 0;
        const startTime = Date.now();

        // Create proposals
        let requestNum = 0;
        for (const [key, proposal] of proposalMap.entries()) {
            requestNum++;
            const gvName = teachers.find(t => t.id === proposal.giao_vien_id)?.ho_ten || `Teacher${proposal.giao_vien_id}`;
            
            // Create chi_tiet with random materials for each subject
            const chi_tiet = [];
            const randomMaterials = getRandomItems(materials, MATERIALS_PER_PROPOSAL);
            
            for (const subject of proposal.subjects) {
                for (const material of randomMaterials) {
                    chi_tiet.push({
                        mon_hoc_id: subject.mon_hoc_id,
                        lop_id: subject.lop_id,
                        vat_tu_id: material.id,
                        so_luong: getRandomQuantity(1, 15)
                    });
                }
            }

            if (chi_tiet.length === 0) continue;

            try {
                // Log progress
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`[${requestNum}/${proposalMap.size}] ${gvName} (${chi_tiet.length} items) ... `, '');
                
                const result = await apiCall('/api/de-xuat', 'POST', {
                    giao_vien_id: proposal.giao_vien_id,
                    ki_id: proposal.ki_id,
                    chi_tiet
                });

                console.log(`✅ ID ${result.id}`);
                successCount++;
            } catch (err) {
                console.log(`❌ ${err.message.substring(0, 50)}`);
                errorCount++;
            }

            // Add delay
            if (requestNum < proposalMap.size) {
                await delay(DELAY_BETWEEN_REQUESTS);
            }
        }

        // Summary
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`✅ Successful proposals: ${successCount}`);
        console.log(`❌ Failed proposals: ${errorCount}`);
        console.log(`📈 Total proposals created: ${successCount}`);
        console.log(`⏱️  Total time: ${totalTime}s`);
        console.log(`🔢 Total chi-tiet items: ${successCount * MATERIALS_PER_PROPOSAL * [...proposalMap.values()][0]?.subjects?.length || 0}`);
        console.log('='.repeat(60) + '\n');

        process.exit(errorCount > 0 ? 1 : 0);

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}\n`);
        process.exit(1);
    }
}

// Run test
runTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
