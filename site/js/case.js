/* Minimal stand-in for the editor runtime: the page logic keeps its original shape. */
class DCLogic {
  constructor() { this.props = {}; }
  setState(p) { this.state = Object.assign({}, this.state, p); if (this.sync) this.sync(); }
  forceUpdate() { if (this.sync) this.sync(); }
}

var STEP_OF = [0, 0, 0, 0, 1, 1, 1, 2, 3, 3, 4, 4, 5, 5];

class Component extends DCLogic {
  state = { theme: (function () { try { return localStorage.getItem('ac-theme2') === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } })() };
  rvEls = []; ixEls = []; chEls = []; stEls = [];
  toggleTheme = () => { var t = this.state.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('ac-theme2', t); } catch (e) {} this.setState({ theme: t }); };
  refRoot = (el) => { this.root = el; };
  refProg = (el) => { this.prog = el; };
  rv = (el) => { if (el && this.rvEls.indexOf(el) < 0) { this.rvEls.push(el); if (this.io) this.io.observe(el); } };
  ch = (el) => { if (el && this.chEls.indexOf(el) < 0) { this.chEls.push(el); this.rv(el); } };
  ix = (el) => { if (el && this.ixEls.indexOf(el) < 0) this.ixEls.push(el); };
  st = (el) => { if (el && this.stEls.indexOf(el) < 0) this.stEls.push(el); };

  componentDidMount() {
    var w = window;
    var reduce = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
    this.measure();
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    if (this.io) this.io.disconnect();
  }

  measure() {
    var w = window, y = w.scrollY || 0, vh = w.innerHeight, docH = document.documentElement.scrollHeight;
    if (this.prog) this.prog.style.transform = 'scaleX(' + Math.min(1, Math.max(0, y / Math.max(1, docH - vh))).toFixed(4) + ')';
    var active = 0;
    for (var i = 0; i < this.chEls.length; i++) {
      if (this.chEls[i].getBoundingClientRect().top < vh * .45) active = +this.chEls[i].getAttribute('data-i');
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
