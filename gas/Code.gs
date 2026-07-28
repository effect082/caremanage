/**
 * 일일 케어 현황 (Daily Care Status) - Google Apps Script (GAS) Backend
 * Google Sheets Database API
 * 
 * 시트 구조 (자동 생성됨):
 * 1. Users (user_id, name, role, password_hash, elder_code, created_at)
 * 2. Elders (elder_code, elder_name, caregiver_id)
 * 3. DailyCare (record_id, elder_code, date, morning_systolic, morning_diastolic, morning_temp, morning_time, evening_systolic, evening_diastolic, evening_temp, evening_time, condition, condition_memo, meal_status, meal_memo, stool_count, stool_type, updated_by, updated_at)
 */

function doGet(e) {
  return handleRequest(e ? e.parameter : {});
}

function doPost(e) {
  var data = {};
  try {
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return createJsonResponse({ success: false, message: "Invalid JSON body: " + err.toString() });
  }
  return handleRequest(data);
}

function handleRequest(params) {
  var action = params.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheetsExist(ss);

  try {
    if (action === 'signup') {
      return handleSignup(ss, params);
    } else if (action === 'login') {
      return handleLogin(ss, params);
    } else if (action === 'getDailyCare') {
      return handleGetDailyCare(ss, params);
    } else if (action === 'saveDailyCare') {
      return handleSaveDailyCare(ss, params);
    } else if (action === 'getMonthlyCare') {
      return handleGetMonthlyCare(ss, params);
    } else {
      return createJsonResponse({ success: true, message: "CareManage GAS API Online", params: params });
    }
  } catch (error) {
    return createJsonResponse({ success: false, message: error.toString() });
  }
}

// 1. 회원가입 (어르신 성함 매칭 및 권한 범위 격리)
function handleSignup(ss, p) {
  if (!p.name || !p.password_hash) {
    return createJsonResponse({ success: false, message: "이름과 비밀번호가 필요합니다." });
  }

  var reqElderName = (p.elder_name || "").trim();
  if (!reqElderName) {
    return createJsonResponse({ success: false, message: "어르신 성함(필수)을 입력해 주세요." });
  }

  var usersSheet = ss.getSheetByName('Users');
  var usersData = usersSheet.getDataRange().getValues();
  
  for (var i = 1; i < usersData.length; i++) {
    if (usersData[i][1] === p.name && usersData[i][2] === p.role) {
      return createJsonResponse({ success: false, message: "이미 가입된 이름입니다." });
    }
  }

  var eldersSheet = ss.getSheetByName('Elders');
  var eldersData = eldersSheet.getDataRange().getValues();
  
  var elderCode = "";
  var elderName = reqElderName;

  // 어르신 성함(elder_name)이 일치하는 기존 어르신 찾기
  for (var j = 1; j < eldersData.length; j++) {
    var existingElderName = String(eldersData[j][1] || "").trim();
    if (existingElderName === reqElderName) {
      elderCode = eldersData[j][0];
      elderName = existingElderName;
      break;
    }
  }

  var userId = 'USER_' + new Date().getTime();
  var createdAt = new Date().toISOString();

  // 기존에 일치하는 어르신이 없을 경우 신규 어르신 코드 생성 및 Elders 시트 등록
  if (!elderCode) {
    elderCode = 'ELDER_' + new Date().getTime();
    eldersSheet.appendRow([elderCode, elderName, userId]);
  }

  usersSheet.appendRow([userId, p.name, p.role, p.password_hash, elderCode, createdAt]);

  var resData = {
    success: true,
    user: { user_id: userId, name: p.name, role: p.role, elder_code: elderCode },
    elder: { elder_code: elderCode, elder_name: elderName },
    message: "회원가입이 완료되었습니다."
  };

  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = "LOGIN_" + p.name + "_" + p.role;
    cache.put(cacheKey, JSON.stringify({ passHash: p.password_hash, resData: resData }), 21600);
  } catch(e) {}

  return createJsonResponse(resData);
}

// 2. 로그인 (초고속 Script Cache 0.1초 응답 적용)
function handleLogin(ss, p) {
  var cacheKey = "LOGIN_" + p.name + "_" + p.role;
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(cacheKey);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (parsed.passHash === p.password_hash) {
        return createJsonResponse(parsed.resData);
      }
    }
  } catch(e) {}

  var usersSheet = ss.getSheetByName('Users');
  var usersData = usersSheet.getDataRange().getValues();
  
  for (var i = 1; i < usersData.length; i++) {
    var uId = usersData[i][0];
    var name = usersData[i][1];
    var role = usersData[i][2];
    var passHash = usersData[i][3];
    var eCode = usersData[i][4];

    if (name === p.name && role === p.role && passHash === p.password_hash) {
      var eldersSheet = ss.getSheetByName('Elders');
      var eldersData = eldersSheet.getDataRange().getValues();
      var elderName = name + " 댁 어르신";

      for (var j = 1; j < eldersData.length; j++) {
        if (eldersData[j][0] === eCode) {
          elderName = eldersData[j][1];
          break;
        }
      }

      var resData = {
        success: true,
        user: { user_id: uId, name: name, role: role, elder_code: eCode },
        elder: { elder_code: eCode, elder_name: elderName }
      };

      try {
        var cache = CacheService.getScriptCache();
        cache.put(cacheKey, JSON.stringify({ passHash: passHash, resData: resData }), 21600);
      } catch(e) {}

      return createJsonResponse(resData);
    }
  }

  return createJsonResponse({ success: false, message: "이름 또는 비밀번호(4자리)가 일치하지 않습니다." });
}

// 3. 일일 케어 조회 (속도 최적화 Script Cache 적용)
function handleGetDailyCare(ss, p) {
  var cache = CacheService.getScriptCache();
  var cacheKey = "DAILY_" + p.elder_code + "_" + p.date;
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      return createJsonResponse(JSON.parse(cached));
    } catch(e) {}
  }

  var sheet = ss.getSheetByName('DailyCare');
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return createJsonResponse({ success: true, data: null });

  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var elderCode = row[1];
    var dateStr = formatDate(row[2]);

    if (elderCode === p.elder_code && dateStr === p.date) {
      var obj = {};
      for (var h = 0; h < headers.length; h++) {
        var hName = headers[h];
        if (hName === 'date') {
          obj[hName] = formatDate(row[h]);
        } else if (hName === 'morning_time' || hName === 'evening_time') {
          obj[hName] = formatTimeVal(row[h]);
        } else if (hName === 'medication_memo') {
          obj[hName] = cleanMedicationMemoVal(row[h]);
        } else {
          obj[hName] = row[h];
        }
      }
      var respObj = { success: true, data: obj };
      cache.put(cacheKey, JSON.stringify(respObj), 300);
      return createJsonResponse(respObj);
    }
  }

  var nullResp = { success: true, data: null };
  cache.put(cacheKey, JSON.stringify(nullResp), 60);
  return createJsonResponse(nullResp);
}

// 4. 일일 케어 저장 (요양보호사 & 가족 작성자 구분)
function handleSaveDailyCare(ss, p) {
  var sheet = ss.getSheetByName('DailyCare');
  var data = sheet.getDataRange().getValues();
  var headers = [
    'record_id', 'elder_code', 'date',
    'morning_systolic', 'morning_diastolic', 'morning_temp', 'morning_time',
    'evening_systolic', 'evening_diastolic', 'evening_temp', 'evening_time',
    'condition', 'condition_memo', 'meal_status', 'meal_memo',
    'stool_count', 'stool_type',
    'medication_morning', 'medication_lunch', 'medication_evening', 'medication_memo',
    'updated_by', 'updated_by_name', 'updated_role', 'updated_at'
  ];

  var rowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === p.elder_code && formatDate(data[i][2]) === p.date) {
      rowIdx = i + 1;
      break;
    }
  }

  var recordId = rowIdx > 0 ? data[rowIdx - 1][0] : 'REC_' + new Date().getTime();
  var updatedAt = new Date().toISOString();
  var updatedRole = p.updated_role || '요양보호사';
  var updatedByName = p.updated_by_name || p.updated_by || '사용자';

  var parsedStool = parseInt(p.stool_count, 10);
  var cleanStool = isNaN(parsedStool) || parsedStool < 0 ? 0 : Math.min(10, parsedStool);

  var medMorning = (p.medication_morning === true || p.medication_morning === 'Y' || p.medication_morning === 'true') ? 'Y' : 'N';
  var medLunch = (p.medication_lunch === true || p.medication_lunch === 'Y' || p.medication_lunch === 'true') ? 'Y' : 'N';
  var medEvening = (p.medication_evening === true || p.medication_evening === 'Y' || p.medication_evening === 'true') ? 'Y' : 'N';
  var medMemo = p.medication_memo || '';

  var rowData = [
    recordId, p.elder_code, p.date,
    p.morning_systolic || '', p.morning_diastolic || '', p.morning_temp || '', p.morning_time || '',
    p.evening_systolic || '', p.evening_diastolic || '', p.evening_temp || '', p.evening_time || '',
    p.condition || '', p.condition_memo || '', p.meal_status || '', p.meal_memo || '',
    cleanStool, p.stool_type || '',
    medMorning, medLunch, medEvening, medMemo,
    p.updated_by || '', updatedByName, updatedRole, updatedAt
  ];

  if (rowIdx > 0) {
    sheet.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  // 캐시 무효화 (저장 후 즉시 동기화 보장)
  try {
    var cache = CacheService.getScriptCache();
    cache.remove("DAILY_" + p.elder_code + "_" + p.date);
    if (p.date && p.date.length >= 7) {
      cache.remove("MONTHLY_" + p.elder_code + "_" + p.date.substring(0, 7));
    }
  } catch(e) {}

  return createJsonResponse({ 
    success: true, 
    message: "일일 케어 현황 기록 저장이 성공적으로 완료되었습니다.", 
    record_id: recordId, 
    updated_role: updatedRole,
    updated_by_name: updatedByName
  });
}

// 5. 월간 기록 조회 (속도 최적화 Script Cache 적용)
function handleGetMonthlyCare(ss, p) {
  var cache = CacheService.getScriptCache();
  var cacheKey = "MONTHLY_" + p.elder_code + "_" + p.month;
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      return createJsonResponse(JSON.parse(cached));
    } catch(e) {}
  }

  var sheet = ss.getSheetByName('DailyCare');
  var data = sheet.getDataRange().getValues();
  var results = [];

  if (data.length > 1) {
    var headers = data[0];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var eCode = row[1];
      var dStr = formatDate(row[2]);

      if (eCode === p.elder_code && dStr.indexOf(p.month) === 0) {
        var obj = {};
        for (var h = 0; h < headers.length; h++) {
          var hName = headers[h];
          if (hName === 'date') {
            obj[hName] = formatDate(row[h]);
          } else if (hName === 'morning_time' || hName === 'evening_time') {
            obj[hName] = formatTimeVal(row[h]);
          } else if (hName === 'medication_memo') {
            obj[hName] = cleanMedicationMemoVal(row[h]);
          } else {
            obj[hName] = row[h];
          }
        }
        results.push(obj);
      }
    }
  }

  var respObj = { success: true, data: results };
  cache.put(cacheKey, JSON.stringify(respObj), 300);
  return createJsonResponse(respObj);
}

// Helper: JSON 응답 생성 (CORS 유연화)
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper: 날짜 포맷 YYYY-MM-DD (대한민국 표준시 Asia/Seoul 타임존 고정)
function formatDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  try {
    return Utilities.formatDate(new Date(d), 'Asia/Seoul', 'yyyy-MM-dd');
  } catch (e) {
    try {
      var year = d.getFullYear();
      var month = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    } catch (e2) {
      return String(d).slice(0, 10);
    }
  }
}

// Helper: 시간 포맷 HH:mm (대한민국 표준시 Asia/Seoul 타임존 고정)
function formatTimeVal(t) {
  if (!t) return '';
  var str = String(t).trim();
  if (!str) return '';
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    var p = str.split(':');
    var h = p[0].length === 1 ? '0' + p[0] : p[0];
    var m = p[1].length === 1 ? '0' + p[1] : p[1];
    return h + ':' + m;
  }
  try {
    var d = new Date(str);
    if (!isNaN(d.getTime())) {
      var kstH = (d.getUTCHours() + 9) % 24;
      var kstM = d.getUTCMinutes();
      return (kstH < 10 ? '0' + kstH : '' + kstH) + ':' + (kstM < 10 ? '0' + kstM : '' + kstM);
    }
  } catch (e) {}
  return str;
}

// Helper: 투약 메모 필터링
function cleanMedicationMemoVal(memo) {
  if (!memo) return '';
  var str = String(memo).trim();
  if (str.indexOf('복용하시는 약 4개중') !== -1 || str.indexOf('70%만 복용') !== -1) {
    return '';
  }
  return str;
}

// Helper: 필수 시트 및 25개 헤더 자동 생성/동기화
function ensureSheetsExist(ss) {
  var sheets = ['Users', 'Elders', 'DailyCare'];
  var defaultHeaders = {
    'Users': ['user_id', 'name', 'role', 'password_hash', 'elder_code', 'created_at'],
    'Elders': ['elder_code', 'elder_name', 'caregiver_id'],
    'DailyCare': [
      'record_id', 'elder_code', 'date',
      'morning_systolic', 'morning_diastolic', 'morning_temp', 'morning_time',
      'evening_systolic', 'evening_diastolic', 'evening_temp', 'evening_time',
      'condition', 'condition_memo', 'meal_status', 'meal_memo',
      'stool_count', 'stool_type',
      'medication_morning', 'medication_lunch', 'medication_evening', 'medication_memo',
      'updated_by', 'updated_by_name', 'updated_role', 'updated_at'
    ]
  };

  sheets.forEach(function(sName) {
    var sheet = ss.getSheetByName(sName);
    if (!sheet) {
      sheet = ss.insertSheet(sName);
      sheet.appendRow(defaultHeaders[sName]);
    } else if (sName === 'DailyCare') {
      var lastCol = sheet.getLastColumn();
      var firstRow = sheet.getRange(1, 1, 1, Math.max(lastCol, defaultHeaders['DailyCare'].length)).getValues()[0];
      var hasMedCol = false;
      for (var k = 0; k < firstRow.length; k++) {
        if (firstRow[k] === 'medication_morning') {
          hasMedCol = true;
          break;
        }
      }
      if (!hasMedCol) {
        sheet.getRange(1, 1, 1, defaultHeaders['DailyCare'].length).setValues([defaultHeaders['DailyCare']]);
      }
    }
  });
}
