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
  }
};

window.CONFIG = CONFIG;
