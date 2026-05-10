'use client';
import { useState, useEffect } from 'react';
import { 
    Scale, Search, ChevronDown, ChevronRight, AlertTriangle, 
    CheckCircle, Info, Boxes, Users, PieChart, PackageSearch
} from 'lucide-react';

export default function PhanPhatPage() {
    const [kiHocs, setKiHocs] = useState([]);
    const [selectedKi, setSelectedKi] = useState('');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        fetch('/api/ki-hoc').then(r => r.json()).then(kis => {
            setKiHocs(kis);
            if (kis.length > 0) setSelectedKi(kis[0].id.toString());
        });
    }, []);

    useEffect(() => {
        if (!selectedKi) return;
        setLoading(true);
        fetch(`/api/admin/thong-ke/phan-phat?ki_id=${selectedKi}`)
            .then(r => r.json())
            .then(d => {
                setData(Array.isArray(d) ? d : []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [selectedKi]);

    const filteredData = data.filter(vt => 
        vt.ten_vat_tu.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vt.yeu_cau_ky_thuat && vt.yeu_cau_ky_thuat.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (loading && kiHocs.length === 0) return <div className="loading-overlay"><div className="spinner" /></div>;

    return (
        <div style={{ paddingBottom: 40 }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div className="page-header-left">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Scale size={28} className="text-primary" />
                        Theo dõi Phân phát Công bằng
                    </h1>
                    <p>Kiểm tra việc cấp phát thực tế so với định mức & đánh giá độ đồng đều.</p>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', gap: 12 }}>
                    <select className="form-select" style={{ width: 220 }} value={selectedKi} onChange={e => setSelectedKi(e.target.value)}>
                        {kiHocs.map(k => <option key={k.id} value={k.id}>{k.ten_ki} - {k.nam_hoc}</option>)}
                    </select>
                </div>
            </div>

            {/* Helper Note */}
            <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, #eff6ff, #fff)', border: '1px solid #bfdbfe' }}>
                <div className="card-body" style={{ display: 'flex', alignItems: 'start', gap: 16 }}>
                    <div style={{ color: '#3b82f6', marginTop: 2 }}><Info size={22} /></div>
                    <div>
                        <h4 style={{ fontWeight: 600, marginBottom: 4, color: '#1e3a8a' }}>⚙️ Chi tiết Công thức Phân phối Phức hợp (Global Teacher-Level Allocation)</h4>
                        <div style={{ fontSize: 14, color: '#1e40af', lineHeight: '1.6' }}>
                            Để khắc phục triệt để hiện tượng làm tròn về 0 và đảm bảo công bằng cho mọi quy mô lớp học, hệ thống tự động áp dụng quy trình 2 bước gom theo <strong>Từng Giáo Viên</strong>:
                            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                                <li><strong>Bước 1 - Kích hoạt Bảo lãnh Đáy (Min = 1):</strong> Hệ thống quét danh sách, trích ngay <strong>1 đơn vị đầu tiên</strong> cấp cho mỗi giáo viên có đăng ký để ai cũng có thể mở lớp (Ưu tiên theo thứ tự ai xin ít đứng trước).</li>
                                <li><strong>Bước 2 - Phân phối Thặng dư Tỷ lệ (Proportional Remainder):</strong> Lấy [Tổng Kho] trừ đi [Quỹ bảo lãnh bước 1]. Số lượng còn thừa bao nhiêu sẽ được chia <strong>nhân theo tỷ lệ % đề xuất</strong> của từng người, rồi dùng thuật toán Hamilton để xử lý phần thập phân lẻ, dồn cho người có trọng số cao hơn.</li>
                            </ul>
                            <em>📌 Lưu ý: Hệ thống tính hạn mức cho <strong>Tổng cả kỳ của giáo viên</strong>, không bị chia nhỏ lẻ theo từng môn nên tuyệt đối không bao giờ xảy ra trường hợp xin nhiều mà bị bỏ sót.</em>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="card" style={{ marginBottom: 24, padding: '12px 20px' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Tìm tên vật tư để xem chi tiết phân phối..." 
                            style={{ paddingLeft: 40 }}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                        Đang hiển thị <strong>{filteredData.length}</strong> mặt hàng
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                    <p>Đang tải dữ liệu thống kê chuyên sâu...</p>
                </div>
            ) : filteredData.length === 0 ? (
                <div className="empty-state card" style={{ padding: 60 }}>
                    <PackageSearch size={60} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                    <h3>Không tìm thấy dữ liệu</h3>
                    <p>Chưa có vật tư nào được ghi nhận cho kỳ này.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {filteredData.map(item => {
                        const isExpanded = expandedId === item.vat_tu_id;
                        const fillRate = item.total_proposed > 0 ? (item.total_da_xuat / item.total_proposed) * 100 : 0;
                        const supplyCover = item.total_proposed > 0 ? (item.total_supply / item.total_proposed) * 100 : 100;
                        const ratioPercent = Math.round(item.ratio * 100);
                        
                        // Calculate alerts: if physical stock ran dry before fulfilling allocated pending
                        const isDanger = item.total_dang_ky > item.so_luong_kho;

                        return (
                            <div key={item.vat_tu_id} className="card" style={{ overflow: 'hidden', border: isExpanded ? '1px solid var(--text-accent)' : '1px solid var(--border-color)', transition: 'all 0.2s' }}>
                                {/* Collapsed Bar */}
                                <div 
                                    onClick={() => toggleExpand(item.vat_tu_id)}
                                    style={{ 
                                        padding: '16px 20px', 
                                        display: 'grid', 
                                        gridTemplateColumns: '40px 2fr 1.5fr 1.5fr 1.5fr', 
                                        alignItems: 'center', 
                                        cursor: 'pointer',
                                        background: isExpanded ? 'rgba(56,189,248,0.04)' : 'white'
                                    }}
                                >
                                    <div style={{ color: 'var(--text-muted)' }}>
                                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    </div>
                                    
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{item.ten_vat_tu}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{item.yeu_cau_ky_thuat || '-'} ({item.don_vi_tinh})</div>
                                    </div>

                                    <div style={{ padding: '0 10px' }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Nhu cầu vs Cung ứng</div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                                            {item.total_proposed} / {item.total_supply} {item.don_vi_tinh}
                                        </div>
                                        <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.min(100, supplyCover)}%`, height: '100%', background: item.ratio < 1 ? '#f59e0b' : '#10b981' }}></div>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0 10px' }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Hạn mức Công bằng</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span className={`badge ${item.ratio < 1 ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: 13, padding: '4px 10px' }}>
                                                {ratioPercent}%
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0 10px' }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Tồn kho / Đang xuất</div>
                                        <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontWeight: 700, color: isDanger ? '#ef4444' : 'var(--text-primary)' }}>{item.so_luong_kho}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>/</span>
                                            <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>{item.total_da_xuat}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details: Per Teacher View */}
                                {isExpanded && (
                                    <div style={{ padding: '0 20px 20px', background: 'rgba(0,0,0,0.01)', borderTop: '1px solid var(--border-color)' }}>
                                        <div style={{ padding: '20px 0 12px', borderBottom: '1px solid var(--border-color)', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                                                <Users size={16} /> Chi tiết phân phối cho từng Giáo viên
                                            </h4>
                                            {isDanger && (
                                                <div className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <AlertTriangle size={14} /> Quá tải: Voucher chờ duyệt lớn hơn kho
                                                </div>
                                            )}
                                        </div>

                                        {item.teachers.length === 0 ? (
                                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                                                Chưa có giáo viên nào đề xuất hoặc nhận vật tư này.
                                            </div>
                                        ) : (
                                            <table className="data-table" style={{ background: 'white' }}>
                                                <thead style={{ background: 'var(--bg-glass)' }}>
                                                    <tr>
                                                        <th style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Giáo viên</th>
                                                        <th style={{ fontSize: 12, textAlign: 'center' }}>Đề xuất ban đầu</th>
                                                        <th style={{ fontSize: 12, textAlign: 'center' }}>Hạn mức công bằng tối đa</th>
                                                        <th style={{ fontSize: 12, textAlign: 'center' }}>Thực xuất (Đã giao)</th>
                                                        <th style={{ fontSize: 12, textAlign: 'center' }}>Đang chờ (Voucher)</th>
                                                        <th style={{ fontSize: 12 }}>Mức độ công bằng</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {item.teachers.map(teacher => {
                                                        const maxQuota = teacher.fair_quota !== undefined ? teacher.fair_quota : Math.floor(teacher.propose * item.ratio);
                                                        const consumedTotal = teacher.actual + teacher.pending;
                                                        const percentOfQuota = maxQuota > 0 ? (consumedTotal / maxQuota) * 100 : 100;
                                                        const isFair = consumedTotal <= maxQuota + 0.001; // tiny epsilon for rounding floating safety
                                                        
                                                        let statusLabel = "Bình thường";
                                                        let statusColor = "var(--text-secondary)";
                                                        
                                                        if (consumedTotal > maxQuota) {
                                                            statusLabel = "Vượt hạn mức!";
                                                            statusColor = "#ef4444";
                                                        } else if (consumedTotal === maxQuota && maxQuota > 0) {
                                                            statusLabel = "Hết suất";
                                                            statusColor = "#10b981";
                                                        }

                                                        return (
                                                            <tr key={teacher.gv_id}>
                                                                <td style={{ fontWeight: 600 }}>{teacher.ho_ten}</td>
                                                                <td style={{ textAlign: 'center' }}>{teacher.propose}</td>
                                                                <td style={{ textAlign: 'center', background: '#f8fafc', fontWeight: 600 }}>{maxQuota}</td>
                                                                <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 600 }}>{teacher.actual}</td>
                                                                <td style={{ textAlign: 'center', color: '#f59e0b' }}>{teacher.pending}</td>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                        <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                                                            <div style={{ 
                                                                                width: `${Math.min(100, percentOfQuota)}%`, 
                                                                                height: '100%', 
                                                                                background: !isFair ? '#ef4444' : consumedTotal === maxQuota ? '#10b981' : '#3b82f6'
                                                                            }}></div>
                                                                        </div>
                                                                        <span style={{ fontSize: 12, fontWeight: 600, color: statusColor, minWidth: 70 }}>
                                                                            {statusLabel}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
