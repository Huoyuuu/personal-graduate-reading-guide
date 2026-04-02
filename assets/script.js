document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const currentPage = document.body.dataset.page;
document.querySelectorAll(".nav a").forEach((link) => {
  const href = link.getAttribute("href") || "";
  if (
    (currentPage === "home" && href.endsWith("index.html")) ||
    (currentPage === "reading" && href.endsWith("reading.html")) ||
    (currentPage === "links" && href.endsWith("links.html"))
  ) {
    link.classList.add("is-active");
  }
});

const shareInput = document.querySelector("[data-share-url]");
const copyButton = document.querySelector("[data-copy-link]");
const copyFeedback = document.querySelector("[data-copy-feedback]");

if (shareInput) {
  shareInput.value = window.location.href;
}

if (copyButton && shareInput) {
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareInput.value);
      if (copyFeedback) {
        copyFeedback.textContent = "链接已复制，可以直接分享。";
      }
    } catch {
      shareInput.select();
      if (copyFeedback) {
        copyFeedback.textContent = "复制失败，请手动选中链接复制。";
      }
    }
  });
}

function escapeHtml(text = "") {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildExternalLink(url, label, className = "inline-link") {
  return `<a class="${className}" href="${url}" target="_blank" rel="noreferrer">${label}</a>`;
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

    if (parts.length && parts[parts.length - 1] !== "<br>") {
      parts.push("<br>");
    }
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
      if (isBreakOnlyLine(line)) {
        return "<br>";
      }
      return line.replace(/\s{2,}/g, " ").trim();
    })
    .filter((line) => line || isBreakOnlyLine(line))
    .join("\n")
    .trim();

  return { text: remaining, links };
}

function getLinkDisplay(link, index) {
  const safeUrl = escapeHtml(link.url);
  const safeLabel = escapeHtml(link.label || "");

  try {
    const parsed = new URL(link.url);
    const host = parsed.hostname.replace(/^www\./, "");
    const isPdf = /\.pdf($|[?#])/i.test(parsed.pathname);

    if (safeLabel && safeLabel !== safeUrl) {
      return {
        url: safeUrl,
        label: safeLabel,
        meta: `${host}${isPdf ? " · PDF" : ""}`,
      };
    }

    return {
      url: safeUrl,
      label: isPdf ? "PDF链接" : `文章链接`,
      meta: `${host}${isPdf ? " · PDF" : ""}`,
    };
  } catch {
    return {
      url: safeUrl,
      label: safeLabel || `文章链接`,
      meta: "外部资源",
    };
  }
}

function renderDescriptionBlock(text = "") {
  const { text: note, links } = extractLinksFromText(text);
  const parts = [];

  if (note) {
    parts.push(`<p class="reading-summary">${renderInlineMarkdown(note)}</p>`);
  }

  if (links.length) {
    parts.push(`
      <div class="reading-links">
        ${links
          .map((link, index) => {
            const display = getLinkDisplay(link, index);
            return `
              <a
                class="reading-link"
                href="${display.url}"
                target="_blank"
                rel="noreferrer"
              >
                <span class="reading-link-label">${display.label}</span>
                <span class="reading-link-meta">${display.meta}</span>
              </a>
            `;
          })
          .join("")}
      </div>
    `);
  }

  return parts.join("");
}

function parseReadingMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const data = {
    title: "",
    meta: {},
    sections: [],
  };

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
      currentSection = {
        title: "未分类",
        meta: {},
        items: [],
      };
      data.sections.push(currentSection);
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("# ")) {
      data.title = trimmed.slice(2).trim();
      currentFieldTarget = null;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      finalizeItem();
      currentSection = {
        title: trimmed.slice(3).trim(),
        meta: {},
        items: [],
      };
      data.sections.push(currentSection);
      currentFieldTarget = null;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      ensureSection();
      finalizeItem();
      currentItem = {
        title: trimmed.slice(4).trim(),
        fields: {},
      };
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

function getItemThought(fields) {
  const thought = (fields["我的想法"] || "").trim();
  if (thought) {
    return thought;
  }

  const status = (fields["状态"] || "").trim();
  if (status.includes("未读完")) {
    return "还没读完，之后补。";
  }
  if (status.includes("待读") || status.includes("未开始")) {
    return "还没开始读，之后补。";
  }
  return "暂时还没有补充想法。";
}

function buildItemIndex(itemIndex) {
  return String(itemIndex + 1).padStart(2, "0");
}

function renderReadingSection(section, sectionIndex) {
  const label = sectionIndex === 0 ? "MAIN ROUTE" : `SECTION ${String(sectionIndex + 1).padStart(2, "0")}`;
  const sectionNote = section.meta["说明"] || "";
  const listClass =
    section.title.includes("方向书") || section.title.includes("方向")
      ? "reading-list reading-list-compact"
      : "reading-list";

  const items = section.items
    .map((item, itemIndex) => {
      const fields = item.fields;
      const badges = [];
      if (fields["难度"]) {
        badges.push(fields["难度"]);
      }
      if (fields["标签"]) {
        badges.push(fields["标签"]);
      }
      if (fields["状态"]) {
        badges.push(`状态：${fields["状态"]}`);
      }

      return `
        <li class="reading-item">
          <article>
            <div class="reading-topline">
              <span class="reading-index">${buildItemIndex(itemIndex)}</span>
              <div class="reading-badges">
                ${badges
                  .map((badge) => `<span class="reading-badge">${renderInlineMarkdown(badge)}</span>`)
                  .join("")}
              </div>
            </div>
            <h3>${renderInlineMarkdown(item.title)}</h3>
            ${fields["作者"] ? `<p class="reading-author">作者：${renderInlineMarkdown(fields["作者"])}</p>` : ""}
            ${fields["简介"] ? renderDescriptionBlock(fields["简介"]) : ""}
            <details>
              <summary>个人思考</summary>
              <p>${renderInlineMarkdown(getItemThought(fields))}</p>
            </details>
          </article>
        </li>
      `;
    })
    .join("");

  return `
    <section class="section-block">
      <div class="section-heading">
        <p class="eyebrow">${label}</p>
        <h2>${renderInlineMarkdown(section.title)}</h2>
        ${sectionNote ? `<p class="section-note">${renderInlineMarkdown(sectionNote)}</p>` : ""}
      </div>
      <ol class="${listClass}">
        ${items}
      </ol>
    </section>
  `;
}

async function initReadingContent() {
  const container = document.querySelector("#reading-content");
  if (!container) {
    return;
  }

  const source = container.dataset.readingSource;
  const titleNode = document.querySelector("[data-reading-title]");
  const introNode = document.querySelector("[data-reading-intro]");
  const audienceNode = document.querySelector("[data-reading-audience]");
  const orderNode = document.querySelector("[data-reading-order]");
  const countNode = document.querySelector("[data-reading-count]");

  try {
    const response = await fetch(source, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${source}`);
    }

    const markdown = await response.text();
    const data = parseReadingMarkdown(markdown);

    if (titleNode && data.title) {
      titleNode.textContent = data.title;
      document.title = data.title;
    }
    if (introNode && data.meta["简介"]) {
      introNode.innerHTML = renderInlineMarkdown(data.meta["简介"]);
    }
    if (audienceNode && data.meta["面向"]) {
      audienceNode.textContent = data.meta["面向"];
    }
    if (orderNode && data.meta["顺序"]) {
      orderNode.textContent = data.meta["顺序"];
    }

    const totalItems = data.sections.reduce((sum, section) => sum + section.items.length, 0);
    if (countNode) {
      countNode.textContent = String(totalItems);
    }

    container.innerHTML = data.sections.map((section, index) => renderReadingSection(section, index)).join("");
  } catch (error) {
    container.innerHTML = `
      <section class="section-block loading-card error-card">
        <h2>阅读书目加载失败</h2>
        <p class="section-note">
          请确认你是通过本地服务器或 GitHub Pages 打开的页面，而不是直接双击 HTML 文件。
        </p>
      </section>
    `;
    if (introNode) {
      introNode.textContent = "Markdown 加载失败，请检查本地预览方式。";
    }
  }
}

function initComments() {
  const section = document.querySelector("#comments");
  if (!section) {
    return;
  }

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
  if (!container) {
    return;
  }

  if (!isConfigured) {
    if (setupBox) {
      setupBox.hidden = false;
    }
    return;
  }

  if (setupBox) {
    setupBox.hidden = true;
  }

  if (container.dataset.loaded === "true") {
    return;
  }

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

initReadingContent();
initComments();
