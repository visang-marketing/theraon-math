/* 더 라온수학 홈페이지 동작 — 7차 2026-11-15 (페이지 나누기: 메인·소개·수업·학교·상담·공부자료 공용) (매쓰플랫 동작: 슬라이더·카드 뒤집기·숫자 굴림·스크롤 연동)
   외부 라이브러리·서버 없음. 정기 비용 0원 구조.
   상담 전송은 sendConsult() 하나만 바꾸면 된다. (아래 TODO) */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 설정 (원장·인수자가 채우는 칸) ---------- */
  var CONFIG = {
    kakaoChannelUrl: '',   // TODO: 카카오톡 채널 URL (예: https://pf.kakao.com/_xxxxx)
    consultEndpoint: '',   // TODO: 상담 전송 주소. 무료 선택지는 README.md 참고
    phone: ''              // TODO: 대표 전화 (예: 051-000-0000). 비어 있으면 전화 버튼을 숨긴다
  };

  /* ---------- 추적: 4개 이벤트를 한 함수로 ---------- */
  var utm = (function () {
    var q = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
      if (q.get(k)) o[k] = q.get(k);
    });
    try { if (Object.keys(o).length) sessionStorage.setItem('utm', JSON.stringify(o)); else o = JSON.parse(sessionStorage.getItem('utm') || '{}'); } catch (e) {}
    return o;
  })();

  function track(name, extra) {
    var payload = Object.assign({ event: name, page: location.pathname }, utm, extra || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    if (typeof window.gtag === 'function') window.gtag('event', name, payload);
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') console.log('[track]', payload);
  }
  document.querySelectorAll('[data-track]').forEach(function (el) {
    el.addEventListener('click', function () { track(el.getAttribute('data-track')); });
  });

  /* ---------- 카카오 채널 링크 ---------- */
  ['kakao', 'kakao2', 'kakao3', 'kakao4', 'kakao5'].forEach(function (id) {
    var a = document.getElementById(id);
    if (!a) return;
    if (CONFIG.kakaoChannelUrl) { a.href = CONFIG.kakaoChannelUrl; a.target = '_blank'; a.rel = 'noopener'; }
    else { a.hidden = true; var dd = a.closest('dd'); if (dd) dd.hidden = true; }
  });
  document.querySelectorAll('a[href^="tel:"]').forEach(function (t) {
    if (CONFIG.phone) { t.href = 'tel:' + CONFIG.phone.replace(/\D/g, ''); if (t.classList.contains('footer__tel')) t.textContent = CONFIG.phone; }
    else { t.hidden = true; if (t.classList.contains('footer__tel')) t.insertAdjacentText('beforebegin', '확인 후 기재 '); }
  });

  /* ---------- 휴대폰 메뉴 열기·닫기 ---------- */
  var menuBtn = document.querySelector('.menu-btn'), navEl = document.getElementById('nav'), gnb = document.getElementById('gnb');
  function setMenu(o) { navEl.classList.toggle('is-open', o); menuBtn.setAttribute('aria-expanded', String(o)); menuBtn.setAttribute('aria-label', o ? '메뉴 닫기' : '메뉴 열기'); }
  if (menuBtn && navEl) {
    var openY = 0;
    addEventListener('scroll', function () { if (navEl.classList.contains('is-open') && Math.abs(scrollY - openY) > 80) setMenu(false); }, { passive: true });
    menuBtn.addEventListener('click', function () { var o = !navEl.classList.contains('is-open'); openY = scrollY; setMenu(o); if (o && gnb) { var f = gnb.querySelector('a'); if (f) f.focus(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && navEl.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });
    document.addEventListener('click', function (e) { if (navEl.classList.contains('is-open') && !e.target.closest('#nav')) setMenu(false); });
    if (gnb) gnb.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    navEl.addEventListener('focusout', function (e) { if (navEl.classList.contains('is-open') && e.relatedTarget && !navEl.contains(e.relatedTarget)) setMenu(false); });
  }

  /* ---------- 첫 화면: 제목이 올라온 뒤 형광펜 1회 ---------- */
  var hl = document.getElementById('hl'), heroDraw = document.querySelectorAll('.m-intro .draw');
  var heroSheet = document.querySelector('.sheet--hero'), t0 = Date.now();
  function fontsOk() { document.documentElement.classList.add('fonts-ok'); }
  function drawHero() { if (heroSheet) heroSheet.classList.add('is-on'); heroDraw.forEach(function (d) { d.classList.add('is-drawn'); }); }
  function startHero() {
    fontsOk();
    if (hl) setTimeout(function () { hl.classList.add('on'); }, 500);
    var work = document.querySelector('.sheet__work');
    if (work && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { o.disconnect(); setTimeout(drawHero, Math.max(0, 1100 - (Date.now() - t0))); } }, { threshold: 1, rootMargin: '0px 0px -8% 0px' }).observe(work);
    } else setTimeout(drawHero, 1100);
  }
  if (reduce) { fontsOk(); if (hl) hl.classList.add('on'); drawHero(); }
  else if (document.fonts && document.fonts.load) Promise.race([document.fonts.load('1em "Nanum Pen Script"'), new Promise(function (r) { setTimeout(r, 3000); })]).then(startHero, startHero);
  else startHero();

  /* ---------- 상단 바: 스크롤하면 아래 선 ---------- */
  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll(); addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- 휴대폰 하단 바: 첫 화면 지나면 표시, 상담 섹션에서는 숨김 ---------- */
  var bar = document.getElementById('bottombar'), hero = document.querySelector('.m-intro');
  var contact = document.getElementById('contact'), heroSeen = !hero, contactSeen = false;
  function barState() { bar.classList.toggle('show', heroSeen && !contactSeen); }
  if (bar && 'IntersectionObserver' in window) {
    if (hero) new IntersectionObserver(function (e) { heroSeen = !e[0].isIntersecting; barState(); }, { threshold: 0.05 }).observe(hero);
    barState();
    if (contact) new IntersectionObserver(function (e) { contactSeen = e[0].isIntersecting; barState(); }, { threshold: 0 }).observe(contact);
  } else if (bar) { bar.classList.add('show'); }

  var topBtn = document.querySelector('.quick__btn--top');
  if (topBtn) { var tb = function () { topBtn.hidden = scrollY < 600; }; tb(); addEventListener('scroll', tb, { passive: true }); topBtn.addEventListener('click', function (e) { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }); }

  /* ---------- 등장(아래에서 위로) + 빨간 펜 동그라미 그리기 ---------- */
  function onceInView(nodes, cls, margin) {
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window) || reduce) { nodes.forEach(function (el) { el.classList.add(cls); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add(cls); io.unobserve(en.target); } });
    }, { rootMargin: margin, threshold: 0.05 });
    nodes.forEach(function (el) { io.observe(el); });
    setTimeout(function () { nodes.forEach(function (el) { el.classList.add(cls); }); }, 8000); // 안전장치
  }
  onceInView(Array.prototype.slice.call(document.querySelectorAll('[data-up]')), 'is-in', '0px 0px -10% 0px');
  onceInView(Array.prototype.slice.call(document.querySelectorAll('.draw, .chart')).filter(function (d) { return !d.closest('.m-intro'); }), 'is-drawn', '0px 0px -15% 0px');

  /* ---------- 슬라이더: 버튼 · 진행 막대 · 마우스 끌기 ---------- */
  document.querySelectorAll('[data-slider]').forEach(function (sl) {
    var track = sl.querySelector('.slider__track'), fill = sl.querySelector('.slider__fill');
    var prev = sl.querySelector('[data-prev]'), next = sl.querySelector('[data-next]');
    function step() { var c = track.children[0]; return c ? c.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 20) : 300; }
    function update() {
      var max = track.scrollWidth - track.clientWidth, x = track.scrollLeft;
      var vis = track.clientWidth / track.scrollWidth;
      fill.style.width = (vis * 100) + '%';
      fill.style.left = (max > 0 ? (x / max) * (100 - vis * 100) : 0) + '%';
      prev.disabled = x < 4; next.disabled = x > max - 4;
    }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }); });
    track.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
    // 마우스로 끌어서 넘기기 (터치는 기본 스크롤)
    var down = false, sx = 0, sl0 = 0, moved = false;
    track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl0 = track.scrollLeft; });
    addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; track.classList.add('is-drag'); } track.scrollLeft = sl0 - dx; });
    addEventListener('pointerup', function () {
      if (!down) return; down = false;
      if (moved) { var s = step(); track.classList.remove('is-drag'); track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: 'smooth' }); }
    });
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });

  /* ---------- 수업 카드: 터치 기기는 눌러서 뒤집기 ---------- */
  var canHover = window.matchMedia('(hover: hover)').matches;
  document.querySelectorAll('.sol-card').forEach(function (c) {
    c.addEventListener('click', function (e) {
      if (canHover || e.target.closest('a')) return;
      c.classList.toggle('is-flip');
    });
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.classList.toggle('is-flip'); } });
  });

  /* ---------- 데이터 띠: 숫자가 굴러 올라감 (매쓰플랫 main-data) ---------- */
  var nums = document.querySelectorAll('.num[data-count]');
  if (nums.length && !reduce && 'IntersectionObserver' in window) {
    nums = Array.prototype.filter.call(nums, function (n) { return +n.getAttribute('data-count') >= 2; });
    nums.forEach(function (n) {
      var target = n.getAttribute('data-count'), unit = n.querySelector('.unit');
      var reel = document.createElement('span'); reel.className = 'reel'; reel.setAttribute('aria-hidden', 'true');
      var strip = document.createElement('span');
      for (var i = 0; i <= 9; i++) { var d = document.createElement('span'); d.textContent = i; strip.appendChild(d); }
      reel.appendChild(strip);
      n.setAttribute('aria-label', target + (unit ? unit.textContent : ''));
      n.textContent = ''; n.appendChild(reel); if (unit) n.appendChild(unit);
      n._go = function () { strip.style.transform = 'translateY(-' + (parseInt(target, 10) * 10) + '%)'; };
    });
    var dio = new IntersectionObserver(function (es) {
      es.forEach(function (en, i) { if (en.isIntersecting) { setTimeout(en.target._go, i * 150); dio.unobserve(en.target); } });
    }, { threshold: 1, rootMargin: '0px 0px -12% 0px' });
    nums.forEach(function (n) { dio.observe(n); });
  }

  /* ---------- 스크롤 연동: CTA 카드 펼침 · 밑줄, 에필로그 사진 확장 ---------- */
  var fan = document.querySelector('.fan'), cta = document.querySelector('.m-cta');
  var epi = document.querySelector('.m-epilogue');
  var ctaTitle = document.querySelector('.cta-title'), ctaLine = document.querySelector('.cta-line');
  function fill(q) { var f = [clamp(q / 0.25), clamp((q - 0.25) / 0.35), clamp((q - 0.6) / 0.4)]; f.forEach(function (v, i) { ctaTitle.style.setProperty('--f' + (i + 1), (v * 100).toFixed(1) + '%'); }); }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function scrub() {
    var vh = innerHeight;
    if (cta && fan) { var r = cta.getBoundingClientRect(); var p = clamp((vh - r.top) / (vh * 0.75)); fan.style.setProperty('--p', p.toFixed(3)); if (ctaLine) ctaLine.style.setProperty('--p', clamp(p * 1.2 - 0.2).toFixed(3)); }
    if (ctaTitle) { var t = ctaTitle.getBoundingClientRect(); fill(clamp((vh * 0.85 - t.top) / (vh * 0.5))); }
    if (epi) { var r2 = epi.getBoundingClientRect(); epi.style.setProperty('--p', clamp((vh - r2.top - 200) / (vh * 0.8)).toFixed(3)); }
  }
  if (reduce) { if (fan) fan.style.setProperty('--p', 1); if (ctaLine) ctaLine.style.setProperty('--p', 1); if (epi) epi.style.setProperty('--p', 1); if (ctaTitle) fill(1); }
  else { var ticking = false; addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { scrub(); ticking = false; }); } }, { passive: true }); addEventListener('resize', scrub); scrub(); }

  /* ---------- 카드 그림 모션그래픽: 보일 때 재생 → 9초 뒤 한 번 더(최대 2번), 화면 밖이면 멈춤 ---------- */
  var mgs = document.querySelectorAll('[data-mg]');
  if (mgs.length && !reduce && 'IntersectionObserver' in window) {
    var mgRun = function (el, fade) {
      if (fade && el.classList.contains('is-run')) {
        el.classList.add('is-out');
        clearTimeout(el._fo);
        el._fo = setTimeout(function () { el.classList.remove('is-run', 'is-out'); el.classList.add('mg-again'); void el.getBoundingClientRect(); el.classList.add('is-run'); }, 400);
        return;
      }
      el.classList.remove('is-run'); void el.getBoundingClientRect(); el.classList.add('is-run');
    };
    var mgPlay = function (el) {
      clearTimeout(el._mg); el._plays = 0;
      var go = function () { if (document.hidden) { el._mg = setTimeout(go, 1000); return; } mgRun(el, el._plays > 0 || el.classList.contains('is-run')); el._plays++; if (el._plays < 2) el._mg = setTimeout(go, 9000); };
      go();
    };
    var mio = new IntersectionObserver(function (es) {
      var k = 0;
      es.forEach(function (en) {
        var el = en.target, r = en.boundingClientRect, ir = en.intersectionRect;
        var on = en.isIntersecting && r.height && r.width && ir.height / r.height >= 0.6 && ir.width / r.width >= 0.3;
        if (on === el._on) return; el._on = on;
        if (on) { clearTimeout(el._mg); el._mg = setTimeout(function () { mgPlay(el); }, (k++) * 700); }
        else { clearTimeout(el._mg); clearTimeout(el._fo); el.classList.remove('is-out'); }
      });
    }, { threshold: [0, 0.3, 0.6, 1] });
    mgs.forEach(function (el) { el.classList.add('mg-ready'); mio.observe(el); });
    // 고민 카드에 마우스를 올리면 흐려진 뒤 처음부터 (반복 타이머도 다시 맞춤)
    document.querySelectorAll('.bank-card').forEach(function (card) {
      var m = card.querySelector('[data-mg]'); if (!m) return;
      card.addEventListener('mouseenter', function () {
        var tr = m.closest('.slider__track');
        if (!matchMedia('(hover: hover)').matches || m.classList.contains('is-out') || (tr && tr.classList.contains('is-drag')) || Date.now() - (m._last || 0) < 4000) return;
        m._last = Date.now(); clearTimeout(m._mg); mgRun(m, true);
      });
    });
  }

  /* ---------- 학부모 고민 말풍선: 누르면 원장 답 (하나만 열림) ---------- */
  var qbs = document.querySelectorAll('.qb');
  function closeQb() { qbs.forEach(function (o) { o.classList.remove('is-open'); var bt = o.querySelector('.qb__btn'); if (bt) bt.setAttribute('aria-expanded', 'false'); }); }
  qbs.forEach(function (q) {
    var bt = q.querySelector('.qb__btn'); if (!bt) return;
    bt.addEventListener('click', function () {
      var open = !q.classList.contains('is-open'); closeQb();
      if (open) {
        q.classList.add('is-open'); bt.setAttribute('aria-expanded', 'true'); track('ask_open', { q: q.querySelector('.qb__q').textContent });
        var an = q.querySelector('.qb__a'); if (an && an.scrollIntoView && innerWidth <= 768) setTimeout(function () { an.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); }, 120);
      }
    });
  });
  document.addEventListener('click', function (ev) { if (!ev.target.closest('.qb')) closeQb(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeQb(); });

  /* ---------- 상담 폼 ---------- */
  var form = document.getElementById('form');
  if (!form) return;

  function field(el) { return el.closest('.field'); }
  function mark(id, bad) {
    var err = document.getElementById(id); if (!err) return;
    var f = field(err); f.classList.toggle('invalid', bad);
    f.querySelectorAll('input').forEach(function (i) { i.setAttribute('aria-invalid', String(bad)); });
  }
  var msg = document.getElementById('form-msg');
  var qs = new URLSearchParams(location.search).get('school');
  if (qs) { var rr = form.querySelector('[name=school][value="' + qs.replace(/"/g, '') + '"]'); if (rr) { rr.checked = true; var dm = form.querySelector('.form__more'); if (dm) dm.open = true; } }
  function say(t) { if (!msg) return; msg.textContent = ''; setTimeout(function () { msg.textContent = t; msg.setAttribute('tabindex', '-1'); msg.focus(); }, 50); }
  form.addEventListener('change', function (e) { var f = e.target.closest('.field'); if (f) { f.classList.remove('invalid'); f.querySelectorAll('input').forEach(function (i) { i.removeAttribute('aria-invalid'); }); } });

  // 전송 함수: 여기만 바꾸면 된다. 성공하면 resolve, 실패하면 reject.
  function sendConsult(data) {
    // TODO: 실제 전송. README.md의 무료 선택지(구글 폼 / 카카오톡 채널 / 이메일) 중 하나로 연결.
    if (!CONFIG.consultEndpoint) return Promise.reject(new Error('no-endpoint'));
    return fetch(CONFIG.consultEndpoint, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data).toString()
    }).then(function () { return { ok: true }; });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var ok = true;
    var g = form.querySelector('[name=grade]:checked'); mark('e-grade', !g); ok = ok && !!g;
    var school = form.querySelector('[name=school]:checked');
    var worry = form.querySelectorAll('[name=worry]:checked');
    var phone = form.phone.value.replace(/\D/g, '').replace(/^820?/, '0'); var pok = /^01\d{8,9}$/.test(phone); mark('e-phone', !pok); ok = ok && pok;
    var agree = form.agree.checked; mark('e-agree', !agree); ok = ok && agree;
    if (!ok) {
      var miss = []; if (!g) miss.push('학년'); if (!pok) miss.push('연락처'); if (!agree) miss.push('개인정보 동의');
      say('빠진 항목: ' + miss.join(', '));
      var first = form.querySelector('.field.invalid');
      if (first) { first.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); var f = first.querySelector('input'); if (f) f.focus({ preventScroll: true }); }
      return;
    }
    var data = Object.assign({
      grade: g.value,
      school: school ? school.value : '',
      worry: Array.prototype.map.call(worry, function (w) { return w.value; }).join(', '),
      phone: phone,
      time: (form.querySelector('[name=time]:checked') || {}).value || '',
      src: (form.querySelector('[name=src]:checked') || {}).value || '',
      sent_at: new Date().toISOString()
    }, utm);

    var btn = document.getElementById('submit'); btn.disabled = true; btn.textContent = '보내는 중';
    sendConsult(data).then(function () {
      track('consult_submit', { grade: data.grade, school: data.school });
      form.hidden = true;
      var d = document.getElementById('done'); d.hidden = false;
      d.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      var h = d.querySelector('h3'); h.setAttribute('tabindex', '-1'); h.focus();
    }).catch(function (err) {
      btn.disabled = false; btn.textContent = '우리 아이 어디서 막혔는지 상담받기';
      say(err && err.message === 'no-endpoint' ? '온라인 접수를 연결하는 중입니다. 잠시 뒤 다시 시도해 주세요.' : '전송이 되지 않았습니다. 잠시 뒤 다시 시도해 주세요.');
      if (msg) msg.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  form.phone.addEventListener('blur', function () {
    var v = this.value.replace(/\D/g, '').replace(/^820?/, '0').slice(0, 11);
    this.value = v.length >= 10 ? v.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3') : v;
  });
})();
