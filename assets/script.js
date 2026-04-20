document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const currentPage = document.body.dataset.page;
document.querySelectorAll(".nav a").forEach((link) => {
  const href = link.getAttribute("href") || "";
  const isActive =
    (currentPage === "home" && href.endsWith("index.html")) ||
    (currentPage === "catalog" && href.endsWith("catalog.html")) ||
    (["reading", "meaning", "methods"].includes(currentPage) && href.endsWith("catalog.html")) ||
    (currentPage === "links" && href.endsWith("links.html"));
  if (isActive) link.classList.add("is-active");
});

const shareInput = document.querySelector("[data-share-url]");
const copyButton = document.querySelector("[data-copy-link]");
const copyFeedback = document.querySelector("[data-copy-feedback]");

if (shareInput) shareInput.value = window.location.href;

if (copyButton && shareInput) {
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareInput.value);
      if (copyFeedback) copyFeedback.textContent = "链接已复制，可以直接分享。";
    } catch {
      shareInput.select();
      if (copyFeedback) copyFeedback.textContent = "复制失败，请手动选中链接复制。";
    }
  });
}

// ── Utilities ──

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildExternalLink(url, label, className = "inline-link") {
  return `<a class="${className}" href="${url}" target="_blank" rel="noreferrer">${label}</a>`;
}

function zeroPadNumber(value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return "00";
  return normalized < 10 ? `0${normalized}` : String(normalized);
}

function resolveUrl(path = "") {
  try {
    return new URL(path, window.location.href).toString();
  } catch {
    return path;
  }
}

async function fetchTextFile(path) {
  const url = resolveUrl(path);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${url} (${response.status})`);
  return response.text();
}

function isBreakOnlyLine(text = "") {
  return /^<br\s*\/?>$/i.test(text.trim());
}

function renderInlineFragment(text = "") {
  let working = escapeHtml(text.trim());
  const placeholders = [];

  working = working.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => {
    const token = `__LINK_${placeholders.length}__`;
    placeholders.push(buildExternalLink(url, label));
    return token;
  });

  working = working.replace(/(^|[\s(>])((https?:\/\/[^\s<)]+))/g, (_, prefix, url) => {
    const token = `__LINK_${placeholders.length}__`;
    placeholders.push(buildExternalLink(url, url));
    return `${prefix}${token}`;
  });

  working = working
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>");

  placeholders.forEach((html, index) => {
    working = working.replace(`__LINK_${index}__`, html);
  });

  return working;
}

function renderInlineMarkdown(text = "") {
  const lines = text
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parts = [];
  lines.forEach((line) => {
    if (isBreakOnlyLine(line)) {
      parts.push("<br>");
      return;
    }
    if (parts.length && parts[parts.length - 1] !== "<br>") parts.push("<br>");
    parts.push(renderInlineFragment(line));
  });

  return parts.join("");
}

function extractLinksFromText(text = "") {
  const links = [];
  let remaining = text.trim();

  remaining = remaining.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => {
    links.push({ label: label.trim(), url: url.trim() });
    return " ";
  });

  remaining = remaining.replace(/https?:\/\/[^\s<)]+/g, (url) => {
    links.push({ label: "", url: url.trim() });
    return " ";
  });

  remaining = remaining
    .split("\n")
    .map((line) => {
      if (isBreakOnlyLine(line)) return "<br>";
      return line.replace(/\s{2,}/g, " ").trim();
    })
    .filter((line) => line || isBreakOnlyLine(line))
    .join("\n")
    .trim();

  return { text: remaining, links };
}

function getLinkDisplay(link) {
  const safeUrl = escapeHtml(link.url);
  const safeLabel = escapeHtml(link.label || "");

  try {
    const parsed = new URL(link.url);
    const host = parsed.hostname.replace(/^www\./, "");
    const isPdf = /\.pdf($|[?#])/i.test(parsed.pathname);

    if (safeLabel && safeLabel !== safeUrl) {
      return { url: safeUrl, label: safeLabel, meta: `${host}${isPdf ? " · PDF" : ""}` };
    }
    return { url: safeUrl, label: isPdf ? "PDF链接" : "文章链接", meta: `${host}${isPdf ? " · PDF" : ""}` };
  } catch {
    return { url: safeUrl, label: safeLabel || "文章链接", meta: "外部资源" };
  }
}

function renderDescriptionBlock(text = "") {
  const { text: note, links } = extractLinksFromText(text);
  const parts = [];

  if (note) parts.push(`<p class="reading-summary">${renderInlineMarkdown(note)}</p>`);

  if (links.length) {
    parts.push(`
      <div class="reading-links">
        ${links
          .map((link) => {
            const display = getLinkDisplay(link);
            return `
              <a class="reading-link" href="${display.url}" target="_blank" rel="noreferrer">
                <span class="reading-link-label">${display.label}</span>
                <span class="reading-link-meta">${display.meta}</span>
              </a>`;
          })
          .join("")}
      </div>`);
  }

  return parts.join("");
}

// ── Markdown Parser ──

function parseReadingMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const data = { title: "", meta: {}, sections: [] };

  let currentSection = null;
  let currentItem = null;
  let currentFieldTarget = null;

  const setField = (target, key, value, append = false) => {
    if (!append || !target[key]) {
      target[key] = value.trim();
      return;
    }
    target[key] = `${target[key]}\n${value.trim()}`.trim();
  };

  const finalizeItem = () => {
    if (currentSection && currentItem) {
      currentSection.items.push(currentItem);
      currentItem = null;
    }
  };

  const ensureSection = () => {
    if (!currentSection) {
      currentSection = { title: "未分类", meta: {}, items: [] };
      data.sections.push(currentSection);
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("# ")) {
      data.title = trimmed.slice(2).trim();
      currentFieldTarget = null;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      finalizeItem();
      currentSection = { title: trimmed.slice(3).trim(), meta: {}, items: [] };
      data.sections.push(currentSection);
      currentFieldTarget = null;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      ensureSection();
      finalizeItem();
      currentItem = { title: trimmed.slice(4).trim(), fields: {} };
      currentFieldTarget = null;
      continue;
    }

    const fieldMatch = trimmed.match(/^([^：]+)：\s*(.*)$/);
    if (fieldMatch) {
      const [, key, value] = fieldMatch;
      if (currentItem) {
        setField(currentItem.fields, key.trim(), value);
        currentFieldTarget = { target: currentItem.fields, key: key.trim() };
      } else if (currentSection) {
        setField(currentSection.meta, key.trim(), value);
        currentFieldTarget = { target: currentSection.meta, key: key.trim() };
      } else {
        setField(data.meta, key.trim(), value);
        currentFieldTarget = { target: data.meta, key: key.trim() };
      }
      continue;
    }

    if (currentFieldTarget) {
      setField(currentFieldTarget.target, currentFieldTarget.key, trimmed, true);
    }
  }

  finalizeItem();
  return data;
}

// ── Progress Tracking (localStorage) ──

function getProgress(title) {
  try {
    return localStorage.getItem(`progress:${title}`) || "";
  } catch {
    return "";
  }
}

function setProgress(title, status) {
  try {
    if (status) {
      localStorage.setItem(`progress:${title}`, status);
    } else {
      localStorage.removeItem(`progress:${title}`);
    }
  } catch {
    // localStorage unavailable
  }
}

function cycleProgress(current) {
  const cycle = ["", "待读", "在读", "读完"];
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
}

function progressClass(status) {
  if (status === "在读") return "progress-reading";
  if (status === "读完") return "progress-done";
  if (status === "待读") return "progress-todo";
  return "";
}

// ── Reading Page Rendering ──

function getItemThought(fields) {
  const thought = (fields["我的想法"] || "").trim();
  if (thought) return thought;

  const status = (fields["状态"] || "").trim();
  if (status.includes("未读完")) return "还没读完，之后补。";
  if (status.includes("待读") || status.includes("未开始")) return "还没开始读，之后补。";
  return "暂时还没有补充想法。";
}

function buildItemIndex(itemIndex) {
  return zeroPadNumber(itemIndex + 1);
}

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]/g, "");
}

function renderReadingSection(section, sectionIndex) {
  const label = sectionIndex === 0 ? "MAIN ROUTE" : `SECTION ${zeroPadNumber(sectionIndex + 1)}`;
  const sectionNote = section.meta["说明"] || "";
  const sectionId = `section-${slugify(section.title) || sectionIndex}`;
  const listClass =
    section.title.includes("方向书") || section.title.includes("方向")
      ? "reading-list reading-list-compact"
      : "reading-list";

  const items = section.items
    .map((item, itemIndex) => {
      const fields = item.fields;
      const badges = [];
      if (fields["难度"]) badges.push(fields["难度"]);
      if (fields["标签"]) badges.push(fields["标签"]);
      if (fields["状态"]) badges.push(`状态：${fields["状态"]}`);

      const prog = getProgress(item.title);
      const progCls = progressClass(prog);

      return `
        <li class="reading-item" data-title="${escapeHtml(item.title)}" data-author="${escapeHtml(fields["作者"] || "")}" data-desc="${escapeHtml(fields["简介"] || "")}" data-difficulty="${escapeHtml(fields["难度"] || "")}" data-status="${escapeHtml(fields["状态"] || "")}">
          <article>
            <div class="reading-topline">
              <span class="reading-index">${buildItemIndex(itemIndex)}</span>
              <div class="reading-badges">
                ${badges.map((badge) => `<span class="reading-badge">${renderInlineMarkdown(badge)}</span>`).join("")}
              </div>
            </div>
            <h3>${renderInlineMarkdown(item.title)}</h3>
            ${fields["作者"] ? `<p class="reading-author">作者：${renderInlineMarkdown(fields["作者"])}</p>` : ""}
            ${fields["简介"] ? renderDescriptionBlock(fields["简介"]) : ""}
            <div class="item-footer">
              <details>
                <summary>个人思考</summary>
                <p>${renderInlineMarkdown(getItemThought(fields))}</p>
              </details>
              <button class="progress-btn ${progCls}" data-progress-btn data-book-title="${escapeHtml(item.title)}" title="点击切换阅读状态">${prog || "标记进度"}</button>
            </div>
          </article>
        </li>`;
    })
    .join("");

  return `
    <section class="section-block" id="${sectionId}" data-section-title="${escapeHtml(section.title)}">
      <div class="section-heading">
        <p class="eyebrow">${label}</p>
        <h2>${renderInlineMarkdown(section.title)}</h2>
        ${sectionNote ? `<p class="section-note">${renderInlineMarkdown(sectionNote)}</p>` : ""}
      </div>
      <ol class="${listClass}">
        ${items}
      </ol>
    </section>`;
}

// ── Filter / Search (detail pages) ──

function initPageSearch() {
  const input = document.querySelector("[data-page-search]");
  if (!input) return;

  input.addEventListener("input", () => {
    applyFilters();
  });
}

function initFilterChips() {
  const container = document.querySelector("[data-filter-chips]");
  if (!container) return;

  const allItems = document.querySelectorAll(".reading-item");
  const difficulties = new Set();
  const statuses = new Set();

  allItems.forEach((item) => {
    const d = item.dataset.difficulty;
    const s = item.dataset.status;
    if (d) difficulties.add(d);
    if (s) statuses.add(s);
  });

  let html = "";
  if (difficulties.size > 0) {
    html += `<span class="filter-group-label">难度：</span>`;
    [...difficulties].sort((a, b) => a.length - b.length).forEach((d) => {
      html += `<button class="filter-chip" data-filter-type="difficulty" data-filter-value="${escapeHtml(d)}">${escapeHtml(d)}</button>`;
    });
  }
  if (statuses.size > 0) {
    html += `<span class="filter-group-label">状态：</span>`;
    [...statuses].forEach((s) => {
      html += `<button class="filter-chip" data-filter-type="status" data-filter-value="${escapeHtml(s)}">${escapeHtml(s)}</button>`;
    });
  }

  container.innerHTML = html;

  container.addEventListener("click", (e) => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    chip.classList.toggle("is-active");
    applyFilters();
  });
}

function applyFilters() {
  const searchInput = document.querySelector("[data-page-search]");
  const query = (searchInput ? searchInput.value : "").toLowerCase();

  const activeChips = document.querySelectorAll(".filter-chip.is-active");
  const activeDifficulties = [];
  const activeStatuses = [];
  activeChips.forEach((chip) => {
    if (chip.dataset.filterType === "difficulty") activeDifficulties.push(chip.dataset.filterValue);
    if (chip.dataset.filterType === "status") activeStatuses.push(chip.dataset.filterValue);
  });

  const allItems = document.querySelectorAll(".reading-item");
  allItems.forEach((item) => {
    const text = `${item.dataset.title} ${item.dataset.author} ${item.dataset.desc}`.toLowerCase();
    const matchSearch = !query || text.includes(query);
    const matchDifficulty = activeDifficulties.length === 0 || activeDifficulties.includes(item.dataset.difficulty);
    const matchStatus = activeStatuses.length === 0 || activeStatuses.includes(item.dataset.status);

    item.style.display = matchSearch && matchDifficulty && matchStatus ? "" : "none";
  });

  document.querySelectorAll(".section-block[data-section-title]").forEach((section) => {
    const visibleItems = section.querySelectorAll(".reading-item:not([style*='display: none'])");
    section.style.display = visibleItems.length === 0 ? "none" : "";
  });
}

// ── Progress buttons ──

function initProgressButtons() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-progress-btn]");
    if (!btn) return;

    const title = btn.dataset.bookTitle;
    const current = getProgress(title);
    const next = cycleProgress(current);

    setProgress(title, next);
    btn.textContent = next || "标记进度";
    btn.className = `progress-btn ${progressClass(next)}`;

    updateProgressStats();
  });
}

function updateProgressStats() {
  const statsEl = document.querySelector("[data-progress-stats]");
  if (!statsEl) return;

  const allItems = document.querySelectorAll(".reading-item");
  let todo = 0;
  let reading = 0;
  let done = 0;

  allItems.forEach((item) => {
    const title = item.dataset.title;
    const prog = getProgress(title);
    if (prog === "待读") todo++;
    else if (prog === "在读") reading++;
    else if (prog === "读完") done++;
  });

  if (todo + reading + done === 0) {
    statsEl.textContent = "";
    return;
  }
  statsEl.innerHTML = `进度：<strong>待读 ${todo}</strong> / <strong>在读 ${reading}</strong> / <strong>读完 ${done}</strong>`;
}

// ── Mini TOC ──

function initMiniToc() {
  const tocList = document.querySelector("[data-mini-toc-list]");
  if (!tocList) return;

  const sections = document.querySelectorAll(".section-block[data-section-title]");
  if (sections.length === 0) return;

  let html = "";
  sections.forEach((section) => {
    const title = section.dataset.sectionTitle;
    const id = section.id;
    html += `<li><a href="#${id}">${escapeHtml(title)}</a></li>`;
  });
  tocList.innerHTML = html;
}

// ── Back to Top ──

function initBackToTop() {
  const btn = document.querySelector("[data-back-to-top]");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    btn.classList.toggle("is-visible", window.scrollY > window.innerHeight);
  }, { passive: true });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ── Catalog Page ──

async function initCatalog() {
  const cards = document.querySelectorAll("[data-catalog-item]");
  if (cards.length === 0) return;

  const allData = [];

  for (const card of cards) {
    const source = card.dataset.source;
    const countEl = card.querySelector("[data-catalog-count]");
    try {
      const md = await fetchTextFile(source);
      const data = parseReadingMarkdown(md);
      const total = data.sections.reduce((sum, s) => sum + s.items.length, 0);
      if (countEl) countEl.textContent = `共 ${total} 本`;
      allData.push({ source, href: card.dataset.href, data });
    } catch (error) {
      console.error("Failed to initialize catalog card:", source, error);
      if (countEl) countEl.textContent = "加载失败";
    }
  }

  initCatalogSearch(allData);
}

function initCatalogSearch(allData) {
  const input = document.querySelector("[data-catalog-search]");
  if (!input) return;

  const cardsContainer = document.getElementById("catalog-cards");
  const resultsContainer = document.getElementById("catalog-search-results");
  const resultsList = document.querySelector("[data-results-list]");
  const resultsTitle = document.querySelector("[data-results-title]");
  const resultsEmpty = document.querySelector("[data-results-empty]");

  if (!cardsContainer || !resultsContainer || !resultsList) return;

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      cardsContainer.hidden = false;
      resultsContainer.hidden = true;
      return;
    }

    cardsContainer.hidden = true;
    resultsContainer.hidden = false;

    const pageNames = {
      "./content/reading.md": { label: "研究技能书单", href: "./reading.html" },
      "./content/meaning.md": { label: "意义与方向书单", href: "./meaning.html" },
      "./content/methods.md": { label: "思维方法书单", href: "./methods.html" },
    };

    const matches = [];
    for (const entry of allData) {
      for (const section of entry.data.sections) {
        for (const item of section.items) {
          const text = `${item.title} ${item.fields["作者"] || ""} ${item.fields["简介"] || ""}`.toLowerCase();
          if (text.includes(query)) {
            matches.push({ item, section, pageInfo: pageNames[entry.source] || { label: "未知书单", href: "#" } });
          }
        }
      }
    }

    if (resultsTitle) resultsTitle.textContent = `搜索结果（${matches.length} 条）`;

    if (matches.length === 0) {
      resultsList.innerHTML = "";
      if (resultsEmpty) resultsEmpty.hidden = false;
      return;
    }

    if (resultsEmpty) resultsEmpty.hidden = true;

    resultsList.innerHTML = matches
      .map((m) => {
        const fields = m.item.fields;
        const badges = [];
        if (fields["难度"]) badges.push(fields["难度"]);
        if (fields["状态"]) badges.push(`状态：${fields["状态"]}`);

        return `
          <li class="reading-item">
            <article>
              <div class="reading-topline">
                <a class="search-source-tag" href="${m.pageInfo.href}">${escapeHtml(m.pageInfo.label)}</a>
                <div class="reading-badges">
                  ${badges.map((b) => `<span class="reading-badge">${renderInlineMarkdown(b)}</span>`).join("")}
                </div>
              </div>
              <h3>${renderInlineMarkdown(m.item.title)}</h3>
              ${fields["作者"] ? `<p class="reading-author">作者：${renderInlineMarkdown(fields["作者"])}</p>` : ""}
              ${fields["简介"] ? `<p class="reading-summary">${renderInlineMarkdown(fields["简介"])}</p>` : ""}
            </article>
          </li>`;
      })
      .join("");
  });
}

// ── Reading Content Init ──

async function initReadingContent() {
  const container = document.querySelector("#reading-content");
  if (!container) return;

  const source = container.dataset.readingSource;
  const titleNode = document.querySelector("[data-reading-title]");
  const introNode = document.querySelector("[data-reading-intro]");
  const audienceNode = document.querySelector("[data-reading-audience]");
  const orderNode = document.querySelector("[data-reading-order]");
  const countNode = document.querySelector("[data-reading-count]");

  try {
    const markdown = await fetchTextFile(source);
    const data = parseReadingMarkdown(markdown);

    if (titleNode && data.title) {
      titleNode.textContent = data.title;
      document.title = data.title;
    }
    if (introNode && data.meta["简介"]) introNode.innerHTML = renderInlineMarkdown(data.meta["简介"]);
    if (audienceNode && data.meta["面向"]) audienceNode.textContent = data.meta["面向"];
    if (orderNode && data.meta["顺序"]) orderNode.textContent = data.meta["顺序"];

    const totalItems = data.sections.reduce((sum, section) => sum + section.items.length, 0);
    if (countNode) countNode.textContent = String(totalItems);

    container.innerHTML = data.sections.map((section, index) => renderReadingSection(section, index)).join("");

    initFilterChips();
    initPageSearch();
    initMiniToc();
    initProgressButtons();
    updateProgressStats();
  } catch (error) {
    console.error("Failed to initialize reading content:", source, error);
    const fallbackUrl = resolveUrl(source);
    container.innerHTML = `
      <section class="section-block loading-card error-card">
        <h2>阅读书目加载失败</h2>
        <p class="section-note">
          页面内容没有正常渲染，可能是 Markdown 请求失败、浏览器脚本兼容性问题，或者缓存了旧版脚本。
        </p>
        ${source ? `<p class="section-note"><a class="inline-link" href="${fallbackUrl}" target="_blank" rel="noreferrer">直接打开原始 Markdown</a></p>` : ""}
      </section>`;
    if (introNode) introNode.textContent = "Markdown 或前端脚本加载失败，请刷新页面或清理缓存后重试。";
  }
}

// ── Comments ──

function initComments() {
  const section = document.querySelector("#comments");
  if (!section) return;

  const config = {
    repo: section.dataset.giscusRepo || section.dataset.repo || "",
    repoId: section.dataset.giscusRepoId || section.dataset.repoId || "",
    category: section.dataset.giscusCategory || section.dataset.category || "",
    categoryId: section.dataset.giscusCategoryId || section.dataset.categoryId || "",
    mapping: section.dataset.mapping || section.dataset.giscusMapping || "pathname",
    lang: section.dataset.lang || section.dataset.giscusLang || "zh-CN",
    theme: section.dataset.theme || section.dataset.giscusTheme || "light",
    strict: section.dataset.strict || "0",
    reactionsEnabled: section.dataset.reactionsEnabled || "1",
    emitMetadata: section.dataset.emitMetadata || "0",
    inputPosition: section.dataset.inputPosition || "bottom",
  };

  const isConfigured = [config.repo, config.repoId, config.category, config.categoryId].every(
    (value) => value && !value.startsWith("["),
  );

  const setupBox = section.querySelector("[data-comments-setup]");
  const container = section.querySelector("[data-giscus-container]");
  if (!container) return;

  if (!isConfigured) {
    if (setupBox) setupBox.hidden = false;
    return;
  }

  if (setupBox) setupBox.hidden = true;
  if (container.dataset.loaded === "true") return;

  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.async = true;
  script.crossOrigin = "anonymous";
  script.setAttribute("data-repo", config.repo);
  script.setAttribute("data-repo-id", config.repoId);
  script.setAttribute("data-category", config.category);
  script.setAttribute("data-category-id", config.categoryId);
  script.setAttribute("data-mapping", config.mapping);
  script.setAttribute("data-strict", config.strict);
  script.setAttribute("data-reactions-enabled", config.reactionsEnabled);
  script.setAttribute("data-emit-metadata", config.emitMetadata);
  script.setAttribute("data-input-position", config.inputPosition);
  script.setAttribute("data-theme", config.theme);
  script.setAttribute("data-lang", config.lang);

  container.innerHTML = "";
  container.appendChild(script);
  container.dataset.loaded = "true";
}

// ── Init ──

initReadingContent();
initComments();
initCatalog();
initBackToTop();
