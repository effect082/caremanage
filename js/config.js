/**
 * 일일 케어 현황 (Daily Care Status) - Config
 */

const CONFIG = {
  // Primary Active GAS Web App Endpoint (Newly Deployed)
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzmkl6wA7WyFtOlL4JpygZkSoxhiUtbem82iutn-MHaumF_G242QDucbv7X-qAw0KFc/exec',
  
  // Secondary GAS Endpoints (Failover)
  GAS_URL_ALT: 'https://script.google.com/macros/s/AKfycbxXmYVkiQl6nMDatgytzqTIv7-AVit5hIkfMsqXl24LnRVOI73C-btaVkxWIBiYU2ZS/exec',
  
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
