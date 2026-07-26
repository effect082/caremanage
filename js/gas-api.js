/**
 * 일일 케어 현황 - GAS Backend API Service Module
 * Handles REST requests to Google Apps Script Web App with automatic resilience.
 */

class GasApiService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || CONFIG.GAS_URL;
  }

  // SHA-256 Simple Hash Utility (비밀번호 안전화)
  async hashPassword(password) {
    if (!password) return '';
    try {
      const msgUint8 = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return password; // Fallback
    }
  }

  // Generic Request Helper
  async request(action, params = {}, method = 'GET', body = null) {
    let url = `${this.baseUrl}?action=${encodeURIComponent(action)}`;
    
    if (method === 'GET') {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url += `&${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
        }
      });
    }

    const fetchOptions = {
      method: method,
      mode: 'cors',
      headers: {
        'Accept': 'application/json'
      }
    };

    if (method === 'POST' && body) {
      // GAS accepts text/plain to prevent CORS preflight OPTIONS failures
      fetchOptions.headers['Content-Type'] = 'text/plain;charset=utf-8';
      fetchOptions.body = JSON.stringify({ action, ...body });
    }

    try {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn(`GAS API Warning (${action}):`, error.message);
      return { success: false, isOfflineFallback: true, error: error.message };
    }
  }

  // 1. 회원가입 API
  async signup(name, role, password, elderCode = '', elderName = '') {
    const passwordHash = await this.hashPassword(password);
    const reqElderName = (elderName || '').trim() || '어르신';

    // 로컬 스토리지에 기존 동일한 어르신 성함이 있는지 확인하여 elder_code 설정
    const localElders = JSON.parse(localStorage.getItem(CONFIG.KEYS.LOCAL_ELDERS) || '[]');
    const existingElder = localElders.find(e => (e.elder_name || '').trim() === reqElderName);
    const targetElderCode = elderCode || (existingElder ? existingElder.elder_code : `ELDER_${Date.now()}`);

    const payload = {
      name,
      role,
      password_hash: passwordHash,
      elder_code: targetElderCode,
      elder_name: reqElderName
    };

    const res = await this.request('signup', {}, 'POST', payload);
    
    // GAS가 미배포/오류 상태일 경우 로컬 스토리지 등록 퐁백
    if (!res.success && res.isOfflineFallback) {
      const users = JSON.parse(localStorage.getItem(CONFIG.KEYS.LOCAL_USERS) || '[]');
      const existing = users.find(u => u.name === name && u.role === role);
      if (existing) {
        return { success: false, message: '이미 존재하는 이름입니다.' };
      }

      const newUser = {
        user_id: `USER_${Date.now()}`,
        name,
        role,
        password_hash: passwordHash,
        elder_code: targetElderCode,
        created_at: new Date().toISOString()
      };
      users.push(newUser);
      localStorage.setItem(CONFIG.KEYS.LOCAL_USERS, JSON.stringify(users));

      // 어르신 정보 업데이트
      if (!existingElder) {
        localElders.push({ elder_code: targetElderCode, elder_name: reqElderName, caregiver_id: newUser.user_id });
        localStorage.setItem(CONFIG.KEYS.LOCAL_ELDERS, JSON.stringify(localElders));
      }

      return {
        success: true,
        user: newUser,
        elder: { elder_code: targetElderCode, elder_name: reqElderName },
        message: '로컬 동기화 모드로 가입되었습니다.'
      };
    }

      return {
        success: true,
        user: newUser,
        elder: elder,
        message: '로컬 동기화 모드로 가입되었습니다.'
      };
    }

    return res;
  }

  // 2. 로그인 API
  async login(name, role, password) {
    const passwordHash = await this.hashPassword(password);
    const res = await this.request('login', { name, role, password_hash: passwordHash }, 'GET');

    if (!res.success && res.isOfflineFallback) {
      const users = JSON.parse(localStorage.getItem(CONFIG.KEYS.LOCAL_USERS) || '[]');
      const user = users.find(u => u.name === name && u.role === role && (u.password_hash === passwordHash || u.password_hash === password));
      
      if (user) {
        const elders = JSON.parse(localStorage.getItem(CONFIG.KEYS.LOCAL_ELDERS) || '[]');
        const elder = elders.find(e => e.elder_code === user.elder_code) || { elder_code: user.elder_code, elder_name: `${user.name} 댁 어르신` };
        
        return {
          success: true,
          user: user,
          elder: elder,
          message: '로그인 성공 (로컬 세션)'
        };
      } else {
        return { success: false, message: '이름 또는 비밀번호(4자리)가 일치하지 않습니다.' };
      }
    }

    return res;
  }

  // 3. 일일 케어 기록 조회
  async getDailyCare(elderCode, dateStr) {
    const res = await this.request('getDailyCare', { elder_code: elderCode, date: dateStr }, 'GET');
    
    if (!res.success && res.isOfflineFallback) {
      const localData = store.getLocalRecord(elderCode, dateStr);
      return {
        success: true,
        data: localData
      };
    }

    return res;
  }

  // 4. 일일 케어 기록 저장
  async saveDailyCare(elderCode, dateStr, careData) {
    const payload = {
      elder_code: elderCode,
      date: dateStr,
      ...careData
    };

    // 로컬 스토리지 선반영 (즉시 반응성)
    const savedLocal = store.saveLocalRecord(elderCode, dateStr, careData);

    const res = await this.request('saveDailyCare', {}, 'POST', payload);
    
    if (!res.success && res.isOfflineFallback) {
      return {
        success: true,
        data: savedLocal,
        message: '로컬에 저장이 완료되었습니다.'
      };
    }

    return res;
  }

  // 5. 월간 기록 조회 (달력 & 추이 그래프용)
  async getMonthlyCare(elderCode, yearMonth) {
    const res = await this.request('getMonthlyCare', { elder_code: elderCode, month: yearMonth }, 'GET');
    
    if (!res.success && res.isOfflineFallback) {
      const localMonthly = store.getLocalMonthlyRecords(elderCode, yearMonth);
      return {
        success: true,
        data: localMonthly
      };
    }

    return res;
  }
}

window.gasApi = new GasApiService();
