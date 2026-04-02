from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parent.parent


class SiteStructureTests(unittest.TestCase):
    def test_required_files_exist(self):
        required = [
            ROOT / "index.html",
            ROOT / "reading.html",
            ROOT / "links.html",
            ROOT / "content" / "reading.md",
            ROOT / "assets" / "styles.css",
            ROOT / "assets" / "script.js",
        ]
        for path in required:
            self.assertTrue(path.exists(), f"Missing required file: {path}")

    def test_homepage_contains_core_sections(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="site-name"', html)
        self.assertIn('id="updates-list"', html)
        self.assertIn('href="./reading.html"', html)
        self.assertNotIn('id="resource-entry"', html)
        self.assertNotIn("查看更新", html)

    def test_reading_page_is_markdown_driven(self):
        html = (ROOT / "reading.html").read_text(encoding="utf-8")
        self.assertIn('id="reading-content"', html)
        self.assertIn('data-reading-source="./content/reading.md"', html)
        self.assertIn("搜集到的参考阅读书目", html)
        self.assertIn('id="share-reading-link"', html)
        self.assertIn('id="comments"', html)
        self.assertIn('data-giscus-container', html)
        self.assertNotIn('<li class="reading-item">', html)

    def test_links_page_contains_placeholder_region(self):
        html = (ROOT / "links.html").read_text(encoding="utf-8")
        self.assertIn('id="links-placeholder"', html)

    def test_stylesheet_contains_design_tokens(self):
        css = (ROOT / "assets" / "styles.css").read_text(encoding="utf-8")
        self.assertIn("--bg:", css)
        self.assertIn(".hero", css)
        self.assertIn(".reading-item", css)
        self.assertIn(".loading-card", css)
        self.assertIn(".reading-links", css)
        self.assertIn(".giscus-shell", css)

    def test_script_contains_markdown_parser(self):
        script = (ROOT / "assets" / "script.js").read_text(encoding="utf-8")
        self.assertIn("parseReadingMarkdown", script)
        self.assertIn("还没读完，之后补。", script)
        self.assertIn("fetch(", script)
        self.assertIn("extractLinksFromText", script)
        self.assertIn("initComments", script)
        self.assertNotIn("String.fromCharCode", script)
        self.assertIn('String(itemIndex + 1).padStart(2, "0")', script)
        self.assertIn("个人思考", script)
        self.assertIn("section.dataset.repo", script)
        self.assertIn("section.dataset.repoId", script)
        self.assertIn("section.dataset.category", script)
        self.assertIn("section.dataset.categoryId", script)

    def test_markdown_content_contains_sections_and_fields(self):
        content = (ROOT / "content" / "reading.md").read_text(encoding="utf-8")
        self.assertIn("# 搜集到的参考阅读书目", content)
        self.assertGreaterEqual(content.count("\n## "), 2)
        self.assertIn("### How to Read a Paper", content)
        self.assertIn("作者：", content)
        self.assertIn("状态：", content)

    def test_reading_page_contains_comment_config_placeholders(self):
        html = (ROOT / "reading.html").read_text(encoding="utf-8")
        self.assertIn('data-repo="', html)
        self.assertIn('data-repo-id="', html)
        self.assertIn('data-category="', html)
        self.assertIn('data-category-id="', html)


if __name__ == "__main__":
    unittest.main()
