/* ============ ARROWPAC SHARED ANIMATIONS — JS ============ */
/* Initializes: scroll progress, reveal, count-up, back-to-top, table stagger, magnetic, ripple */

(function(){

  /* ---- scroll progress bar ---- */
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  function updateProgress(){
    const h = document.documentElement;
    const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
    bar.style.width = (scrolled * 100) + '%';
  }
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress);
  updateProgress();

  /* ---- back-to-top button ---- */
  const back = document.createElement('button');
  back.className = 'back-top';
  back.setAttribute('aria-label', 'Back to top');
  back.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  back.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.appendChild(back);
  addEventListener('scroll', () => {
    back.classList.toggle('show', scrollY > 400);
  }, { passive: true });

  /* ---- scroll-reveal (IntersectionObserver) ---- */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        e.target.classList.add('rev-in');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-reveal]').forEach(el => revealObs.observe(el));

  /* ---- count-up numbers ---- */
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        const el = e.target;
        const target = +el.dataset.count;
        const duration = +el.dataset.duration || 1500;
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const start = performance.now();
        function tick(t){
          const p = Math.min(1, (t - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          const v = Math.round(target * eased);
          el.textContent = prefix + v.toLocaleString() + suffix;
          if(p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        countObs.unobserve(el);
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.count-up').forEach(el => countObs.observe(el));

  /* ---- table row stagger (when table enters viewport) ---- */
  const tableObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        const table = e.target;
        table.querySelectorAll('tbody tr').forEach((tr, i) => {
          tr.style.setProperty('--row-i', i);
        });
        table.classList.add('revealed');
        tableObs.unobserve(table);
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.ap-table').forEach(t => tableObs.observe(t));

  /* ---- glow-hover card: track cursor position ---- */
  document.querySelectorAll('.glow-hover').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--mx', mx + '%');
      el.style.setProperty('--my', my + '%');
    });
  });

  /* ---- magnetic links (cursor-responsive subtle pull) ---- */
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${mx * 0.15}px, ${my * 0.15}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });

  /* ---- button ripple click effect ---- */
  document.querySelectorAll('.btn-ripple, .btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--rx', (e.clientX - rect.left) + 'px');
      btn.style.setProperty('--ry', (e.clientY - rect.top) + 'px');
      btn.classList.add('rippling');
      setTimeout(() => btn.classList.remove('rippling'), 600);
    });
  });

})();
