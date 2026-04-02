# 个人的研究生阅读书目推荐

这是一个部署在 **GitHub Pages** 上的静态站点，用来整理一份面向 **研0阶段** 的阅读导航。

当前站点包含：

- `index.html`：首页 / 入口页
- `reading.html`：阅读导航页
- `links.html`：后续补充 URL 的预留页
- `content/reading.md`：阅读书目主内容来源

仓库地址：

- <https://github.com/Huoyuuu/personal-graduate-reading-guide>

---

## 1. 如何更新阅读页
阅读导航页是 **Markdown 驱动** 的。  
后续如果要增删改书目，主要编辑：

```text
content/reading.md
```

`reading.html` 会自动读取并解析这个文件。

---

## 2. 当前 `reading.md` 的结构
页面本身用一级标题
```md
# 搜集到的参考阅读书目
简介：这里写页面说明
面向：研0
顺序：由易到难
```

每个分类用二级标题：

```md
## 阅读
```

每本材料用三级标题加字段：

```md
### How to Read a Paper
作者：S. Keshav
难度：★☆☆☆☆
状态：待整理
简介：[论文链接](https://example.com/paper.pdf)
我的想法：
```

---

## 3. 字段约定

### 使用字段

- `作者`
- `难度`
- `状态`
- `简介`
- `我的想法`
---

## 4. 链接怎么写

`简介` 字段里可以直接放链接，推荐写成 Markdown 链接：

```md
简介：[How to Read a Paper](https://web.stanford.edu/class/ee384m/Handouts/HowtoReadPaper.pdf)
```
页面会自动把这些链接整理成更适合阅读的链接样式。
如果链接后面还有补充说明，也可以直接写在同一行：

```md
简介：[讲稿链接](https://example.com/talk.pdf) 侧重讲解怎样做汇报
```

---

## 5. 如何通过评论或 PR 提建议

阅读页底部已经接入 GitHub 账号评论区。  
如果只是想补充建议、提醒更新、推荐新材料，可以直接到阅读页底部评论。
如果需要直接修改内容，最直接的方法是提交 PR，主要改：
```text
content/reading.md
```
---

## 6. 本地预览

如果你本地有 Python，可以在当前目录运行：

```bash
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

注意：因为 `reading.html` 要通过 `fetch` 读取 `content/reading.md`，所以**不要直接双击 HTML 文件打开**，而要用本地服务器预览。

---

## 7. 线上地址

GitHub Pages 地址：
- 首页：<https://huoyuuu.github.io/personal-graduate-reading-guide/>
- 阅读页：<https://huoyuuu.github.io/personal-graduate-reading-guide/reading.html>
