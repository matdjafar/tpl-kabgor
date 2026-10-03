/* ==========================================================================
   Galeri Karya MPI — Application logic (v2 - Fixed Viewport & Live Showcase)
   Data source: window.MPI_DATA (js/data.js)
   ========================================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------- */
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const collator = new Intl.Collator('id', { sensitivity: 'base', numeric: true });

  const parseLink = (raw) => {
    const s = String(raw ?? '').trim();
    const md = s.match(/\]\((https?:\/\/[^)\s]+)\)/i);
    if (md) return md[1];
    const plain = s.match(/https?:\/\/[^\s\])]+/i);
    return plain ? plain[0] : '#';
  };

  const schoolCanonical = (name) => {
    let s = String(name).toUpperCase().replace(/[.,\-_]/g, ' ').replace(/\s+/g, ' ').trim();
    s = s.replace(/\bKABGOR\b/g, 'KABUPATEN GORONTALO').replace(/\bKAB\b/g, 'KABUPATEN').replace(/\bNEGERI\b/g, 'N').replace(/\bMTS\s+N\b/g, 'MTSN').replace(/^MTSS\b/, 'MTS').replace(/^MIS\b/, 'MI').replace(/^MAS\b/, 'MA');
    if (/GORONTALO$/.test(s) && !/(UTARA|KABUPATEN|KOTA)/.test(s)) s = s.replace(/GORONTALO$/, 'KABUPATEN GORONTALO');
    return s;
  };

  const jenjangOf = (canon) => (/^MTS/.test(canon) ? 'MTs' : /^MA/.test(canon) ? 'MA' : /^MI/.test(canon) ? 'MI' : 'Lainnya');
  const personKey = (name) => String(name).split(',')[0].toUpperCase().replace(/[^A-Z]/g, '');
  const initialsOf = (name) => {
    const words = String(name).split(',')[0].split(/\s+/).filter((w) => w && !w.includes('.') && w.length > 1);
    const pick = words.length > 1 ? [words[0], words[words.length - 1]] : words;
    return pick.map((w) => w[0]).join('').toUpperCase() || '?';
  };
  const prettyTitle = (t) => String(t).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

  /* ---------------------------------------------------------------------
   * Visual identity
   * ------------------------------------------------------------------- */
  const MAPEL_STYLE = {
    'Bahasa Indonesia': { hue: 4, icon: '📖' }, 'Pendidikan Pancasila': { hue: 340, icon: '🦅' }, 'SKI': { hue: 24, icon: '📜' },
    'Sejarah': { hue: 38, icon: '🏺' }, 'IPS Terpadu': { hue: 50, icon: '🌦️' }, 'IPS': { hue: 64, icon: '🌏' },
    'IPAS': { hue: 92, icon: '🌱' }, "Al-Qur'an Hadits": { hue: 128, icon: '📗' }, 'Fikih': { hue: 152, icon: '🤲' },
    'IPA': { hue: 172, icon: '🔬' }, 'Bahasa Arab': { hue: 186, icon: '🔤' }, 'Fisika': { hue: 198, icon: '📏' },
    'Bahasa Inggris': { hue: 212, icon: '🗣️' }, 'Matematika': { hue: 228, icon: '➗' }, 'Informatika': { hue: 245, icon: '💻' },
    'Guru Kelas': { hue: 262, icon: '🏫' }, 'Akidah Akhlak': { hue: 282, icon: '🌙' }, 'Seni Budaya': { hue: 302, icon: '🎵' },
    'Bimbingan Dan Konseling': { hue: 322, icon: '🤝' },
  };
  const hashHue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const mapelStyle = (m) => MAPEL_STYLE[m] || { hue: hashHue(m), icon: '✨' };

  const FASE_ORDER = ['Fase A', 'Fase B', 'Fase C', 'Fase D', 'Fase E', 'Fase F'];
  const FASE_HUE = { 'Fase A': 150, 'Fase B': 186, 'Fase C': 212, 'Fase D': 252, 'Fase E': 292, 'Fase F': 332 };
  const FASE_INFO = { 'Fase A': 'Kelas 1–2', 'Fase B': 'Kelas 3–4', 'Fase C': 'Kelas 5–6', 'Fase D': 'Kelas 7–9', 'Fase E': 'Kelas 10', 'Fase F': 'Kelas 11–12' };
  const faseIndex = (f) => { const i = FASE_ORDER.indexOf(f); return i === -1 ? 99 : i; };

  /* ---------------------------------------------------------------------
   * Data preparation
   * ------------------------------------------------------------------- */
  const OVERRIDE = window.MPI_KABUPATEN_OVERRIDE || {};
  const RAW = Array.isArray(window.MPI_DATA) ? window.MPI_DATA : [];

  const DATA = RAW.map((d, i) => {
    const canon = schoolCanonical(d.sekolah);
    const fase = String(d.fase || '').trim().replace(/^fase\s*/i, 'Fase ').replace(/\s+([a-f])$/i, (m, l) => ' ' + l.toUpperCase());
    const item = {
      id: i + 1, no: i + 1,
      nama: String(d.nama || '').trim(),
      mapel: String(d.mapel || 'Lainnya').trim(),
      judul: String(d.judul || '').trim(),
      judulTampil: prettyTitle(d.judul || 'Tanpa Judul'),
      sekolah: String(d.sekolah || '').trim(),
      fase, url: parseLink(d.link),
      schoolKey: canon.replace(/\s+/g, ''),
      jenjang: jenjangOf(canon),
      kab: OVERRIDE[d.sekolah] || (/UTARA/.test(canon) ? 'Gorontalo Utara' : 'Kab. Gorontalo'),
    };
    item.haystack = [item.nama, item.judul, item.judulTampil, item.sekolah].join(' ').toLowerCase();
    return item;
  });

  const countBy = (key) => DATA.reduce((m, d) => m.set(d[key], (m.get(d[key]) || 0) + 1), new Map());

  /* ---------------------------------------------------------------------
   * App State
   * ------------------------------------------------------------------- */
  const state = {
    view: 'home',
    theme: document.documentElement.getAttribute('data-theme') || 'dark',
    filter: { q: '', mapel: '', fase: '', jenjang: '', kab: '', sort: 'default' },
    page: 1,
    perPage: 12
  };
  let filtered = DATA.slice();

  /* ---------------------------------------------------------------------
   * Navigation / Views Management
   * ------------------------------------------------------------------- */
  const goView = (viewId) => {
    state.view = viewId;
    $$('.view').forEach(v => {
      const active = v.dataset.view === viewId;
      v.classList.toggle('is-active', active);
      v.setAttribute('aria-hidden', !active);
    });
    
    // Update Tabs
    $$('.tab').forEach(t => {
      const active = t.dataset.go === viewId;
      t.setAttribute('aria-selected', active);
    });
    // Update Bottom Nav
    $$('.bnav-item').forEach(b => {
      const active = b.dataset.go === viewId;
      b.setAttribute('aria-selected', active);
    });

    // Move Tabs indicator
    const activeTab = $(`.tab[data-go="${viewId}"]`);
    const indicator = $('.tabs-indicator');
    if (activeTab && indicator) {
      const tabRect = activeTab.getBoundingClientRect();
      const parentRect = activeTab.parentNode.getBoundingClientRect();
      indicator.style.width = `${tabRect.width}px`;
      indicator.style.transform = `translateX(${tabRect.left - parentRect.left}px)`;
    }

    if (viewId === 'home') setTimeout(splashOff, 300);
    if (viewId === 'gallery') renderGallery();
  };

  // Splash Screen
  const splashOff = () => {
    const s = $('#splash');
    if (s && !s.classList.contains('is-hidden')) s.classList.add('is-hidden');
  };
  
  // Theme Toggle
  const toggleTheme = () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('mpi-theme-v2', state.theme);
  };
  $('#themeToggle')?.addEventListener('click', toggleTheme);

  // Global nav bindings
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-go]');
    if (btn) goView(btn.dataset.go);
  });

  /* ---------------------------------------------------------------------
   * Home: Stats
   * ------------------------------------------------------------------- */
  const statsData = {
    karya: DATA.length,
    guru: new Set(DATA.map(d => personKey(d.nama))).size,
    madrasah: new Set(DATA.map(d => d.schoolKey)).size,
    fase: new Set(DATA.map(d => d.fase).filter(f => FASE_ORDER.includes(f))).size,
  };
  
  const countUp = (node, target, duration = 1400) => {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(target * eased).toLocaleString('id-ID');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ($('#statKarya')) {
    countUp($('#statKarya'), statsData.karya);
    countUp($('#statGuru'), statsData.guru);
    countUp($('#statMadrasah'), statsData.madrasah);
    countUp($('#statFase'), statsData.fase);
  }

  /* ---------------------------------------------------------------------
   * Home: Custom Visualization Showcase
   * ------------------------------------------------------------------- */
  const showcase = {
    entries: [],
    index: 0,
    timer: null,
    isPaused: false,
    layers: $$('.sc-layer'),
    activeLayer: 0
  };

  const initShowcase = () => {
    const pool = DATA.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    showcase.entries = pool.slice(0, 5);
    showcase.index = 0;
    renderShowcaseThumbs();
    playShowcase(0);
  };

  const renderShowcaseThumbs = () => {
    const c = $('#scThumbs');
    if (!c) return;
    c.innerHTML = showcase.entries.map((_, i) => `<div class="sc-thumb" data-si="${i}"></div>`).join('');
  };

  const getShowcaseCardHTML = (d) => {
    const st = mapelStyle(d.mapel);
    return `
      <div class="sc-card" style="--h:${st.hue}" data-preview="${d.id}">
        <div class="sc-bg"></div>
        <div class="sc-content">
          <div class="sc-badge-row">
            <span class="sc-badge mapel">${esc(d.mapel)}</span>
            <span class="sc-badge fase" style="--fh:${FASE_HUE[d.fase] ?? 200}">${esc(d.fase)}</span>
          </div>
          <div class="sc-center">
            <span class="sc-emoji" aria-hidden="true">${st.icon}</span>
            <h3 class="sc-title" title="${esc(d.judulTampil)}">${esc(d.judulTampil)}</h3>
            <p class="sc-author">${esc(d.nama)}</p>
            <p class="sc-school">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/></svg>
              ${esc(d.sekolah)}
            </p>
          </div>
          <div class="sc-footer">
            <span class="btn-primary" style="--h:${st.hue}">
              Buka Pratinjau
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </span>
          </div>
        </div>
      </div>
    `;
  };

  const updateShowcaseUI = () => {
    if (!showcase.entries.length) return;
    $('#scCounter').textContent = `${showcase.index + 1}/5`;
    
    // Update thumbs
    $$('.sc-thumb').forEach((t, i) => {
      t.classList.toggle('is-done', i < showcase.index);
      t.classList.toggle('is-active', i === showcase.index);
      if (i !== showcase.index) t.style.removeProperty('--p');
    });
  };

  const loadShowcaseCard = (d) => {
    const prevLayer = showcase.layers[showcase.activeLayer];
    showcase.activeLayer = showcase.activeLayer === 0 ? 1 : 0;
    const nextLayer = showcase.layers[showcase.activeLayer];
    
    if (nextLayer) {
      nextLayer.innerHTML = getShowcaseCardHTML(d);
      nextLayer.classList.add('is-active');
    }
    if (prevLayer) {
      prevLayer.classList.remove('is-active');
    }
  };

  const playShowcase = (index) => {
    if (index !== undefined) showcase.index = (index + 5) % 5;
    const d = showcase.entries[showcase.index];
    if (!d) return;
    
    updateShowcaseUI();
    loadShowcaseCard(d);
    startShowcaseTimer();
  };

  const startShowcaseTimer = () => {
    cancelAnimationFrame(showcase.timer);
    let start = performance.now();
    const duration = 6000;
    
    const tick = (now) => {
      if (showcase.isPaused) {
        start += (now - (showcase.lastNow || now));
      } else {
        const p = Math.min(1, (now - start) / duration);
        const thumb = $(`.sc-thumb[data-si="${showcase.index}"]`);
        if (thumb) thumb.style.setProperty('--p', `${p * 100}%`);
        
        if (p >= 1) {
          playShowcase(showcase.index + 1);
          return;
        }
      }
      showcase.lastNow = now;
      showcase.timer = requestAnimationFrame(tick);
    };
    showcase.timer = requestAnimationFrame(tick);
  };

  // Bind Showcase Controls
  if ($('#scPrev')) {
    $('#scPrev').addEventListener('click', () => playShowcase(showcase.index - 1));
    $('#scNext').addEventListener('click', () => playShowcase(showcase.index + 1));
    
    const panel = $('.showcase-panel');
    panel.addEventListener('mouseenter', () => { showcase.isPaused = true; });
    panel.addEventListener('mouseleave', () => { showcase.isPaused = false; });
    
    $('#scThumbs').addEventListener('click', (e) => {
      const t = e.target.closest('.sc-thumb');
      if (t) playShowcase(Number(t.dataset.si));
    });
  }


  /* ---------------------------------------------------------------------
   * Insights (Sebaran)
   * ------------------------------------------------------------------- */
  const renderInsights = () => {
    // Fase
    const faseCounts = countBy('fase');
    const fMax = Math.max(...FASE_ORDER.map((f) => faseCounts.get(f) || 0), 1);
    if (el.faseBars) {
      el.faseBars.innerHTML = FASE_ORDER.map((f) => {
        const n = faseCounts.get(f) || 0;
        return `
          <div class="bar-item" data-go="gallery" data-fase="${esc(f)}" style="--h:${FASE_HUE[f]}">
            <div class="bar-header">
              <div><span class="bar-title">${esc(f)}</span><span class="bar-sub">${FASE_INFO[f]}</span></div>
              <span class="bar-val">${n}</span>
            </div>
            <div class="bar-track"><span class="bar-fill" style="width:${(n/fMax)*100}%"></span></div>
          </div>`;
      }).join('');
    }

    // Mapel
    const mapelCounts = [...countBy('mapel').entries()].sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]));
    if (el.mapelChips) {
      el.mapelCount.textContent = mapelCounts.length;
      el.mapelChips.innerHTML = mapelCounts.map(([m, n]) => {
        const st = mapelStyle(m);
        return `<div class="chip" data-go="gallery" data-mapel="${esc(m)}" style="--h:${st.hue}">
          <span class="chip-dot"></span><span class="truncate max-w-[120px]">${esc(m)}</span><span class="chip-cnt">${n}</span>
        </div>`;
      }).join('');
    }
    
    // Jenjang Donut
    const jenjangCounts = countBy('jenjang');
    const jData = [
      { k: 'MI', v: jenjangCounts.get('MI') || 0, c: '#10b981' },
      { k: 'MTs', v: jenjangCounts.get('MTs') || 0, c: '#3b82f6' },
      { k: 'MA', v: jenjangCounts.get('MA') || 0, c: '#8b5cf6' }
    ].filter(x => x.v > 0);
    const jTotal = jData.reduce((s, x) => s + x.v, 0);
    
    if ($('#jenjangDonut')) {
      $('#donutTotal').textContent = jTotal;
      let offset = 0;
      $('#jenjangDonut').innerHTML = jData.map(d => {
        const p = d.v / jTotal;
        const dash = `${p * 100} 100`;
        const html = `<circle class="donut-seg" cx="60" cy="60" r="50" stroke="${d.c}" stroke-dasharray="${dash}" stroke-dashoffset="${-offset * 100}" data-go="gallery" data-jenjang="${d.k}"><title>${d.k}: ${d.v}</title></circle>`;
        offset += p;
        return html;
      }).join('');
      
      $('#jenjangLegend').innerHTML = jData.map(d => `
        <li class="l-item" data-go="gallery" data-jenjang="${d.k}" style="--bgc:${d.c}">
          <span class="l-dot"></span><span class="flex-1">${d.k}</span><span class="font-bold text-fg">${d.v}</span>
        </li>
      `).join('');
    }

    // Kab
    const kabCounts = countBy('kab');
    const kMax = Math.max(...kabCounts.values(), 1);
    if ($('#kabPanel')) {
      $('#kabPanel').innerHTML = [...kabCounts.entries()].map(([k, v]) => `
        <div class="bar-item" data-go="gallery" data-kab="${esc(k)}" style="--h:190">
          <div class="bar-header">
            <div><span class="bar-title">${esc(k)}</span></div>
            <span class="bar-val">${v}</span>
          </div>
          <div class="bar-track"><span class="bar-fill" style="width:${(v/kMax)*100}%"></span></div>
        </div>
      `).join('');
    }
  };

  // Intercept clicks on insight to filter gallery
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-go="gallery"]');
    if (el) {
      if (el.dataset.fase) state.filter.fase = el.dataset.fase;
      if (el.dataset.mapel) state.filter.mapel = el.dataset.mapel;
      if (el.dataset.jenjang) state.filter.jenjang = el.dataset.jenjang;
      if (el.dataset.kab) state.filter.kab = el.dataset.kab;
      if (el.dataset.fase || el.dataset.mapel || el.dataset.jenjang || el.dataset.kab) {
        syncFilterUI();
      }
    }
  });


  /* ---------------------------------------------------------------------
   * Gallery & Filters
   * ------------------------------------------------------------------- */
  const el = {
    grid: $('#cardGrid'),
    empty: $('#emptyState'),
    search: $('#searchInput'),
    searchClear: $('#searchClear'),
    sort: $('#sortSelect'),
    reset: $('#resetBtn'),
    emptyReset: $('#emptyReset'),
    result: $('#resultCount'),
    range: $('#rangeText'),
    active: $('#activeFilters'),
    pager: $('#pager'),
    selects: {
      mapel: $('#filterMapel'),
      fase: $('#filterFase'),
      jenjang: $('#filterJenjang'),
      kab: $('#filterKab'),
    },
    faseBars: $('#faseBars'),
    mapelChips: $('#mapelChips'),
    mapelCount: $('#mapelCount')
  };

  const populateSelects = () => {
    if (!el.selects.mapel) return;
    const build = (select, label, entries) => {
      select.innerHTML = `<option value="">${label}</option>` +
        entries.map(([v, n]) => `<option value="${esc(v)}">${esc(v)} (${n})</option>`).join('');
    };
    const m = countBy('mapel'), f = countBy('fase'), j = countBy('jenjang'), k = countBy('kab');
    build(el.selects.mapel, 'Semua Mapel', [...m.entries()].sort((a, b) => collator.compare(a[0], b[0])));
    build(el.selects.fase, 'Semua Fase', [...f.entries()].sort((a, b) => faseIndex(a[0]) - faseIndex(b[0])));
    build(el.selects.jenjang, 'Semua Jenjang', ['MI', 'MTs', 'MA', 'Lainnya'].filter((x) => j.has(x)).map((x) => [x, j.get(x)]));
    build(el.selects.kab, 'Semua Kabupaten', ['Kab. Gorontalo', 'Gorontalo Utara'].filter((x) => k.has(x)).map((x) => [x, k.get(x)]));
  };

  const tokens = () => state.filter.q.toLowerCase().split(/\s+/).filter(Boolean);

  const applyFilters = () => {
    const tks = tokens();
    const f = state.filter;
    filtered = DATA.filter((d) =>
      (!f.mapel || d.mapel === f.mapel) &&
      (!f.fase || d.fase === f.fase) &&
      (!f.jenjang || d.jenjang === f.jenjang) &&
      (!f.kab || d.kab === f.kab) &&
      tks.every((t) => d.haystack.includes(t))
    );
    const sorters = {
      judul: (a, b) => collator.compare(a.judulTampil, b.judulTampil),
      nama: (a, b) => collator.compare(a.nama, b.nama),
      sekolah: (a, b) => collator.compare(a.sekolah, b.sekolah) || collator.compare(a.nama, b.nama),
      fase: (a, b) => faseIndex(a.fase) - faseIndex(b.fase) || collator.compare(a.mapel, b.mapel),
    };
    if (sorters[f.sort]) filtered.sort(sorters[f.sort]);
  };

  const hl = (text) => {
    const tks = tokens();
    if (!tks.length) return esc(text);
    const re = new RegExp(`(${tks.map(escapeRegex).join('|')})`, 'gi');
    return String(text).split(re).map((part, i) => (i % 2 ? `<mark class="hl">${esc(part)}</mark>` : esc(part))).join('');
  };

  const cardHTML = (d, i) => {
    const st = mapelStyle(d.mapel);
    const delay = Math.min((i % state.perPage) * 40, 560);
    return `
      <article class="mpi-card anim" style="--h:${st.hue};--i:${(i%state.perPage)}" data-id="${d.id}">
        <div class="mpi-inner">
          <div class="m-thumb">
            <div class="m-pat"></div>
            <span class="m-emoji" aria-hidden="true">${st.icon}</span>
            <span class="m-num">MPI #${String(d.no).padStart(2, '0')}</span>
            <span class="badge-mapel">${esc(d.mapel)}</span>
            <span class="badge-fase" style="--fh:${FASE_HUE[d.fase] ?? 200}">${esc(d.fase)}</span>
          </div>
          <div class="m-body">
            <h3 class="m-title" title="${esc(d.judulTampil)}">${hl(d.judulTampil)}</h3>
            <div class="m-meta">
              <span class="avatar" aria-hidden="true">${esc(initialsOf(d.nama))}</span>
              <div class="m-meta-text min-w-0"><p>Penyusun</p><p class="truncate" title="${esc(d.nama)}">${hl(d.nama)}</p></div>
            </div>
            <div class="m-meta">
              <span class="icon-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/></svg></span>
              <div class="m-meta-text min-w-0"><p>Madrasah</p><p class="truncate" title="${esc(d.sekolah)}">${hl(d.sekolah)}</p></div>
            </div>
            <div class="m-tags">
              <span class="m-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/></svg>${esc(d.jenjang)}</span>
              <span class="m-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${esc(d.kab)}</span>
            </div>
            <div class="m-actions">
              <button type="button" class="btn-ghost" data-preview="${d.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                Pratinjau
              </button>
              <a class="btn-primary" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" style="--h:${st.hue}">
                Buka
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
              </a>
            </div>
          </div>
        </div>
      </article>`;
  };

  const renderActiveFilters = () => {
    if (!el.active) return;
    const f = state.filter;
    const FILTER_LABEL = { mapel: 'Mapel', fase: 'Fase', jenjang: 'Jenjang', kab: 'Kab.' };
    const items = [];
    if (f.q.trim()) items.push(['q', `“${f.q.trim()}”`]);
    Object.keys(FILTER_LABEL).forEach((k) => { if (f[k]) items.push([k, `${FILTER_LABEL[k]}: ${f[k]}`]); });
    
    el.active.classList.toggle('hidden', !items.length);
    el.active.innerHTML = items.length ? '<span class="text-xs font-medium text-slate-500">Filter aktif:</span>' + items.map(([k, label]) =>
      `<span class="active-chip">${esc(label)}<button type="button" data-clear="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></span>`
    ).join('') : '';

    const count = Object.values(f).filter(v => v && v !== 'default' && v !== '').length - (f.q ? 1 : 0);
    const badge = $('#filterBadge');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  };

  const renderGallery = () => {
    if (!el.grid) return;
    applyFilters();
    
    const totalPages = Math.ceil(filtered.length / state.perPage);
    if (state.page > totalPages) state.page = Math.max(1, totalPages);
    
    const start = (state.page - 1) * state.perPage;
    const paged = filtered.slice(start, start + state.perPage);
    
    el.grid.innerHTML = paged.map((d, i) => cardHTML(d, i)).join('');
    
    el.result.textContent = filtered.length;
    el.range.textContent = filtered.length ? `${start + 1}-${Math.min(start + state.perPage, filtered.length)}` : '0';
    
    const none = filtered.length === 0;
    el.empty.classList.toggle('hidden', !none);
    el.grid.classList.toggle('hidden', none);

    renderPager(totalPages);
    renderActiveFilters();

    // Scroll to top of grid
    $('#gridViewport').scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPager = (total) => {
    if (!el.pager) return;
    let html = `<button class="pg-btn" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>&lsaquo;</button>`;
    
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= state.page - 1 && i <= state.page + 1)) {
        html += `<button class="pg-btn" data-page="${i}" ${i === state.page ? 'aria-current="page"' : ''}>${i}</button>`;
      } else if (i === state.page - 2 || i === state.page + 2) {
        html += `<span class="pg-btn" disabled>...</span>`;
      }
    }
    
    html += `<button class="pg-btn" data-page="${state.page + 1}" ${state.page === total || total === 0 ? 'disabled' : ''}>&rsaquo;</button>`;
    el.pager.innerHTML = html;
  };

  const syncFilterUI = () => {
    if (!el.search) return;
    const f = state.filter;
    el.search.value = f.q;
    Object.entries(el.selects).forEach(([k, s]) => { if (s) s.value = f[k]; });
    if (el.sort) el.sort.value = f.sort;
    el.searchClear.classList.toggle('hidden', !f.q);
    state.page = 1;
    renderGallery();
  };

  const resetFilters = () => {
    state.filter = { q: '', mapel: '', fase: '', jenjang: '', kab: '', sort: 'default' };
    syncFilterUI();
  };

  if (el.search) {
    const onSearch = debounce(() => { state.filter.q = el.search.value; state.page = 1; renderGallery(); }, 200);
    el.search.addEventListener('input', () => {
      el.searchClear.classList.toggle('hidden', !el.search.value);
      onSearch();
    });
    el.searchClear.addEventListener('click', () => { el.search.value = ''; state.filter.q = ''; state.page = 1; renderGallery(); el.search.focus(); });
    
    Object.entries(el.selects).forEach(([k, s]) => s?.addEventListener('change', () => { state.filter[k] = s.value; state.page = 1; renderGallery(); }));
    el.sort?.addEventListener('change', () => { state.filter.sort = el.sort.value; state.page = 1; renderGallery(); });
    el.reset?.addEventListener('click', resetFilters);
    el.emptyReset?.addEventListener('click', resetFilters);
    
    el.active?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-clear]');
      if (!btn) return;
      const k = btn.dataset.clear;
      if (k === 'q') el.search.value = '';
      state.filter[k] = '';
      syncFilterUI();
    });
    
    el.pager?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (btn && btn.dataset.page) {
        state.page = Number(btn.dataset.page);
        renderGallery();
      }
    });

    $('#filterToggle')?.addEventListener('click', () => {
      $('#filterPanel')?.classList.toggle('is-open');
    });
  }

  /* ---------------------------------------------------------------------
   * Preview modal
   * ------------------------------------------------------------------- */
  const modal = {
    root: $('#previewModal'),
    panel: $('#modalPanel'),
    title: $('#modalTitle'),
    meta: $('#modalMeta'),
    badges: $('#modalBadges'),
    frame: $('#previewFrame'),
    wrap: $('#frameWrap'),
    loader: $('#frameLoader'),
    slow: $('#frameSlowHint'),
    open: $('#modalOpen'),
    prev: $('#modalPrev'),
    next: $('#modalNext'),
    pos: $('#modalPos'),
    url: $('#modalUrl'),
    reload: $('#modalReload'),
    fullscreen: $('#modalFullscreen'),
    list: [],
    index: -1,
    slowTimer: null,
  };

  const loadFrame = (url) => {
    modal.loader.classList.remove('is-hidden');
    clearTimeout(modal.slowTimer);
    modal.frame.setAttribute('src', url);
  };

  const showItem = (index) => {
    const d = modal.list[index];
    if (!d) return;
    modal.index = index;
    const st = mapelStyle(d.mapel);
    modal.panel.style.setProperty('--h', st.hue);
    modal.open.style.setProperty('--h', st.hue);
    modal.badges.innerHTML =
      `<span class="badge-mapel !static !transform-none !shadow-none !px-2" style="--h:${st.hue}">${st.icon} ${esc(d.mapel)}</span>` +
      `<span class="badge-fase !static !transform-none" style="--fh:${FASE_HUE[d.fase] ?? 200}">${esc(d.fase)}</span>` +
      `<span class="m-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/></svg>${esc(d.jenjang)}</span>`;
    modal.title.textContent = d.judulTampil;
    modal.title.title = d.judulTampil;
    modal.meta.textContent = `${d.nama} — ${d.sekolah}`;
    modal.open.href = d.url;
    modal.pos.textContent = `${index + 1} / ${modal.list.length}`;
    modal.prev.disabled = index <= 0;
    modal.next.disabled = index >= modal.list.length - 1;
    loadFrame(d.url);
  };

  const openModal = (id) => {
    modal.list = filtered.length ? filtered.slice() : DATA.slice();
    let idx = modal.list.findIndex((d) => d.id === id);
    if (idx === -1) { modal.list = DATA.slice(); idx = modal.list.findIndex((d) => d.id === id); }
    modal.root.classList.add('is-open');
    modal.root.setAttribute('aria-hidden', 'false');
    showItem(idx);
  };

  const closeModal = () => {
    if (!modal.root.classList.contains('is-open')) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    modal.root.classList.remove('is-open');
    modal.root.setAttribute('aria-hidden', 'true');
    clearTimeout(modal.slowTimer);
    setTimeout(() => { modal.frame.src = 'about:blank'; }, 250);
  };

  if (modal.frame) {
    modal.frame.addEventListener('load', () => {
      const src = modal.frame.getAttribute('src');
      if (src && src !== 'about:blank' && modal.root.classList.contains('is-open')) {
        clearTimeout(modal.slowTimer);
        modal.loader.classList.add('is-hidden');
      }
    });

    $$('[data-close]', modal.root).forEach((n) => n.addEventListener('click', closeModal));
    modal.prev.addEventListener('click', () => showItem(modal.index - 1));
    modal.next.addEventListener('click', () => showItem(modal.index + 1));
    $$('button[data-device]', modal.root).forEach((b) => b.addEventListener('click', () => {
      modal.wrap.dataset.device = b.dataset.device;
      $$('button[data-device]', modal.root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));

    // Trigger modal from grid and showcase
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-preview]');
      if (b) openModal(Number(b.dataset.preview));
    });
  }

  // Keyboard
  document.addEventListener('keydown', (e) => {
    const isOpen = modal.root.classList.contains('is-open');
    if (isOpen) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      else if (e.key === 'ArrowLeft' && !modal.prev.disabled) showItem(modal.index - 1);
      else if (e.key === 'ArrowRight' && !modal.next.disabled) showItem(modal.index + 1);
      return;
    }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (e.key === '/' && !typing && el.search) { e.preventDefault(); el.search.focus(); el.search.select(); }
  });


  /* ---------------------------------------------------------------------
   * Init
   * ------------------------------------------------------------------- */
  populateSelects();
  renderInsights();
  initShowcase();
  goView('home');

})();
