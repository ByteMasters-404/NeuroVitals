// Simple SPA loader (vanilla JS)
(function () {
  function fetchText(url) {
    return fetch(url, { cache: 'no-store' }).then(res => {
      if (!res.ok) throw new Error('Fetch failed: ' + res.status);
      return res.text();
    });
  }

  function runScriptsFromDoc(doc) {
    // Execute scripts found in the fetched document (head and body) in order
    const scripts = Array.from(doc.querySelectorAll('script'));
    scripts.forEach(s => {
      try {
        // Skip loading external scripts that are already present in the shell
        if (s.src) {
          const already = Array.from(document.scripts).some(ds => ds.src && ds.src === s.src);
          if (already) return; // avoid duplicate library loads
        }

        const el = document.createElement('script');
        if (s.src) {
          el.src = s.src;
          el.async = false;
        }
        if (s.type) el.type = s.type;
        if (s.textContent) el.textContent = s.textContent;
        document.body.appendChild(el);
      } catch (e) {
        console.error('Error injecting script', e);
      }
    });
  }

  function injectMainContent(html) {
    const container = document.getElementById('main-content');
    if (!container) return;
    container.innerHTML = html;
  }

  async function navigateTo(href, push = true) {
    try {
      const text = await fetchText(href);
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      // Remove top-level page chrome (only direct children of body) so shell header/sidebar/footer are not duplicated
      try {
        const bodyChildren = Array.from(doc.body.children);
        bodyChildren.forEach(ch => {
          if (ch.tagName && ['ASIDE', 'HEADER', 'FOOTER'].includes(ch.tagName)) ch.remove();
        });
      } catch (e) { /* ignore */ }

      // Prefer element with id main-content. If absent, choose the last <main> element (more likely the page body)
      const mains = Array.from(doc.querySelectorAll('main'));
      const newMain = doc.querySelector('#main-content') || (mains.length ? mains[mains.length - 1] : null);
      if (!newMain) {
        // If no fragment found, fallback to full navigation
        window.location.href = href;
        return;
      }

      // Remove layout-specific left-padding classes that assume a standalone page layout
      try {
        // remove Tailwind padding token like pl-[280px]
        newMain.className = (newMain.className || '').replace(/pl-\[[^\]]+\]/g, '').trim();
        // also remove any inline left padding style
        if (newMain.style && newMain.style.paddingLeft) newMain.style.paddingLeft = '';
      } catch (e) { /* ignore */ }

      // Inject the cleaned main fragment into the shell
      injectMainContent(newMain.innerHTML);

      // Run scripts from the fetched document to allow page behavior to initialize
      runScriptsFromDoc(doc);

      if (push) history.pushState({ url: href }, '', href);
      highlightActive(href);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('SPA load failed, falling back to full navigation', err);
      window.location.href = href;
    }
  }

  function highlightActive(href) {
    const links = document.querySelectorAll('aside a.sidebar-item');
    links.forEach(a => a.classList.remove('active'));
    try {
      const name = href.split('/').pop();
      const match = Array.from(links).find(a => (a.getAttribute('href') || '').split('/').pop() === name);
      if (match) match.classList.add('active');
    } catch (e) { /* ignore */ }
  }

  function setupAsideLinks() {
    const links = document.querySelectorAll('aside a');
    links.forEach(a => {
      a.addEventListener('click', function (e) {
        const href = a.getAttribute('href');
        if (!href) return;
        // allow anchors and external links to behave normally
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return;
        e.preventDefault();
        navigateTo(href, true);
      });
    });
  }

  function setupInternalLinks() {
    // capture clicks inside main content as well
    const main = document.getElementById('main-content');
    if (!main) return;
    main.addEventListener('click', function (e) {
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      e.preventDefault();
      navigateTo(href, true);
    });
  }

  window.addEventListener('popstate', function (e) {
    const url = (e.state && e.state.url) || location.pathname.split('/').pop() || 'code.html';
    navigateTo(url, false);
  });

  document.addEventListener('DOMContentLoaded', function () {
    setupAsideLinks();
    setupInternalLinks();

    // Load initial page: if URL path points to a known page, load it; otherwise default to code.html
    const current = location.pathname.split('/').pop();
    const start = current && (current === 'index.html' || current === '') ? 'code.html' : current;
    const initial = start || 'code.html';
    navigateTo(initial, false);
  });

})();
