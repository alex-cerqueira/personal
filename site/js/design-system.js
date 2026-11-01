/* Minimal stand-in for the editor runtime: the page logic keeps its original shape. */
class DCLogic {
  constructor() { this.props = {}; }
  setState(p) { this.state = Object.assign({}, this.state, p); if (this.sync) this.sync(); }
  forceUpdate() { if (this.sync) this.sync(); }
}

var STEP_OF = [0, 0, 0, 0, 1, 1, 1, 2, 3, 3, 4, 5, 5, 5, 5];

class Component extends DCLogic {
  state = { menu: false, theme: (function () { try { return localStorage.getItem('ac-theme2') === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } })() };
  rvEls = []; ixEls = []; chEls = []; stEls = [];
  toggleMenu = () => { this.setMenu(!this.state.menu); };
  closeMenu = () => { if (this.state.menu) this.setMenu(false); };
  /* open/close the drawer: it starts below the header, focus goes to the first item and comes back to the hamburger */
  setMenu(open) {
    var d = document, hdr = d.querySelector('.hdr'), dr = d.getElementById('mmenu'), btn = d.querySelector('.menu-btn');
    if (open && hdr && dr) dr.style.setProperty('--hh', Math.round(hdr.getBoundingClientRect().bottom) + 'px');
    this.setState({ menu: open });
    clearTimeout(this.menuT);
    this.menuT = setTimeout(() => {
      if (open) { var first = dr && dr.querySelector('.nd-menu__item'); if (first) first.focus({ preventScroll: true }); }
      else if (btn && dr && dr.contains(d.activeElement)) btn.focus({ preventScroll: true });
    }, open ? 60 : 0);
  }
  onMenuKey = (e) => {
    if (!this.state.menu) return;
    var d = document, dr = d.getElementById('mmenu'), btn = d.querySelector('.menu-btn');
    if (e.key === 'Escape') { e.preventDefault(); this.setMenu(false); if (btn) btn.focus({ preventScroll: true }); return; }
    if (e.key !== 'Tab' || !dr || !btn) return;
    var items = [].slice.call(dr.querySelectorAll('.nd-menu__item')), a = d.activeElement;
    if (!items.length) return;
    if (!e.shiftKey && a === items[items.length - 1]) { e.preventDefault(); btn.focus(); }
    else if (e.shiftKey && a === btn) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (a !== btn && !dr.contains(a)) { e.preventDefault(); items[0].focus(); }
  };
  toggleTheme = () => { var t = this.state.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('ac-theme2', t); } catch (e) {} this.setState({ theme: t }); };
  refRoot = (el) => { this.root = el; };
  refProg = (el) => { this.prog = el; };
  refRun = (el) => { this.run = el; };
  refTrack = (el) => { this.track = el; };
  refCar = (el) => { if (el) this.car = el; };
  refCap = (el) => { if (el) this.cap = el; };

  /* Project carousel (NodIA). The cover holds still. Each documentation page is far taller than the 16:9 frame, so it
     rests at the top for HOLD ms, then travels to the bottom at a slow constant speed (PAN frame-heights per second);
     only when it ends does the honeycomb carry the next image in. The honeycomb works on two baked frames (the page
     where it stopped, the next page at its top), so the big SVG is never re-rasterised while the transition runs. */
  initCar() {
    var f = this.car;
    if (!f || f.getAttribute('data-car')) return;
    var imgs = [].slice.call(f.querySelectorAll('.cimg')), n = imgs.length;
    if (n < 2) return;
    f.setAttribute('data-car', '1');
    var cv = f.querySelector('.car-cv'), ctx = cv && cv.getContext ? cv.getContext('2d') : null;
    var num = f.querySelector('.car-n b'), bar = f.querySelector('.car-bar i');
    var reduce = this.reduce, DUR = 5600, TR = 1250, HOLD = 2000, PAN = .22;
    var S = this.carS = { i: 0, busy: false, wait: 0, el: 0, vis: false, paused: false, last: 0, raf: 0, W: 0, H: 0 }, cache = {};
    var pad = (k) => (k < 9 ? '0' : '') + (k + 1);
    var tall = (im) => im.getAttribute('data-fit') === 'top';
    var ready = (im) => im.complete && im.naturalWidth > 0;
    var dpr = () => Math.min(2, window.devicePixelRatio || 1);
    var size = () => { S.W = f.clientWidth; S.H = f.clientHeight; };
    var span = (im) => tall(im) ? Math.max(0, S.W * (+im.getAttribute('height')) / (+im.getAttribute('width')) - S.H) : 0;
    var dur = (im) => tall(im) ? HOLD + span(im) / (PAN * Math.max(1, S.H)) * 1000 : DUR;
    var off = (im, el) => tall(im) ? Math.min(span(im), Math.max(0, (el - HOLD) / 1000 * PAN * S.H)) : 0;
    var place = (im, y) => { var q = dpr(); im.style.transform = y > 0 ? 'translate3d(0,' + (-Math.round(y * q) / q) + 'px,0)' : ''; };
    var load = (j) => { var im = imgs[j]; if (!im.getAttribute('src') && im.getAttribute('data-src')) im.src = im.getAttribute('data-src'); };
    /* a frame-sized bitmap of slide k with its top edge y px down the page */
    var snap = (k, y) => {
      var im = imgs[k], q = dpr(), W = S.W, H = S.H, c = document.createElement('canvas'), g;
      c.width = Math.round(W * q); c.height = Math.round(H * q); g = c.getContext('2d');
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      if (tall(im)) {
        y = Math.round(y * q) / q;
        var u = W / im.naturalWidth;
        g.drawImage(im, 0, y / u, im.naturalWidth, H / u, 0, 0, c.width, c.height);
      } else {
        var iw = im.naturalWidth, ih = im.naturalHeight, cover = im.getAttribute('data-fit') !== 'contain';
        var pos = (im.getAttribute('data-pos') || '50% 50%').split(' ').map(parseFloat);
        var s = cover ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih), dw = iw * s, dh = ih * s;
        if (!cover) { g.fillStyle = getComputedStyle(f).backgroundColor; g.fillRect(0, 0, c.width, c.height); }
        g.drawImage(im, (W - dw) * pos[0] / 100 * q, (H - dh) * pos[1] / 100 * q, dw * q, dh * q);
      }
      return c;
    };
    var frameOf = (k, y) => { var key = k + '|' + S.W + 'x' + S.H + '|' + Math.round(y); return cache[key] || (cache[key] = snap(k, y)); };
    /* while a page rests at the top, bake the two frames the next transition will need */
    var warm = () => {
      if (reduce || !ctx || S.busy || !S.W) return;
      var k = S.i, A = imgs[k], j = (k + 1) % n, B = imgs[j];
      load(j);
      if (!ready(A)) return;
      if (!ready(B)) { if (!S.warming) { S.warming = 1; B.addEventListener('load', () => { S.warming = 0; warm(); }, { once: true }); } return; }
      setTimeout(() => { if (S.i === k && !S.busy) frameOf(k, span(A)); }, 0);
      setTimeout(() => { if (S.i === k && !S.busy) frameOf(j, 0); }, 150);
    };
    var hex = (x, y, r) => {
      ctx.moveTo(x + r, y);
      for (var a = 1; a < 6; a++) ctx.lineTo(x + r * Math.cos(a * Math.PI / 3), y + r * Math.sin(a * Math.PI / 3));
      ctx.closePath();
    };
    var settle = (j, manual) => {
      var A = imgs[S.i], B = imgs[j];
      A.classList.remove('on'); A.setAttribute('aria-hidden', 'true'); place(A, 0);
      B.classList.add('on'); B.classList.remove('under'); B.removeAttribute('aria-hidden'); place(B, 0);
      S.i = j; S.el = 0;
      if (num) num.textContent = pad(j);
      if (this.cap) { this.cap.setAttribute('aria-live', manual ? 'polite' : 'off'); this.cap.textContent = B.getAttribute('data-cap') || ''; }
      load((j + 1) % n);
      clearTimeout(S.wt); S.wt = setTimeout(warm, 500);
    };
    var go = (d, manual) => {
      if (S.busy || S.wait) return;
      var j = (S.i + d + n) % n, A = imgs[S.i], B = imgs[j];
      load(j);
      if (reduce || !ctx) { settle(j, manual); return; }
      if (!ready(B)) {
        /* the next page is still on its way: start as soon as it lands (or give up and swap if it never does) */
        S.wait = 1;
        var landed = (ok) => { S.wait = 0; if (ok) go(d, manual); else settle(j, manual); };
        B.addEventListener('load', () => landed(true), { once: true });
        B.addEventListener('error', () => landed(false), { once: true });
        return;
      }
      S.busy = true;
      var W = S.W, H = S.H, q = dpr(), snA = frameOf(S.i, off(A, S.el)), snB = frameOf(j, 0);
      S.el = 0;
      cv.width = Math.round(W * q); cv.height = Math.round(H * q);
      ctx.setTransform(q, 0, 0, q, 0, 0);
      var R = Math.max(24, Math.min(76, W / 16)), h3 = Math.sqrt(3) * R, cells = [];
      for (var c = -1; c * 1.5 * R < W + R; c++) {
        for (var r = -1; r * h3 < H + h3; r++) {
          var x = c * 1.5 * R, y = r * h3 + (c & 1 ? h3 / 2 : 0);
          var u = (d > 0 ? x / W : 1 - x / W) * .8 + (y / H) * .12 + Math.random() * .08;
          cells.push(x, y, Math.max(0, Math.min(1, u)));
        }
      }
      place(B, 0); B.classList.add('under');
      var t0 = 0;
      var frame = (now) => {
        if (!t0) t0 = now;
        var t = Math.min(1, (now - t0) / TR), ring = [];
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(snA, 0, 0, W, H);
        ctx.save(); ctx.beginPath();
        for (var k = 0; k < cells.length; k += 3) {
          var p = Math.min(1, Math.max(0, (t - cells[k + 2] * .55) / .45));
          if (p <= 0) continue;
          var e = 1 - Math.pow(1 - p, 3);
          hex(cells[k], cells[k + 1], R * 1.03 * e);
          if (p < 1) ring.push(cells[k], cells[k + 1], R * e, p);
        }
        ctx.clip(); ctx.drawImage(snB, 0, 0, W, H); ctx.restore();
        ctx.lineWidth = 1;
        for (var z = 0; z < ring.length; z += 4) {
          ctx.strokeStyle = 'rgba(255,255,255,' + (Math.sin(Math.PI * ring[z + 3]) * .75).toFixed(3) + ')';
          ctx.beginPath(); hex(ring[z], ring[z + 1], ring[z + 2]); ctx.stroke();
        }
        if (t < 1) { S.tr = requestAnimationFrame(frame); return; }
        settle(j, manual);
        cache = {};
        /* keep the finished frame up for a beat, so the page underneath has painted before the canvas goes */
        S.tr = requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => { cv.classList.remove('on'); S.busy = false; }, 60)));
      };
      cv.classList.add('on');
      S.tr = requestAnimationFrame(frame);
    };
    var tick = (now) => {
      var dt = S.last ? Math.min(100, now - S.last) : 0; S.last = now;
      var A = imgs[S.i], tot = dur(A);
      if (!S.paused && !S.busy && !S.wait && !document.hidden) {
        S.el = Math.min(tot, S.el + dt);
        if (S.el >= tot) go(1, false);
      }
      if (!S.busy && tall(A)) place(A, off(A, S.el));
      if (bar) bar.style.transform = 'scaleX(' + (S.busy ? 0 : Math.min(1, S.el / tot)).toFixed(4) + ')';
      S.raf = S.vis ? requestAnimationFrame(tick) : 0;
    };
    f.addEventListener('click', (e) => {
      var b = e.target.closest ? e.target.closest('.car-b') : null;
      if (b) go(b.classList.contains('car-prev') ? -1 : 1, true);
    });
    f.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1, true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1, true); }
    });
    f.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') S.paused = true; });
    f.addEventListener('pointerleave', () => { S.paused = f.contains(document.activeElement); });
    f.addEventListener('focusin', () => { S.paused = true; });
    f.addEventListener('focusout', () => { S.paused = false; });
    var px = null;
    f.addEventListener('pointerdown', (e) => { px = e.target.closest && e.target.closest('.car-b') ? null : e.clientX; });
    f.addEventListener('pointerup', (e) => {
      if (px === null) return;
      var dx = e.clientX - px; px = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1, true);
    });
    size();
    if (window.ResizeObserver) { this.carRO = new ResizeObserver(() => { size(); cache = {}; }); this.carRO.observe(f); }
    if (reduce) {
      /* no motion: the pages sit at the top and the frame itself scrolls, so the whole page can still be read */
      f.classList.add('rm');
      var st = f.querySelector('.car-st');
      if (st) { st.setAttribute('tabindex', '0'); st.setAttribute('role', 'group'); st.setAttribute('aria-label', 'Página do componente — role para ver tudo'); }
      load(1);
      return;
    }
    if ('IntersectionObserver' in window) {
      this.carIO = new IntersectionObserver((es) => {
        S.vis = es[0].isIntersecting;
        if (S.vis && !S.raf) { S.last = 0; S.raf = requestAnimationFrame(tick); }
        if (S.vis && !S.started) { S.started = 1; setTimeout(() => { load(1); warm(); }, 700); }
      }, { threshold: .35 });
      this.carIO.observe(f);
    } else { S.vis = true; S.raf = requestAnimationFrame(tick); load(1); setTimeout(warm, 700); }
  }
  fit() {
    this.chEls.forEach((c) => {
      var cc = c.querySelector('.ch-c'); if (!cc) return;
      cc.style.zoom = '';
      if (!this.hz) return;
      var need = cc.scrollHeight, avail = cc.clientHeight;
      if (need > avail + 1) cc.style.zoom = Math.max(.45, avail / need).toFixed(3);
    });
  }
  goChapter(i) {
    if (!this.hz || !this.run) return;
    var top = this.run.getBoundingClientRect().top + window.scrollY - this.hh;
    window.scrollTo({ top: top + i * this.seg, behavior: 'smooth' });
  }
  rv = (el) => { if (el && this.rvEls.indexOf(el) < 0) { this.rvEls.push(el); if (this.io) this.io.observe(el); } };
  ch = (el) => { if (el && this.chEls.indexOf(el) < 0) { this.chEls.push(el); this.rv(el); } };
  ix = (el) => { if (el && this.ixEls.indexOf(el) < 0) this.ixEls.push(el); };
  st = (el) => { if (el && this.stEls.indexOf(el) < 0) this.stEls.push(el); };

  componentDidMount() {
    var w = window;
    document.addEventListener('keydown', this.onMenuKey);
    var reduce = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.reduce = reduce;
    if (!reduce && this.root) this.root.classList.add('js');
    if ('IntersectionObserver' in w) {
      this.io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); this.io.unobserve(e.target); } });
      }, { threshold: .08, rootMargin: '0px 0px -6% 0px' });
      this.rvEls.forEach((el) => this.io.observe(el));
    } else {
      this.rvEls.forEach((el) => el.classList.add('is-in'));
    }
    this.onScroll = () => { if (!this.q) { this.q = true; requestAnimationFrame(() => { this.q = false; this.measure(); }); } };
    w.addEventListener('scroll', this.onScroll, { passive: true });
    w.addEventListener('resize', this.onScroll);
    this.onToc = (e) => {
      var a = e.target && e.target.closest ? e.target.closest('.toc a') : null;
      if (!a || !this.hz) return;
      e.preventDefault();
      this.goChapter(+a.getAttribute('data-i') - 1);
    };
    document.addEventListener('click', this.onToc);
    this.measure();
    this.initCar();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.fit());
    setTimeout(() => this.fit(), 600);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onMenuKey);
    document.removeEventListener('click', this.onToc);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    if (this.io) this.io.disconnect();
    if (this.carIO) this.carIO.disconnect();
    if (this.carS) { cancelAnimationFrame(this.carS.raf); cancelAnimationFrame(this.carS.tr); this.carS.vis = false; }
  }

  measure() {
    var w = window, y = w.scrollY || 0, vh = w.innerHeight, docH = document.documentElement.scrollHeight;
    if (this.prog) this.prog.style.transform = 'scaleX(' + Math.min(1, Math.max(0, y / Math.max(1, docH - vh))).toFixed(4) + ')';
    var active = 0, n = this.chEls.length;
    var hz = !!(w.matchMedia && w.matchMedia('(min-width: 1081px)').matches && this.root && this.root.classList.contains('js') && this.run && this.track);
    if (hz !== this.hz && !hz && this.run) { this.run.style.height = ''; this.track.style.transform = ''; }
    this.hz = hz;
    var fk = hz + ':' + w.innerWidth + 'x' + vh;
    if (fk !== this.fitKey) { this.fitKey = fk; this.fit(); }
    if (hz) {
      /* web: each chapter holds for a moment, then the next one slides in from the side */
      var hdr = document.querySelector('.hdr'), hh = hdr ? hdr.offsetHeight : 108;
      if (hh !== this.hh) { this.hh = hh; this.root.style.setProperty('--hh', hh + 'px'); }
      this.seg = Math.round(vh * .9);
      var want = (vh - hh) + this.seg * (n - 1) + 'px';
      if (this.run.style.height !== want) this.run.style.height = want;
      var top = this.run.getBoundingClientRect().top + y - hh;
      var r = Math.min(n - 1, Math.max(0, (y - top) / this.seg)), k = Math.floor(r), f = r - k;
      var t = Math.min(1, Math.max(0, (f - .3) / .7)), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var pos = Math.min(n - 1, k + e), pw = this.track.parentNode.clientWidth;
      this.track.style.transform = 'translate3d(' + (-pos * pw).toFixed(1) + 'px,0,0)';
      active = y >= top - vh * .3 ? Math.round(pos) + 1 : 0;
    } else {
      for (var i = 0; i < n; i++) {
        if (this.chEls[i].getBoundingClientRect().top < vh * .45) active = +this.chEls[i].getAttribute('data-i');
      }
    }
    if (active === this.active) return;
    this.active = active;
    this.ixEls.forEach((a) => {
      var on = +a.getAttribute('data-i') === active;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
    var step = active ? STEP_OF[active] : -1;
    this.stEls.forEach((li) => li.classList.toggle('on', +li.getAttribute('data-s') === step));
  }

  sync() {
    var dark = this.state.theme !== 'light', d = document;
    d.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var fab = d.querySelector('.theme-btn'), lb = dark ? 'Ativar tema claro' : 'Ativar tema escuro';
    if (fab) { fab.setAttribute('aria-pressed', dark ? 'true' : 'false'); fab.setAttribute('aria-label', lb); fab.setAttribute('title', lb); }
    var tc = d.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', dark ? '#121212' : '#F8F8F6');
    var menu = !!this.state.menu, mb = d.querySelector('.menu-btn'), mm = d.getElementById('mmenu');
    if (mb) { mb.setAttribute('aria-expanded', menu ? 'true' : 'false'); mb.setAttribute('aria-label', menu ? 'Fechar menu' : 'Abrir menu'); }
    if (mm) mm.setAttribute('data-open', menu ? 'true' : 'false');
    d.body.style.overflow = menu ? 'hidden' : '';
  }
}

function acBoot(comp, resolve) {
  document.querySelectorAll('[data-ref]').forEach(function (el) {
    var f = comp[el.getAttribute('data-ref')];
    if (typeof f === 'function') f(el);
  });
  [['data-click', 'click'], ['data-enter', 'mouseenter'], ['data-leave', 'mouseleave'], ['data-focus', 'focus']].forEach(function (p) {
    document.querySelectorAll('[' + p[0] + ']').forEach(function (el) {
      var fn = resolve(el.getAttribute(p[0]));
      if (fn) el.addEventListener(p[1], fn);
    });
  });
  if (comp.componentDidMount) comp.componentDidMount();
  if (comp.sync) comp.sync();
}

(function () {
  var comp = new Component();
  acBoot(comp, function (name) { return typeof comp[name] === 'function' ? comp[name] : null; });
})();
