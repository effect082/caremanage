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

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length > 0 ? labels : ['기록 없음'],
        datasets: [
          {
            label: '아침 수축기(mmHg)',
            data: morningSystolic.length > 0 ? morningSystolic : [0],
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
    const todayStr = new Date().toISOString().split('T')[0];

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
      const formatTime = (t) => {
        if (!t) return '시간미입력';
        const str = String(t);
        if (str.includes('T')) {
          const timePart = str.split('T')[1];
          if (timePart) {
            const parts = timePart.split(':');
            return `${parts[0]}:${parts[1]}`;
          }
        }
        return str;
      };

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
            ${record.medication_memo ? `<p style="font-size: 0.9rem; color: var(--text-medium); background: #F4F7FF; padding: 8px 12px; border-radius: 8px; margin-top: 6px;">"${record.medication_memo}"</p>` : ''}
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
}

window.uiComponents = new UIComponents();
