/**
 * 일일 케어 현황 (Daily Care Status) - Config
 */

const CONFIG = {
  // Primary Active GAS Web App Endpoint (Newly Deployed)
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzWfvWvBtUKlCaYEEso77YHeBF_vq5Jm13yYO0vwVA9nO23k3L1L3ruU72s2BVzCShA/exec',
  
  // Secondary GAS Endpoints (Failover)
  GAS_URL_ALT: 'https://script.google.com/macros/s/AKfycbw9GfsWI9YocSm1q5gkTWto2Ef08cnIULYYqO_5D916307hCuFn12TOWUHh8jGivoBC/exec',
  
  // Health Thresholds
  THRESHOLDS: {
    HIGH_SYSTOLIC: 140, // 수축기 고혈압 임계값
    HIGH_DIASTOLIC: 90, // 이완기 고혈압 임계값
    HIGH_TEMP: 37.5,    // 체온 미열/발열 임계값
    LOW_TEMP: 35.5      // 저체온 임계값
  },
  
  // LocalStorage Keys
  KEYS: {
    CURRENT_USER: 'care_app_current_user',
    LOCAL_RECORDS: 'care_app_local_records',
    LOCAL_USERS: 'care_app_local_users',
    LOCAL_ELDERS: 'care_app_local_elders'
  },

  // 대한민국 표준시 (KST, Asia/Seoul) 기준 YYYY-MM-DD 포맷 반환
  getKSTDateString: function(date = new Date()) {
    const d = (typeof date === 'string' || typeof date === 'number') ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  },

  // KST 기준 어제 날짜 YYYY-MM-DD 반환
  getKSTYesterdayString: function(date = new Date()) {
    const d = (typeof date === 'string' || typeof date === 'number') ? new Date(date) : new Date(date.getTime());
    d.setDate(d.getDate() - 1);
    return CONFIG.getKSTDateString(d);
  },

  // KST 기준 YYYY-MM 포맷 반환
  getKSTYearMonthString: function(date = new Date()) {
    return CONFIG.getKSTDateString(date).slice(0, 7);
  },

  // KST 날짜 화면 표기용 (예: 2026-07-28 (화))
  formatKSTDateDisplay: function(dateStr) {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length < 3) return dateStr;
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const dayName = days[d.getDay()];
      return `${dateStr} (${dayName})`;
    } catch (e) {
      return dateStr;
    }
  },

  // KST 기준 주어진 날짜가 포함된 주(Week)의 월요일~일요일 날짜 범위 반환 (YYYY-MM-DD)
  getKSTWeekRange: function(date = new Date()) {
    const parts = (typeof date === 'string') ? date.split('-').map(Number) : null;
    const targetDate = parts ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(date.getTime());
    const day = targetDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    
    const monday = new Date(targetDate.getTime());
    monday.setDate(monday.getDate() + diffToMonday);
    
    const sunday = new Date(monday.getTime());
    sunday.setDate(sunday.getDate() + 6);
    
    return {
      startDateStr: CONFIG.getKSTDateString(monday),
      endDateStr: CONFIG.getKSTDateString(sunday),
      monday,
      sunday
    };
  },

  // 날짜 범위 표기용 (예: 07.27(월) ~ 08.02(일))
  formatKSTDateRangeDisplay: function(startStr, endStr) {
    if (!startStr || !endStr) return '';
    try {
      const sParts = startStr.split('-');
      const eParts = endStr.split('-');
      const sDate = new Date(Number(sParts[0]), Number(sParts[1]) - 1, Number(sParts[2]));
      const eDate = new Date(Number(eParts[0]), Number(eParts[1]) - 1, Number(eParts[2]));
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      
      return `${sParts[1]}.${sParts[2]}(${days[sDate.getDay()]}) ~ ${eParts[1]}.${eParts[2]}(${days[eDate.getDay()]})`;
    } catch (e) {
      return `${startStr} ~ ${endStr}`;
    }
  },

  // 대한민국 표준시(KST) 시간 표기용 (예: 05:28, 22:12, 1899-12-29T23:30:08.000Z -> 08:30)
  formatKSTTime: function(timeStr, defaultFallback = '') {
    if (!timeStr) return defaultFallback;
    const str = String(timeStr).trim();
    if (!str) return defaultFallback;

    // 이미 HH:mm 또는 HH:mm:ss 형식인 경우
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
      const parts = str.split(':');
      const h = String(parts[0]).padStart(2, '0');
      const m = String(parts[1]).padStart(2, '0');
      return `${h}:${m}`;
    }

    // ISO 날짜 또는 Google Sheets Time 셀 변환 ISO 문자열인 경우 (T 포함)
    if (str.includes('T')) {
      const timePart = str.split('T')[1];
      if (timePart) {
        const parts = timePart.split(':');
        if (parts.length >= 2) {
          let h = parseInt(parts[0], 10);
          let m = parseInt(parts[1], 10);
          if (str.endsWith('Z') || str.includes('+')) {
            h = (h + 9) % 24;
          }
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
      }
    }

    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const kstHours = (d.getUTCHours() + 9) % 24;
        const kstMinutes = d.getUTCMinutes();
        return `${String(kstHours).padStart(2, '0')}:${String(kstMinutes).padStart(2, '0')}`;
      }
    } catch (e) {}

    return str || defaultFallback;
  },

  // 투약 메모 정화 (요청사항: "복용하시는 약 4개중 3가지 70%만 복용(보호자요청)" 문구 필터링)
  cleanMedicationMemo: function(memo) {
    if (!memo) return '';
    const str = String(memo).trim();
    if (str.includes('복용하시는 약 4개중') || str.includes('70%만 복용')) {
      return '';
    }
    return str;
  }
};

window.CONFIG = CONFIG;
