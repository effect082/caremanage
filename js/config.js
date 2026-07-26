/**
 * 일일 케어 현황 (Daily Care Status) - Config
 */

const CONFIG = {
  // Primary Active GAS Web App Endpoint
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxaF4BbsWz40cd2iGd_EENS1xCnufLl41BfSNNcJsZBu703Xuq_1rYxzRc6rMyTEFrZ/exec',
  
  // Secondary GAS Endpoint
  GAS_URL_ALT: 'https://script.google.com/macros/s/AKfycbw92rv44K3MMQvN7UyzbQpEQt7V-q72rY0tt_ftI4-XoXNaMOeaJpewyPPw3dGjhA8/exec',
  
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
