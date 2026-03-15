#!/usr/bin/env node
/**
 * Test script to create proposals (đề xuất) for all teachers with all materials
 * with random quantities
 */

const http = require('http');
const querystring = require('querystring');

// Configuration
const HOST = 'localhost';
const PORT = 3000;
const DELAY_BETWEEN_REQUESTS = 200; // ms

// Helper functions
function getRandomQuantity(min = 1, max = 20) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
                        reject(new Error(`API error: ${jsonData.error || res.statusMessage}`));
                    } else {
                        resolve(jsonData);
                    }
                } catch (e) {
                    reject(new Error(`Invalid JSON response: ${data}`));
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
    console.log('🧪 Starting proposal creation test...\n');

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

        console.log(`✅ Found ${teachers.length} teachers`);
        console.log(`✅ Found ${materials.length} materials`);
        console.log(`✅ Found ${semesters.length}/${allSemesters.length} active semesters`);
        console.log(`✅ Found ${activeAssignments.length}/${assignments.length} assignments\n`);

        // Group assignments by (teacher, semester)
        const proposalMap = new Map();
        activeAssignments.forEach(pc => {
            const key = `${pc.giao_vien_id}_${pc.ki_id}`;
            if (!proposalMap.has(key)) {
                proposalMap.set(key, {
                    giao_vien_id: pc.giao_vien_id,
                    ki_id: pc.ki_id,
                    subjects: new Set()
                });
            }
            proposalMap.get(key).subjects.add({
                mon_hoc_id: pc.mon_hoc_id,
                lop_id: pc.lop_id
            });
        });

        console.log(`📋 Creating proposals for ${proposalMap.size} teacher-semester combinations...\n`);

        let successCount = 0;
        let errorCount = 0;
        let requestCount = 0;

        // Create proposals
        for (const [key, proposal] of proposalMap.entries()) {
            const subjectArray = Array.from(proposal.subjects);
            
            // Create chi_tiet with all materials for all subject/class combinations
            const chi_tiet = [];
            for (const subject of subjectArray) {
                for (const material of materials) {
                    chi_tiet.push({
                        mon_hoc_id: subject.mon_hoc_id,
                        lop_id: subject.lop_id,
                        vat_tu_id: material.id,
                        so_luong: getRandomQuantity(1, 20),
                        ghi_chu: `Test - Random quantity`
                    });
                }
            }

            if (chi_tiet.length === 0) continue;

            try {
                const gvName = teachers.find(t => t.id === proposal.giao_vien_id)?.ho_ten || `Teacher ${proposal.giao_vien_id}`;
                const semesterName = semesters.find(s => s.id === proposal.ki_id)?.diem_ki_dau_hoc || `Semester ${proposal.ki_id}`;
                
                console.log(`📝 Creating proposal for ${gvName} - Semester ${proposal.ki_id}...`);
                console.log(`   Chi-tiet items: ${chi_tiet.length} (${subjectArray.length} subjects × ${materials.length} materials)`);

                const result = await apiCall('/api/de-xuat', 'POST', {
                    giao_vien_id: proposal.giao_vien_id,
                    ki_id: proposal.ki_id,
                    chi_tiet
                });

                console.log(`   ✅ Proposal ID ${result.id} created successfully\n`);
                successCount++;
                requestCount++;
            } catch (err) {
                console.log(`   ❌ Error: ${err.message}\n`);
                errorCount++;
                requestCount++;
            }

            // Add delay to avoid overwhelming server
            if (requestCount < proposalMap.size) {
                await delay(DELAY_BETWEEN_REQUESTS);
            }
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`✅ Successful proposals: ${successCount}`);
        console.log(`❌ Failed proposals: ${errorCount}`);
        console.log(`📈 Total requests: ${requestCount}`);
        console.log(`📌 Total chi-tiet items created: ${successCount > 0 ? 'See server logs' : 0}`);
        console.log('='.repeat(50) + '\n');

        if (errorCount === 0) {
            console.log('✨ All tests passed!');
            process.exit(0);
        } else {
            console.log(`⚠️  ${errorCount} proposals failed`);
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run test
runTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
