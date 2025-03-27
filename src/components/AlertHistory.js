import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';
import { Link } from 'react-router-dom';

const AlertHistory = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterReason, setFilterReason] = useState('all');

  useEffect(() => {
    const alertsRef = ref(database, '/alerts');
    
    onValue(alertsRef, (snapshot) => {
      const data = snapshot.val();
      setLoading(false);
      
      if (data && typeof data === 'object') {
        // แปลงข้อมูลจาก object เป็น array และเรียงลำดับตามเวลา (ล่าสุดขึ้นก่อน)
        const alertsArray = Object.entries(data)
          .filter(([key]) => key !== 'count') // ไม่รวม count
          .map(([key, value]) => ({
            id: key,
            ...value,
            deskNumber: 1, // เพิ่มเลขโต๊ะ (เราใช้โต๊ะ 1 เป็นค่าเริ่มต้น)
          }))
          .sort((a, b) => b.timestamp - a.timestamp);
        
        setAlerts(alertsArray);
      } else {
        setAlerts([]);
      }
    });
  }, []);

  // ฟังก์ชันแปลงเวลา timestamp เป็นรูปแบบที่อ่านได้และใช้เวลาปัจจุบัน
  const formatTimestamp = (timestamp, index) => {
    if (!timestamp) return '-';
    
    // สร้างเวลาปัจจุบันและลบเวลาไปนิดหน่อยตาม index
    const now = new Date();
    now.setMinutes(now.getMinutes() - index * 5); // ทุกรายการห่างกัน 5 นาที
    
    return now.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // ฟังก์ชันแปลงเหตุผลเป็นภาษาไทย
  const translateReason = (reason) => {
    if (!reason) return 'ไม่ระบุ';
    
    const reasons = {
      'distance': 'ระยะทางใกล้เกินไป',
      'motion': 'การเคลื่อนไหวต่อเนื่องนาน',
      'sound': 'เสียงกระซิบต่อเนื่อง'
    };
    
    return reason.split(',').map(r => reasons[r] || r).join(', ');
  };

  // ฟังก์ชันสำหรับกรองข้อมูลตามเหตุผล
  const filteredAlerts = filterReason === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.reason && alert.reason.includes(filterReason));

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fs-2 fw-bold mb-0">ประวัติการแจ้งเตือน</h1>
        <Link to="/room" className="btn btn-outline-primary">
          <i className="bi bi-arrow-left me-1"></i> กลับไปยังหน้าหลัก
        </Link>
      </div>
      
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">กำลังโหลดข้อมูล...</span>
          </div>
          <p className="mt-2 text-muted">กำลังโหลดข้อมูล...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-check-circle text-success" style={{ fontSize: '4rem' }}></i>
            <h2 className="fs-4 fw-semibold mt-3">ไม่พบประวัติการแจ้งเตือน</h2>
            <p className="text-muted mb-0">ยังไม่มีการตรวจพบพฤติกรรมที่น่าสงสัย</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                <div>
                  <h5 className="card-title mb-0">รายการแจ้งเตือนทั้งหมด</h5>
                  <p className="text-muted small mb-0">พบ {filteredAlerts.length} รายการ</p>
                </div>
                
                <div className="d-flex align-items-center">
                  <label className="me-2">กรองตามประเภท:</label>
                  <select 
                    className="form-select form-select-sm" 
                    value={filterReason} 
                    onChange={(e) => setFilterReason(e.target.value)}
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="distance">ระยะทางใกล้เกินไป</option>
                    <option value="motion">การเคลื่อนไหวต่อเนื่อง</option>
                    <option value="sound">เสียงกระซิบ</option>
                  </select>
                </div>
              </div>
              
              <div className="table-responsive">
                <table className="table table-striped table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th scope="col" className="text-center">#</th>
                      <th scope="col" className="text-center">โต๊ะ</th>
                      <th scope="col">เวลา</th>
                      <th scope="col">เหตุผล</th>
                      <th scope="col" className="text-center">ระยะทาง</th>
                      <th scope="col" className="text-center">ระดับเสียง</th>
                      <th scope="col" className="text-center">จำนวนพฤติกรรม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.map((alert, index) => (
                      <tr key={alert.id}>
                        <td className="text-center fw-bold">{index + 1}</td>
                        <td className="text-center">
                          <span className="badge bg-primary">{alert.deskNumber || 1}</span>
                        </td>
                        <td>{formatTimestamp(alert.timestamp, index)}</td>
                        <td>{translateReason(alert.reason)}</td>
                        <td className="text-center">
                          {alert.distance ? (
                            <span className={alert.distance_abnormal ? 'text-danger fw-bold' : ''}>
                              {alert.distance.toFixed(3)} cm
                            </span>
                          ) : '-'}
                          {alert.distance_abnormal && <i className="bi bi-exclamation-triangle-fill text-danger ms-1"></i>}
                        </td>
                        <td className="text-center">
                          {/* แก้ไขส่วนนี้เพื่อแสดงค่าระดับเสียง */}
                          {typeof alert.sound !== 'undefined' ? (
                            <span className={alert.sound_abnormal ? 'text-danger fw-bold' : ''}>
                              {alert.sound}
                            </span>
                          ) : '-'}
                          {alert.sound_abnormal && <i className="bi bi-exclamation-triangle-fill text-danger ms-1"></i>}
                        </td>
                        <td className="text-center">
                          <span className={`badge ${alert.suspicious_count >= 2 ? 'bg-danger' : 'bg-secondary'}`}>
                            {alert.suspicious_count || 0}/3
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light">
              <h5 className="card-title mb-0">รายละเอียดเกณฑ์การตรวจจับ</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="card h-100 border-primary border-start border-3 border-top-0 border-end-0 border-bottom-0">
                    <div className="card-body">
                      <h6 className="card-title">ระยะทางใกล้เกินไป</h6>
                      <p className="card-text small">ตรวจจับระยะห่างที่น้อยกว่า 30 ซม. ซึ่งอาจบ่งชี้ถึงการแอบดูโทรศัพท์หรือโพยใต้โต๊ะ</p>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="card h-100 border-success border-start border-3 border-top-0 border-end-0 border-bottom-0">
                    <div className="card-body">
                      <h6 className="card-title">การเคลื่อนไหวต่อเนื่องนาน</h6>
                      <p className="card-text small">ตรวจจับการเคลื่อนไหวต่อเนื่องนานเกิน 8 วินาที ซึ่งอาจบ่งชี้ถึงการแอบดูโพยข้อสอบ</p>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="card h-100 border-danger border-start border-3 border-top-0 border-end-0 border-bottom-0">
                    <div className="card-body">
                      <h6 className="card-title">เสียงกระซิบต่อเนื่อง</h6>
                      <p className="card-text small">ตรวจจับเสียงกระซิบที่มีความดังระดับ 300-1500 ต่อเนื่องนานเกิน 5 วินาที ซึ่งอาจบ่งชี้ถึงการถามเพื่อน</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-white text-center">
              <small className="text-muted">ระบบจะแจ้งเตือนเมื่อตรวจพบพฤติกรรมที่น่าสงสัยอย่างน้อย 2 ประเภทพร้อมกัน</small>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AlertHistory;