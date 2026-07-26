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

// 1. 회원가입
function handleSignup(ss, p) {
  if (!p.name || !p.password_hash) {
    return createJsonResponse({ success: false, message: "이름과 비밀번호가 필요합니다." });
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
  
  var elderCode = p.elder_code;
  var elderName = p.elder_name;

  // elder_code가 전달되지 않은 경우 기존 등록된 어르신 자동 매칭 또는 ELDER001 기본값 사용
  if (!elderCode || elderCode.trim() === '') {
    if (eldersData.length > 1) {
      elderCode = eldersData[1][0];
      elderName = eldersData[1][1];
    } else {
      elderCode = 'ELDER001';
      elderName = '어르신';
    }
  }

  var userId = 'USER_' + new Date().getTime();
  var createdAt = new Date().toISOString();

  usersSheet.appendRow([userId, p.name, p.role, p.password_hash, elderCode, createdAt]);

  var elderFound = false;
  for (var j = 1; j < eldersData.length; j++) {
    if (eldersData[j][0] === elderCode) {
      elderFound = true;
      elderName = eldersData[j][1];
      break;
    }
  }

  if (!elderFound) {
    eldersSheet.appendRow([elderCode, elderName, userId]);
  }

  return createJsonResponse({
    success: true,
    user: { user_id: userId, name: p.name, role: p.role, elder_code: elderCode },
    elder: { elder_code: elderCode, elder_name: elderName },
    message: "회원가입이 완료되었습니다."
  });
}

// 2. 로그인
function handleLogin(ss, p) {
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

      return createJsonResponse({
        success: true,
        user: { user_id: uId, name: name, role: role, elder_code: eCode },
        elder: { elder_code: eCode, elder_name: elderName }
      });
    }
  }

  return createJsonResponse({ success: false, message: "이름 또는 비밀번호(4자리)가 일치하지 않습니다." });
}

// 3. 일일 케어 조회
function handleGetDailyCare(ss, p) {
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
        obj[headers[h]] = headers[h] === 'date' ? formatDate(row[h]) : row[h];
      }
      return createJsonResponse({ success: true, data: obj });
    }
  }

  return createJsonResponse({ success: true, data: null });
}

// 4. 일일 케어 저장
function handleSaveDailyCare(ss, p) {
  var sheet = ss.getSheetByName('DailyCare');
  var data = sheet.getDataRange().getValues();
  var headers = [
    'record_id', 'elder_code', 'date',
    'morning_systolic', 'morning_diastolic', 'morning_temp', 'morning_time',
    'evening_systolic', 'evening_diastolic', 'evening_temp', 'evening_time',
    'condition', 'condition_memo', 'meal_status', 'meal_memo',
    'stool_count', 'stool_type', 'updated_by', 'updated_at'
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

  var rowData = [
    recordId, p.elder_code, p.date,
    p.morning_systolic || '', p.morning_diastolic || '', p.morning_temp || '', p.morning_time || '',
    p.evening_systolic || '', p.evening_diastolic || '', p.evening_temp || '', p.evening_time || '',
    p.condition || '', p.condition_memo || '', p.meal_status || '', p.meal_memo || '',
    p.stool_count || 0, p.stool_type || '', p.updated_by || '', updatedAt
  ];

  if (rowIdx > 0) {
    sheet.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return createJsonResponse({ success: true, message: "케어 기록이 저장되었습니다.", record_id: recordId });
}

// 5. 월간 기록 조회
function handleGetMonthlyCare(ss, p) {
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
          obj[headers[h]] = headers[h] === 'date' ? formatDate(row[h]) : row[h];
        }
        results.push(obj);
      }
    }
  }

  return createJsonResponse({ success: true, data: results });
}

// Helper: JSON 응답 생성 (CORS 유연화)
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper: 날짜 포맷 YYYY-MM-DD
function formatDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  try {
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  } catch (e) {
    return String(d).slice(0, 10);
  }
}

// Helper: 필수 시트 자동 생성
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
      'stool_count', 'stool_type', 'updated_by', 'updated_at'
    ]
  };

  sheets.forEach(function(sName) {
    var sheet = ss.getSheetByName(sName);
    if (!sheet) {
      sheet = ss.insertSheet(sName);
      sheet.appendRow(defaultHeaders[sName]);
    }
  });
}
