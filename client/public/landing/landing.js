(() => {
  // A root HTTP redirect preserves its fragment. Keep old /#graph-style
  // workspace bookmarks usable without redirecting normal marketing anchors.
  const workspacePages = ['overview', 'discovery', 'graph', 'tasks', 'workflows', 'strategy', 'governance', 'weekly', 'deliverables', 'system', 'settings', 'help'];
  if (workspacePages.includes(window.location.hash.slice(1))) {
    window.location.replace('/login' + window.location.search + window.location.hash);
    return;
  }
  const gallery = document.querySelector('.product-gallery');
  const tabs = [...gallery.querySelectorAll('[role="tab"]')];
  const panels = [...gallery.querySelectorAll('[role="tabpanel"]')];
  const play = document.querySelector('#gallery-play');
  const caption = document.querySelector('#gallery-caption');
  const announcement = document.querySelector('#gallery-announcement');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const captions = [
    'Supplier onboarding: follow the usual path, inspect exceptions, and see the approval responsibility that still needs agreement.',
    'The task library: compare Human, AI, and AI + human review roles across the work. Each card keeps its output, tools, and owner in view.',
    'A task in context: open the human checkpoint and its connected records without losing the workflow around it.'
  ];
  let current = 0;
  let paused = reduced.matches;
  let hovered = false;
  let visible = false;
  let timer;
  function updatePlay() {
    play.textContent = paused ? 'Play' : 'Pause';
    play.setAttribute('aria-pressed', String(paused));
    play.setAttribute('aria-label', paused ? 'Play product gallery' : 'Pause product gallery');
  }
  function schedule() {
    clearTimeout(timer);
    if (!paused && !hovered && visible && !document.hidden && !gallery.contains(document.activeElement)) {
      timer = setTimeout(() => show(current + 1, false), 8500);
    }
  }
  function show(index, manual) {
    current = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => {
      const active = current === i;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    caption.textContent = captions[current];
    document.querySelector('#gallery-count').textContent = `0${current + 1} / 03`;
    if (manual) {
      paused = true;
      updatePlay();
      announcement.textContent = `${current + 1} of 3. ${tabs[current].querySelector('strong').textContent} ${captions[current]}`;
    }
    schedule();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => show(index, true));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (current + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); show(next, true); tabs[next].focus(); }
    });
  });
  document.querySelector('#gallery-prev').addEventListener('click', () => show(current - 1, true));
  document.querySelector('#gallery-next').addEventListener('click', () => show(current + 1, true));
  play.addEventListener('click', () => { paused = !paused; updatePlay(); schedule(); });
  gallery.addEventListener('mouseenter', () => { hovered = true; schedule(); });
  gallery.addEventListener('mouseleave', () => { hovered = false; schedule(); });
  gallery.addEventListener('focusin', () => clearTimeout(timer));
  gallery.addEventListener('focusout', () => setTimeout(schedule, 0));
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => { if (reduced.matches) paused = true; updatePlay(); schedule(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, {threshold:.2}).observe(gallery);
  } else { visible = true; }
  updatePlay();
  schedule();

  const dialog = document.querySelector('#image-dialog');
  const expanded = document.querySelector('#expanded-image');
  let opener;
  document.querySelectorAll('[data-zoom]').forEach(link => link.addEventListener('click', event => {
    if (typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    opener = link;
    paused = true;
    updatePlay();
    schedule();
    expanded.src = link.href;
    expanded.alt = link.querySelector('img').alt;
    document.querySelector('#image-dialog-title').textContent = link.dataset.zoom;
    dialog.showModal();
  }));
  document.querySelector('#close-image').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
})();
document.querySelector('#pilot-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type=submit]');
  const result = document.querySelector('#pilot-result');
  button.disabled = true;
  result.textContent = 'Saving your request…';
  const fields = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch('/api/pilot-applications', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({...fields, consent:fields.consent === 'on'})
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'We could not save your request. Please try again.');
    result.textContent = body.message;
    if (!fields.website) window.dispatchEvent(new CustomEvent('dutygraph:pilot-receipt', {detail:{inquiryType:fields.inquiryType || 'pilot'}}));
    form.reset();
  } catch (error) { result.textContent = error.message || 'We could not save your request. Please try again.'; }
  finally { button.disabled = false; }
});

(() => {
 const select = document.querySelector('#inquiry-type');
 if (!select) return;
 const labels = {pilot:'Sign up for a demo',advisor:'Explore the advisor program',enterprise:'Discuss an enterprise evaluation',team:'Help build DutyGraph'};
 const interest = new URLSearchParams(location.search).get('interest');
 if (Object.hasOwn(labels, interest || '')) select.value = interest;
 const update = () => { document.querySelector('#inquiry-title').textContent = labels[select.value]; document.querySelector('#pilot-form button[type=submit]').textContent = select.value === 'pilot' ? 'Request my demo ↗' : 'Send my inquiry ↗'; };
 select.addEventListener('change',update);
 document.querySelector('#pilot-form').addEventListener('reset', () => setTimeout(update,0));
 update();
})();
