/**
 * 일일 케어 현황 - Store (상태 및 세션 관리)
 */

class Store {
  constructor() {
    this.currentUser = this.loadCurrentUser();
    this.initMockDataIfNeeded();
  }

  loadCurrentUser() {
    try {
      const data = localStorage.getItem(CONFIG.KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Failed to load user from localStorage:', e);
      return null;
    }
  }

  setCurrentUser(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(CONFIG.KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(CONFIG.KEYS.CURRENT_USER);
    }
  }

  logout() {
    this.setCurrentUser(null);
  }

  // 초기 로컬 모의 데이터 세팅 (네트워크 연결이 지연되거나 테스트 시 활용)
  initMockDataIfNeeded() {
    if (!localStorage.getItem(CONFIG.KEYS.LOCAL_ELDERS)) {
      const mockElders = [
        { elder_code: 'ELDER001', elder_name: '김순자 어르신', caregiver_id: 'CG001' },
        { elder_code: 'ELDER002', elder_name: '박철수 어르신', caregiver_id: 'CG002' }
      ];
      localStorage.setItem(CONFIG.KEYS.LOCAL_ELDERS, JSON.stringify(mockElders));
    }

    if (!localStorage.getItem(CONFIG.KEYS.LOCAL_USERS)) {
      const mockUsers = [
        { user_id: 'CG001', name: '홍길동', role: '요양보호사', password_hash: '1234', elder_code: 'ELDER001' },
        { user_id: 'FM001', name: '김철수', role: '가족', password_hash: '1234', elder_code: 'ELDER001' }
      ];
      localStorage.setItem(CONFIG.KEYS.LOCAL_USERS, JSON.stringify(mockUsers));
    }

    if (!localStorage.getItem(CONFIG.KEYS.LOCAL_RECORDS)) {
      const todayStr = CONFIG.getKSTDateString();
      const yesterdayStr = CONFIG.getKSTYesterdayString();

      const mockRecords = {};
      mockRecords[`ELDER001_${yesterdayStr}`] = {
        record_id: `REC_${yesterdayStr}`,
        elder_code: 'ELDER001',
        date: yesterdayStr,
        morning_systolic: 125,
        morning_diastolic: 80,
        morning_temp: 36.6,
        morning_time: '08:30',
        evening_systolic: 130,
        evening_diastolic: 85,
        evening_temp: 36.8,
        evening_time: '18:00',
        condition: '상',
        condition_memo: '오늘 기분이 무척 좋으시고 산책을 하셨음',
        meal_status: '잘 드심',
        meal_memo: '점심 된장찌개 식사 원활하게 마치심',
        stool_count: 1,
        stool_type: '부드러움',
        updated_by: 'CG001',
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(CONFIG.KEYS.LOCAL_RECORDS, JSON.stringify(mockRecords));
    }
  }

  // 로컬 케어 기록 조회
  getLocalRecord(elderCode, dateStr) {
    const key = `${elderCode}_${dateStr}`;
    const records = JSON.parse(localStorage.getItem(CONFIG.KEYS.LOCAL_RECORDS) || '{}');
    return records[key] || null;
  }

  // 로컬 케어 기록 저장
  saveLocalRecord(elderCode, dateStr, data) {
    const key = `${elderCode}_${dateStr}`;
    const records = JSON.parse(localStorage.getItem(CONFIG.KEYS.LOCAL_RECORDS) || '{}');
    records[key] = {
      ...data,
      elder_code: elderCode,
      date: dateStr,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(CONFIG.KEYS.LOCAL_RECORDS, JSON.stringify(records));
    return records[key];
  }

  // 월간 로컬 기록 조회
  getLocalMonthlyRecords(elderCode, yearMonth) {
    const records = JSON.parse(localStorage.getItem(CONFIG.KEYS.LOCAL_RECORDS) || '{}');
    const result = [];
    Object.keys(records).forEach(k => {
      if (k.startsWith(`${elderCode}_${yearMonth}`)) {
        result.push(records[k]);
      }
    });
    return result;
  }
}

window.store = new Store();
