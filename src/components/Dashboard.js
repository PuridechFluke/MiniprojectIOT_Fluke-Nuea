import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [systemStatus, setSystemStatus] = useState({});
  const [sensorData, setSensorData] = useState({});
  const [alertCount, setAlertCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState('ระบบทำงานปกติ');
  const [lastUpdate, setLastUpdate] = useState('-');
  const [deskNumber, setDeskNumber] = useState(1); // เพิ่มข้อมูลโต๊ะ (เริ่มต้นที่โต๊ะ 1)
  
  // สำหรับกราฟ - เก็บข้อมูล 12 ตัวล่าสุด (60 วินาที)
  const [distanceHistory, setDistanceHistory] = useState([]);
  const [soundHistory, setSoundHistory] = useState([]);

  useEffect(() => {
    // อ่านข้อมูลสถานะระบบ
    const systemRef = ref(database, '/system');
    onValue(systemRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSystemStatus(data);
        
        // คำนวณเวลาที่ระบบทำงาน
        const uptime = parseInt(data.uptime || 0);
        const hours = Math.floor(uptime / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        const seconds = Math.floor((uptime % 60000) / 1000);
        setLastUpdate(`${hours}h ${minutes}m ${seconds}s`);
      }
    });

    // อ่านข้อมูลเซ็นเซอร์
    const sensorsRef = ref(database, '/sensors');
    onValue(sensorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSensorData(data);
        
        // อัพเดตประวัติข้อมูลสำหรับกราฟ
        setDistanceHistory(prevData => {
          const newData = [...prevData, data.ultrasonic?.distance || 0];
          return newData.slice(-12); // เก็บแค่ 12 ตัวล่าสุด
        });
        
        setSoundHistory(prevData => {
          const newData = [...prevData, data.sound?.level || 0];
          return newData.slice(-12); // เก็บแค่ 12 ตัวล่าสุด
        });
      }
    });

    // อ่านข้อมูลสถานะการแจ้งเตือน
    const statusRef = ref(database, '/status');
    onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.suspicious) {
          setStatusMessage(`⚠️ พบพฤติกรรมน่าสงสัย: ${data.reason || 'ไม่ระบุ'}`);
        } else {
          setStatusMessage('✅ ระบบทำงานปกติ');
        }
      }
    });

    // อ่านจำนวนการแจ้งเตือนทั้งหมด
    const alertsRef = ref(database, '/alerts/count');
    onValue(alertsRef, (snapshot) => {
      const count = snapshot.val() || 0;
      setAlertCount(count);
    });
  }, []);

  // ฟังก์ชันสำหรับรูปแบบข้อมูลกราฟ
  const formatChartData = (data, label, color) => {
    const labels = data.map((_, index) => {
      return `${index * 5}s ago`;
    }).reverse();

    return {
      labels,
      datasets: [
        {
          label,
          data: [...data].reverse(),
          borderColor: color,
          backgroundColor: `${color}33`, // เพิ่มความโปร่งใส
          tension: 0.4,
          fill: true
        },
      ],
    };
  };

  // ตัวเลือกกราฟ
  const chartOptions = (title) => {
    return {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: title,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
      animation: {
        duration: 500
      },
    };
  };

  // แปลงเหตุผลเป็นภาษาไทย
  const translateReason = (reason) => {
    if (!reason) return 'ไม่ระบุ';
    
    const reasons = {
      'distance': 'ระยะทางใกล้เกินไป',
      'motion': 'การเคลื่อนไหวต่อเนื่องนาน',
      'sound': 'เสียงกระซิบต่อเนื่อง'
    };
    
    return reason.split(',').map(r => reasons[r] || r).join(', ');
  };

  return (
    <div className="container mt-4">
      <h1 className="fs-2 fw-bold mb-4">แผงควบคุมระบบตรวจจับพฤติกรรมการโกง</h1>
      
      {/* สถานะระบบ */}
      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-center mb-2">
            <div className={`rounded-circle me-2 ${statusMessage.includes('น่าสงสัย') ? 'bg-danger' : 'bg-success'}`} style={{width: '12px', height: '12px'}}></div>
            <h2 className="fs-5 fw-semibold mb-0">
              สถานะระบบ: {statusMessage}
              {statusMessage.includes('น่าสงสัย') && <span className="badge bg-danger ms-2">โต๊ะ {deskNumber}</span>}
            </h2>
          </div>
          <div className="row">
            <div className="col-md-6">
              <p className="text-muted mb-1">ระยะเวลาทำงาน: {lastUpdate}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* การ์ดสถานะ */}
      <div className="row row-cols-1 row-cols-md-3 g-4 mb-4">
        <div className="col">
          <div className="card h-100 border-primary border-start border-5 border-top-0 border-end-0 border-bottom-0 shadow-sm">
            <div className="card-body d-flex justify-content-between">
              <div>
                <h6 className="card-subtitle text-muted">ระยะทาง (โต๊ะ {deskNumber})</h6>
                <p className={`card-title fs-3 fw-bold ${sensorData.ultrasonic?.distance < 40 ? 'text-danger' : ''}`}>
                  {sensorData.ultrasonic?.distance?.toFixed(1) || 0} cm
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col">
          <div className="card h-100 border-success border-start border-5 border-top-0 border-end-0 border-bottom-0 shadow-sm">
            <div className="card-body d-flex justify-content-between">
              <div>
                <h6 className="card-subtitle text-muted">การเคลื่อนไหว (โต๊ะ {deskNumber})</h6>
                <p className={`card-title fs-3 fw-bold ${sensorData.pir?.continuous_motion ? 'text-danger' : ''}`}>
                  {sensorData.pir?.motion_detected ? "ตรวจพบ" : "ไม่พบ"}
                </p>
                {sensorData.pir?.continuous_motion && 
                  <span className="badge bg-danger">ต่อเนื่องนาน</span>
                }
              </div>
            </div>
          </div>
        </div>
        
        <div className="col">
          <div className="card h-100 border-purple border-start border-5 border-top-0 border-end-0 border-bottom-0 shadow-sm" style={{borderColor: '#6f42c1'}}>
            <div className="card-body d-flex justify-content-between">
              <div>
                <h6 className="card-subtitle text-muted">ระดับเสียง (โต๊ะ {deskNumber})</h6>
                <p className={`card-title fs-3 fw-bold ${sensorData.sound?.continuous_sound ? 'text-danger' : ''}`}>
                  {sensorData.sound?.level || 0}
                </p>
                {sensorData.sound?.is_whisper && 
                  <span className="badge bg-warning text-dark">กระซิบ</span>
                }
                {sensorData.sound?.continuous_sound && 
                  <span className="badge bg-danger ms-1">ต่อเนื่องนาน</span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* การแจ้งเตือน */}
      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="fs-5 fw-semibold mb-0">การแจ้งเตือน</h2>
            <span className="badge bg-danger rounded-pill">{alertCount} รายการ</span>
          </div>
          
          {alertCount > 0 ? (
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <div>
                พบพฤติกรรมน่าสงสัยที่<strong>โต๊ะ {deskNumber}</strong> - 
                <Link to="/alerts" className="alert-link ms-1">ตรวจสอบประวัติการแจ้งเตือน</Link>
              </div>
            </div>
          ) : (
            <div className="alert alert-success d-flex align-items-center" role="alert">
              <i className="bi bi-check-circle-fill me-2"></i>
              <div>ไม่พบพฤติกรรมน่าสงสัย</div>
            </div>
          )}

          {alertCount > 0 && (
            <div className="mt-3">
              <h6 className="fw-bold">พฤติกรรมล่าสุดที่ตรวจพบ:</h6>
              <div className="table-responsive">
                <table className="table table-sm table-striped">
                  <thead className="table-light">
                    <tr>
                      <th>ประเภท</th>
                      <th>โต๊ะ</th>
                      <th>รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensorData.suspicious_count >= 2 && (
                      <tr>
                        <td>
                          <span className="badge bg-danger">พฤติกรรมน่าสงสัย</span>
                        </td>
                        <td>{deskNumber}</td>
                        <td>ตรวจพบพฤติกรรมน่าสงสัย {sensorData.suspicious_count}/3 ประเภท</td>
                      </tr>
                    )}
                    {sensorData.ultrasonic?.distance < 30 && (
                      <tr>
                        <td>
                          <span className="badge bg-warning text-dark">ระยะทาง</span>
                        </td>
                        <td>{deskNumber}</td>
                        <td>ระยะทางใกล้เกินไป ({sensorData.ultrasonic?.distance?.toFixed(1)} cm)</td>
                      </tr>
                    )}
                    {sensorData.pir?.continuous_motion && (
                      <tr>
                        <td>
                          <span className="badge bg-warning text-dark">การเคลื่อนไหว</span>
                        </td>
                        <td>{deskNumber}</td>
                        <td>ตรวจพบการเคลื่อนไหวต่อเนื่องนาน (เกิน 8 วินาที)</td>
                      </tr>
                    )}
                    {sensorData.sound?.continuous_sound && (
                      <tr>
                        <td>
                          <span className="badge bg-warning text-dark">เสียง</span>
                        </td>
                        <td>{deskNumber}</td>
                        <td>ตรวจพบเสียงกระซิบต่อเนื่องนาน (เกิน 5 วินาที)</td>
                      </tr>
                    )}
                    </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* กราฟข้อมูล */}
      <div className="row row-cols-1 row-cols-lg-2 g-4 mb-4">
        <div className="col">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom-0 pt-3">
              <h5 className="card-title">ระยะทาง (cm) - โต๊ะ {deskNumber}</h5>
            </div>
            <div className="card-body">
              {distanceHistory.length > 0 ? (
                <Line 
                  options={chartOptions("ระยะทางในช่วง 60 วินาทีที่ผ่านมา")} 
                  data={formatChartData(distanceHistory, "ระยะทาง (cm)", "#0d6efd")} 
                />
              ) : (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-hourglass fs-1"></i>
                  <p className="mt-2">กำลังรอข้อมูล...</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="col">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom-0 pt-3">
              <h5 className="card-title">ระดับเสียง - โต๊ะ {deskNumber}</h5>
            </div>
            <div className="card-body">
              {soundHistory.length > 0 ? (
                <Line 
                  options={chartOptions("ระดับเสียงในช่วง 60 วินาทีที่ผ่านมา")} 
                  data={formatChartData(soundHistory, "ระดับเสียง", "#6f42c1")} 
                />
              ) : (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-hourglass fs-1"></i>
                  <p className="mt-2">กำลังรอข้อมูล...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* คำอธิบายเกณฑ์การตรวจจับ */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-light">
          <h5 className="card-title mb-0">เกณฑ์การตรวจจับพฤติกรรมการโกง</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="card h-100 border-primary border-top border-2 border-start-0 border-end-0 border-bottom-0">
                <div className="card-body">
                  <h5 className="card-title d-flex align-items-center">
                    <i className="bi bi-rulers fs-4 me-2 text-primary"></i>
                    1. ระยะทางใกล้เกินไป
                  </h5>
                  <p className="card-text">ตรวจจับระยะห่างที่น้อยกว่า 30 ซม. ซึ่งอาจบ่งชี้ถึงการแอบดูโทรศัพท์หรือโพยใต้โต๊ะ</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="card h-100 border-success border-top border-2 border-start-0 border-end-0 border-bottom-0">
                <div className="card-body">
                  <h5 className="card-title d-flex align-items-center">
                    <i className="bi bi-eye fs-4 me-2 text-success"></i>
                    2. การเคลื่อนไหวต่อเนื่อง
                  </h5>
                  <p className="card-text">ตรวจจับการเคลื่อนไหวต่อเนื่องนานเกิน 8 วินาที ซึ่งอาจบ่งชี้ถึงการแอบดูโพยข้อสอบ</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="card h-100" style={{ borderTop: '2px solid #6f42c1', borderLeft: '0', borderRight: '0', borderBottom: '0' }}>
                <div className="card-body">
                  <h5 className="card-title d-flex align-items-center">
                    <i className="bi bi-volume-up fs-4 me-2" style={{ color: '#6f42c1' }}></i>
                    3. เสียงกระซิบ
                  </h5>
                  <p className="card-text">ตรวจจับเสียงกระซิบที่มีความดังระดับ 300-1500 ต่อเนื่องนานเกิน 5 วินาที ซึ่งอาจบ่งชี้ถึงการถามเพื่อน</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card-footer bg-white text-center">
          <small className="text-muted">ระบบจะแจ้งเตือนเมื่อตรวจพบพฤติกรรมที่น่าสงสัยอย่างน้อย 2 ประเภทพร้อมกัน</small>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;