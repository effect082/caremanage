/**
 * 일일 케어 현황 (Daily Care Status) - Main SPA Controller
 */

class App {
  constructor() {
    this.currentDateStr = new Date().toISOString().split('T')[0];
    this.currentYearMonth = this.currentDateStr.slice(0, 7);
    this.pinPadController = null;
    this.signupPinPadController = null;
    this.selectedCondition = '상';
    this.selectedMeal = '잘 드심';
    this.selectedStoolType = '부드러움';
  }

  init() {
    console.log('App Initializing...');
    this.bindEvents();
    this.initPinPads();
    this.checkAuthAndRender();
  }

  // Toast 메시지 출력
  showToast(message, type = 'info') {
    const toast = document.getElementById('appToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast-${type} active`;
    setTimeout(() => {
      toast.classList.remove('active');
    }, 3000);
  }

  // Auth 상태 체크 후 적절한 화면으로 라우팅
  checkAuthAndRender() {
    const user = store.currentUser;
    const authSection = document.getElementById('authSection');
    const caregiverSection = document.getElementById('caregiverSection');
    const familySection = document.getElementById('familySection');
    const bottomNav = document.getElementById('bottomNav');
    const userHeaderInfo = document.getElementById('userHeaderInfo');

    if (!user) {
      authSection.style.display = 'block';
      caregiverSection.style.display = 'none';
      familySection.style.display = 'none';
      bottomNav.style.display = 'none';
      if (userHeaderInfo) userHeaderInfo.style.display = 'none';
      return;
    }

    if (userHeaderInfo) {
      userHeaderInfo.style.display = 'flex';
      document.getElementById('headerUserName').textContent = `${user.name} (${user.role})`;
      document.getElementById('headerElderName').textContent = user.elder_name || `${user.name} 댁 어르신`;
    }

    if (user.role === '요양보호사') {
      authSection.style.display = 'none';
      caregiverSection.style.display = 'block';
      familySection.style.display = 'none';
      bottomNav.style.display = 'flex';
      this.loadCaregiverDashboard();
    } else {
      authSection.style.display = 'none';
      caregiverSection.style.display = 'none';
      familySection.style.display = 'block';
      bottomNav.style.display = 'flex';
      this.loadFamilyDashboard();
    }
  }

  // 4자리 PIN 패드 초기화
  initPinPads() {
    this.pinPadController = uiComponents.setupPinKeypad(
      'loginPinDisplay',
      'loginKeypadGrid',
      (pin) => {
        document.getElementById('loginPinHidden').value = pin;
      }
    );

    this.signupPinPadController = uiComponents.setupPinKeypad(
      'signupPinDisplay',
      'signupKeypadGrid',
      (pin) => {
        document.getElementById('signupPinHidden').value = pin;
      }
    );
  }

  // 이벤트 바인딩
  bindEvents() {
    // 1. Auth 탭 전환 (로그인 / 회원가입)
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-tab');
        
        if (targetTab === 'login') {
          document.getElementById('loginTabForm').style.display = 'block';
          document.getElementById('signupTabForm').style.display = 'none';
        } else {
          document.getElementById('loginTabForm').style.display = 'none';
          document.getElementById('signupTabForm').style.display = 'block';
        }
      });
    });

    // 2. 로그인 폼 제출
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('loginName').value.trim();
      const role = document.querySelector('input[name="loginRole"]:checked').value;
      const pin = document.getElementById('loginPinHidden').value;

      if (!name || !pin || pin.length < 4) {
        this.showToast('이름과 4자리 비밀번호(PIN)를 입력해 주세요.', 'warning');
        return;
      }

      this.showToast('로그인 중...', 'info');
      const res = await gasApi.login(name, role, pin);

      if (res.success) {
        store.setCurrentUser({
          ...res.user,
          elder_name: res.elder ? res.elder.elder_name : `${name} 댁 어르신`
        });
        this.showToast('로그인되었습니다.', 'success');
        this.checkAuthAndRender();
      } else {
        this.showToast(res.message || '로그인 실패', 'danger');
      }
    });

    // 3. 회원가입 폼 제출
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value.trim();
      const role = document.querySelector('input[name="signupRole"]:checked').value;
      const pin = document.getElementById('signupPinHidden').value;
      const elderCode = '';
      const elderName = '';

      if (!name || !pin || pin.length < 4) {
        this.showToast('이름과 4자리 PIN 비밀번호를 완성해 주세요.', 'warning');
        return;
      }

      this.showToast('회원가입 처리 중...', 'info');
      const res = await gasApi.signup(name, role, pin, elderCode, elderName);

      if (res.success) {
        this.showToast('회원가입이 완료되었습니다. 로그인해 주세요.', 'success');
        document.querySelector('.auth-tab-btn[data-tab="login"]').click();
      } else {
        this.showToast(res.message || '회원가입 실패', 'danger');
      }
    });

    // 4. 로그아웃
    document.getElementById('logoutBtn').addEventListener('click', () => {
      store.logout();
      this.showToast('로그아웃되었습니다.', 'info');
      this.checkAuthAndRender();
    });

    // 5. 하단 탭 네비게이션
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const targetView = item.getAttribute('data-target');

        document.querySelectorAll('.view-pane').forEach(pane => pane.style.display = 'none');
        const activePane = document.getElementById(targetView);
        if (activePane) activePane.style.display = 'block';

        if (targetView === 'familyCalendarView') {
          this.refreshFamilyCalendar();
        } else if (targetView === 'familyTrendView') {
          this.refreshFamilyTrendChart();
        }
      });
    });

    // 6. 스텝퍼 (+/- 버튼) 바인딩
    this.setupStepper('morningSysStepper', 120, 60, 220);
    this.setupStepper('morningDiaStepper', 80, 40, 140);
    this.setupStepper('morningTempStepper', 36.5, 34.0, 42.0, 0.1);

    this.setupStepper('eveningSysStepper', 120, 60, 220);
    this.setupStepper('eveningDiaStepper', 80, 40, 140);
    this.setupStepper('eveningTempStepper', 36.5, 34.0, 42.0, 0.1);

    this.setupStepper('stoolCountStepper', 1, 0, 10, 1);

    // 7. 이상 수치 감지 실시간 피드백
    ['morningSys', 'morningDia', 'morningTemp', 'eveningSys', 'eveningDia', 'eveningTemp'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', () => this.validateHealthInputs());
      }
    });

    // 8. 칩 선택 바인딩 (컨디션 / 식사 / 배변형태)
    this.setupChips('conditionChips', (val) => this.selectedCondition = val);
    this.setupChips('mealChips', (val) => this.selectedMeal = val);
    this.setupChips('stoolTypeChips', (val) => this.selectedStoolType = val);

    // 9. 케어 작성 폼 제출
    document.getElementById('caregiverForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveCareRecord();
    });

    // 10. 모달 닫기 버튼
    document.getElementById('closeModalBtn').addEventListener('click', () => {
      uiComponents.closeDetailModal();
    });
    document.getElementById('detailModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'detailModalOverlay') uiComponents.closeDetailModal();
    });
  }

  // 스텝퍼 헬퍼
  setupStepper(containerId, defaultVal, min, max, step = 1) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const minusBtn = container.querySelector('.stepper-minus');
    const plusBtn = container.querySelector('.stepper-plus');
    const input = container.querySelector('input');

    if (!input.value) input.value = defaultVal;

    const updateVal = (delta) => {
      let current = parseFloat(input.value) || defaultVal;
      current = Math.round((current + delta) * 10) / 10;
      if (current < min) current = min;
      if (current > max) current = max;
      input.value = step < 1 ? current.toFixed(1) : Math.round(current);
      this.validateHealthInputs();
    };

    minusBtn.addEventListener('click', () => updateVal(-step));
    plusBtn.addEventListener('click', () => updateVal(step));
  }

  // 칩 선택 헬퍼
  setupChips(containerId, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        const val = chip.getAttribute('data-val');
        onSelect(val);
      });
    });
  }

  // 실시간 수치 유효성 및 경고 하이라이트
  validateHealthInputs() {
    const checkInput = (inputId, threshold, isHigh = true) => {
      const el = document.getElementById(inputId);
      if (!el) return;
      const val = parseFloat(el.value);
      if (!isNaN(val) && (isHigh ? val >= threshold : val <= threshold)) {
        el.classList.add('input-danger');
      } else {
        el.classList.remove('input-danger');
      }
    };

    checkInput('morningSys', CONFIG.THRESHOLDS.HIGH_SYSTOLIC);
    checkInput('morningDia', CONFIG.THRESHOLDS.HIGH_DIASTOLIC);
    checkInput('morningTemp', CONFIG.THRESHOLDS.HIGH_TEMP);

    checkInput('eveningSys', CONFIG.THRESHOLDS.HIGH_SYSTOLIC);
    checkInput('eveningDia', CONFIG.THRESHOLDS.HIGH_DIASTOLIC);
    checkInput('eveningTemp', CONFIG.THRESHOLDS.HIGH_TEMP);
  }

  // 요양보호사 대시보드 데이터 로드
  async loadCaregiverDashboard() {
    const user = store.currentUser;
    document.getElementById('careDateLabel').textContent = this.currentDateStr;
    
    // 현재 시각 자동 바인딩
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('morningTime').value = timeStr;
    document.getElementById('eveningTime').value = timeStr;

    // 기존 오늘의 작성 기록 조회
    this.showToast('오늘 기록 확인 중...', 'info');
    const res = await gasApi.getDailyCare(user.elder_code, this.currentDateStr);
    
    if (res.success && res.data) {
      const d = res.data;
      if (d.morning_systolic) document.getElementById('morningSys').value = d.morning_systolic;
      if (d.morning_diastolic) document.getElementById('morningDia').value = d.morning_diastolic;
      if (d.morning_temp) document.getElementById('morningTemp').value = d.morning_temp;
      if (d.morning_time) document.getElementById('morningTime').value = d.morning_time;

      if (d.evening_systolic) document.getElementById('eveningSys').value = d.evening_systolic;
      if (d.evening_diastolic) document.getElementById('eveningDia').value = d.evening_diastolic;
      if (d.evening_temp) document.getElementById('eveningTemp').value = d.evening_temp;
      if (d.evening_time) document.getElementById('eveningTime').value = d.evening_time;

      if (d.condition_memo) document.getElementById('conditionMemo').value = d.condition_memo;
      if (d.meal_memo) document.getElementById('mealMemo').value = d.meal_memo;
      if (d.stool_count !== undefined) document.getElementById('stoolCount').value = d.stool_count;

      if (d.condition) {
        this.selectedCondition = d.condition;
        this.selectChipByValue('conditionChips', d.condition);
      }
      if (d.meal_status) {
        this.selectedMeal = d.meal_status;
        this.selectChipByValue('mealChips', d.meal_status);
      }
      if (d.stool_type) {
        this.selectedStoolType = d.stool_type;
        this.selectChipByValue('stoolTypeChips', d.stool_type);
      }

      this.validateHealthInputs();
      document.getElementById('todayStatusBadge').innerHTML = `<span class="badge badge-green">✔ 오늘 기록 작성 완료</span>`;
    } else {
      document.getElementById('todayStatusBadge').innerHTML = `<span class="badge badge-warning">⚠ 오늘 기록 미작성</span>`;
    }

    this.loadRecentHistory();
  }

  selectChipByValue(containerId, value) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.chip').forEach(c => {
      if (c.getAttribute('data-val') === value) {
        c.click();
      }
    });
  }

  // 최근 7일 작성 이력 로드
  async loadRecentHistory() {
    const user = store.currentUser;
    const historyList = document.getElementById('recentHistoryList');
    if (!historyList) return;

    const res = await gasApi.getMonthlyCare(user.elder_code, this.currentYearMonth);
    const records = res.success ? res.data : [];

    if (!records || records.length === 0) {
      historyList.innerHTML = `<p class="text-muted" style="text-align:center; padding: 12px;">최근 작성된 기록이 없습니다.</p>`;
      return;
    }

    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
    historyList.innerHTML = sorted.map(r => `
      <div style="display:flex; justify-shadow:space-between; align-items:center; padding: 10px 14px; background: rgba(255,255,255,0.7); border-radius: 12px; margin-bottom: 8px;">
        <div>
          <span style="font-weight: 700; color: var(--text-dark);">${r.date}</span>
          <span class="badge badge-blue" style="margin-left: 8px;">${r.condition || '기록'}</span>
        </div>
        <button class="btn btn-secondary" style="width: auto; min-height: 32px; padding: 4px 12px; font-size: 0.85rem;" onclick="app.openDetailModalForDate('${r.date}')">상세보기</button>
      </div>
    `).join('');
  }

  // 케어 기록 저장
  async saveCareRecord() {
    const user = store.currentUser;
    const careData = {
      morning_systolic: parseFloat(document.getElementById('morningSys').value) || null,
      morning_diastolic: parseFloat(document.getElementById('morningDia').value) || null,
      morning_temp: parseFloat(document.getElementById('morningTemp').value) || null,
      morning_time: document.getElementById('morningTime').value,

      evening_systolic: parseFloat(document.getElementById('eveningSys').value) || null,
      evening_diastolic: parseFloat(document.getElementById('eveningDia').value) || null,
      evening_temp: parseFloat(document.getElementById('eveningTemp').value) || null,
      evening_time: document.getElementById('eveningTime').value,

      condition: this.selectedCondition,
      condition_memo: document.getElementById('conditionMemo').value.trim(),
      meal_status: this.selectedMeal,
      meal_memo: document.getElementById('mealMemo').value.trim(),

      stool_count: parseInt(document.getElementById('stoolCount').value) || 0,
      stool_type: this.selectedStoolType,
      updated_by: user.user_id
    };

    this.showToast('기록을 저장하고 있습니다...', 'info');
    const res = await gasApi.saveDailyCare(user.elder_code, this.currentDateStr, careData);

    if (res.success) {
      this.showToast('일일 케어 기록이 성공적으로 저장되었습니다!', 'success');
      document.getElementById('todayStatusBadge').innerHTML = `<span class="badge badge-green">✔ 오늘 기록 작성 완료</span>`;
      this.loadRecentHistory();
    } else {
      this.showToast(res.message || '저장 실패', 'danger');
    }
  }

  // 가족 대시보드 데이터 로드
  async loadFamilyDashboard() {
    const user = store.currentUser;
    document.getElementById('familyDateLabel').textContent = this.currentDateStr;

    this.showToast('오늘의 케어 현황을 불러오는 중...', 'info');
    const res = await gasApi.getDailyCare(user.elder_code, this.currentDateStr);

    const summaryCard = document.getElementById('familyTodaySummaryCard');

    if (res.success && res.data) {
      const d = res.data;
      document.getElementById('familyStatusBadge').innerHTML = `<span class="badge badge-green">✔ 오늘 기록 작성 완료</span>`;
      
      summaryCard.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
          <div style="background: rgba(255,255,255,0.85); padding: 14px; border-radius: 14px;">
            <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">🌅 아침 혈압/체온</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--primary-blue); margin-top: 4px;">
              ${d.morning_systolic ? `${d.morning_systolic}/${d.morning_diastolic} mmHg` : '미입력'}
            </div>
            <div style="font-size: 0.95rem; font-weight: 600; color: ${d.morning_temp >= 37.5 ? 'var(--alert-red)' : 'var(--text-dark)'};">
              ${d.morning_temp ? `${d.morning_temp} ℃` : ''}
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.85); padding: 14px; border-radius: 14px;">
            <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">🌙 저녁 혈압/체온</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--primary-blue); margin-top: 4px;">
              ${d.evening_systolic ? `${d.evening_systolic}/${d.evening_diastolic} mmHg` : '미입력'}
            </div>
            <div style="font-size: 0.95rem; font-weight: 600; color: ${d.evening_temp >= 37.5 ? 'var(--alert-red)' : 'var(--text-dark)'};">
              ${d.evening_temp ? `${d.evening_temp} ℃` : ''}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <span class="badge badge-blue">😀 컨디션: ${d.condition || '미입력'}</span>
          <span class="badge badge-blue">🍚 식사: ${d.meal_status || '미입력'}</span>
          <span class="badge badge-blue">🚽 배변: ${d.stool_count || 0}회 (${d.stool_type || '형태미선택'})</span>
        </div>
      `;
    } else {
      document.getElementById('familyStatusBadge').innerHTML = `<span class="badge badge-warning">⚠ 오늘 기록 미작성</span>`;
      summaryCard.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">📋</div>
          <p style="font-weight: 600;">오늘 작성된 케어 기록이 아직 없습니다.</p>
          <p style="font-size: 0.85rem; margin-top: 4px;">요양보호사님이 입력하면 자동으로 업데이트됩니다.</p>
        </div>
      `;
    }

    this.refreshFamilyCalendar();
    this.refreshFamilyTrendChart();
  }

  // 가족 달력 뷰 새로고침
  async refreshFamilyCalendar() {
    const user = store.currentUser;
    const [year, month] = this.currentYearMonth.split('-').map(Number);
    const res = await gasApi.getMonthlyCare(user.elder_code, this.currentYearMonth);
    const records = res.success ? res.data : [];

    uiComponents.renderCalendar('familyCalendarContainer', year, month, records, (dateStr, record) => {
      uiComponents.showDetailModal(dateStr, record);
    });
  }

  // 가족 추이 그래프 새로고침
  async refreshFamilyTrendChart() {
    const user = store.currentUser;
    const res = await gasApi.getMonthlyCare(user.elder_code, this.currentYearMonth);
    const records = res.success ? res.data : [];
    uiComponents.renderTrendChart('familyTrendChartCanvas', records);
  }

  // 특정 일자 모달 호출 헬퍼
  async openDetailModalForDate(dateStr) {
    const user = store.currentUser;
    const res = await gasApi.getDailyCare(user.elder_code, dateStr);
    const record = res.success ? res.data : null;
    uiComponents.showDetailModal(dateStr, record);
  }
}

// Global App Launch
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
