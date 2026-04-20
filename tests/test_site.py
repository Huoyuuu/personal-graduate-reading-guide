from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parent.parent


class SiteStructureTests(unittest.TestCase):
    def test_required_files_exist(self):
        required = [
            ROOT / "index.html",
            ROOT / "catalog.html",
            ROOT / "reading.html",
            ROOT / "meaning.html",
            ROOT / "methods.html",
            ROOT / "links.html",
            ROOT / "content" / "reading.md",
            ROOT / "content" / "meaning.md",
            ROOT / "content" / "methods.md",
            ROOT / "assets" / "styles.css",
            ROOT / "assets" / "script.js",
        ]
        for path in required:
            self.assertTrue(path.exists(), f"Missing required file: {path}")

    def test_homepage_contains_core_sections(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="site-name"', html)
        self.assertIn('id="updates-list"', html)
        self.assertIn('href="./catalog.html"', html)

    def test_all_pages_have_consistent_nav(self):
        pages = ["index.html", "catalog.html", "reading.html", "meaning.html", "methods.html", "links.html"]
        for page in pages:
            html = (ROOT / page).read_text(encoding="utf-8")
            self.assertIn('href="./index.html"', html, f"{page} missing index link")
            self.assertIn('href="./catalog.html"', html, f"{page} missing catalog link")
            self.assertIn('href="./links.html"', html, f"{page} missing links link")

    def test_catalog_page_has_three_cards(self):
        html = (ROOT / "catalog.html").read_text(encoding="utf-8")
        self.assertIn('data-catalog-cards', html)
        self.assertIn('data-catalog-search', html)
        self.assertEqual(html.count('data-catalog-item'), 3)
        self.assertIn('./content/reading.md', html)
        self.assertIn('./content/meaning.md', html)
        self.assertIn('./content/methods.md', html)

    def test_reading_page_is_markdown_driven(self):
        html = (ROOT / "reading.html").read_text(encoding="utf-8")
        self.assertIn('id="reading-content"', html)
        self.assertIn('data-reading-source="./content/reading.md"', html)
        self.assertIn('id="share-reading-link"', html)
        self.assertIn('id="comments"', html)
        self.assertIn('data-giscus-container', html)
        self.assertNotIn('<li class="reading-item">', html)

    def test_meaning_page_is_markdown_driven(self):
        html = (ROOT / "meaning.html").read_text(encoding="utf-8")
        self.assertIn('id="reading-content"', html)
        self.assertIn('data-reading-source="./content/meaning.md"', html)
        self.assertIn('id="comments"', html)

    def test_methods_page_is_markdown_driven(self):
        html = (ROOT / "methods.html").read_text(encoding="utf-8")
        self.assertIn('id="reading-content"', html)
        self.assertIn('data-reading-source="./content/methods.md"', html)
        self.assertIn('id="comments"', html)

    def test_detail_pages_have_search_and_filter(self):
        for page in ["reading.html", "meaning.html", "methods.html"]:
            html = (ROOT / page).read_text(encoding="utf-8")
            self.assertIn('data-page-search', html, f"{page} missing search input")
            self.assertIn('data-filter-chips', html, f"{page} missing filter chips")
            self.assertIn('data-mini-toc', html, f"{page} missing mini toc")
            self.assertIn('data-back-to-top', html, f"{page} missing back to top")
            self.assertIn('data-progress-stats', html, f"{page} missing progress stats")

    def test_links_page_contains_site_link(self):
        html = (ROOT / "links.html").read_text(encoding="utf-8")
        self.assertIn('id="site-links"', html)
        self.assertIn("https://huoyuuu.github.io/personal-graduate-reading-guide/", html)

    def test_stylesheet_contains_design_tokens(self):
        css = (ROOT / "assets" / "styles.css").read_text(encoding="utf-8")
        self.assertIn("--bg:", css)
        self.assertIn(".hero", css)
        self.assertIn(".reading-item", css)
        self.assertIn(".loading-card", css)
        self.assertIn(".reading-links", css)
        self.assertIn(".giscus-shell", css)
        self.assertIn(".catalog-grid", css)
        self.assertIn(".catalog-card", css)
        self.assertIn(".search-input", css)
        self.assertIn(".filter-chip", css)
        self.assertIn(".progress-btn", css)
        self.assertIn(".mini-toc", css)
        self.assertIn(".back-to-top", css)

    def test_script_contains_core_functions(self):
        script = (ROOT / "assets" / "script.js").read_text(encoding="utf-8")
        self.assertIn("parseReadingMarkdown", script)
        self.assertIn("还没读完，之后补。", script)
        self.assertIn("fetch(", script)
        self.assertIn("fetchTextFile", script)
        self.assertIn("extractLinksFromText", script)
        self.assertIn("initComments", script)
        self.assertIn("isBreakOnlyLine", script)
        self.assertIn("renderInlineFragment", script)
        self.assertIn("section.dataset.repo", script)
        self.assertIn("section.dataset.repoId", script)
        self.assertIn("section.dataset.category", script)
        self.assertIn("section.dataset.categoryId", script)
        self.assertIn("section.dataset.lang", script)
        self.assertIn("section.dataset.mapping", script)
        self.assertIn("section.dataset.theme", script)
        self.assertIn("个人思考", script)
        self.assertIn("zeroPadNumber", script)
        self.assertNotIn(".replaceAll(", script)

    def test_script_contains_new_features(self):
        script = (ROOT / "assets" / "script.js").read_text(encoding="utf-8")
        self.assertIn("initPageSearch", script)
        self.assertIn("initFilterChips", script)
        self.assertIn("applyFilters", script)
        self.assertIn("initCatalog", script)
        self.assertIn("initCatalogSearch", script)
        self.assertIn("getProgress", script)
        self.assertIn("setProgress", script)
        self.assertIn("initProgressButtons", script)
        self.assertIn("initMiniToc", script)
        self.assertIn("initBackToTop", script)
        self.assertIn("updateProgressStats", script)
        self.assertIn("localStorage", script)

    def test_reading_md_has_sections_and_fields(self):
        content = (ROOT / "content" / "reading.md").read_text(encoding="utf-8")
        self.assertIn("# 研究技能书单", content)
        self.assertGreaterEqual(content.count("\n## "), 2)
        self.assertIn("### How to Read a Paper", content)
        self.assertIn("作者：", content)
        self.assertIn("状态：", content)
        self.assertIn("https://github.com/Huoyuuu/personal-graduate-reading-guide", content)

    def test_meaning_md_has_sections_and_fields(self):
        content = (ROOT / "content" / "meaning.md").read_text(encoding="utf-8")
        self.assertIn("# 意义与方向书单", content)
        self.assertGreaterEqual(content.count("\n## "), 2)
        self.assertIn("### Four Thousand Weeks", content)
        self.assertIn("作者：", content)
        self.assertIn("状态：", content)

    def test_methods_md_has_sections_and_fields(self):
        content = (ROOT / "content" / "methods.md").read_text(encoding="utf-8")
        self.assertIn("# 思维方法书单", content)
        self.assertGreaterEqual(content.count("\n## "), 2)
        self.assertIn("### Make It Stick", content)
        self.assertIn("作者：", content)
        self.assertIn("状态：", content)

    def test_reading_page_contains_comment_config_placeholders(self):
        for page in ["reading.html", "meaning.html", "methods.html"]:
            html = (ROOT / page).read_text(encoding="utf-8")
            self.assertIn('data-repo="', html, f"{page} missing data-repo")
            self.assertIn('data-repo-id="', html, f"{page} missing data-repo-id")
            self.assertIn('data-category="', html, f"{page} missing data-category")
            self.assertIn('data-category-id="', html, f"{page} missing data-category-id")
            self.assertIn('data-lang="zh-CN"', html, f"{page} missing data-lang")
            self.assertIn('data-mapping="pathname"', html, f"{page} missing data-mapping")
            self.assertIn('data-theme="light"', html, f"{page} missing data-theme")


if __name__ == "__main__":
    unittest.main()
