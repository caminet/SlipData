// ============================================================
// MySlipData — Database & Storage Module (dbs.js)
// localStorage-based: works fully offline / mobile browser
// ============================================================

var DB = (function () {

  var KEY     = 'myslipdata_records';
  var LOG_KEY = 'myslipdata_exportlogs';

  // ── CRUD ──────────────────────────────────────────────────
  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }

  function save(records) {
    localStorage.setItem(KEY, JSON.stringify(records));
  }

  function insert(record) {
    var records = getAll();
    record.id         = Date.now() + Math.floor(Math.random() * 1000);
    record.created_at = new Date().toISOString();
    records.unshift(record);
    save(records);
    return record;
  }

  function getById(id) {
    return getAll().find(function (r) { return r.id == id; }) || null;
  }

  function deleteById(id) {
    save(getAll().filter(function (r) { return r.id != id; }));
  }

  // ── Query ─────────────────────────────────────────────────
  function getByDate(dateStr) {
    return getAll().filter(function (r) { return r.record_date === dateStr; });
  }

  function getByDateRange(from, to) {
    return getAll().filter(function (r) {
      return r.record_date >= from && r.record_date <= to;
    });
  }

  function getByMonth(year, month) {
    var prefix = year + '-' + String(month).padStart(2, '0');
    return getAll().filter(function (r) {
      return r.record_date && r.record_date.startsWith(prefix);
    });
  }

  // ── Parse slip / receipt text (OCR output) ────────────────
  // หลักการ: จำนวนเงิน = ช่อง "จำนวนเงิน" หรือ "จำนวน" เท่านั้น
  // ไม่ใช้ยอดรวม/ยอดคงเหลือที่อาจปรากฏที่อื่นใน slip
  function parseSlipText(text) {
    var result = {
      record_date: null, record_time: null,
      from_party: null,  to_party: null,
      amount: 0,         slip_type: 'bank_slip'
    };

    // ── Date ──────────────────────────────────────────────
    // รองรับ: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    // Thai date: วันที่ 27 มิ.ย. 2569 / 27 มิถุนายน 2569
    var thaiMonths = {
      'ม.ค.':1,'ก.พ.':2,'มี.ค.':3,'เม.ย.':4,'พ.ค.':5,'มิ.ย.':6,
      'ก.ค.':7,'ส.ค.':8,'ก.ย.':9,'ต.ค.':10,'พ.ย.':11,'ธ.ค.':12,
      'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,
      'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12
    };
    var dateFound = false;

    // Thai format: 27 มิ.ย. 2569 หรือ 27 มิถุนายน 2569
    var thaiDateRx = /(\d{1,2})\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s+(\d{4})/;
    var tdm = text.match(thaiDateRx);
    if (tdm) {
      var buddhistYear = parseInt(tdm[3]);
      var christianYear = buddhistYear > 2400 ? buddhistYear - 543 : buddhistYear;
      var mo = thaiMonths[tdm[2]] || 1;
      result.record_date = christianYear + '-' + String(mo).padStart(2,'0') + '-' + String(tdm[1]).padStart(2,'0');
      dateFound = true;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    if (!dateFound) {
      var dm = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (dm) {
        var yr = parseInt(dm[3]);
        if (yr > 2400) yr -= 543; // Buddhist year
        result.record_date = yr + '-' + String(dm[2]).padStart(2,'0') + '-' + String(dm[1]).padStart(2,'0');
        dateFound = true;
      }
    }

    // YYYY-MM-DD
    if (!dateFound) {
      var ym = text.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (ym) {
        var yr2 = parseInt(ym[1]);
        if (yr2 > 2400) yr2 -= 543;
        result.record_date = yr2 + '-' + String(ym[2]).padStart(2,'0') + '-' + String(ym[3]).padStart(2,'0');
      }
    }
    if (!result.record_date) result.record_date = new Date().toISOString().split('T')[0];

    // ── Time ──────────────────────────────────────────────
    // จับเวลา HH:MM หรือ HH:MM:SS (ไม่จับเวลาที่อยู่ในวันที่)
    var timeRx = /(?:เวลา|time)?[\s:]*(\d{1,2}):(\d{2})(?::(\d{2}))?/i;
    var tm = text.match(timeRx);
    if (tm) {
      result.record_time = String(tm[1]).padStart(2,'0') + ':' + tm[2] + ':' + (tm[3] || '00');
    } else {
      result.record_time = new Date().toTimeString().slice(0, 8);
    }

    // ── Amount — เน้นที่ช่อง "จำนวนเงิน" / "จำนวน" เท่านั้น ──
    // ลำดับความสำคัญ (สูง → ต่ำ):
    // 1. จำนวนเงิน: XX.XX  (Thai bank slip field)
    // 2. จำนวน: XX.XX
    // 3. Amount: XX.XX  (English receipt)
    // 4. Grand Total: XX.XX
    // 5. Total: XX.XX
    // หมายเหตุ: ไม่ใช้ ฿ หรือ standalone number เพราะอาจเป็นยอดคงเหลือ
    var amtPatterns = [
      // Thai bank slip — ช่อง "จำนวนเงิน" ตามด้วยจำนวน (อาจมีหรือไม่มี ฿/บาท)
      /จำนวนเงิน\s*[:\s]\s*([\d,]+\.?\d*)/,
      // Thai "จำนวน" ตามด้วยจำนวน
      /(?:^|\n)\s*จำนวน\s*[:\s]\s*([\d,]+\.?\d*)/m,
      // English receipt fields
      /amount\s*[:\s]\s*([\d,]+\.?\d*)/i,
      /grand\s*total\s*[:\s]\s*([\d,]+\.?\d*)/i,
      /total\s*[:\s]\s*([\d,]+\.?\d*)/i,
      // ยอดรวม / grand total Thai
      /ยอดรวม\s*[:\s]\s*([\d,]+\.?\d*)/,
      /ยอดชำระ\s*[:\s]\s*([\d,]+\.?\d*)/,
      /ยอดโอน\s*[:\s]\s*([\d,]+\.?\d*)/,
      // fallback: หน่วยบาท/THB ตามหลัง
      /([\d,]+\.?\d*)\s*บาท\b/,
      /([\d,]+\.?\d*)\s*THB\b/i
    ];

    for (var i = 0; i < amtPatterns.length; i++) {
      var am = text.match(amtPatterns[i]);
      if (am) {
        var val = parseFloat(am[1].replace(/,/g, ''));
        // กรอง: ไม่รับค่าที่ดูเหมือนยอดคงเหลือ (> 100,000)
        // และต้องมากกว่า 0
        if (val > 0) {
          result.amount = val;
          break;
        }
      }
    }

    // ── From / To ──────────────────────────────────────────
    var fromM = text.match(/(?:จาก|from|ผู้โอน|บัญชีต้นทาง)\s*[\n\r]*\s*([^\n\r฿]+?)(?:\s*[\n\r]|$)/i);
    if (fromM) result.from_party = fromM[1].trim().replace(/\s+/g,' ');

    var toM = text.match(/(?:ไปยัง|to|ผู้รับ|บัญชีปลายทาง)\s*[\n\r]*\s*([^\n\r฿]+?)(?:\s*[\n\r]|$)/i);
    if (toM) result.to_party = toM[1].trim().replace(/\s+/g,' ');

    // ── Slip Type ──────────────────────────────────────────
    result.slip_type = /receipt|ใบเสร็จ|tax\s*invoice|ใบกำกับภาษี/i.test(text)
      ? 'receipt' : 'bank_slip';

    return result;
  }

  // ── Export log ────────────────────────────────────────────
  function logExport(dateFrom, dateTo, records) {
    var logs  = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    var total = records.reduce(function (s, r) { return s + parseFloat(r.amount || 0); }, 0);
    logs.unshift({
      id: Date.now(),
      export_date:  new Date().toISOString().split('T')[0],
      date_from:    dateFrom,
      date_to:      dateTo,
      record_count: records.length,
      total_amount: total,
      file_name:    'Export.xlsx'
    });
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  }

  // ── Clear ─────────────────────────────────────────────────
  function clearAll() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LOG_KEY);
  }

  // ── Public API ────────────────────────────────────────────
  return {
    KEY:           KEY,
    LOG_KEY:       LOG_KEY,
    getAll:        getAll,
    save:          save,
    insert:        insert,
    getById:       getById,
    delete:        deleteById,
    getByDate:     getByDate,
    getByDateRange:getByDateRange,
    getByMonth:    getByMonth,
    parseSlipText: parseSlipText,
    logExport:     logExport,
    clearAll:      clearAll
  };

})();
// DB is now a global variable — accessible everywhere in the browser
