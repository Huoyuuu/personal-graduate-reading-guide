# 个人的研究生阅读书目推荐

这是一个部署在 **GitHub Pages** 上的静态站点，用来整理面向研究生阶段的阅读导航。当前包含三份书单：

- **研究技能书单**：阅读、复现、出 idea、做汇报相关的实用材料
- **意义与方向书单**：关于动力、倦怠、时间与意义的书
- **思维方法书单**：学习方法、研究方法、判断与知识论

仓库地址：

- <https://github.com/Huoyuuu/personal-graduate-reading-guide>

---

## 站点结构

```text
├── index.html              首页 / 入口页
├── catalog.html            书单目录页（含跨书单搜索）
├── reading.html            研究技能书单
├── meaning.html            意义与方向书单
├── methods.html            思维方法书单
├── links.html              常用链接与站点入口
├── content/
│   ├── reading.md          研究技能书单内容
│   ├── meaning.md          意义与方向书单内容
│   └── methods.md          思维方法书单内容
├── assets/
│   ├── styles.css          样式
│   └── script.js           所有交互逻辑
└── tests/
    └── test_site.py        结构测试
```

---

## 功能

- **Markdown 驱动**：书单内容全部写在 `content/*.md` 里，页面自动解析渲染
- **跨书单搜索**：在目录页搜索框输入关键词，搜索所有三份书单的书名、作者和简介
- **页内搜索 + 筛选**：每个书单详情页有独立的搜索框和难度/状态筛选 chips
- **阅读进度追踪**：每本书旁边有进度按钮（待读→在读→读完），状态存在浏览器 localStorage
- **页面内目录**：可折叠的迷你 TOC，点击跳转到对应分类
- **评论区**：通过 Giscus 接入 GitHub Discussions

---

## 如何更新书目

编辑对应的 Markdown 文件：

| 书单 | 文件 |
|------|------|
| 研究技能 | `content/reading.md` |
| 意义与方向 | `content/meaning.md` |
| 思维方法 | `content/methods.md` |

每个条目的格式：

```md
### 书名
作者：作者名
难度：★★☆☆☆
状态：待读
简介：一两句话说清楚这本书讲什么。[可选链接](https://example.com)
我的想法：
```

---

## 本地预览

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。不要直接双击 HTML 文件，因为页面需要 `fetch` 读取 Markdown。

---

## 运行测试

```bash
python -m pytest tests/test_site.py -v
```

---

## 线上地址

- 首页：<https://huoyuuu.github.io/personal-graduate-reading-guide/>
- 书单目录：<https://huoyuuu.github.io/personal-graduate-reading-guide/catalog.html>
