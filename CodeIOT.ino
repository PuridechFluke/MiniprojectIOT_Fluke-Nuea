#include <WiFi.h>
#include <FirebaseESP32.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
 
// กำหนดข้อมูล WiFi
#define WIFI_SSID "00K"          // แก้ไขเป็นชื่อ WiFi ของคุณ
#define WIFI_PASSWORD "00K.Orms"  // แก้ไขเป็นรหัสผ่าน WiFi ของคุณ
 
// กำหนดข้อมูล Firebase
#define API_KEY "AIzaSyDlrUJpfzskoXXJL-uvWXtc-aZZFvRKEuM"     // แก้ไขเป็น API Key ของคุณ
#define DATABASE_URL "https://lab6-113c2-default-rtdb.asia-southeast1.firebasedatabase.app" // แก้ไขเป็น Database URL ของคุณ
 
// กำหนดพิน
#define ULTRASONIC_TRIG_PIN 2   // พินสำหรับ HC-SR04P (Ultrasonic)
#define ULTRASONIC_ECHO_PIN 15  // พินสำหรับ HC-SR04P (Ultrasonic)
#define PIR_PIN 23              // พินสำหรับ HC-SR501 (PIR)
#define SOUND_PIN 34            // พินสำหรับ MAX9814 (Sound Sensor)
#define BUZZER_PIN 13           // พินสำหรับ Buzzer

// กำหนดโหมดการทำงานของ Buzzer (สำคัญ!)
#define BUZZER_ACTIVE_LOW true  // ตั้งเป็น true สำหรับ Active Buzzer ที่ทำงานเมื่อได้รับ LOW

// กำหนดค่าขีดจำกัด
#define DISTANCE_THRESHOLD 30.0   // ระยะห่างที่น่าสงสัย (cm) - น้อยกว่านี้ถือว่าผิดปกติ
#define PIR_DURATION 8000        // ระยะเวลาการเคลื่อนไหวต่อเนื่องที่น่าสงสัย (8000ms = 8 วินาที)
#define WHISPER_LOW_THRESHOLD 300  // ค่าเสียงต่ำสุดที่ถือว่าเป็นเสียงกระซิบ
#define WHISPER_HIGH_THRESHOLD 1500 // ค่าเสียงสูงสุดที่ถือว่าเป็นเสียงกระซิบ
#define NORMAL_SPEECH_THRESHOLD 2000 // ค่าเสียงที่ถือว่าเป็นเสียงพูดปกติ
#define SOUND_DURATION 5000       // ระยะเวลาเสียงต่อเนื่องที่น่าสงสัย (5000ms = 5 วินาที)
#define BUZZER_DURATION 5000     // ระยะเวลาการดังของ Buzzer (5000ms = 5 วินาที)
#define ALERT_COOLDOWN 30000      // ระยะเวลาพักระหว่างการแจ้งเตือน (ms)
#define REPORT_INTERVAL 3000      // ระยะเวลาส่งข้อมูลไปยัง Firebase (ms)
#define MIN_SUSPICIOUS_COUNT 2    // จำนวนขั้นต่ำของพฤติกรรมน่าสงสัยที่ต้องตรวจพบพร้อมกัน

// กำหนด Object ของ Firebase
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
 
// ตัวแปรสำหรับเก็บเวลาและข้อมูล
unsigned long sendDataPrevMillis = 0;
unsigned long lastPrintMillis = 0;
unsigned long lastAlertMillis = 0;
unsigned long motionStartTime = 0;
unsigned long soundStartTime = 0;
unsigned long buzzerStartTime = 0;
unsigned long startTime = 0;

float currentDistance = 0;
int currentSound = 0;
bool motionDetected = false;
bool soundDetected = false;
bool isWhisper = false;
bool continuousMotion = false;
bool continuousSound = false;
bool signupOK = false;
bool buzzerActive = false;
int alertCount = 0;

// ตัวแปรบอกสถานะการตรวจจับแต่ละประเภท
bool distanceAbnormal = false;
bool motionAbnormal = false;
bool soundAbnormal = false;

// ตัวแปรสำหรับป้องกันการแจ้งเตือนซ้ำ
bool alreadyNotified = false;
 
void setup() {
  // เริ่มต้นซีเรียล
  Serial.begin(115200);
  delay(1000);  // รอให้ซีเรียลพร้อมใช้งาน
  
  // บันทึกเวลาเริ่มต้น
  startTime = millis();
  
  // กำหนด pinMode สำหรับเซ็นเซอร์
  pinMode(ULTRASONIC_TRIG_PIN, OUTPUT);
  pinMode(ULTRASONIC_ECHO_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(SOUND_PIN, INPUT);     
  
  // กำหนดและปิด Buzzer ทันที
  pinMode(BUZZER_PIN, OUTPUT);
  
  // ปิด Buzzer (ค่าที่ใช้ขึ้นอยู่กับโหมดการทำงาน)
  turnOffBuzzer();
  delay(100);  // รอสักครู่
  
  Serial.println("ปิด Buzzer แล้ว");
  
  // ทดสอบ Buzzer
  Serial.println("ทดสอบ Buzzer");
  beepShort();
  
  Serial.println("เริ่มต้นระบบตรวจจับพฤติกรรมการโกงในห้องสอบ");
  Serial.println("กรุณารอสักครู่ให้เซ็นเซอร์ PIR ปรับตัว...");
  
  // รอให้ PIR sensor ปรับตัว
  for (int i = 0; i < 10; i++) {
    Serial.print(".");
    
    // ตรวจสอบว่า Buzzer ถูกปิดไว้อย่างแน่นอน
    turnOffBuzzer();
    
    delay(1000);
  }
  Serial.println("\nเซ็นเซอร์ PIR พร้อมทำงาน");
  
  // เชื่อมต่อ WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("กำลังเชื่อมต่อกับ Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    
    // ตรวจสอบว่า Buzzer ถูกปิดไว้อย่างแน่นอน
    turnOffBuzzer();
    
    delay(300);
  }
  Serial.println();
  Serial.print("เชื่อมต่อ Wi-Fi แล้ว, IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.println();
 
  // กำหนดค่า Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
 
  // ลงทะเบียนกับ Firebase โดยไม่ใช้ Email/Password (Anonymous)
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("การลงทะเบียนสำเร็จ");
    signupOK = true;
  } else {
    Serial.printf("การลงทะเบียนล้มเหลว, %s\n", config.signer.signupError.message.c_str());
  }
 
  // กำหนด callback function สำหรับการดูสถานะการเชื่อมต่อ
  config.token_status_callback = tokenStatusCallback;
 
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // สร้างโครงสร้างข้อมูลใน Firebase เพื่อเริ่มใช้งาน
  if (Firebase.ready() && signupOK) {
    // ส่งข้อมูลเริ่มต้น
    Firebase.setString(fbdo, "/system/status", "online");
    Firebase.setString(fbdo, "/system/started_at", String(millis()));
    Firebase.setString(fbdo, "/system/ip_address", WiFi.localIP().toString());
    Firebase.setBool(fbdo, "/status/suspicious", false);
    
    // เคลียร์การแจ้งเตือนเก่า
    Firebase.deleteNode(fbdo, "/alerts");
    Firebase.setInt(fbdo, "/alerts/count", 0);
  }
  
  // ทดสอบ Buzzer อีกครั้งเพื่อแจ้งว่าระบบพร้อมทำงาน
  beepShort();
  delay(300);
  beepShort();
  
  // ปิด Buzzer อีกครั้งเพื่อความแน่ใจ
  turnOffBuzzer();
  
  Serial.println("ระบบพร้อมตรวจจับพฤติกรรมการโกงในห้องสอบ");
  Serial.println("-------------------------------------");
}

// ฟังก์ชันสำหรับเปิด Buzzer
void turnOnBuzzer() {
  if (BUZZER_ACTIVE_LOW) {
    digitalWrite(BUZZER_PIN, LOW);  // Active-Low: LOW = เปิด
  } else {
    digitalWrite(BUZZER_PIN, HIGH); // Active-High: HIGH = เปิด
  }
  buzzerActive = true;
  buzzerStartTime = millis();
}

// ฟังก์ชันสำหรับปิด Buzzer
void turnOffBuzzer() {
  if (BUZZER_ACTIVE_LOW) {
    digitalWrite(BUZZER_PIN, HIGH); // Active-Low: HIGH = ปิด
  } else {
    digitalWrite(BUZZER_PIN, LOW);  // Active-High: LOW = ปิด
  }
  buzzerActive = false;
}

// ฟังก์ชันสำหรับสั่งให้ Buzzer ดังเสียงสั้นๆ (สำหรับทดสอบ)
void beepShort() {
  turnOnBuzzer();
  delay(500);  // ดัง 0.5 วินาที
  turnOffBuzzer();
}

// ฟังก์ชันสำหรับจัดการ Buzzer ในลูปหลัก
void handleBuzzer() {
  // ถ้า Buzzer กำลังทำงานอยู่ตรวจสอบระยะเวลา
  if (buzzerActive) {
    if (millis() - buzzerStartTime >= BUZZER_DURATION) {
      turnOffBuzzer();
      Serial.println("จบการแจ้งเตือน (5 วินาที)");
    }
  }
}
 
void loop() {
  // จัดการ Buzzer ตามเวลา
  handleBuzzer();
  
  // 1. ตรวจจับระยะทาง (Step 1)
  currentDistance = measureDistance();
  distanceAbnormal = (currentDistance < DISTANCE_THRESHOLD && currentDistance > 0);
  
  // 2. ตรวจจับการเคลื่อนไหว (Step 2)
  bool pirState = digitalRead(PIR_PIN);
  
  // เมื่อตรวจพบการเคลื่อนไหวครั้งแรก
  if (pirState == HIGH && !motionDetected) {
    motionDetected = true;
    motionStartTime = millis();
    continuousMotion = false;  // รีเซ็ตค่าครั้งแรก
    motionAbnormal = false;    // รีเซ็ตสถานะผิดปกติ
    Serial.println("ตรวจพบการเคลื่อนไหว");
  }
  // เมื่อการเคลื่อนไหวสิ้นสุดลง
  else if (pirState == LOW && motionDetected) {
    motionDetected = false;
    continuousMotion = false;
    motionAbnormal = false;
    Serial.println("การเคลื่อนไหวสิ้นสุด");
  }

  // ตรวจสอบว่าการเคลื่อนไหวต่อเนื่องเกินเวลาที่กำหนดหรือไม่
  if (motionDetected && (millis() - motionStartTime > PIR_DURATION)) {
    continuousMotion = true;
    motionAbnormal = true;
    Serial.println("ตรวจพบการเคลื่อนไหวต่อเนื่องนานผิดปกติ!");
  } else if (!motionDetected) {
    // ถ้าไม่มีการเคลื่อนไหวแล้ว รีเซ็ตค่าทั้งหมด
    continuousMotion = false;
    motionAbnormal = false;
  }
  
  // 3. ตรวจจับเสียง (Step 3)
  // อ่านค่าเสียงและใช้การเฉลี่ยเพื่อลดสัญญาณรบกวน
  static int soundValues[10] = {0};
  static int soundIndex = 0;
  
  soundValues[soundIndex] = analogRead(SOUND_PIN);
  soundIndex = (soundIndex + 1) % 10;
  
  long soundSum = 0;
  for (int i = 0; i < 10; i++) {
    soundSum += soundValues[i];
  }
  currentSound = soundSum / 10;
  
  // ตรวจสอบประเภทของเสียง
  isWhisper = (currentSound >= WHISPER_LOW_THRESHOLD && currentSound <= WHISPER_HIGH_THRESHOLD);
  bool isNormalSpeech = (currentSound > WHISPER_HIGH_THRESHOLD);
  
  // เมื่อตรวจพบเสียงกระซิบครั้งแรก
  if (isWhisper && !soundDetected) {
    soundDetected = true;
    soundStartTime = millis();
    Serial.println("ตรวจพบเสียงกระซิบ");
  }
  // เมื่อเสียงสิ้นสุดลง หรือกลายเป็นเสียงพูดปกติ
  else if ((!isWhisper && soundDetected) || isNormalSpeech) {
    soundDetected = false;
    continuousSound = false;
    soundAbnormal = false;  // เพิ่มการรีเซ็ตสถานะผิดปกติ
    if (isNormalSpeech) {
      Serial.println("ตรวจพบเสียงพูดปกติ - ไม่ใช่เสียงกระซิบ");
    } else {
      Serial.println("เสียงกระซิบสิ้นสุด");
    }
  }
  
  // ตรวจสอบว่าเสียงกระซิบต่อเนื่องเกินเวลาที่กำหนดหรือไม่
  if (soundDetected && !continuousSound && (millis() - soundStartTime > SOUND_DURATION)) {
    continuousSound = true;
    soundAbnormal = true;
    Serial.println("ตรวจพบเสียงกระซิบต่อเนื่องนานผิดปกติ!");
  }
  
  // 4. แสดงข้อมูลทุก 1 วินาที
  if (millis() - lastPrintMillis >= 1000) {
    lastPrintMillis = millis();
    
    Serial.println("-------------------------------------");
    Serial.print("ระยะห่าง: ");
    Serial.print(currentDistance);
    Serial.print(" cm | ");
    Serial.println(distanceAbnormal ? "ผิดปกติ" : "ปกติ");
    
    Serial.print("การเคลื่อนไหวต่อเนื่อง: ");
    Serial.print(continuousMotion ? "ใช่" : "ไม่ใช่");
    Serial.print(" | ");
    Serial.println(motionAbnormal ? "ผิดปกติ" : "ปกติ");
    
    Serial.print("ระดับเสียง: ");
    Serial.print(currentSound);
    Serial.print(" | ประเภท: ");
    if (currentSound < WHISPER_LOW_THRESHOLD) {
      Serial.print("เงียบ");
    } else if (isWhisper) {
      Serial.print("กระซิบ");
    } else {
      Serial.print("พูดปกติ");
    }
    Serial.print(" | เสียงต่อเนื่อง: ");
    Serial.print(continuousSound ? "ใช่" : "ไม่ใช่");
    Serial.print(" | ");
    Serial.println(soundAbnormal ? "ผิดปกติ" : "ปกติ");
    Serial.println("-------------------------------------");
  }
  
  // 5. ตรวจสอบพฤติกรรมที่น่าสงสัย (ทั้ง 3 ขั้นตอน)
  int suspiciousCount = 0;
  String suspiciousReason = "";
  
  if (distanceAbnormal) {
    suspiciousCount++;
    suspiciousReason = "distance";
  }
  
  if (motionAbnormal) {
    suspiciousCount++;
    if (suspiciousReason.length() > 0) {
      suspiciousReason += ",motion";
    } else {
      suspiciousReason = "motion";
    }
  }
  
  if (soundAbnormal) {
    suspiciousCount++;
    if (suspiciousReason.length() > 0) {
      suspiciousReason += ",sound";
    } else {
      suspiciousReason = "sound";
    }
  }
  
  // ต้องตรวจพบพฤติกรรมน่าสงสัยอย่างน้อย MIN_SUSPICIOUS_COUNT ประเภทจึงจะแจ้งเตือน
  bool isSuspicious = (suspiciousCount >= MIN_SUSPICIOUS_COUNT);
  
  // 6. ส่งเสียงแจ้งเตือนและบันทึกข้อมูลเมื่อพบพฤติกรรมที่น่าสงสัย
  if (isSuspicious && !alreadyNotified && (millis() - lastAlertMillis > ALERT_COOLDOWN) && !buzzerActive) {
    // ส่งเสียงแจ้งเตือน (จะดังต่อเนื่อง 5 วินาที)
    turnOnBuzzer();
    lastAlertMillis = millis();
    alreadyNotified = true;
    
    Serial.println("!!! พบพฤติกรรมที่น่าสงสัย: " + suspiciousReason + " !!! (เริ่มแจ้งเตือน 5 วินาที)");
    
    // ส่งข้อมูลไปยัง Firebase
    if (Firebase.ready() && signupOK) {
      // อัพเดตสถานะว่ามีพฤติกรรมที่น่าสงสัย
      Firebase.setBool(fbdo, "/status/suspicious", true);
      Firebase.setString(fbdo, "/status/reason", suspiciousReason);
      Firebase.setString(fbdo, "/status/last_alert", String(millis()));
      
      // บันทึกข้อมูลการแจ้งเตือน
      String alertPath = "/alerts/" + String(alertCount);
      FirebaseJson json;
      json.set("distance", currentDistance);
      json.set("distance_abnormal", distanceAbnormal);
      json.set("motion_abnormal", motionAbnormal);
      json.set("sound", currentSound);
      json.set("sound_abnormal", soundAbnormal);
      json.set("timestamp", millis());
      json.set("reason", suspiciousReason);
      json.set("suspicious_count", suspiciousCount);
      
      if (Firebase.setJSON(fbdo, alertPath, json)) {
        Serial.print("บันทึกการแจ้งเตือนสำเร็จ, path: ");
        Serial.println(alertPath);
        
        // อัพเดตจำนวนการแจ้งเตือน
        Firebase.setInt(fbdo, "/alerts/count", alertCount + 1);
        alertCount++;
      } else {
        Serial.println("บันทึกการแจ้งเตือนล้มเหลว: " + fbdo.errorReason());
      }
    }
  } else if (!isSuspicious) {
    // รีเซ็ตตัวแปรตรวจจับผิดปกติ (เพื่อเริ่มตรวจจับใหม่)
    alreadyNotified = false;
    
    if (Firebase.ready() && signupOK) {
      // อัพเดตสถานะว่าไม่มีพฤติกรรมที่น่าสงสัย
      Firebase.setBool(fbdo, "/status/suspicious", false);
    }
  }
  
  // 7. ส่งข้อมูลไปยัง Firebase ทุก x วินาที (อัพเดตข้อมูลปกติ)
  if (Firebase.ready() && signupOK && (millis() - sendDataPrevMillis > REPORT_INTERVAL || sendDataPrevMillis == 0)) {
    sendDataPrevMillis = millis();
    
    // สร้าง JSON สำหรับข้อมูลเซ็นเซอร์ทั้งหมด
    FirebaseJson sensorData;
    sensorData.set("ultrasonic/distance", currentDistance);
    sensorData.set("ultrasonic/status", distanceAbnormal ? "abnormal" : "normal");
    sensorData.set("pir/motion_detected", motionDetected);
    sensorData.set("pir/continuous_motion", continuousMotion);
    sensorData.set("pir/status", motionAbnormal ? "abnormal" : "normal");
    sensorData.set("sound/level", currentSound);
    sensorData.set("sound/is_whisper", isWhisper);
    sensorData.set("sound/continuous_sound", continuousSound);
    sensorData.set("sound/status", soundAbnormal ? "abnormal" : "normal");
    sensorData.set("timestamp", millis());
    sensorData.set("suspicious_count", suspiciousCount);
    sensorData.set("buzzer_active", buzzerActive);
    
    // ส่งข้อมูลทั้งหมดในครั้งเดียว
    if (Firebase.setJSON(fbdo, "/sensors", sensorData)) {
      Serial.println("ส่งข้อมูลเซ็นเซอร์ทั้งหมดสำเร็จ");
    } else {
      Serial.println("ส่งข้อมูลเซ็นเซอร์ล้มเหลว: " + fbdo.errorReason());
    }
    
    // อัพเดตสถานะระบบ
    Firebase.setString(fbdo, "/system/uptime", String(millis()));
  }
  
  // หน่วงเวลาเล็กน้อย
  delay(100);
}
 
// ฟังก์ชันวัดระยะห่างจากเซ็นเซอร์อัลตร้าซาวด์
float measureDistance() {
  // ส่งสัญญาณ trigger
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
  // รับสัญญาณ echo และคำนวณระยะห่าง
  long duration = pulseIn(ULTRASONIC_ECHO_PIN, HIGH);
  float distance = duration * 0.034 / 2;
  return distance;
}