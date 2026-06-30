/* ============================================================
 *  My Expense Data  -  Data layer  (db.js)
 * ------------------------------------------------------------
 *  This file is the single source of truth for the column
 *  structure. index.html, db.sql and export.xlsx all share the
 *  SAME columns so that data can be imported / exported and
 *  used together without conversion.
 *
 *  Persistence: localStorage (key = "expense_data").
 *  No sample data is included.
 * ============================================================ */

/* ---------- Column definition (shared with db.sql / export.xlsx) ----------
 * The order here MUST match:
 *   - CREATE TABLE columns in db.sql
 *   - Header row in export.xlsx
 */
const DB_COLUMNS = [
    { key: "id",        label: "No.",         sql: "id INTEGER PRIMARY KEY" },
    { key: "date",      label: "Date",        sql: "date TEXT" },
    { key: "time",      label: "Time",        sql: "time TEXT" },
    { key: "from_acc",  label: "From",        sql: "from_acc TEXT" },
    { key: "to_acc",    label: "To",          sql: "to_acc TEXT" },
    { key: "amount",    label: "Amount",      sql: "amount REAL" },
    { key: "type",      label: "Type",        sql: "type TEXT" },     // income | expense
    { key: "note",      label: "Note",        sql: "note TEXT" },
    { key: "created_at",label: "Created At",  sql: "created_at TEXT" }
];

const STORAGE_KEY = "expense_data";

const DB = {
    /* ---------- read all rows ---------- */
    getAll() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        } catch (e) {
            console.error("DB.getAll error:", e);
            return [];
        }
    },

    /* ---------- write all rows ---------- */
    _save(rows) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    },

    /* ---------- add one row (auto id + created_at) ---------- */
    insert(row) {
        const rows = this.getAll();
        const nextId = rows.length ? Math.max(...rows.map(r => Number(r.id) || 0)) + 1 : 1;
        const record = {
            id: nextId,
            date:       row.date       || "",
            time:       row.time       || "",
            from_acc:   row.from_acc   || "",
            to_acc:     row.to_acc     || "",
            amount:     Number(row.amount) || 0,
            type:       row.type       || "expense",
            note:       row.note       || "",
            created_at: row.created_at || new Date().toISOString()
        };
        rows.push(record);
        this._save(rows);
        return record;
    },

    /* ---------- update one field of one row ---------- */
    update(id, patch) {
        const rows = this.getAll();
        const idx = rows.findIndex(r => Number(r.id) === Number(id));
        if (idx > -1) {
            rows[idx] = { ...rows[idx], ...patch };
            this._save(rows);
            return rows[idx];
        }
        return null;
    },

    /* ---------- delete one row ---------- */
    remove(id) {
        const rows = this.getAll().filter(r => Number(r.id) !== Number(id));
        this._save(rows);
    },

    /* ---------- delete every row ---------- */
    clear() {
        this._save([]);
    },

    /* ---------- rows whose date is within [from,to] (dd/mm/yyyy) ---------- */
    getByDateRange(fromDDMMYYYY, toDDMMYYYY) {
        const toTs = d => {
            if (!d) return null;
            const [dd, mm, yyyy] = String(d).split("/");
            const t = new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getTime();
            return isNaN(t) ? null : t;
        };
        const f = toTs(fromDDMMYYYY), t = toTs(toDDMMYYYY);
        return this.getAll().filter(r => {
            const ts = toTs(r.date);
            if (ts === null) return false;
            if (f !== null && ts < f) return false;
            if (t !== null && ts > t) return false;
            return true;
        });
    },

    /* ---------- export current data as plain JS array of plain objects,
     *              in the exact shared column order. ---------- */
    exportRows(rows) {
        return (rows || this.getAll()).map(r => {
            const o = {};
            DB_COLUMNS.forEach(c => { o[c.key] = r[c.key]; });
            return o;
        });
    }
};

/* expose globally for index.html */
window.DB = DB;
window.DB_COLUMNS = DB_COLUMNS;
