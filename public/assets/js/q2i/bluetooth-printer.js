/* JADSTACK LOTTO — Q2i Bluetooth ESC/POS (Bluetooth Classic / SPP)
 * Bridge: window.AndroidPrinter (Android WebView -> AndroidPrinter.java)
 * API piblik: window.JadStackPrinter, window.JadStackReceiptConfig,
 *             window.buildJadStackReceipt, window.connectQ2i,
 *             window.testQ2i, window.printLottoTicket
 *
 * Sekirite: pa janm lanse yon exception ki ka kraze POS la — tout erè
 * yo trete gracieusement epi retounen yon mesaj klè an kreyòl.
 */
(function () {
  'use strict';

  /* Anti double-loading */
  if (window.JadStackPrinter && window.JadStackPrinter.__jadstack) return;

  const CONFIG = {
    name: 'JADSTACK LOTTO',
    phone: '+50940973833',
    address: 'LÉOGÂNE, LAGONAVE, PORT AU PRINCE',
    footer: 'Bienvenue la prochaine fois'
  };

  const NO_BRIDGE = 'La fonction Q2i est disponible uniquement dans l\'APK Android.';

  function clean(v) {
    return String(v === undefined || v === null ? '' : v).replace(/\r?\n/g, ' ').trim();
  }
  function padRight(s, n) {
    s = clean(s);
    return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
  }
  function padLeft(s, n) {
    s = clean(s);
    return s.length >= n ? s.slice(-n) : ' '.repeat(n - s.length) + s;
  }
  function line(width) {
    return '-'.repeat(width || 32);
  }

  function bridge() {
    try {
      return (typeof window !== 'undefined' && window.AndroidPrinter) ? window.AndroidPrinter : null;
    } catch (_) {
      return null;
    }
  }

  /* Rele yon metòd bridge san janm kraze. */
  async function callBridge(method, arg) {
    const b = bridge();
    if (!b || typeof b[method] !== 'function') return NO_BRIDGE;
    try {
      const r = arg === undefined ? b[method]() : b[method](arg);
      return await Promise.resolve(r);
    } catch (e) {
      return 'Erreur du pont Android : ' + ((e && e.message) || e);
    }
  }

  const Printer = {
    __jadstack: true,
    connected: false,

    available() {
      return !!bridge();
    },

    /* Android 12+ : mande BLUETOOTH_CONNECT / BLUETOOTH_SCAN anvan koneksyon. */
    async ensurePermissions() {
      const b = bridge();
      if (!b) return NO_BRIDGE;
      if (typeof b.hasPermissions !== 'function') return 'OK'; // ansyen bridge
      try {
        if (b.hasPermissions() === true || b.hasPermissions() === 'OK') return 'OK';
      } catch (_) { /* ignore */ }
      const r = await callBridge('requestPermissions');
      return r || 'OK';
    },

    async connect() {
      if (!bridge()) {
        this.connected = false;
        return { ok: false, message: NO_BRIDGE };
      }
      const perm = await this.ensurePermissions();
      if (perm !== 'OK' && perm !== 'GRANTED' && perm !== true) {
        this.connected = false;
        return { ok: false, message: String(perm || 'Bluetooth permission refize. Tanpri bay pèmisyon Bluetooth la.') };
      }
      const r = await callBridge('connect');
      if (r === 'OK' || r === 'CONNECTED') {
        this.connected = true;
        return { ok: true, message: 'Q2i connecté ✅' };
      }
      this.connected = false;
      return { ok: false, message: String(r || 'Q2i introuvable. Veuillez appairer l\'imprimante dans les paramètres Bluetooth.') };
    },

    /* Sinkronize drapo `connected` a ak eta reyèl bridge la (synchrone). */
    isLive() {
      const b = bridge();
      if (!b) { this.connected = false; return false; }
      if (typeof b.isConnected === 'function') {
        try {
          const v = b.isConnected();
          this.connected = (v === true || v === 'true');
        } catch (_) { /* kenbe ansyen valè a */ }
      }
      return this.connected;
    },

    async status() {
      const b = bridge();
      if (!b) return { ok: false, message: NO_BRIDGE };
      const ok = this.isLive();
      return { ok, message: ok ? 'Q2i connecté ✅' : 'Q2i déconnecté' };
    },


    async print(text) {
      if (!bridge()) return { ok: false, message: NO_BRIDGE };
      if (!this.isLive()) {
        const c = await this.connect();
        if (!c.ok) return c;
      }
      const r = await callBridge('print', String(text || ''));
      if (r === 'PRINT_OK' || r === 'OK') return { ok: true, message: 'Imprimer ✅' };
      if (String(r).indexOf('non connecté') >= 0) this.connected = false;
      return { ok: false, message: String(r || 'Enpresyon echwe.') };
    },

    async testPrint() {
      return this.print(buildReceipt({
        test: true,
        uniqueNumber: 'XSD20190921000060',
        sequence: '1',
        date: '2019-09-21',
        seller: '',
        rows: [
          { lotto: 'B0', boule: '02', option: '-', amount: '50' },
          { lotto: 'L4', boule: '9825', option: '2', amount: '25' }
        ],
        total: '75',
        payment: 'Compte en especes',
        remarks: 'aucun',
        express: 'aucun',
        printTime: '2019-09-21 10:00:00'
      }));
    },

    async printTicket(data) {
      return this.print(buildReceipt(data || {}));
    },

    disconnect() {
      this.connected = false;
      if (bridge()) { callBridge('disconnect'); }
      return true;
    }
  };

  function buildReceipt(data) {
    data = data || {};
    const width = 32;
    const rows = Array.isArray(data.rows) ? data.rows : [];

    const uniqueNumber = clean(data.uniqueNumber || data.ticketNumber || ('JAD' + Date.now()));
    const sequence = clean(data.sequence || '1');
    const date = clean(data.date || new Date().toISOString().slice(0, 10));
    const seller = clean(data.seller || data.vendeur || '');
    const payment = clean(data.payment || 'Compte en especes');
    const remarks = clean(data.remarks || 'aucun');
    const express = clean(data.express || 'aucun');
    const printTime = clean(data.printTime || new Date().toLocaleString('fr-FR'));

    let total = data.total;
    if (total === undefined || total === null || total === '') {
      total = rows.reduce((sum, r) => {
        const n = Number(String((r && r.amount) || 0).replace(/[^\d.-]/g, ''));
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0);
    }
    total = clean(total);

    let out = '';

    out += '\x1B\x40';             // ESC @ - initialize
    out += '\x1B\x61\x01';         // center
    out += '\x1B\x45\x01';         // bold ON
    out += CONFIG.name + '\n';
    out += '\x1B\x45\x00';         // bold OFF
    out += '\x1B\x61\x00';         // left
    out += 'POS Test Printer\n';

    out += 'Numero unique: ' + uniqueNumber + '\n';
    out += sequence + '\n';
    out += 'Date: ' + date + '\n';
    out += 'Vendeur: ' + seller + '\n';

    out += line(width) + '\n';

    out += padRight('Lotto', 9)
        + padRight('Boule', 8)
        + padRight('Optio', 6)
        + 'Montant\n';

    rows.forEach(r => {
      r = r || {};
      out += padRight(r.lotto || '', 9)
          + padRight(r.boule || '', 8)
          + padRight(r.option || '', 6)
          + padLeft(r.amount || '', 9).slice(-9)
          + '\n';
    });

    out += '\n' + line(width) + '\n';
    out += padRight('total', 10) + '=> ' + padLeft(total, 18) + '\n';
    out += line(width) + '\n';

    out += 'Compte de reglement: ' + payment + '\n';
    out += 'Remarques: ' + remarks + '\n';
    out += 'Numero express: ' + express + '\n';
    out += 'Heure d\'impression: ' + printTime + '\n';

    out += line(width) + '\n';
    out += 'Telephone: ' + CONFIG.phone + '\n';
    out += 'Adresse: ' + CONFIG.address + '\n';

    out += '\n';
    out += '\x1B\x61\x01';         // center
    out += CONFIG.footer + '\n';
    out += '\x1B\x61\x00';         // left
    out += '\n\n\n';

    return out;
  }

  function notify(msg, kind) {
    try {
      if (window.Lotri && typeof window.Lotri.toast === 'function') {
        window.Lotri.toast(msg, kind || 'info');
        return;
      }
    } catch (_) { /* ignore */ }
    try { alert(msg); } catch (_) { /* ignore */ }
  }

  window.JadStackPrinter = Printer;
  window.JadStackReceiptConfig = CONFIG;
  window.buildJadStackReceipt = buildReceipt;
  window.JadStackNotify = notify;

  window.connectQ2i = async function () {
    const r = await Printer.connect();
    notify(r.ok ? 'Q2i Bluetooth connecté ✅' : 'Imprimante non connectée ❌ — ' + r.message, r.ok ? 'success' : 'error');
    try { document.dispatchEvent(new CustomEvent('q2i:status', { detail: r })); } catch (_) { /* ignore */ }
    return r.ok;
  };

  window.testQ2i = async function () {
    const r = await Printer.testPrint();
    notify(r.ok ? 'Test imprimé avec succès ✅' : 'Enpresyon echwe ❌ — ' + r.message, r.ok ? 'success' : 'error');
    try { document.dispatchEvent(new CustomEvent('q2i:status', { detail: { ok: Printer.connected, message: r.message } })); } catch (_) { /* ignore */ }
    return r.ok;
  };

  /* printLottoTicket(ticketNumber, rows, total, extra) */
  window.printLottoTicket = async function (ticketNumber, rows, total, extra) {
    const r = await Printer.printTicket(Object.assign({
      ticketNumber: ticketNumber,
      rows: Array.isArray(rows) ? rows : [],
      total: total
    }, extra || {}));
    if (!r.ok) notify('Le ticket n\'a pas été imprimé ❌ — ' + r.message, 'error');
    else notify('Ticket imprimé sur Q2i ✅', 'success');
    try { document.dispatchEvent(new CustomEvent('q2i:status', { detail: { ok: Printer.connected, message: r.message } })); } catch (_) { /* ignore */ }
    return r.ok;
  };
})();
