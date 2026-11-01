/* DIGILAX — interactions & animations */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const cfg = window.DIGILAX || {};
  const T = window.DLX_I18N || {};
  const UI = window.DLX_UI || {};
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const motion = !!gsap && html.classList.contains("motion");
  if (!motion) html.classList.remove("motion", "preload", "trans-in");
  if (gsap && ST) gsap.registerPlugin(ST);
  const LANGS = ["en", "fr", "tr", "ar"];
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const waUrl = (text) => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(text)}`;
  let lang = "en";
  const ui = () => UI[lang] || UI.en;

  /* ── Settings from config.js ─────────────────────────────── */
  function applyConfig() {
    $$("[data-cfg]").forEach((el) => { const v = cfg[el.dataset.cfg]; if (v) el.textContent = v; });
    $$("[data-cfg-href]").forEach((el) => {
      const k = el.dataset.cfgHref;
      if (k === "wa") el.href = waUrl(ui().fab);
      else if (k === "mail") el.href = `mailto:${cfg.email}`;
      else if (cfg[k]) el.href = cfg[k];
    });
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  /* ── Word splitting for headline reveals ─────────────────── */
  // A "word" runs until the next space, so <em>word</em>, keeps its comma.
  function splitWords(el, cls = "w") {
    const nodes = [...el.childNodes];
    el.textContent = "";
    let cur = null;
    const word = () => {
      const o = document.createElement("span"); o.className = cls;
      if (cls === "w") { const i = document.createElement("span"); i.className = "wi"; o.append(i); el.append(o); return (cur = i); }
      el.append(o); return (cur = o);
    };
    nodes.forEach((n) => {
      if (n.nodeType !== 3) { (cur || word()).append(n); return; }
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { el.append(" "); cur = null; }
        else (cur || word()).append(part);
      });
    });
  }

  /* ── Language ────────────────────────────────────────────── */
  const EN = {};
  $$("[data-i18n]").forEach((el) => { if (!(el.dataset.i18n in EN)) EN[el.dataset.i18n] = el.innerHTML; });
  T.en = EN;

  function setLang(next, initial) {
    if (!LANGS.includes(next)) next = "en";
    lang = next;
    const dict = T[lang] || EN;
    html.lang = lang;
    html.dir = lang === "ar" ? "rtl" : "ltr";
    $$("[data-i18n]").forEach((el) => {
      const v = dict[el.dataset.i18n] ?? EN[el.dataset.i18n];
      if (v != null) el.innerHTML = v;
    });
    $$("[data-lang-current]").forEach((el) => (el.textContent = lang.toUpperCase()));
    $$("[data-set-lang]").forEach((b) => {
      const on = b.dataset.setLang === lang;
      b.setAttribute(b.getAttribute("role") === "menuitem" ? "aria-current" : "aria-pressed", on);
    });
    store.set("dlx-lang", lang);
    applyConfig();
    renderReviews();
    setWaTopic(waTopic);
    renderInboxEmpty();
    $$("[data-count]").forEach((el) => (el.textContent = fmt(+el.dataset.count)));
    if (!initial && motion) buildDynamic(true);
  }
  const fmt = (n) => n.toLocaleString(lang === "ar" ? "en" : lang);

  function initialLang() {
    const q = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(q)) return q;
    const s = store.get("dlx-lang");
    if (LANGS.includes(s)) return s;
    const nav = (navigator.languages || [navigator.language || "en"]).map((x) => x.slice(0, 2).toLowerCase());
    return nav.find((x) => LANGS.includes(x)) || "en";
  }

  // Language menu + segmented buttons
  const langMenu = $("[data-lang-menu]");
  if (langMenu) {
    const btn = $(".lang-btn", langMenu);
    btn.addEventListener("click", (e) => { e.stopPropagation(); const o = langMenu.classList.toggle("open"); btn.setAttribute("aria-expanded", o); });
    document.addEventListener("click", () => { langMenu.classList.remove("open"); btn.setAttribute("aria-expanded", false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") langMenu.classList.remove("open"); });
  }
  $$("[data-set-lang]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.setLang === lang) return;
    langMenu?.classList.remove("open");
    if (motion) {
      gsap.to("main, .footer, .nav-inner", { opacity: 0, duration: .22, onComplete: () => {
        setLang(b.dataset.setLang);
        gsap.to("main, .footer, .nav-inner", { opacity: 1, duration: .45, clearProps: "opacity" });
      } });
    } else setLang(b.dataset.setLang);
  }));

  /* ── Theme ───────────────────────────────────────────────── */
  const metaTheme = $('meta[name="theme-color"]');
  function setTheme(t) {
    html.dataset.theme = t;
    store.set("dlx-theme", t);
    metaTheme?.setAttribute("content", t === "dark" ? "#08080F" : "#F4F2EC");
  }
  setTheme(html.dataset.theme || "light");
  $$("[data-theme-toggle]").forEach((b) => b.addEventListener("click", (e) => {
    const next = html.dataset.theme === "dark" ? "light" : "dark";
    // Circular reveal from the click point where supported.
    if (document.startViewTransition && motion) {
      const x = e.clientX || innerWidth / 2, y = e.clientY || 40;
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(() => setTheme(next));
      vt.ready.then(() => document.documentElement.animate(
        { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(.22,1,.36,1)", pseudoElement: "::view-transition-new(root)" },
      )).catch(() => {});
    } else setTheme(next);
  }));

  /* ── Navigation ──────────────────────────────────────────── */
  const nav = $(".nav");
  const burger = $(".burger");
  let lenis = null;
  function closeMenu() { html.classList.remove("menu-open"); burger?.setAttribute("aria-expanded", false); $(".mobile-menu")?.setAttribute("aria-hidden", true); lenis?.start(); }
  burger?.addEventListener("click", () => {
    const o = html.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", o);
    $(".mobile-menu").setAttribute("aria-hidden", !o);
    o ? lenis?.stop() : lenis?.start();
  });
  // Smooth anchor scrolling
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2 && id !== "#") return;
    const target = id === "#" ? null : $(id);
    if (id !== "#" && !target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target || 0, { offset: id === "#top" ? 0 : -80, duration: 1.4 });
    else (target || document.body).scrollIntoView({ behavior: "smooth" });
  }));
  let lastY = 0;
  function onScrollBasic() {
    const y = scrollY;
    nav?.classList.toggle("scrolled", y > 20);
    nav?.classList.toggle("hide", y > lastY && y > 500 && !html.classList.contains("menu-open"));
    $(".wa-fab")?.classList.toggle("show", y > 600);
    lastY = y;
  }
  addEventListener("scroll", onScrollBasic, { passive: true });
  onScrollBasic();

  /* ── Spotlight cards ─────────────────────────────────────── */
  document.addEventListener("pointermove", (e) => {
    const c = e.target.closest?.(".spot");
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", `${e.clientX - r.left}px`);
    c.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });

  /* ── QR codes ────────────────────────────────────────────── */
  function makeQR(text, ecc = "M") {
    if (!window.qrcode) return null;
    window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs["UTF-8"];
    const q = window.qrcode(0, ecc);
    q.addData(text || " ");
    q.make();
    return q;
  }
  function drawQR(canvas, text, { fg = "#0B0B14", bg = "#FFFFFF", scale = 1 } = {}) {
    const q = makeQR(text);
    if (!q) return;
    const n = q.getModuleCount(), quiet = 2, size = canvas.width * scale;
    const cell = Math.floor(size / (n + quiet * 2));
    const off = Math.floor((size - cell * n) / 2);
    const out = scale === 1 ? canvas : Object.assign(document.createElement("canvas"), { width: size, height: size });
    const ctx = out.getContext("2d");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = fg;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(off + c * cell, off + r * cell, cell, cell);
    return out;
  }
  const qrInput = $("[data-qr-input]"), qrCanvas = $("[data-qr-canvas]");
  if (qrInput && qrCanvas) {
    const redraw = () => {
      drawQR(qrCanvas, qrInput.value.trim() || "https://digilax.com");
      if (motion) gsap.fromTo(qrCanvas, { scale: .94 }, { scale: 1, duration: .4, ease: "back.out(3)" });
    };
    let t; qrInput.addEventListener("input", () => { clearTimeout(t); t = setTimeout(redraw, 120); });
    redraw();
    $("[data-qr-download]")?.addEventListener("click", () => {
      const big = drawQR(qrCanvas, qrInput.value.trim() || "https://digilax.com", { scale: 6 });
      const a = document.createElement("a");
      a.href = big.toDataURL("image/png"); a.download = "qr-code.png"; a.click();
      redraw();
    });
  }
  const cardQR = $("[data-card-qr]");
  if (cardQR) drawQR(cardQR, `https://wa.me/${cfg.whatsapp}`, { bg: "#F4F2EC" });
  const miniQR = $(".qr-mini");
  if (miniQR) {
    const q = makeQR("https://digilax.com", "L");
    if (q) {
      const n = q.getModuleCount();
      miniQR.setAttribute("viewBox", `0 0 ${n} ${n}`);
      let d = "";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
      miniQR.innerHTML = `<path d="${d}" fill="#0B0B14"/>`;
    }
  }

  /* ── Business card flip ──────────────────────────────────── */
  const bcard = $(".bcard");
  if (bcard) {
    bcard.addEventListener("click", () => bcard.classList.toggle("flipped"));
    if (motion && matchMedia("(pointer: fine)").matches) {
      const inner = $(".bcard-in", bcard);
      bcard.addEventListener("pointermove", (e) => {
        if (bcard.classList.contains("flipped")) return;
        const r = bcard.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        gsap.to(inner, { rotateY: x * 18, rotateX: -y * 18, duration: .5 });
      });
      bcard.addEventListener("pointerleave", () => gsap.to(inner, { rotateY: 0, rotateX: 0, duration: .8, ease: "elastic.out(1,.5)", clearProps: "transform" }));
      bcard.addEventListener("click", () => gsap.set(inner, { clearProps: "transform" }));
    }
  }

  /* ── WhatsApp demo ───────────────────────────────────────── */
  let waTopic = 0, typeTimer;
  function setWaTopic(i) {
    waTopic = i;
    const msg = ui().wa?.[i] || "";
    const bubble = $("[data-wa-preview]"), link = $("[data-wa-link]");
    if (!bubble) return;
    $$("[data-wa-topic]").forEach((c) => c.classList.toggle("on", +c.dataset.waTopic === i));
    link.href = waUrl(msg);
    clearInterval(typeTimer);
    if (!motion) { bubble.textContent = msg; return; }
    let n = 0; bubble.textContent = "";
    typeTimer = setInterval(() => { n += 2; bubble.textContent = msg.slice(0, n); if (n >= msg.length) clearInterval(typeTimer); }, 18);
  }
  $$("[data-wa-topic]").forEach((c) => c.addEventListener("click", () => setWaTopic(+c.dataset.waTopic)));

  /* ── Quote → inbox simulation ────────────────────────────── */
  const inbox = $(".inbox-list"), badge = $(".sim-inbox .badge");
  let simIdx = 0, simBusy = false, simCount = 0;
  function renderInboxEmpty() {
    if (inbox && !simCount) inbox.innerHTML = `<li class="inbox-empty" style="border:0;background:none;box-shadow:none;justify-content:center">${ui().empty}</li>`;
  }
  async function runSim() {
    if (simBusy || !inbox) return;
    simBusy = true;
    const [who, what] = ui().inbox[simIdx % ui().inbox.length];
    simIdx++;
    const fields = $$(".sim-field");
    const type = (el, txt) => new Promise((res) => {
      el.textContent = ""; el.classList.add("typing");
      if (!motion) { el.textContent = txt; el.classList.remove("typing"); return res(); }
      let i = 0;
      const t = setInterval(() => { el.textContent = txt.slice(0, ++i); if (i >= txt.length) { clearInterval(t); el.classList.remove("typing"); res(); } }, 28);
    });
    await type(fields[0], who);
    await type(fields[1], what);
    const btn = $("[data-sim-send]");
    if (motion) await gsap.fromTo(btn, { scale: 1 }, { scale: .92, duration: .12, yoyo: true, repeat: 1 });
    if (!simCount) inbox.innerHTML = "";
    simCount++;
    const li = document.createElement("li");
    li.innerHTML = `<span class="av">${who.slice(0, 1)}</span><span><b></b><small></small></span><time>${ui().now}</time>`;
    li.querySelector("b").textContent = who; li.querySelector("small").textContent = what;
    inbox.prepend(li);
    while (inbox.children.length > 3) inbox.lastChild.remove();
    badge.textContent = simCount;
    if (motion) {
      gsap.from(li, { y: -30, opacity: 0, scale: .95, duration: .6, ease: "back.out(2)" });
      gsap.fromTo(badge, { scale: 1.6 }, { scale: 1, duration: .5, ease: "back.out(3)" });
    }
    simBusy = false;
  }
  $("[data-sim-send]")?.addEventListener("click", runSim);

  /* ── Reviews ─────────────────────────────────────────────── */
  function renderReviews() {
    const rail = $("[data-reviews]");
    if (!rail) return;
    const list = (cfg.testimonials || []).length ? cfg.testimonials : null;
    const items = list || Array.from({ length: 4 }, () => ({ quote: ui().review, name: ui().reviewName, company: ui().reviewCo, ph: true }));
    const card = (r) => `<article class="review${r.ph ? " placeholder" : ""}"><span class="stars" aria-label="5 stars">★★★★★</span><blockquote>“${esc(r.quote)}”</blockquote><div class="who"><span class="av">${r.ph ? "?" : esc(r.name.slice(0, 1))}</span><span><b>${esc(r.name)}</b><small>${esc(r.company || "")}</small></span></div></article>`;
    const set = items.map(card).join("");
    rail.innerHTML = set + set.replace(/<article /g, '<article aria-hidden="true" ');
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ── FAQ smooth accordion ────────────────────────────────── */
  $$(".faq details").forEach((d) => {
    const sum = $("summary", d), ans = $(".ans", d);
    sum.addEventListener("click", (e) => {
      if (!motion) return;
      e.preventDefault();
      if (d.open) {
        gsap.to(ans, { height: 0, duration: .45, ease: "power3.inOut", onComplete: () => { d.open = false; gsap.set(ans, { clearProps: "height" }); ST?.refresh(); } });
      } else {
        $$(".faq details[open]").forEach((o) => o !== d && sum !== $("summary", o) && $("summary", o).click());
        d.open = true;
        gsap.from(ans, { height: 0, duration: .55, ease: "power3.out", onComplete: () => ST?.refresh() });
      }
    });
  });

  /* ── Quote form ──────────────────────────────────────────── */
  const form = $(".qform");
  if (form) {
    const sheet = $(".sendsheet", form), done = $(".form-done", form), err = $(".form-err", form);
    $$("[data-plan]").forEach((a) => a.addEventListener("click", () => { form.elements.plan.value = a.dataset.plan; }));
    const showDone = () => { sheet.hidden = true; done.hidden = false; if (motion) gsap.from(done, { opacity: 0, duration: .4 }); };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = form.elements;
      const data = {
        name: f.name.value.trim(), company: f.company.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(),
        needs: $$('input[name="needs"]:checked', form).map((i) => i.value).join(", "), plan: f.plan.value,
        message: f.message.value.trim(), website: f.website.value, locale: lang,
      };
      const okContact = (data.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) || data.phone.replace(/\D/g, "").length >= 7;
      $$(".fld", form).forEach((l) => l.classList.remove("bad"));
      if (!data.name) f.name.closest(".fld").classList.add("bad");
      if (!okContact) { f.email.closest(".fld").classList.add("bad"); f.phone.closest(".fld").classList.add("bad"); }
      if (!data.message) f.message.closest(".fld").classList.add("bad");
      if (!data.name || !okContact || !data.message) {
        err.hidden = false;
        if (motion) gsap.fromTo(form, { x: -8 }, { x: 0, duration: .5, ease: "elastic.out(1,.3)" });
        return;
      }
      err.hidden = true;
      if (data.website) return showDone(); // bot trap
      if (cfg.formEndpoint) {
        try {
          const r = await fetch(cfg.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
          if (r.ok) return showDone();
        } catch {}
      }
      // GitHub Pages (or the server is unreachable): send through WhatsApp or email.
      const u = ui();
      const lines = [`${u.req} — Digilax`, "", `${u.lName}: ${data.name}`];
      if (data.company) lines.push(`${u.lCompany}: ${data.company}`);
      if (data.email) lines.push(`${u.lEmail}: ${data.email}`);
      if (data.phone) lines.push(`${u.lPhone}: ${data.phone}`);
      if (data.needs) lines.push(`${u.lNeeds}: ${data.needs}`);
      if (data.plan) lines.push(`${u.lPlan}: ${data.plan}`);
      lines.push("", `${u.lMsg}:`, data.message);
      const text = lines.join("\n");
      $("[data-send-wa]", form).href = waUrl(text);
      $("[data-send-mail]", form).href = `mailto:${cfg.email}?subject=${encodeURIComponent(`${u.req} — ${data.name}`)}&body=${encodeURIComponent(text)}`;
      sheet.hidden = false;
      if (motion) gsap.from($(".sendsheet-box", form), { y: 30, opacity: 0, duration: .5, ease: "power3.out" });
    });
    $("[data-sheet-close]", form)?.addEventListener("click", () => (sheet.hidden = true));
    $$("[data-send-wa], [data-send-mail]", form).forEach((a) => a.addEventListener("click", () => setTimeout(() => { showDone(); form.reset(); }, 600)));
  }

  /* ── Page transitions (curtain) ──────────────────────────── */
  const curtain = $(".curtain");
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-transition]");
    if (!a || !motion || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    try { sessionStorage.setItem("dlx-trans", "1"); } catch {}
    gsap.fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: .6, ease: "power4.inOut", onComplete: () => (location.href = a.href) });
  });
  addEventListener("pageshow", (e) => { if (e.persisted && curtain) gsap?.set(curtain, { yPercent: 100 }); });

  /* ── Initial language (before animations are built) ──────── */
  setLang(initialLang(), true);
  if (!motion) {
    $$("[data-reveal]").forEach((el) => (el.style.opacity = 1));
    $$(".hello span")[0]?.classList.add("on");
    return;
  }

  /* ═════════ Everything below needs GSAP + motion ═════════ */
  let dyn;

  // Smooth scrolling
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on("scroll", ST.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Scroll progress bar
  gsap.to(".progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: .3 } });

  // Active nav link
  $$('.nav-links a[href^="#"]').forEach((a) => {
    const sec = $(a.getAttribute("href"));
    if (sec) ST.create({ trigger: sec, start: "top 50%", end: "bottom 50%", onToggle: (s) => a.classList.toggle("active", s.isActive) });
  });

  // Generic reveal
  ST.batch("[data-reveal]", {
    start: "top 88%", once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: .08, overwrite: true }),
  });

  // Counters
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count, o = { v: 0 };
    ST.create({ trigger: el, start: "top 92%", once: true, onEnter: () => gsap.to(o, { v: end, duration: 2, ease: "power2.out", onUpdate: () => (el.textContent = fmt(Math.round(o.v))) }) });
  });

  // Services visual bits
  gsap.from(".web-viz span", { scaleY: 0, duration: 1.1, ease: "power3.out", stagger: .08, scrollTrigger: { trigger: ".web-viz", start: "top 85%" } });
  const hellos = $$(".hello span");
  let hi = 0;
  if (hellos.length) setInterval(() => { hellos.forEach((s, i) => s.classList.toggle("on", i === hi)); hi = (hi + 1) % hellos.length; }, 1100);

  // Hero: floating chips, language cycle, speed ring, mouse tilt
  const chips = $$(".float");
  chips.forEach((c, i) => gsap.to(c, { y: i % 2 ? 10 : -10, duration: 2.6 + i * .35, ease: "sine.inOut", yoyo: true, repeat: -1 }));
  const langChips = $$(".f-lang span");
  let li = 0;
  if (langChips.length) setInterval(() => { li = (li + 1) % langChips.length; langChips.forEach((s, i) => s.classList.toggle("on", i === li)); }, 1500);
  const stage = $(".stage-tilt");
  if (stage && matchMedia("(pointer: fine)").matches) {
    const rx = gsap.quickTo(stage, "rotationX", { duration: .8, ease: "power3" });
    const ry = gsap.quickTo(stage, "rotationY", { duration: .8, ease: "power3" });
    $(".hero").addEventListener("pointermove", (e) => { ry((e.clientX / innerWidth - .5) * 12); rx(-(e.clientY / innerHeight - .5) * 10); });
    $(".hero").addEventListener("pointerleave", () => { rx(0); ry(0); });
  }
  gsap.to(".hero-stage", { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero-copy", { yPercent: -8, opacity: .2, ease: "none", scrollTrigger: { trigger: ".hero", start: "40% top", end: "bottom top", scrub: true } });

  // Hero intro (runs after the preloader)
  function heroIntro() {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.from(".nav-inner", { y: -30, opacity: 0, duration: .9 })
      .from(".hero-pill", { y: 20, opacity: 0, duration: .8 }, "<.1")
      .from(".hero-title .wi", { yPercent: 115, rotate: 4, duration: 1.1, stagger: .06 }, "<.1")
      .from([".hero-sub", ".hero-ctas", ".hero-proof"], { y: 30, opacity: 0, duration: 1, stagger: .1 }, "<.4")
      .from(".browser", { y: 60, opacity: 0, scale: .92, duration: 1.3 }, "<-.6")
      .from(".float", { scale: .4, opacity: 0, duration: .9, stagger: .09, ease: "back.out(2)" }, "<.4")
      .to(".f-score .ring", { strokeDashoffset: 113 * .02, duration: 1.6, ease: "power2.out" }, "<.3")
      .from(".scroll-hint", { opacity: 0, duration: .6 }, "<");
  }

  buildDynamic(false);

  // Preloader
  const pre = $(".preloader");
  if (html.classList.contains("preload") && pre) {
    try { sessionStorage.setItem("dlx-seen", "1"); } catch {}
    lenis?.stop();
    const num = $(".pre-count span"), o = { v: 0 };
    gsap.timeline()
      .from(".pre-mark", { scale: 0, rotate: -90, duration: .8, ease: "back.out(2)" })
      .to(o, { v: 100, duration: 1, ease: "power2.inOut", onUpdate: () => (num.textContent = Math.round(o.v)) }, "<")
      .to(pre, { yPercent: -100, duration: .8, ease: "power4.inOut", onComplete: () => { html.classList.remove("preload"); pre.remove(); lenis?.start(); } })
      .add(heroIntro, "<.35");
  } else {
    pre?.remove();
    if (html.classList.contains("trans-in") && curtain) {
      try { sessionStorage.removeItem("dlx-trans"); } catch {}
      gsap.fromTo(curtain, { yPercent: 0 }, { yPercent: -100, duration: .8, ease: "power4.inOut", delay: .1, onComplete: () => { html.classList.remove("trans-in"); gsap.set(curtain, { yPercent: 100 }); } });
    }
    heroIntro();
  }

  // Case study images parallax
  $$("[data-speed]").forEach((img) => {
    const s = +img.dataset.speed;
    gsap.fromTo(img, { yPercent: (1 - s) * -60 }, { yPercent: (1 - s) * 60, ease: "none", scrollTrigger: { trigger: img.closest(".case-visual, .cs-gallery") || img, start: "top bottom", end: "bottom top", scrub: true } });
    gsap.set(img, { scale: 1.12 });
  });
  const caseVisual = $(".case-visual");
  if (caseVisual) gsap.from(".case-browser", { rotateX: 18, y: 80, scale: .92, transformPerspective: 1200, ease: "none", scrollTrigger: { trigger: caseVisual, start: "top bottom", end: "center 55%", scrub: true } });

  // Case study: image strip slides sideways while scrolling
  const strip = $(".cs-strip-track");
  if (strip) gsap.fromTo(strip, { x: 0 }, { x: () => -(strip.scrollWidth - innerWidth), ease: "none", scrollTrigger: { trigger: ".cs-strip", start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true } });

  // Demo: auto-run the inbox once when visible
  if (inbox) ST.create({ trigger: ".d-quote", start: "top 70%", once: true, onEnter: () => setTimeout(runSim, 400) });

  // Footer wordmark draws in
  const fw = $(".foot-word");
  if (fw) gsap.from(fw, { yPercent: 40, opacity: 0, ease: "none", scrollTrigger: { trigger: fw, start: "top bottom", end: "center 70%", scrub: true } });

  /* ── Language-dependent animations (rebuilt on change) ───── */
  function buildDynamic(langChanged) {
    dyn?.revert();
    $$("[data-split]").forEach((el) => splitWords(el));
    const st = $(".statement-text");
    if (st) splitWords(st, "lw");
    // Marquee clones
    $$(".marquee-track[data-clone]").forEach((c) => c.remove());
    $$(".marquee-row").forEach((row) => { const t = $(".marquee-track", row); const c = t.cloneNode(true); c.removeAttribute("data-i18n"); c.dataset.clone = ""; c.setAttribute("aria-hidden", "true"); row.append(c); });

    dyn = gsap.context(() => {
      // Headlines
      $$("[data-split]").forEach((el) => {
        if (el.classList.contains("hero-title") && !langChanged) return;
        gsap.from($$(".wi", el), { yPercent: 115, rotate: 3, duration: 1, ease: "power4.out", stagger: .045, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
      });
      // Statement: words light up while scrolling
      if (st) gsap.to($$(".lw", st), { opacity: 1, stagger: .1, ease: "none", scrollTrigger: { trigger: st, start: "top 80%", end: "bottom 40%", scrub: true } });
      // Marquees with scroll-velocity boost
      const tweens = $$(".marquee-row").map((row) => {
        const dir = +row.dataset.dir;
        return gsap.fromTo($$(".marquee-track", row), { xPercent: dir > 0 ? 0 : -100 }, { xPercent: dir > 0 ? -100 : 0, duration: 38, ease: "none", repeat: -1 });
      });
      ST.create({ trigger: ".marquee", start: "top bottom", end: "bottom top", onUpdate: (s) => {
        const v = 1 + Math.min(Math.abs(s.getVelocity()) / 300, 5);
        tweens.forEach((t) => gsap.to(t, { timeScale: v, duration: .2, overwrite: true, onComplete: () => gsap.to(t, { timeScale: 1, duration: 1 }) }));
      } });
      // Reviews rail drifts
      const rail = $("[data-reviews]");
      if (rail) gsap.fromTo(rail, { xPercent: 0 }, { xPercent: -50, duration: 60, ease: "none", repeat: -1 });
      // Process: horizontal scroll on wide screens
      const track = $(".process-track");
      if (track) {
        const mm = gsap.matchMedia();
        mm.add("(min-width: 901px)", () => {
          const rtl = html.dir === "rtl";
          const dist = () => Math.max(0, track.scrollWidth - innerWidth);
          gsap.to(track, { x: () => (rtl ? dist() : -dist()), ease: "none", scrollTrigger: { trigger: ".process", start: "top top", end: () => "+=" + dist(), pin: true, scrub: .6, invalidateOnRefresh: true } });
          gsap.to(".process-bar span", { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".process", start: "top top", end: () => "+=" + dist(), scrub: true } });
        });
        mm.add("(max-width: 900px)", () => {
          $$(".step").forEach((s) => gsap.from(s, { y: 60, opacity: 0, duration: .9, ease: "power3.out", scrollTrigger: { trigger: s, start: "top 88%" } }));
        });
      }
    });
    if (langChanged) ST.refresh();
  }
  // Custom cursor + magnetic buttons (mouse only)
  if (matchMedia("(pointer: fine)").matches) {
    const cur = $(".cursor"), dot = $(".cursor-dot"), ring = $(".cursor-ring"), label = $(".cursor-label");
    cur.classList.add("hide");
    const dx = gsap.quickTo(dot, "x", { duration: .1 }), dy = gsap.quickTo(dot, "y", { duration: .1 });
    const rx = gsap.quickTo(ring, "x", { duration: .45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: .45, ease: "power3" });
    addEventListener("pointermove", (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); cur.classList.remove("hide"); }, { passive: true });
    document.addEventListener("pointerleave", () => cur.classList.add("hide"));
    document.addEventListener("pointerover", (e) => {
      const lab = e.target.closest?.("[data-cursor]");
      cur.classList.toggle("label", !!lab);
      if (lab) label.textContent = lab.dataset.cursor;
      cur.classList.toggle("hover", !lab && !!e.target.closest?.("a, button, label, summary, input, select, textarea"));
    });
    $$(".magnetic").forEach((m) => {
      const mx = gsap.quickTo(m, "x", { duration: .5, ease: "power3" }), my = gsap.quickTo(m, "y", { duration: .5, ease: "power3" });
      m.addEventListener("pointermove", (e) => { const r = m.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .3); my((e.clientY - r.top - r.height / 2) * .35); });
      m.addEventListener("pointerleave", () => { gsap.to(m, { x: 0, y: 0, duration: .9, ease: "elastic.out(1,.4)" }); });
    });
  }
  if (caseVisual) caseVisual.dataset.cursor = "↗";
  caseVisual?.addEventListener("click", () => $(".case-ctas a")?.click());

  addEventListener("load", () => ST.refresh());
})();
