/**
 * 일일 케어 현황 (Daily Care Status) - Config
 */

const CONFIG = {
  // Primary Active GAS Web App Endpoint (Newly Deployed)
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzpzCnH5aCR0zUHEttRc5AmEgLHxrXopZ5u2DMt3kvy7mFxuNdGexINZplokDQWcZsi/exec',
  
  // Secondary GAS Endpoints
  GAS_URL_ALT: 'https://script.google.com/macros/s/AKfycbwJNrrQsuniO2FSHQUhIPYQUX8hTMGe1RGZ96nnWsx5qp2P-NSUhod1XzLs5y7Gbu0T/exec',
  
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
  }
};

window.CONFIG = CONFIG;
