/* JADSTACK LOTTO — V87 Push notifications natifs (Android)
 * Bridge: window.AndroidPush (Android WebView -> AndroidPush.java)
 * API piblik: window.Lotri.push.arm(profile), .onNativeToken(token),
 *             .onForegroundPush(title, body, link)
 *
 * Sekirite: menm jan ak bluetooth-printer.js — pa janm kraze paj la;
 * si bridge natif la pa la (ex. moun k ap itilize navigatè web), tout
 * fonksyon yo tonbe san danje.
 */
(function () {
  'use strict';

  window.Lotri = window.Lotri || {};
  if (window.Lotri.push && window.Lotri.push.__jadstack) return;

  const SB = () => window.Lotri.supabase;

  /* Rakousi pa defo selon wòl la — kle yo koresponn ak vi ki deja
     anrejistre nan LotriShell.register(...) pou chak paj wòl. */
  const QUICK_ACTIONS_BY_ROLE = {
    agent: [
      { label: 'Vann tikè', view: 'pos' },
      { label: 'Tikè yo', view: 'tickets' },
      { label: 'Mesaj', view: 'messages' },
    ],
    supervisor: [
      { label: 'Tikè yo', view: 'tickets' },
      { label: 'Rapò', view: 'reports' },
      { label: 'Mesaj', view: 'messages' },
    ],
    company: [
      { label: 'Faktirasyon', view: 'billing-check' },
      { label: 'Rapò', view: 'reports' },
      { label: 'Mesaj', view: 'messages' },
    ],
    employer: [
      { label: 'Konpayi', view: 'employer-list' },
      { label: 'Sirveyans', view: 'employer-surveillance' },
      { label: 'Mesaj', view: 'messages' },
    ],
    super_admin: [
      { label: 'Dashboard', view: 'dashboard' },
      { label: 'Konpayi', view: 'companies' },
      { label: 'Mesaj', view: 'messages' },
    ],
  };

  function bridge() {
    try {
      return (typeof window !== 'undefined' && window.AndroidPush) ? window.AndroidPush : null;
    } catch (_) { return null; }
  }

  async function registerToken(token) {
    if (!token || !SB()) return;
    try { await SB().rpc('jl43_rpc_register_device_token', { _token: token, _platform: 'android' }); }
    catch (_) { /* pa kritik — n ap eseye ankò pwochen chajman paj */ }
  }

  const P = (window.Lotri.push = { __jadstack: true });

  /* Rele DIRÈKTEMAN pa Kotlin (FcmService.onNewToken) lè app la deja louvri. */
  P.onNativeToken = function (token) { registerToken(token); };

  /* Rele pa Kotlin (FcmService.onMessageReceived) lè yon push rive
     PANDAN app la nan premye plan — n ap sèlman fè yon toast, paske
     sistèm notifikasyon Supabase a (jl43) ap deja rafrechi klòch la. */
  P.onForegroundPush = function (title, body, link) {
    if (window.Lotri.toast) window.Lotri.toast(title || body || 'Nouvo notifikasyon', 'info');
    if (window.Lotri.notifications && window.Lotri.notifications.refresh) window.Lotri.notifications.refresh();
  };

  P.arm = function (profile) {
    const b = bridge();
    if (!b) return; // navigatè web nòmal — pa gen push natif

    // 1) Anrejistre tokèn FCM annatant si genyen (kreye lè app te fèmen).
    try {
      const pending = b.getPendingToken && b.getPendingToken();
      if (pending) registerToken(pending);
    } catch (_) {}

    // 2) Kòmanse notifikasyon "aksyon rapid" pèsistan selon wòl la.
    try {
      const role = String((profile && profile.role) || '').toLowerCase();
      const actions = QUICK_ACTIONS_BY_ROLE[role];
      if (actions && b.startQuickActions) {
        b.startQuickActions('JADSTACK LOTTO', JSON.stringify(actions));
      }
    } catch (_) {}
  };
})();
