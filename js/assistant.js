/*
 * DIGILAX — AI assistant
 * Works right away in the browser from the knowledge below (EN/FR/TR/AR).
 * To connect a real AI model later (cPanel hosting), upload server/ai/ and set
 * aiEndpoint in js/config.js — answers then come from the model, and this
 * knowledge base stays as the fallback.
 */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const root = document.documentElement;
  const cfg = window.DIGILAX || {};
  const panel = $(".ai-panel");
  if (!panel) return;
  const body = $(".ai-body", panel), sug = $(".ai-sug", panel), form = $(".ai-form", panel), input = $("input", form);
  const teaser = $(".ai-teaser");
  const base = document.body.classList.contains("cs-page") ? "../" : "";
  const lang = () => (["en", "fr", "tr", "ar"].includes(root.lang) ? root.lang : "en");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const waUrl = (t) => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(t)}`;
  const history = [];

  /* ── What visitors may ask (keywords in 4 languages) ─────── */
  const KW = {
    start: ["want a website", "need a website", "new website", "build my", "make me a", "create a website", "site yaptır", "web sitesi istiyorum", "site istiyorum", "siteye ihtiyac", "je veux un site", "besoin d un site", "créer un site", "creer un site", "faire un site", "اريد موقع", "احتاج موقع", "موقع جديد", "انشاء موقع"],
    price: ["price", "cost", "how much", "budget", "expensive", "cheap", "fiyat", "ucret", "ücret", "kaç para", "kac para", "maliyet", "pahali", "pahalı", "prix", "tarif", "combien", "coût", "cout", "budget", "سعر", "تكلفة", "كم يكلف", "بكم", "الاسعار", "ميزانية"],
    time: ["how long", "how fast", "how many days", "how many weeks", "deadline", "delivery time", "ne kadar sürer", "ne kadar surer", "kaç gün", "kac gun", "kaç hafta", "ne zaman hazır", "combien de temps", "délai", "delai", "quand", "كم يستغرق", "مدة", "متى يكون", "كم يوم"],
    ai: [" ai ", "chatbot", "chat bot", "assistant", "artificial", "gpt", "yapay zeka", "yapay zekâ", "asistan", " bot ", " ia ", "intelligence artificielle", "assistant ia", "ذكاء اصطناعي", "مساعد ذكي", "مساعد الي", "روبوت", "شات بوت"],
    lang: ["language", "arabic", "rtl", "translat", "multilingual", "french", "turkish", "russian", " dil", "dilde", "dilli", "arapça", "arapca", "çeviri", "ceviri", "langue", "arabe", "traduction", "multilingue", "لغة", "لغات", "عربي", "العربية", "ترجمة"],
    form: ["form", "quote request", "request form", "inbox", "formulaire", "demande de devis", "teklif formu", "form ", "نموذج", "استمارة"],
    social: ["whatsapp", "instagram", "linkedin", "facebook", "social", "sosyal", "réseaux", "reseaux", "واتساب", "انستغرام", "تواصل اجتماعي"],
    catalog: ["catalog", "product", "shop", "store", "e-commerce", "ecommerce", "katalog", "ürün", "urun", "magaza", "mağaza", "catalogue", "produit", "boutique", "كتالوج", "منتجات", "متجر"],
    qr: ["qr", "business card", "kartvizit", "carte de visite", "بطاقة", "باركود"],
    hosting: ["hosting", "domain", "server", "cpanel", "ssl", "email address", "professional email", "alan adı", "alan adi", "sunucu", "kurumsal e-posta", "hébergement", "hebergement", "domaine", "استضافة", "نطاق", "دومين", "سيرفر"],
    seo: ["seo", "google", "ranking", "search engine", "first page", "arama motoru", "référencement", "referencement", "جوجل", "محركات البحث"],
    work: ["portfolio", "example", "previous work", "your work", "projects", "references", "clients", "örnek", "ornek", "referans", "proje", "çalışmalar", "réalisation", "realisation", "exemple", "projets", "أعمال", "اعمال", "أمثلة", "امثلة", "مشاريع"],
    process: ["process", "how do you work", "steps", "how does it work", "süreç", "surec", "nasıl çalış", "nasil calis", "adım", "étapes", "etapes", "méthode", "comment ça marche", "خطوات", "طريقة العمل", "كيف تعملون"],
    support: ["after launch", "maintenance", "update", "change later", "edit myself", "support", "bakım", "bakim", "güncelle", "guncelle", "değişiklik", "destek", "maintenance", "modifier", "mise à jour", "صيانة", "تحديث", "تعديل", "دعم"],
    contact: ["contact", "phone", "call", "email", "e-mail", "address", "where are you", "reach you", "iletişim", "iletisim", "telefon", "numara", "adres", "nerede", "contacter", "appeler", "téléphone", "telephone", "adresse", "où êtes", "اتصال", "هاتف", "رقم", "عنوان", "اين انتم", "ايميل"],
    services: ["service", "what do you do", "what can you", "offer", "hizmet", "ne yapıyorsunuz", "ne yapiyorsunuz", "neler yap", "que faites", "vos services", "proposez", "خدمات", "ماذا تقدم", "ماذا تفعلون"],
    hello: ["hello", "hi ", "hey", "good morning", "merhaba", "selam", "iyi günler", "bonjour", "salut", "bonsoir", "مرحبا", "السلام", "اهلا", "أهلا"],
    thanks: ["thank", "thx", "teşekkür", "tesekkur", "sağ ol", "sag ol", "merci", "شكرا", "شكراً"],
  };
  const ORDER = ["start", "price", "time", "ai", "lang", "form", "social", "catalog", "qr", "hosting", "seo", "work", "process", "support", "contact", "services", "thanks", "hello"];
  const norm = (s) => (" " + s.toLocaleLowerCase(lang() === "tr" ? "tr" : undefined)
    .replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/[’']/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim() + " ");
  function intent(q) {
    const s = norm(q);
    return ORDER.find((k) => KW[k].some((w) => s.includes(norm(w).slice(w.startsWith(" ") ? 0 : 1, w.endsWith(" ") ? undefined : -1))));
  }

  /* ── Answers ─────────────────────────────────────────────── */
  const go = (hash, label) => ({ go: hash, label });
  const WA = (label) => ({ wa: true, label });
  const A = {
    en: {
      greet: "<p>Hi! I'm the Digilax assistant 👋</p><p>Ask me about websites, prices, timelines, languages, AI assistants — anything about getting your business online.</p>",
      sug: ["How much does a website cost?", "How long does it take?", "Can you add an AI assistant?", "Show me your work", "Do you build in Arabic?"],
      fallback: "<p>Good question — I'm not sure I understood it correctly. Our team can answer you personally on WhatsApp, usually within the hour.</p>",
      waLabel: "Ask on WhatsApp", formLabel: "Open the quote form",
      i: {
        start: ["<p>Great — let's build it! 🚀 Tell us a little about your business in the quote form (2 minutes), or message us directly on WhatsApp. We reply within one working day with ideas and a tailored quote.</p>", [go("#contact", "Open the quote form"), WA("WhatsApp us")]],
        price: ["<p>Every business is different, so we don't use fixed prices. After a <b>free 20-minute call</b> about your needs, we send a clear written quote — nothing starts until you agree.</p><p>The price depends on pages, languages, catalog, forms and hosting.</p>", [go("#pricing", "See the packages"), WA("Get a quote on WhatsApp")]],
        time: ["<p>Usually:</p><ul><li>One-page site: about <b>1 week</b></li><li>Complete business site: <b>2–3 weeks</b></li><li>Catalog / multilingual: depends on the number of products and languages</li></ul><p>The fastest projects are the ones where texts and photos arrive quickly.</p>", [go("#process", "How we work")]],
        ai: ["<p>Yes! We add AI assistants like me to our clients' websites. It answers your visitors 24/7 <b>in their language</b> — services, opening hours, pricing approach, FAQs — and sends serious requests to your WhatsApp or email.</p><p>Several of our recent sites already have one (clinics, industry, consultancy).</p>", [go("#work", "See sites with AI"), go("#contact", "I want one")]],
        lang: ["<p>Yes — we build in <b>English, French, Turkish, Russian, Arabic</b> and more. Arabic pages are fully mirrored right-to-left. Try it: switch this site to العربية with the language button at the top.</p>", [go("#demos", "Try the language demo")]],
        form: ["<p>Our quote forms send every request to <b>your email</b> as a clean message, and your client gets an automatic confirmation in their language. You can also receive requests on WhatsApp.</p>", [go("#demos", "See a request arrive")]],
        social: ["<p>We add one-tap <b>WhatsApp</b> buttons with a pre-written message, plus Instagram, LinkedIn and other social links — so clients can reach you in one click.</p>", [go("#demos", "Try the WhatsApp demo")]],
        catalog: ["<p>Yes — we build product catalogs with photos, categories, filters and search. One of our clients has a <b>1,448-page</b> export site with hundreds of products, each with a quote request button.</p>", [go("#work", "See the project")]],
        qr: ["<p>We create branded <b>QR codes</b> (shop, packaging, fairs, table menus) and digital or print-ready <b>business cards</b> linked to your site. Make one yourself in our QR demo!</p>", [go("#demos", "Open the QR demo")]],
        hosting: ["<p>We set up everything: <b>cPanel hosting</b>, your domain name, the SSL padlock and professional email addresses (you@yourbusiness.com).</p>", [go("#contact", "Ask about hosting")]],
        seo: ["<p>Every site we build is fast, cleanly structured and ready for Google: titles and descriptions, Google Maps, Search Console. Good SEO also needs good content — we help you write it.</p>"],
        work: ["<p>We've built <b>10 websites</b> so far: clinics, an ENT practice, industrial manufacturers, a sourcing company, an HR consultancy, a café QR menu, a perfume brand and a 1,448-page textile export site. Client names stay private, but you can open the live demos.</p>", [go("#work", "See all projects")]],
        process: ["<p>Four simple steps:</p><ul><li><b>Free call & plan</b> — day 1</li><li><b>Design & content</b> — week 1</li><li><b>Build & connect</b> forms, WhatsApp, catalog — weeks 2–3</li><li><b>Launch & support</b></li></ul>", [go("#process", "See the steps")]],
        support: ["<p>Every package includes free changes for a period after launch. After that you can choose a simple care plan or pay only for the changes you need. We also show you how to update texts yourself.</p>"],
        contact: () => [`<p>You can reach us:</p><ul><li>WhatsApp: <b dir="ltr">${esc(cfg.phone || "")}</b></li><li>Email: <b>${esc(cfg.email || "")}</b></li><li>${esc(cfg.hours || "")}</li></ul>`, [WA("WhatsApp"), go("#contact", "Contact form")]],
        services: ["<p>We build websites for small and medium businesses, plus the systems around them:</p><ul><li>Business websites & product catalogs</li><li>Quote forms that email you</li><li>WhatsApp, Instagram & LinkedIn buttons</li><li>Multilingual sites incl. Arabic RTL</li><li>AI assistants</li><li>QR codes, business cards, hosting & email</li></ul>", [go("#services", "All services")]],
        hello: ["<p>Hello! 😊 How can I help you today?</p>"],
        thanks: ["<p>You're welcome! If you'd like a quote, our team is one message away.</p>", [WA("WhatsApp us")]],
      },
    },
    fr: {
      greet: "<p>Bonjour ! Je suis l'assistant Digilax 👋</p><p>Posez-moi vos questions sur les sites web, les prix, les délais, les langues, les assistants IA…</p>",
      sug: ["Combien coûte un site ?", "Combien de temps faut-il ?", "Pouvez-vous ajouter un assistant IA ?", "Montrez-moi vos réalisations", "Faites-vous des sites en arabe ?"],
      fallback: "<p>Bonne question — je ne suis pas sûr d'avoir bien compris. Notre équipe peut vous répondre personnellement sur WhatsApp, en général dans l'heure.</p>",
      waLabel: "Demander sur WhatsApp", formLabel: "Ouvrir le formulaire",
      i: {
        start: ["<p>Super — construisons-le ! 🚀 Décrivez votre activité dans le formulaire de devis (2 minutes) ou écrivez-nous sur WhatsApp. Réponse sous un jour ouvré avec des idées et un devis sur mesure.</p>", [go("#contact", "Ouvrir le formulaire"), WA("WhatsApp")]],
        price: ["<p>Chaque entreprise est différente : pas de prix fixes. Après un <b>appel gratuit de 20 minutes</b> sur vos besoins, nous envoyons un devis écrit clair — rien ne commence sans votre accord.</p><p>Le prix dépend des pages, langues, catalogue, formulaires et hébergement.</p>", [go("#pricing", "Voir les formules"), WA("Devis sur WhatsApp")]],
        time: ["<p>En général :</p><ul><li>Site d'une page : environ <b>1 semaine</b></li><li>Site complet : <b>2 à 3 semaines</b></li><li>Catalogue / multilingue : selon le nombre de produits et de langues</li></ul>", [go("#process", "Notre méthode")]],
        ai: ["<p>Oui ! Nous ajoutons des assistants IA comme moi aux sites de nos clients. Il répond à vos visiteurs 24h/24 <b>dans leur langue</b> — services, horaires, FAQ — et transmet les vraies demandes sur votre WhatsApp ou par e-mail.</p><p>Plusieurs de nos sites récents en ont déjà un.</p>", [go("#work", "Voir les sites avec IA"), go("#contact", "J'en veux un")]],
        lang: ["<p>Oui — en <b>anglais, français, turc, russe, arabe</b> et plus. Les pages en arabe sont entièrement en miroir, de droite à gauche. Essayez : passez ce site en العربية avec le bouton de langue en haut.</p>", [go("#demos", "Essayer la démo")]],
        form: ["<p>Nos formulaires envoient chaque demande sur <b>votre e-mail</b>, et votre client reçoit une confirmation automatique dans sa langue. Vous pouvez aussi recevoir les demandes sur WhatsApp.</p>", [go("#demos", "Voir une demande arriver")]],
        social: ["<p>Nous ajoutons des boutons <b>WhatsApp</b> avec message pré-écrit, plus Instagram, LinkedIn et vos autres réseaux — vos clients vous joignent en un clic.</p>", [go("#demos", "Essayer la démo WhatsApp")]],
        catalog: ["<p>Oui — catalogues produits avec photos, catégories, filtres et recherche. Un de nos clients a un site export de <b>1 448 pages</b> avec des centaines de produits.</p>", [go("#work", "Voir le projet")]],
        qr: ["<p>Nous créons des <b>QR codes</b> à votre image (boutique, emballage, salons, menus) et des <b>cartes de visite</b> numériques ou à imprimer reliées à votre site.</p>", [go("#demos", "Ouvrir la démo QR")]],
        hosting: ["<p>Nous configurons tout : <b>hébergement cPanel</b>, nom de domaine, cadenas SSL et adresses e-mail professionnelles.</p>", [go("#contact", "Nous contacter")]],
        seo: ["<p>Chaque site est rapide, bien structuré et prêt pour Google : titres, descriptions, Google Maps, Search Console. Un bon référencement demande aussi de bons contenus — nous vous aidons à les rédiger.</p>"],
        work: ["<p>Nous avons réalisé <b>10 sites</b> : cliniques, cabinet ORL, industriels, société de sourcing, cabinet RH, menu QR de café, marque de parfums et un site export textile de 1 448 pages. Les noms des clients restent privés, mais vous pouvez ouvrir les démos.</p>", [go("#work", "Voir tous les projets")]],
        process: ["<p>Quatre étapes :</p><ul><li><b>Appel gratuit & plan</b> — jour 1</li><li><b>Design & contenus</b> — semaine 1</li><li><b>Construction & connexions</b> — semaines 2–3</li><li><b>Lancement & suivi</b></li></ul>", [go("#process", "Voir les étapes")]],
        support: ["<p>Chaque formule inclut des modifications gratuites après le lancement. Ensuite : un contrat de maintenance simple ou seulement les changements dont vous avez besoin.</p>"],
        contact: () => [`<p>Pour nous joindre :</p><ul><li>WhatsApp : <b dir="ltr">${esc(cfg.phone || "")}</b></li><li>E-mail : <b>${esc(cfg.email || "")}</b></li></ul>`, [WA("WhatsApp"), go("#contact", "Formulaire")]],
        services: ["<p>Nous créons des sites pour les PME, et les systèmes autour :</p><ul><li>Sites vitrines & catalogues</li><li>Formulaires de devis par e-mail</li><li>Boutons WhatsApp, Instagram & LinkedIn</li><li>Sites multilingues dont l'arabe</li><li>Assistants IA</li><li>QR codes, cartes de visite, hébergement</li></ul>", [go("#services", "Tous les services")]],
        hello: ["<p>Bonjour ! 😊 Comment puis-je vous aider ?</p>"],
        thanks: ["<p>Avec plaisir ! Pour un devis, notre équipe est à un message de vous.</p>", [WA("WhatsApp")]],
      },
    },
    tr: {
      greet: "<p>Merhaba! Ben Digilax asistanıyım 👋</p><p>Web siteleri, fiyatlar, süreler, diller, yapay zekâ asistanları… merak ettiğiniz her şeyi sorun.</p>",
      sug: ["Bir web sitesi ne kadar tutar?", "Ne kadar sürede hazır olur?", "Yapay zekâ asistanı ekleyebilir misiniz?", "Projelerinizi göster", "Arapça site yapıyor musunuz?"],
      fallback: "<p>Güzel soru — tam anladığımdan emin değilim. Ekibimiz WhatsApp'tan size kişisel olarak, genellikle bir saat içinde cevap verir.</p>",
      waLabel: "WhatsApp'tan sor", formLabel: "Teklif formunu aç",
      i: {
        start: ["<p>Harika — hadi yapalım! 🚀 Teklif formunda işinizi kısaca anlatın (2 dakika) ya da bize doğrudan WhatsApp'tan yazın. Bir iş günü içinde fikirler ve size özel teklifle dönüyoruz.</p>", [go("#contact", "Teklif formunu aç"), WA("WhatsApp")]],
        price: ["<p>Her işletme farklı olduğu için sabit fiyat kullanmıyoruz. İhtiyaçlarınızı konuştuğumuz <b>ücretsiz 20 dakikalık</b> bir görüşmeden sonra net bir yazılı teklif gönderiyoruz — siz onaylamadan hiçbir şey başlamaz.</p><p>Fiyat; sayfa sayısı, diller, katalog, formlar ve hostinge göre değişir.</p>", [go("#pricing", "Paketleri gör"), WA("WhatsApp'tan teklif al")]],
        time: ["<p>Genellikle:</p><ul><li>Tek sayfalık site: yaklaşık <b>1 hafta</b></li><li>Eksiksiz kurumsal site: <b>2–3 hafta</b></li><li>Katalog / çok dilli: ürün ve dil sayısına göre</li></ul>", [go("#process", "Nasıl çalışıyoruz")]],
        ai: ["<p>Evet! Müşterilerimizin sitelerine benim gibi yapay zekâ asistanları ekliyoruz. Ziyaretçilerinize 7/24 <b>kendi dillerinde</b> cevap verir — hizmetler, çalışma saatleri, SSS — ve ciddi talepleri WhatsApp'ınıza veya e-postanıza iletir.</p><p>Son sitelerimizin çoğunda zaten var.</p>", [go("#work", "Yapay zekâlı siteleri gör"), go("#contact", "Ben de istiyorum")]],
        lang: ["<p>Evet — <b>İngilizce, Fransızca, Türkçe, Rusça, Arapça</b> ve daha fazlası. Arapça sayfalar tamamen sağdan sola çevrilir. Deneyin: üstteki dil butonundan siteyi العربية yapın.</p>", [go("#demos", "Dil demosunu dene")]],
        form: ["<p>Teklif formlarımız her talebi <b>e-postanıza</b> düzenli bir mesaj olarak gönderir; müşteriniz de kendi dilinde otomatik onay alır. Talepleri WhatsApp'tan da alabilirsiniz.</p>", [go("#demos", "Talebin gelişini izle")]],
        social: ["<p>Hazır mesajlı tek dokunuşluk <b>WhatsApp</b> butonları, Instagram, LinkedIn ve diğer sosyal bağlantılar ekliyoruz.</p>", [go("#demos", "WhatsApp demosunu dene")]],
        catalog: ["<p>Evet — fotoğraflı, kategorili, filtreli ve aramalı ürün katalogları yapıyoruz. Bir müşterimizin yüzlerce ürünlü <b>1.448 sayfalık</b> ihracat sitesi var.</p>", [go("#work", "Projeyi gör")]],
        qr: ["<p>Mağaza, ambalaj, fuar ve masa menüleri için markalı <b>QR kodlar</b> ve sitenize bağlı dijital ya da baskıya hazır <b>kartvizitler</b> hazırlıyoruz.</p>", [go("#demos", "QR demosunu aç")]],
        hosting: ["<p>Her şeyi kuruyoruz: <b>cPanel hosting</b>, alan adı, SSL kilidi ve kurumsal e-posta adresleri.</p>", [go("#contact", "Bize ulaşın")]],
        seo: ["<p>Yaptığımız her site hızlı, düzenli ve Google'a hazır: başlıklar, açıklamalar, Google Haritalar, Search Console. İyi SEO iyi içerik de ister — yazmanıza yardım ediyoruz.</p>"],
        work: ["<p>Şimdiye kadar <b>10 web sitesi</b> yaptık: klinikler, KBB muayenehanesi, sanayi üreticileri, tedarik şirketi, İK danışmanlığı, kafe QR menüsü, parfüm markası ve 1.448 sayfalık tekstil ihracat sitesi. Müşteri isimleri gizli; canlı demoları açabilirsiniz.</p>", [go("#work", "Tüm projeler")]],
        process: ["<p>Dört adım:</p><ul><li><b>Ücretsiz görüşme & plan</b> — 1. gün</li><li><b>Tasarım & içerik</b> — 1. hafta</li><li><b>Yapım & entegrasyon</b> — 2–3. hafta</li><li><b>Yayın & destek</b></li></ul>", [go("#process", "Adımları gör")]],
        support: ["<p>Her paket yayından sonra bir süre ücretsiz değişiklik içerir. Sonrasında basit bir bakım paketi seçebilir ya da yalnızca ihtiyacınız olan değişiklikler için ödeme yaparsınız.</p>"],
        contact: () => [`<p>Bize ulaşın:</p><ul><li>WhatsApp: <b dir="ltr">${esc(cfg.phone || "")}</b></li><li>E-posta: <b>${esc(cfg.email || "")}</b></li></ul>`, [WA("WhatsApp"), go("#contact", "İletişim formu")]],
        services: ["<p>KOBİ'ler için web siteleri ve etrafındaki sistemleri yapıyoruz:</p><ul><li>Kurumsal siteler & ürün katalogları</li><li>E-postaya gelen teklif formları</li><li>WhatsApp, Instagram & LinkedIn butonları</li><li>Arapça dahil çok dilli siteler</li><li>Yapay zekâ asistanları</li><li>QR kod, kartvizit, hosting & e-posta</li></ul>", [go("#services", "Tüm hizmetler")]],
        hello: ["<p>Merhaba! 😊 Size nasıl yardımcı olabilirim?</p>"],
        thanks: ["<p>Rica ederim! Teklif için ekibimiz bir mesaj uzağınızda.</p>", [WA("WhatsApp")]],
      },
    },
    ar: {
      greet: "<p>مرحباً! أنا مساعد Digilax 👋</p><p>اسألني عن المواقع والأسعار والمدة واللغات والمساعدين الأذكياء — أي شيء عن إطلاق نشاطك على الإنترنت.</p>",
      sug: ["كم تكلفة الموقع؟", "كم يستغرق إنجازه؟", "هل يمكنكم إضافة مساعد ذكي؟", "أرني أعمالكم", "هل تصممون مواقع بالعربية؟"],
      fallback: "<p>سؤال جيد — لست متأكداً أنني فهمته جيداً. يمكن لفريقنا الرد عليك شخصياً عبر واتساب، عادةً خلال ساعة.</p>",
      waLabel: "اسأل عبر واتساب", formLabel: "افتح نموذج الطلب",
      i: {
        start: ["<p>رائع — لنبدأ! 🚀 حدّثنا عن نشاطك في نموذج الطلب (دقيقتان) أو راسلنا مباشرة على واتساب. نرد خلال يوم عمل بأفكار وعرض سعر مخصّص.</p>", [go("#contact", "افتح النموذج"), WA("واتساب")]],
        price: ["<p>كل نشاط مختلف، لذلك لا نعتمد أسعاراً ثابتة. بعد <b>مكالمة مجانية مدتها 20 دقيقة</b> حول احتياجاتك نرسل لك عرض سعر مكتوباً وواضحاً — ولا يبدأ شيء قبل موافقتك.</p><p>يعتمد السعر على عدد الصفحات واللغات والكتالوج والنماذج والاستضافة.</p>", [go("#pricing", "شاهد الباقات"), WA("اطلب عرضاً عبر واتساب")]],
        time: ["<p>عادةً:</p><ul><li>موقع صفحة واحدة: نحو <b>أسبوع</b></li><li>موقع متكامل: <b>2–3 أسابيع</b></li><li>كتالوج / عدة لغات: حسب عدد المنتجات واللغات</li></ul>", [go("#process", "طريقة عملنا")]],
        ai: ["<p>نعم! نضيف مساعدين أذكياء مثلي إلى مواقع عملائنا. يرد على زوارك على مدار الساعة <b>بلغتهم</b> — الخدمات، ساعات العمل، الأسئلة الشائعة — ويحوّل الطلبات الجادة إلى واتساب أو بريدك.</p><p>كثير من مواقعنا الأخيرة تحتوي عليه بالفعل.</p>", [go("#work", "مواقع بها مساعد ذكي"), go("#contact", "أريد واحداً")]],
        lang: ["<p>نعم — <b>العربية والإنجليزية والفرنسية والتركية والروسية</b> وغيرها. الصفحات العربية معكوسة بالكامل من اليمين لليسار، كما ترى الآن.</p>", [go("#demos", "جرّب عرض اللغات")]],
        form: ["<p>نماذجنا ترسل كل طلب إلى <b>بريدك الإلكتروني</b> برسالة منظّمة، ويتلقى عميلك تأكيداً تلقائياً بلغته. ويمكنك أيضاً استقبال الطلبات على واتساب.</p>", [go("#demos", "شاهد وصول طلب")]],
        social: ["<p>نضيف أزرار <b>واتساب</b> برسالة جاهزة، وروابط إنستغرام ولينكدإن وغيرها — ليصل إليك العملاء بلمسة واحدة.</p>", [go("#demos", "جرّب زر واتساب")]],
        catalog: ["<p>نعم — كتالوجات منتجات بالصور والتصنيفات والفلاتر والبحث. أحد عملائنا لديه موقع تصدير من <b>1448 صفحة</b> بمئات المنتجات.</p>", [go("#work", "شاهد المشروع")]],
        qr: ["<p>نصمّم <b>رموز QR</b> بهويتك (للمتجر والعبوات والمعارض وقوائم الطاولات) و<b>بطاقات عمل</b> رقمية أو للطباعة مرتبطة بموقعك.</p>", [go("#demos", "افتح عرض QR")]],
        hosting: ["<p>نجهّز كل شيء: <b>استضافة cPanel</b> واسم النطاق وشهادة SSL وعناوين بريد احترافية.</p>", [go("#contact", "تواصل معنا")]],
        seo: ["<p>كل موقع نبنيه سريع ومنظّم وجاهز لـ Google: العناوين والأوصاف وخرائط Google وSearch Console. والظهور الجيد يحتاج محتوى جيداً — نساعدك في كتابته.</p>"],
        work: ["<p>أنجزنا <b>10 مواقع</b> حتى الآن: عيادات، طبيب أنف وأذن وحنجرة، مصانع، شركة توريد، استشارات موارد بشرية، قائمة QR لمقهى، علامة عطور، وموقع تصدير منسوجات من 1448 صفحة. أسماء العملاء سرّية، لكن يمكنك فتح العروض الحية.</p>", [go("#work", "كل المشاريع")]],
        process: ["<p>أربع خطوات:</p><ul><li><b>مكالمة مجانية وخطة</b> — اليوم 1</li><li><b>التصميم والمحتوى</b> — الأسبوع 1</li><li><b>البناء والربط</b> — الأسبوع 2–3</li><li><b>الإطلاق والدعم</b></li></ul>", [go("#process", "شاهد الخطوات")]],
        support: ["<p>كل باقة تتضمن تعديلات مجانية لفترة بعد الإطلاق. بعدها يمكنك اختيار خطة صيانة بسيطة أو الدفع فقط مقابل التعديلات التي تحتاجها.</p>"],
        contact: () => [`<p>للتواصل معنا:</p><ul><li>واتساب: <b dir="ltr">${esc(cfg.phone || "")}</b></li><li>البريد: <b>${esc(cfg.email || "")}</b></li></ul>`, [WA("واتساب"), go("#contact", "نموذج التواصل")]],
        services: ["<p>نبني مواقع للشركات الصغيرة والمتوسطة والأنظمة المحيطة بها:</p><ul><li>مواقع الشركات وكتالوجات المنتجات</li><li>نماذج طلب تصل إلى بريدك</li><li>أزرار واتساب وإنستغرام ولينكدإن</li><li>مواقع متعددة اللغات مع العربية</li><li>مساعدون أذكياء</li><li>رموز QR وبطاقات عمل واستضافة وبريد</li></ul>", [go("#services", "كل الخدمات")]],
        hello: ["<p>أهلاً! 😊 كيف يمكنني مساعدتك؟</p>"],
        thanks: ["<p>على الرحب! لعرض سعر، فريقنا على بُعد رسالة واحدة.</p>", [WA("واتساب")]],
      },
    },
  };
  const K = () => A[lang()];

  function localAnswer(q) {
    const k = intent(q), d = K();
    if (!k) return { html: d.fallback, acts: [WA(d.waLabel), go("#contact", d.formLabel)] };
    let a = d.i[k];
    if (typeof a === "function") a = a();
    return { html: a[0], acts: a[1] || [] };
  }

  /* ── Rendering ───────────────────────────────────────────── */
  const ICON = { wa: '<svg class="ic"><use href="#i-chat"/></svg>', go: '<svg class="ic flip"><use href="#i-arrow"/></svg>' };
  function actsHTML(acts, q) {
    if (!acts.length) return "";
    return `<div class="ai-acts">${acts.map((a) => a.wa
      ? `<a class="wa" href="${waUrl(q || K().waLabel)}" target="_blank" rel="noopener">${ICON.wa}${esc(a.label)}</a>`
      : `<a href="${base}${a.go}" data-ai-go="${a.go}">${esc(a.label)}${ICON.go}</a>`).join("")}</div>`;
  }
  function add(who, html) {
    const m = document.createElement("div");
    m.className = "ai-m " + who;
    if (who === "me") m.textContent = html; else m.innerHTML = html;
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    return m;
  }
  function renderSug() { sug.innerHTML = K().sug.map((s) => `<button type="button">${esc(s)}</button>`).join(""); }

  async function ask(q) {
    q = q.trim();
    if (!q) return;
    add("me", q);
    history.push({ role: "user", content: q });
    const bubble = add("bot", '<span class="ai-typing"><i></i><i></i><i></i></span>');
    let html, acts;
    if (cfg.aiEndpoint) {
      try {
        const r = await fetch(cfg.aiEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: lang(), messages: history.slice(-10) }) });
        const j = r.ok ? await r.json() : null;
        if (j && j.reply) {
          html = esc(j.reply).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
          acts = [WA(K().waLabel)];
          history.push({ role: "assistant", content: j.reply });
        }
      } catch {}
    }
    const local = !html;
    if (local) {
      ({ html, acts } = localAnswer(q));
      await new Promise((r) => setTimeout(r, 450 + Math.random() * 450));
    }
    bubble.innerHTML = html + actsHTML(acts, q);
    if (local) history.push({ role: "assistant", content: bubble.textContent });
    body.scrollTop = body.scrollHeight;
  }

  /* ── Open / close ────────────────────────────────────────── */
  let greeted = false;
  function open(q) {
    root.classList.add("ai-open");
    panel.setAttribute("aria-hidden", "false");
    document.querySelectorAll("[data-ai-open]").forEach((b) => b.setAttribute("aria-expanded", "true"));
    teaser && (teaser.hidden = true);
    try { sessionStorage.setItem("dlx-ai-seen", "1"); } catch {}
    if (!greeted) { greeted = true; add("bot", K().greet); renderSug(); }
    if (q) ask(q);
    if (matchMedia("(pointer: fine)").matches) setTimeout(() => input.focus(), 300);
  }
  function close() {
    root.classList.remove("ai-open");
    panel.setAttribute("aria-hidden", "true");
    document.querySelectorAll("[data-ai-open]").forEach((b) => b.setAttribute("aria-expanded", "false"));
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-ai-open]")) { e.preventDefault(); open(); return; }
    if (e.target.closest("[data-ai-close]")) { close(); return; }
    const g = e.target.closest("[data-ai-go]");
    if (g && !base) {
      const el = document.querySelector(g.dataset.aiGo);
      if (!el) return;
      e.preventDefault();
      close();
      window.dlxScrollTo ? window.dlxScrollTo(el) : el.scrollIntoView({ behavior: "smooth" });
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && root.classList.contains("ai-open")) close(); });
  form.addEventListener("submit", (e) => { e.preventDefault(); const q = input.value; input.value = ""; ask(q); });
  sug.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) ask(b.textContent); });
  document.addEventListener("dlx:lang", () => { if (greeted) renderSug(); });

  // Friendly nudge after a few seconds, once per visit.
  if (teaser) {
    let seen = false;
    try { seen = sessionStorage.getItem("dlx-ai-seen") === "1"; } catch {}
    if (!seen) setTimeout(() => { if (!root.classList.contains("ai-open")) teaser.hidden = false; }, 7000);
    teaser.addEventListener("click", (e) => {
      teaser.hidden = true;
      try { sessionStorage.setItem("dlx-ai-seen", "1"); } catch {}
      if (!e.target.closest(".ai-teaser-x")) open();
    });
  }
})();
