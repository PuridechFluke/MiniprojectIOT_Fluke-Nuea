import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';

const ExamRoom = () => {
  const [desks, setDesks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realTimeData, setRealTimeData] = useState(null);

  // เปลี่ยนวิธีการนำทางเป็น window.location.href
  const navigateTo = (path) => {
    window.location.href = path;
  };

  useEffect(() => {
    // ดึงข้อมูล realtime ของ sensor จาก Firebase สำหรับโต๊ะที่ 1 เท่านั้น
    const sensorsRef = ref(database, '/sensors');
    const statusRef = ref(database, '/status');
    const systemRef = ref(database, '/system');
    
    // สร้างข้อมูลจำลองสำหรับโต๊ะ 12 ตัว (โต๊ะที่ 1 online, ที่เหลือ offline)
    const totalDesks = 12;
    const mockDesks = Array.from({ length: totalDesks }, (_, i) => {
      const deskId = i + 1;
      return {
        id: deskId,
        isOffline: deskId !== 1, // เฉพาะโต๊ะ 1 ที่ online
      };
    });
    
    setDesks(mockDesks);
    
    try {
      // ดึงข้อมูล sensor
      const sensorListener = onValue(sensorsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          console.log('Sensor data received:', data);
          setRealTimeData(prev => ({
            ...prev,
            sensors: data
          }));
        }
      }, error => {
        console.error('Error fetching sensor data:', error);
      });

      // ดึงข้อมูลสถานะ
      const statusListener = onValue(statusRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          console.log('Status data received:', data);
          setRealTimeData(prev => ({
            ...prev,
            status: data
          }));
        }
      }, error => {
        console.error('Error fetching status data:', error);
      });

      // ดึงข้อมูลระบบ
      const systemListener = onValue(systemRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          console.log('System data received:', data);
          setRealTimeData(prev => ({
            ...prev,
            system: data
          }));
        }
      }, error => {
        console.error('Error fetching system data:', error);
      });

      setLoading(false);

      // Cleanup function
      return () => {
        // ยกเลิกการ subscribe
        console.log('Cleaning up Firebase listeners');
      };
    } catch (error) {
      console.error('Error setting up Firebase listeners:', error);
      setLoading(false);
    }
  }, []);

  // อัพเดทข้อมูลของ desk ทุกครั้งที่ realTimeData เปลี่ยน
  useEffect(() => {
    if (!realTimeData || desks.length === 0) return;
    console.log('Updating desks with realtime data');

    const updatedDesks = desks.map(desk => {
      // อัพเดทเฉพาะโต๊ะที่ 1 ด้วยข้อมูล realtime
      if (desk.id === 1 && realTimeData.sensors) {
        const isSuspicious = realTimeData.status?.suspicious || false;
        
        return {
          ...desk,
          status: isSuspicious ? 'suspicious' : 'normal',
          distance: realTimeData.sensors.ultrasonic?.distance || 0,
          motion: realTimeData.sensors.pir?.motion_detected || false,
          continuousMotion: realTimeData.sensors.pir?.continuous_motion || false,
          sound: realTimeData.sensors.sound?.level || 0,
          soundType: realTimeData.sensors.sound?.is_whisper ? 'whisper' : 'normal',
          reason: realTimeData.status?.reason || '',
          uptime: realTimeData.system?.uptime || 0,
          lastUpdate: new Date().toLocaleTimeString()
        };
      }
      return desk;
    });

    setDesks(updatedDesks);
  }, [realTimeData, desks]);

  // ฟังก์ชันสำหรับรับสีสถานะของโต๊ะ
  const getDeskStatusColor = (desk) => {
    if (desk.isOffline) return 'secondary';
    if (desk.status === 'suspicious') return 'danger';
    
    // ตรวจสอบเงื่อนไขเพิ่มเติม
    if (desk.distance < 40) return 'warning';
    if (desk.soundType === 'whisper') return 'warning';
    if (desk.continuousMotion) return 'warning';
    
    return 'success';
  };

  // ฟังก์ชันสำหรับรับไอคอนสถานะของโต๊ะ
  const getDeskStatusIcon = (desk) => {
    if (desk.isOffline) {
      return <i className="bi bi-power fs-4 text-secondary"></i>;
    }

    if (desk.status === 'suspicious') {
      return <i className="bi bi-exclamation-triangle-fill fs-4 text-danger"></i>;
    }
    
    if (desk.distance < 40 || desk.soundType === 'whisper' || desk.continuousMotion) {
      return <i className="bi bi-exclamation-circle-fill fs-4 text-warning"></i>;
    }
    
    return <i className="bi bi-check-circle-fill fs-4 text-success"></i>;
  };

  // คำนวณเวลาทำงานของระบบ
  const formatUptime = (milliseconds) => {
    if (!milliseconds) return '-';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

  // แปลงเหตุผลเป็นภาษาไทย
  const translateReason = (reason) => {
    if (!reason) return '';
    
    const reasons = {
      'distance': 'ระยะทางใกล้เกินไป',
      'motion': 'การเคลื่อนไหวต่อเนื่องนาน',
      'sound': 'เสียงกระซิบต่อเนื่อง'
    };
    
    return reason.split(',').map(r => reasons[r] || r).join(', ');
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fs-2 fw-bold mb-0">ภาพรวมห้องสอบ</h1>
        <div>
          {/* เปลี่ยนมาใช้ window.location.href แทน */}
          <button onClick={() => window.location.href = '/'} className="btn btn-primary me-2">
            <i className="bi bi-speedometer2 me-1"></i> Dashboard
          </button>
          <button onClick={() => window.location.href = '/alerts'} className="btn btn-outline-danger">
            <i className="bi bi-bell me-1"></i> การแจ้งเตือน
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">กำลังโหลดข้อมูล...</span>
          </div>
          <p className="mt-2 text-muted">กำลังโหลดข้อมูลห้องสอบ...</p>
        </div>
      ) : (
        <>
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex align-items-center mb-3 flex-wrap">
                <div className="d-flex align-items-center me-3 mb-2">
                  <div className="rounded-circle bg-success me-2" style={{ width: '12px', height: '12px' }}></div>
                  <span>ปกติ</span>
                </div>
                
                <div className="d-flex align-items-center me-3 mb-2">
                  <div className="rounded-circle bg-warning me-2" style={{ width: '12px', height: '12px' }}></div>
                  <span>ต้องเฝ้าระวัง</span>
                </div>
                
                <div className="d-flex align-items-center me-3 mb-2">
                  <div className="rounded-circle bg-danger me-2" style={{ width: '12px', height: '12px' }}></div>
                  <span>พบพฤติกรรมน่าสงสัย</span>
                </div>
                
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle bg-secondary me-2" style={{ width: '12px', height: '12px' }}></div>
                  <span>Offline</span>
                </div>
              </div>
              
              <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
                {desks.map((desk) => (
                  <div key={desk.id} className="col">
                    {desk.isOffline ? (
                      // โต๊ะที่ offline จะไม่สามารถคลิกได้
                      <div className={`card border-${getDeskStatusColor(desk)} h-100 shadow-sm`}>
                        <div className="card-header bg-white d-flex justify-content-between align-items-center">
                          <h5 className="card-title mb-0">โต๊ะ {desk.id}</h5>
                          {getDeskStatusIcon(desk)}
                        </div>
                        <div className="card-body text-center py-5">
                          <i className="bi bi-wifi-off fs-1 text-secondary opacity-50"></i>
                          <p className="mt-2 text-muted">Offline</p>
                        </div>
                      </div>
                    ) : (
                      // โต๊ะที่ online (โต๊ะ 1) สามารถคลิกเพื่อดูรายละเอียดได้ - เปลี่ยนวิธีการนำทาง
                      <div 
                        onClick={() => window.location.href = `/?desk=${desk.id}`}
                        className="text-decoration-none"
                        style={{cursor: 'pointer'}}
                      >
                        <div className={`card border-${getDeskStatusColor(desk)} h-100 shadow-sm`}>
                          <div className="card-header bg-white d-flex justify-content-between align-items-center">
                            <h5 className="card-title mb-0">โต๊ะ {desk.id}</h5>
                            {getDeskStatusIcon(desk)}
                          </div>
                          <div className="card-body">
                            <div className="row g-2">
                              <div className="col-12">
                                {desk.status === 'suspicious' ? (
                                  <div className="alert alert-danger py-1 mb-2">
                                    <small>พบพฤติกรรมน่าสงสัย: {translateReason(desk.reason)}</small>
                                  </div>
                                ) : desk.distance < 40 || desk.soundType === 'whisper' || desk.continuousMotion ? (
                                  <div className="alert alert-warning py-1 mb-2">
                                    <small>ต้องเฝ้าระวัง</small>
                                  </div>
                                ) : (
                                  <div className="alert alert-success py-1 mb-2">
                                    <small>ปกติ</small>
                                  </div>
                                )}
                              </div>
                              
                              <div className="col-12">
                                <div className="d-flex justify-content-between border-bottom pb-1 mb-1">
                                  <small className="text-muted">ระยะทาง:</small>
                                  <small className={desk.distance < 40 ? 'text-danger fw-bold' : ''}>
                                    {desk.distance ? desk.distance.toFixed(1) : 0} cm
                                  </small>
                                </div>
                              </div>
                              
                              <div className="col-12">
                                <div className="d-flex justify-content-between border-bottom pb-1 mb-1">
                                  <small className="text-muted">การเคลื่อนไหว:</small>
                                  <small className={desk.continuousMotion ? 'text-danger fw-bold' : ''}>
                                    {desk.motion ? 'พบ' : 'ไม่พบ'}
                                    {desk.continuousMotion && 
                                      <span className="badge bg-danger ms-1" style={{fontSize: '0.65rem'}}>ต่อเนื่อง</span>
                                    }
                                  </small>
                                </div>
                              </div>
                              
                              <div className="col-12">
                                <div className="d-flex justify-content-between">
                                  <small className="text-muted">ระดับเสียง:</small>
                                  <small>
                                    {desk.sound || 0}
                                    {desk.soundType === 'whisper' && (
                                      <span className="badge bg-warning text-dark ms-1" style={{fontSize: '0.65rem'}}>กระซิบ</span>
                                    )}
                                  </small>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="card-footer bg-white">
                            <small className="text-muted">
                              อัพเดตล่าสุด: {desk.lastUpdate || '-'}
                            </small>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="alert alert-info d-flex align-items-center" role="alert">
            <i className="bi bi-info-circle-fill me-2"></i>
            <div>
              <strong>หมายเหตุ:</strong> คลิกที่โต๊ะที่ต้องการเพื่อดูข้อมูลรายละเอียดข้อมูล
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExamRoom;