/**
 * 일일 케어 현황 - Components UI Engine
 * Chart.js, Calendar, PIN Keypad, Steppers, Modals
 */

class UIComponents {
  constructor() {
    this.chartInstance = null;
  }

  // 1. Chart.js 혈압 및 체온 추이 그래프 생성/업데이트
  renderTrendChart(canvasId, monthlyRecords) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Sort records by date ascending
    const sortedRecords = [...monthlyRecords].sort((a, b) => a.date.localeCompare(b.date));
    
    const labels = sortedRecords.map(r => {
      const parts = r.date.split('-');
      return `${parts[1]}/${parts[2]}`;
    });

    const morningSystolic = sortedRecords.map(r => r.morning_systolic || null);
    const morningDiastolic = sortedRecords.map(r => r.morning_diastolic || null);
    const morningTemp = sortedRecords.map(r => r.morning_temp || null);

    const eveningSystolic = sortedRecords.map(r => r.evening_systolic || null);
    const eveningDiastolic = sortedRecords.map(r => r.evening_diastolic || null);
    const eveningTemp = sortedRecords.map(r => r.evening_temp || null);

    const labelsArr = labels.length > 0 ? labels : ['기록 없음'];
    const morningSysArr = morningSystolic.length > 0 ? morningSystolic : [0];
    const eveningSysArr = eveningSystolic.length > 0 ? eveningSystolic : [0];
    const morningTempArr = morningTemp.length > 0 ? morningTemp : [0];

    if (this.chartInstance && this.chartInstance.ctx && this.chartInstance.canvas === canvas) {
      this.chartInstance.data.labels = labelsArr;
      this.chartInstance.data.datasets[0].data = morningSysArr;
      this.chartInstance.data.datasets[1].data = eveningSysArr;
      this.chartInstance.data.datasets[2].data = morningTempArr;
      this.chartInstance.update('none');
      return;
    }

    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    const ctx = canvas.getContext('2d');
    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labelsArr,
        datasets: [
          {
            label: '아침 수축기(mmHg)',
            data: morningSysArr,
            borderColor: '#2F6FED',
            backgroundColor: 'rgba(47, 111, 237, 0.1)',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            yAxisID: 'yBP'
          },
          {
            label: '저녁 수축기(mmHg)',
            data: eveningSystolic.length > 0 ? eveningSystolic : [0],
            borderColor: '#5B9BF8',
            borderDash: [4, 4],
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 3,
            yAxisID: 'yBP'
          },
          {
            label: '아침 체온(℃)',
            data: morningTemp.length > 0 ? morningTemp : [0],
            borderColor: '#F59E0B',
            backgroundColor: 'transparent',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            yAxisID: 'yTemp'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { family: 'Paperlogy', size: 12 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            bodyFont: { family: 'Paperlogy' },
            titleFont: { family: 'Paperlogy', weight: 'bold' }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Paperlogy', size: 11 } }
          },
          yBP: {
            type: 'linear',
            display: true,
            position: 'left',
            min: 80,
            max: 180,
            title: { display: true, text: '혈압 (mmHg)', font: { family: 'Paperlogy', size: 11 } },
            ticks: { font: { family: 'Paperlogy', size: 11 } }
          },
          yTemp: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 35.0,
            max: 39.5,
            grid: { drawOnChartArea: false },
            title: { display: true, text: '체온 (℃)', font: { family: 'Paperlogy', size: 11 } },
            ticks: { font: { family: 'Paperlogy', size: 11 } }
          }
        }
      }
    });
  }

  // 2. 월간 달력 grid 렌더링
  renderCalendar(containerId, year, month, records = [], onDayClickCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const todayStr = CONFIG.getKSTDateString();

    let html = `
      <div class="calendar-grid">
        <div class="calendar-day-header text-primary">일</div>
        <div class="calendar-day-header">월</div>
        <div class="calendar-day-header">화</div>
        <div class="calendar-day-header">수</div>
        <div class="calendar-day-header">목</div>
        <div class="calendar-day-header">금</div>
        <div class="calendar-day-header text-primary">토</div>
    `;

    // Empty lead cells
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="calendar-cell empty"></div>`;
    }

    // Days cells
    for (let d = 1; d <= daysInMonth; d++) {
      const monthFormatted = String(month).padStart(2, '0');
      const dayFormatted = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;
      
      const record = records.find(r => r.date === dateStr);
      const isToday = dateStr === todayStr;

      let statusDot = '';
      if (record) {
        let dotClass = 'normal';
        if (record.condition === '상') dotClass = 'good';
        else if (record.condition === '하' || (record.morning_temp >= 37.5 || record.evening_temp >= 37.5)) dotClass = 'bad';

        statusDot = `<span class="status-dot ${dotClass}" title="${record.condition || '기록있음'}"></span>`;
      }

      html += `
        <div class="calendar-cell ${record ? 'has-record' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
          <span class="day-num">${d}</span>
          ${statusDot}
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Attach click events
    container.querySelectorAll('.calendar-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const dStr = cell.getAttribute('data-date');
        const rec = records.find(r => r.date === dStr);
        if (onDayClickCallback) {
          onDayClickCallback(dStr, rec);
        }
      });
    });
  }

  // 3. 상세 기록 모달 오픈
  showDetailModal(dateStr, record) {
    const modalOverlay = document.getElementById('detailModalOverlay');
    const modalTitle = document.getElementById('modalDateTitle');
    const modalContent = document.getElementById('modalDetailContent');

    if (!modalOverlay || !modalTitle || !modalContent) return;

    modalTitle.textContent = `${dateStr} 케어 상세 기록`;

    if (!record) {
      modalContent.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 12px;">📝</div>
          <p style="font-size: 1.1rem; font-weight: 600;">작성된 케어 기록이 없습니다.</p>
          <p style="font-size: 0.9rem; margin-top: 4px;">요양보호사님이 기록을 등록하면 이곳에서 확인하실 수 있습니다.</p>
        </div>
      `;
    } else {
      const formatTime = (t) => CONFIG.formatKSTTime(t, '시간미입력');
      const cleanMedMemo = CONFIG.cleanMedicationMemo(record.medication_memo);

      const getTempBadge = (t) => {
        if (!t) return '-';
        if (t >= CONFIG.THRESHOLDS.HIGH_TEMP) return `<span class="badge badge-danger">${t} ℃ (발열 경고)</span>`;
        return `<span class="badge badge-blue">${t} ℃</span>`;
      };

      const getBPBadge = (sys, dia) => {
        if (!sys || !dia) return '-';
        if (sys >= CONFIG.THRESHOLDS.HIGH_SYSTOLIC || dia >= CONFIG.THRESHOLDS.HIGH_DIASTOLIC) {
          return `<span class="badge badge-danger">${sys}/${dia} mmHg (주의)</span>`;
        }
        return `<span class="badge badge-blue">${sys}/${dia} mmHg</span>`;
      };

      const rawCount = parseInt(record.stool_count, 10);
      const cleanStoolCount = isNaN(rawCount) || rawCount < 0 ? 0 : (rawCount > 10 ? 1 : rawCount);
      const stoolDisplay = cleanStoolCount === 0 ? '0회 (미배변)' : `${cleanStoolCount}회 / ${record.stool_type || '부드러움'}`;

      const authorText = record.updated_by_name ? ` (${record.updated_by_name})` : '';
      const creatorBadge = record.updated_role === '가족'
        ? `<span class="badge badge-blue">👨‍👩‍👧 가족 직접 작성${authorText}</span>`
        : `<span class="badge badge-green">🧑‍⚕️ 요양보호사 작성${authorText}</span>`;

      const getMedBadge = (r) => {
        const isTaken = (val) => val === true || val === 'true' || val === 'Y' || val === '복용' || val === 1 || val === '1';
        const m = isTaken(r.medication_morning);
        const l = isTaken(r.medication_lunch);
        const e = isTaken(r.medication_evening);

        return `아침 ${m ? '✔' : '❌'} | 점심 ${l ? '✔' : '❌'} | 저녁 ${e ? '✔' : '❌'}`;
      };

      modalContent.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- 작성자 구분 바 -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.85); padding: 10px 14px; border-radius: 12px;">
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">작성자 구별:</span>
            ${creatorBadge}
          </div>

          <!-- 혈압/체온 아침/저녁 -->
          <div class="glass-card" style="padding: 16px; margin: 0; background: rgba(255,255,255,0.9);">
            <div style="font-weight: 700; color: var(--primary-blue); margin-bottom: 10px;">🌅 아침 케어 체크 (${formatTime(record.morning_time)})</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span class="text-medium">혈압:</span>
              ${getBPBadge(record.morning_systolic, record.morning_diastolic)}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-medium">체온:</span>
              ${getTempBadge(record.morning_temp)}
            </div>
          </div>

          <div class="glass-card" style="padding: 16px; margin: 0; background: rgba(255,255,255,0.9);">
            <div style="font-weight: 700; color: var(--primary-blue); margin-bottom: 10px;">🌙 저녁 케어 체크 (${formatTime(record.evening_time)})</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span class="text-medium">혈압:</span>
              ${getBPBadge(record.evening_systolic, record.evening_diastolic)}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-medium">체온:</span>
              ${getTempBadge(record.evening_temp)}
            </div>
          </div>

          <!-- 컨디션 & 식사 & 배변 & 투약 -->
          <div class="glass-card" style="padding: 16px; margin: 0; background: rgba(255,255,255,0.9);">
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between;">
              <span style="font-weight: 600;">😀 하루 컨디션:</span>
              <span style="font-weight: 700; color: var(--primary-blue);">${record.condition || '미선택'}</span>
            </div>
            ${record.condition_memo ? `<p style="font-size: 0.9rem; color: var(--text-medium); background: #F4F7FF; padding: 8px 12px; border-radius: 8px;">"${record.condition_memo}"</p>` : ''}
            
            <div style="margin: 12px 0 10px 0; display: flex; justify-content: space-between;">
              <span style="font-weight: 600;">🍚 하루 식사:</span>
              <span style="font-weight: 700; color: var(--primary-blue);">${record.meal_status || '미선택'}</span>
            </div>
            ${record.meal_memo ? `<p style="font-size: 0.9rem; color: var(--text-medium); background: #F4F7FF; padding: 8px 12px; border-radius: 8px;">"${record.meal_memo}"</p>` : ''}

            <div style="margin-top: 12px; display: flex; justify-content: space-between;">
              <span style="font-weight: 600;">🚽 배변 상태:</span>
              <span style="font-weight: 700; color: var(--primary-blue);">${stoolDisplay}</span>
            </div>

            <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-subtle); padding-top: 10px;">
              <span style="font-weight: 600;">💊 투약 체크:</span>
              <span style="font-weight: 700; color: var(--primary-blue); font-size: 0.88rem;">${getMedBadge(record)}</span>
            </div>
            ${cleanMedMemo ? `<p style="font-size: 0.9rem; color: var(--text-medium); background: #F4F7FF; padding: 8px 12px; border-radius: 8px; margin-top: 6px;">"${cleanMedMemo}"</p>` : ''}
          </div>
        </div>
      `;
    }

    modalOverlay.classList.add('active');
  }

  closeDetailModal() {
    const modalOverlay = document.getElementById('detailModalOverlay');
    if (modalOverlay) modalOverlay.classList.remove('active');
  }

  // 4. 4자리 PIN 입력 키패드 컨트롤러
  setupPinKeypad(displayContainerId, keypadContainerId, onComplete) {
    let pin = '';
    const dots = document.querySelectorAll(`#${displayContainerId} .pin-dot`);
    const keypadBtns = document.querySelectorAll(`#${keypadContainerId} .keypad-btn`);

    const updateDisplay = () => {
      dots.forEach((dot, idx) => {
        if (idx < pin.length) {
          dot.classList.add('filled');
        } else {
          dot.classList.remove('filled');
        }
      });
    };

    keypadBtns.forEach(btn => {
      btn.onclick = () => {
        const val = btn.getAttribute('data-val');
        if (val === 'clear') {
          pin = '';
        } else if (val === 'backspace') {
          pin = pin.slice(0, -1);
        } else if (pin.length < 4) {
          pin += val;
        }

        updateDisplay();

        if (pin.length === 4 && onComplete) {
          onComplete(pin);
        }
      };
    });

    return {
      getPin: () => pin,
      clear: () => {
        pin = '';
        updateDisplay();
      }
    };
  }

  // ==========================================================================
  // 기간별(일/주/월) 케어 작성 이력 보고서 전용 렌더러
  // ==========================================================================

  // 5. 일 단위 보고서 카드 (Daily Report)
  renderDailyReport(containerId, record, dateStr) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!record) {
      container.innerHTML = `
        <div style="background: rgba(255,255,255,0.7); border: 1px dashed rgba(47,111,237,0.3); border-radius: 18px; padding: 40px 20px; text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 12px;">📭</div>
          <h3 style="margin: 0 0 8px 0; color: var(--text-dark); font-size: 1.2rem;">${CONFIG.formatKSTDateDisplay(dateStr)}</h3>
          <p class="text-muted" style="margin: 0 0 18px 0; font-size: 0.92rem;">선택하신 일자에 등록된 케어 작성 기록이 없습니다.</p>
          <button type="button" class="btn btn-primary" style="width: auto; min-height: 42px; padding: 8px 24px; font-size: 0.92rem; margin: 0 auto; display: inline-flex; align-items: center; gap: 6px; border-radius: 12px;" onclick="app.switchToCareWriteTab()">
            <span>✍️</span> 오늘 케어 기록 작성하기
          </button>
        </div>
      `;
      return;
    }

    const sysWarnMorning = record.morning_systolic >= CONFIG.THRESHOLDS.HIGH_SYSTOLIC;
    const sysWarnEvening = record.evening_systolic >= CONFIG.THRESHOLDS.HIGH_SYSTOLIC;
    const tempWarnMorning = record.morning_temp >= CONFIG.THRESHOLDS.HIGH_TEMP;
    const tempWarnEvening = record.evening_temp >= CONFIG.THRESHOLDS.HIGH_TEMP;

    const morningTimeDisplay = CONFIG.formatKSTTime(record.morning_time, '08:30');
    const eveningTimeDisplay = CONFIG.formatKSTTime(record.evening_time, '18:00');
    const cleanMedMemo = CONFIG.cleanMedicationMemo(record.medication_memo);

    const authorBadge = record.updated_role === '가족'
      ? `<span class="badge badge-blue">👨‍👩‍👧 가족 작성자 (${record.updated_by_name || '가족'})</span>`
      : `<span class="badge badge-green">🧑‍⚕️ 요양보호사 (${record.updated_by_name || '요양보호사'})</span>`;

    const getMedText = (r) => {
      const items = [];
      if (r.medication_morning === 'Y' || r.medication_morning === true) items.push('아침 🌅');
      if (r.medication_lunch === 'Y' || r.medication_lunch === true) items.push('점심 ☀️');
      if (r.medication_evening === 'Y' || r.medication_evening === true) items.push('저녁 🌙');
      return items.length > 0 ? items.join(', ') : '미복용/기록없음';
    };

    container.innerHTML = `
      <div style="background: rgba(255,255,255,0.75); border: 1px solid var(--border-subtle); border-radius: 18px; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="margin: 0; font-size: 1.18rem; color: var(--primary-blue);">${CONFIG.formatKSTDateDisplay(dateStr)} 일일 보고서</h3>
            <div style="margin-top: 4px;">${authorBadge}</div>
          </div>
          <span class="badge badge-blue" style="font-size: 0.92rem; padding: 6px 14px;">종합 컨디션: ${record.condition || '보통'}</span>
        </div>

        <!-- 바이탈 그리드 -->
        <div class="report-stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 18px;">
          <div class="report-stat-card" style="${sysWarnMorning || tempWarnMorning ? 'border: 1px solid var(--alert-red-border); background: var(--alert-red-bg);' : ''}">
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-dark); margin-bottom: 6px;">🌅 아침 체크 (${morningTimeDisplay})</div>
            <div class="report-stat-val" style="${sysWarnMorning ? 'color: var(--alert-red);' : ''}">${record.morning_systolic || '--'}/${record.morning_diastolic || '--'} <span style="font-size: 0.75rem; font-weight: normal;">mmHg</span></div>
            <div style="font-size: 0.92rem; font-weight: 700; margin-top: 6px; ${tempWarnMorning ? 'color: var(--alert-red);' : 'color: var(--text-medium);'}">체온: ${record.morning_temp || '--'}℃</div>
          </div>

          <div class="report-stat-card" style="${sysWarnEvening || tempWarnEvening ? 'border: 1px solid var(--alert-red-border); background: var(--alert-red-bg);' : ''}">
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-dark); margin-bottom: 6px;">🌙 저녁 체크 (${eveningTimeDisplay})</div>
            <div class="report-stat-val" style="${sysWarnEvening ? 'color: var(--alert-red);' : ''}">${record.evening_systolic || '--'}/${record.evening_diastolic || '--'} <span style="font-size: 0.75rem; font-weight: normal;">mmHg</span></div>
            <div style="font-size: 0.92rem; font-weight: 700; margin-top: 6px; ${tempWarnEvening ? 'color: var(--alert-red);' : 'color: var(--text-medium);'}">체온: ${record.evening_temp || '--'}℃</div>
          </div>
        </div>

        <!-- 세부 항목 체크 -->
        <div style="display: flex; flex-direction: column; gap: 12px; background: rgba(255,255,255,0.85); padding: 16px; border-radius: 16px; border: 1px solid var(--border-subtle);">
          <div style="display: flex; justify-content: space-between; font-size: 0.95rem; align-items: center;">
            <span>🍚 <b>식사 상태:</b> ${record.meal_status || '정보없음'}</span>
            <span class="text-muted" style="font-size: 0.85rem;">${record.meal_memo || ''}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.95rem; border-top: 1px dashed var(--border-subtle); padding-top: 10px; align-items: center;">
            <span>🚽 <b>배변 현황:</b> ${record.stool_count ? `${record.stool_count}회 (${record.stool_type || '보통'})` : '없음/미작성'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.95rem; border-top: 1px dashed var(--border-subtle); padding-top: 10px; align-items: center;">
            <span>💊 <b>투약 완료:</b> ${getMedText(record)}</span>
          </div>
          ${cleanMedMemo ? `<div style="font-size: 0.88rem; color: var(--text-medium); background: #F0F4FF; padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(47,111,237,0.15);">" ${cleanMedMemo} "</div>` : ''}
          ${record.condition_memo ? `<div style="font-size: 0.88rem; color: var(--text-dark); background: #FFF9E6; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(245,158,11,0.2); margin-top: 4px;">📝 <b>컨디션 메모:</b> ${record.condition_memo}</div>` : ''}
        </div>
      </div>
    `;
  }

  // 6. 주 단위 보고서 카드 (Weekly Report)
  renderWeeklyReport(containerId, records = [], startDateStr, endDateStr) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const safeRecords = Array.isArray(records) ? records : (records && typeof records === 'object' ? Object.values(records) : []);

    const totalDays = 7;
    const writtenDays = safeRecords.length;
    const completionPct = Math.round((writtenDays / totalDays) * 100);

    // 바이탈 평균 집계
    let sumMorningSys = 0, sumMorningDia = 0, sumMorningTemp = 0, countMorning = 0;
    let sumEveningSys = 0, sumEveningDia = 0, sumEveningTemp = 0, countEvening = 0;
    let medDoneCount = 0;
    let condGood = 0, condNormal = 0, condLow = 0;

    safeRecords.forEach(r => {
      if (r.morning_systolic) { sumMorningSys += Number(r.morning_systolic); sumMorningDia += Number(r.morning_diastolic); countMorning++; }
      if (r.morning_temp) { sumMorningTemp += Number(r.morning_temp); }
      if (r.evening_systolic) { sumEveningSys += Number(r.evening_systolic); sumEveningDia += Number(r.evening_diastolic); countEvening++; }
      if (r.evening_temp) { sumEveningTemp += Number(r.evening_temp); }

      if (r.medication_morning === 'Y' || r.medication_lunch === 'Y' || r.medication_evening === 'Y' || r.medication_morning === true) {
        medDoneCount++;
      }

      if (r.condition === '상') condGood++;
      else if (r.condition === '하') condLow++;
      else condNormal++;
    });

    const avgMorningSys = countMorning > 0 ? Math.round(sumMorningSys / countMorning) : '--';
    const avgMorningDia = countMorning > 0 ? Math.round(sumMorningDia / countMorning) : '--';
    const avgMorningTemp = countMorning > 0 ? (sumMorningTemp / countMorning).toFixed(1) : '--';

    const avgEveningSys = countEvening > 0 ? Math.round(sumEveningSys / countEvening) : '--';
    const avgEveningDia = countEvening > 0 ? Math.round(sumEveningDia / countEvening) : '--';
    const avgEveningTemp = countEvening > 0 ? (sumEveningTemp / countEvening).toFixed(1) : '--';

    const medPct = writtenDays > 0 ? Math.round((medDoneCount / writtenDays) * 100) : 0;

    // 주간 날짜 리스트 생성 (월~일 7일)
    const sParts = startDateStr.split('-').map(Number);
    const startDate = new Date(sParts[0], sParts[1] - 1, sParts[2]);

    let dayListHTML = '';
    for (let i = 0; i < 7; i++) {
      const curDate = new Date(startDate.getTime());
      curDate.setDate(curDate.getDate() + i);
      const curDateStr = CONFIG.getKSTDateString(curDate);
      const dayRec = safeRecords.find(r => r.date === curDateStr);
      const dayDisplay = CONFIG.formatKSTDateDisplay(curDateStr);

      let statusBadge = `<span class="badge badge-warning">미작성</span>`;
      if (dayRec) {
        let badgeColor = 'badge-blue';
        if (dayRec.condition === '상') badgeColor = 'badge-green';
        else if (dayRec.condition === '하') badgeColor = 'badge-red';
        statusBadge = `<span class="badge ${badgeColor}">${dayRec.condition || '작성완료'}</span>`;
      }

      dayListHTML += `
        <div class="report-day-item">
          <div>
            <span style="font-weight: 700; color: var(--text-dark); font-size: 0.95rem;">${dayDisplay}</span>
            <span style="margin-left: 8px;">${statusBadge}</span>
          </div>
          <div>
            ${dayRec ? `<button type="button" class="btn btn-secondary" style="width: auto; min-height: 28px; padding: 2px 10px; font-size: 0.78rem;" onclick="app.openDetailModalForDate('${curDateStr}')">상세보기</button>` : '<span class="text-muted" style="font-size: 0.8rem;">기록없음</span>'}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="background: rgba(255,255,255,0.75); border: 1px solid var(--border-subtle); border-radius: 18px; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="margin: 0; font-size: 1.18rem; color: var(--primary-blue);">주간 케어 리포트</h3>
            <span class="text-muted" style="font-size: 0.85rem;">${CONFIG.formatKSTDateRangeDisplay(startDateStr, endDateStr)}</span>
          </div>
          <span class="badge badge-green" style="font-size: 0.9rem; padding: 6px 14px;">작성률 ${completionPct}% (${writtenDays}/7일)</span>
        </div>

        <!-- 주간 통계 카드 그리드 -->
        <div class="report-stat-grid">
          <div class="report-stat-card">
            <div class="report-stat-label">🌅 아침 평균 바이탈</div>
            <div class="report-stat-val">${avgMorningSys}/${avgMorningDia}</div>
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-medium); margin-top: 2px;">${avgMorningTemp}℃</div>
          </div>

          <div class="report-stat-card">
            <div class="report-stat-label">🌙 저녁 평균 바이탈</div>
            <div class="report-stat-val">${avgEveningSys}/${avgEveningDia}</div>
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-medium); margin-top: 2px;">${avgEveningTemp}℃</div>
          </div>

          <div class="report-stat-card">
            <div class="report-stat-label">💊 주간 투약 준수율</div>
            <div class="report-stat-val" style="color: var(--success-green);">${medPct}%</div>
            <div class="report-progress-container">
              <div class="report-progress-fill" style="width: ${medPct}%;"></div>
            </div>
          </div>

          <div class="report-stat-card">
            <div class="report-stat-label">😊 컨디션 분포</div>
            <div style="font-size: 0.85rem; font-weight: 700; margin-top: 6px; display: flex; justify-content: space-around;">
              <span style="color: #2E7D32;">양호 ${condGood}</span>
              <span style="color: #E65100;">보통 ${condNormal}</span>
              <span style="color: #C62828;">저조 ${condLow}</span>
            </div>
          </div>
        </div>

        <!-- 일별 케어 이력 상세 목록 -->
        <div style="margin-top: 20px;">
          <div style="font-weight: 700; font-size: 1rem; margin-bottom: 12px; color: var(--text-dark);">📅 주간 일별 작성 이력</div>
          ${dayListHTML}
        </div>
      </div>
    `;
  }

  // 7. 월 단위 보고서 카드 (Monthly Report)
  renderMonthlyReport(containerId, records = [], yearMonthStr) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const safeRecords = Array.isArray(records) ? records : (records && typeof records === 'object' ? Object.values(records) : []);

    const [year, month] = yearMonthStr.split('-').map(Number);
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const writtenCount = safeRecords.length;
    const monthPct = Math.round((writtenCount / totalDaysInMonth) * 100);

    let sumSys = 0, sumDia = 0, sumTemp = 0, validCount = 0;
    let condGood = 0, condNormal = 0, condLow = 0;

    safeRecords.forEach(r => {
      if (r.morning_systolic) { sumSys += Number(r.morning_systolic); sumDia += Number(r.morning_diastolic); validCount++; }
      if (r.morning_temp) { sumTemp += Number(r.morning_temp); }

      if (r.condition === '상') condGood++;
      else if (r.condition === '하') condLow++;
      else condNormal++;
    });

    const avgSys = validCount > 0 ? Math.round(sumSys / validCount) : '--';
    const avgDia = validCount > 0 ? Math.round(sumDia / validCount) : '--';
    const avgTemp = validCount > 0 ? (sumTemp / validCount).toFixed(1) : '--';

    container.innerHTML = `
      <div style="background: rgba(255,255,255,0.75); border: 1px solid var(--border-subtle); border-radius: 18px; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="margin: 0; font-size: 1.18rem; color: var(--primary-blue);">${year}년 ${month}월 월간 종합 보고서</h3>
            <span class="text-muted" style="font-size: 0.85rem;">월간 총 기록 ${writtenCount}일 / ${totalDaysInMonth}일 (${monthPct}%)</span>
          </div>
          <span class="badge badge-blue" style="font-size: 0.9rem; padding: 6px 14px;">평균 혈압 ${avgSys}/${avgDia}</span>
        </div>

        <div class="report-stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 20px;">
          <div class="report-stat-card">
            <div class="report-stat-label">📝 총 작성일수</div>
            <div class="report-stat-val">${writtenCount}일</div>
            <div class="report-progress-container">
              <div class="report-progress-fill" style="width: ${monthPct}%;"></div>
            </div>
          </div>

          <div class="report-stat-card">
            <div class="report-stat-label">🩺 평균 혈압 / 체온</div>
            <div class="report-stat-val">${avgSys}/${avgDia}</div>
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-medium); margin-top: 2px;">${avgTemp}℃</div>
          </div>

          <div class="report-stat-card">
            <div class="report-stat-label">😊 최다 컨디션</div>
            <div class="report-stat-val" style="color: #2E7D32;">${condGood >= condNormal && condGood >= condLow ? '양호' : (condNormal >= condLow ? '보통' : '저조')}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">양호 ${condGood}회 / 저조 ${condLow}회</div>
          </div>
        </div>

        <!-- 월간 달력 & 추이 차트 임베디드 레이아웃 -->
        <div style="margin-top: 20px;">
          <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 12px; color: var(--text-dark);">📆 ${year}년 ${month}월 케어 달력</div>
          <div id="reportMonthCalendarContainer"></div>
        </div>

        <div style="margin-top: 24px;">
          <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 12px; color: var(--text-dark);">📈 ${year}년 ${month}월 혈압 & 체온 추이 그래프</div>
          <div class="chart-wrapper">
            <canvas id="reportMonthTrendCanvas"></canvas>
          </div>
        </div>
      </div>
    `;

    // 렌더링 직후 달력과 차트 세팅
    setTimeout(() => {
      this.renderCalendar('reportMonthCalendarContainer', year, month, safeRecords, (dStr, rec) => {
        if (window.app && window.app.openDetailModalForDate) {
          window.app.openDetailModalForDate(dStr);
        }
      });
      this.renderTrendChart('reportMonthTrendCanvas', safeRecords);
    }, 50);
  }
}

window.uiComponents = new UIComponents();
