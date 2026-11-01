/* Minimal stand-in for the editor runtime: the page logic keeps its original shape. */
class DCLogic {
  constructor() { this.props = {}; }
  setState(p) { this.state = Object.assign({}, this.state, p); if (this.sync) this.sync(); }
  forceUpdate() { if (this.sync) this.sync(); }
}

var STEP_OF = [0, 0, 0, 0, 1, 1, 1, 2, 3, 3, 4, 5, 5, 5, 5];

class Component extends DCLogic {
  state = { theme: (function () { try { return localStorage.getItem('ac-theme2') === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } })() };
  rvEls = []; ixEls = []; chEls = []; stEls = [];
  toggleTheme = () => { var t = this.state.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('ac-theme2', t); } catch (e) {} this.setState({ theme: t }); };
  refRoot = (el) => { this.root = el; };
  refProg = (el) => { this.prog = el; };
  refRun = (el) => { this.run = el; };
  refTrack = (el) => { this.track = el; };
  refCar = (el) => { if (el) this.car = el; };
  refCap = (el) => { if (el) this.cap = el; };

  /* Project carousel: the next image grows out of a honeycomb that sweeps in the direction of travel. */
  initCar() {
    var f = this.car;
    if (!f || f.getAttribute('data-car')) return;
    var imgs = [].slice.call(f.querySelectorAll('.cimg')), n = imgs.length;
    if (n < 2) return;
    f.setAttribute('data-car', '1');
    var cv = f.querySelector('.car-cv'), ctx = cv && cv.getContext ? cv.getContext('2d') : null;
    var num = f.querySelector('.car-n b'), bar = f.querySelector('.car-bar i');
    var reduce = this.reduce, DUR = 5600, TR = 1250;
    var S = this.carS = { i: 0, busy: false, el: 0, vis: false, paused: false, last: 0, raf: 0 };
    var pad = (k) => (k < 9 ? '0' : '') + (k + 1);
    var ready = (im) => im.complete && im.naturalWidth > 0;
    var paint = (im, W, H) => {
      var iw = im.naturalWidth, ih = im.naturalHeight, cover = im.getAttribute('data-fit') !== 'contain';
      var pos = (im.getAttribute('data-pos') || '50% 50%').split(' ').map(parseFloat);
      var s = cover ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih), dw = iw * s, dh = ih * s;
      if (!cover) { ctx.fillStyle = getComputedStyle(f).backgroundColor; ctx.fillRect(0, 0, W, H); }
      ctx.drawImage(im, (W - dw) * pos[0] / 100, (H - dh) * pos[1] / 100, dw, dh);
    };
    var hex = (x, y, r) => {
      ctx.moveTo(x + r, y);
      for (var a = 1; a < 6; a++) ctx.lineTo(x + r * Math.cos(a * Math.PI / 3), y + r * Math.sin(a * Math.PI / 3));
      ctx.closePath();
    };
    var settle = (j, manual) => {
      imgs[S.i].classList.remove('on'); imgs[S.i].setAttribute('aria-hidden', 'true');
      imgs[j].classList.add('on'); imgs[j].removeAttribute('aria-hidden');
      S.i = j;
      if (num) num.textContent = pad(j);
      if (this.cap) { this.cap.setAttribute('aria-live', manual ? 'polite' : 'off'); this.cap.textContent = imgs[j].getAttribute('data-cap') || ''; }
    };
    var go = (d, manual) => {
      if (S.busy) return;
      var j = (S.i + d + n) % n, A = imgs[S.i], B = imgs[j];
      S.el = 0;
      if (reduce || !ctx || !ready(A) || !ready(B)) { settle(j, manual); return; }
      S.busy = true;
      var W = f.clientWidth, H = f.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var R = Math.max(24, Math.min(76, W / 16)), h3 = Math.sqrt(3) * R, cells = [];
      for (var c = -1; c * 1.5 * R < W + R; c++) {
        for (var r = -1; r * h3 < H + h3; r++) {
          var x = c * 1.5 * R, y = r * h3 + (c & 1 ? h3 / 2 : 0);
          var u = (d > 0 ? x / W : 1 - x / W) * .8 + (y / H) * .12 + Math.random() * .08;
          cells.push(x, y, Math.max(0, Math.min(1, u)));
        }
      }
      var t0 = 0;
      var frame = (now) => {
        if (!t0) t0 = now;
        var t = Math.min(1, (now - t0) / TR), ring = [];
        ctx.clearRect(0, 0, W, H);
        paint(A, W, H);
        ctx.save(); ctx.beginPath();
        for (var k = 0; k < cells.length; k += 3) {
          var p = Math.min(1, Math.max(0, (t - cells[k + 2] * .55) / .45));
          if (p <= 0) continue;
          var e = 1 - Math.pow(1 - p, 3);
          hex(cells[k], cells[k + 1], R * 1.03 * e);
          if (p < 1) ring.push(cells[k], cells[k + 1], R * e, p);
        }
        ctx.clip(); paint(B, W, H); ctx.restore();
        ctx.lineWidth = 1;
        for (var q = 0; q < ring.length; q += 4) {
          ctx.strokeStyle = 'rgba(255,255,255,' + (Math.sin(Math.PI * ring[q + 3]) * .75).toFixed(3) + ')';
          ctx.beginPath(); hex(ring[q], ring[q + 1], ring[q + 2]); ctx.stroke();
        }
        if (t < 1) { S.tr = requestAnimationFrame(frame); return; }
        settle(j, manual);
        S.tr = requestAnimationFrame(() => { cv.classList.remove('on'); S.busy = false; });
      };
      cv.classList.add('on');
      S.tr = requestAnimationFrame(frame);
    };
    var tick = (now) => {
      var dt = S.last ? Math.min(100, now - S.last) : 0; S.last = now;
      if (!S.paused && !S.busy && !document.hidden) { S.el += dt; if (S.el >= DUR) go(1, false); }
      if (bar) bar.style.transform = 'scaleX(' + Math.min(1, S.el / DUR).toFixed(4) + ')';
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
    if (reduce) return;
    if ('IntersectionObserver' in window) {
      this.carIO = new IntersectionObserver((es) => {
        S.vis = es[0].isIntersecting;
        if (S.vis && !S.raf) { S.last = 0; S.raf = requestAnimationFrame(tick); }
      }, { threshold: .35 });
      this.carIO.observe(f);
    } else { S.vis = true; S.raf = requestAnimationFrame(tick); }
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
    var fab = d.querySelector('.fab'), lb = dark ? 'Ativar tema claro' : 'Ativar tema escuro';
    if (fab) { fab.setAttribute('aria-pressed', dark ? 'true' : 'false'); fab.setAttribute('aria-label', lb); fab.setAttribute('title', lb); }
    var tc = d.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', dark ? '#121212' : '#F8F8F6');
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
