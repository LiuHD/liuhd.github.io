import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT_ROOT = path.join(ROOT, "ai-daily");
const DATA_ROOT = path.join(OUTPUT_ROOT, "data");
const INDEX_PATH = path.join(ROOT, "index.html");
const ARCHIVE_PATH = path.join(OUTPUT_ROOT, "index.html");
const DIGESTS_INDEX_PATH = path.join(DATA_ROOT, "digests.json");
const TIME_ZONE = "Asia/Shanghai";
const USER_AGENT =
  "Mozilla/5.0 (compatible; LiuHDAIDailyBot/1.0; +https://github.com/LiuHD/liuhd.github.io)";
const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || process.env.AI_DAILY_OPENAI_API_KEY || "";
const AI_DAILY_MODEL = process.env.AI_DAILY_MODEL || "gpt-4o-mini";
const DRY_RUN = process.argv.includes("--dry-run");
const NOW = getRunDate();
const DATE_STAMP = formatDate(NOW);
const ISO_STAMP = NOW.toISOString();
const MAX_DETAIL_CHARS = 2800;

const SOURCES = [
  {
    id: "openai-developers",
    name: "OpenAI Developers",
    url: "https://developers.openai.com/rss.xml",
    region: "global",
    kind: "official"
  },
  {
    id: "anthropic",
    name: "Anthropic",
    url: "https://www.anthropic.com/news",
    region: "global",
    kind: "official"
  },
  {
    id: "google-ai",
    name: "Google AI",
    url: "https://blog.google/innovation-and-ai/technology/ai/",
    region: "global",
    kind: "official"
  },
  {
    id: "meta-ai",
    name: "Meta AI",
    url: "https://ai.meta.com/blog/",
    region: "global",
    kind: "official"
  },
  {
    id: "alibaba-cloud",
    name: "Alibaba Cloud",
    url: "https://www.alibabacloud.com/blog/",
    region: "cn",
    kind: "official"
  },
  {
    id: "modelscope",
    name: "ModelScope",
    url: "https://modelscope.cn/home",
    region: "cn",
    kind: "platform"
  },
  {
    id: "infoq-ai",
    name: "InfoQ AI",
    url: "https://www.infoq.com/artificial_intelligence/",
    region: "global",
    kind: "media"
  },
  {
    id: "infoq-cn-ai",
    name: "InfoQ 中文",
    url: "https://www.infoq.cn/topic/AI",
    region: "cn",
    kind: "media"
  },
  {
    id: "36kr",
    name: "36Kr",
    url: "https://www.36kr.com/information/AI",
    region: "cn",
    kind: "media"
  }
];

const POSITIVE_KEYWORDS = [
  "launch",
  "launched",
  "introducing",
  "introduce",
  "release",
  "released",
  "update",
  "open source",
  "opensourced",
  "api",
  "sdk",
  "agent",
  "workflow",
  "enterprise",
  "customer",
  "customers",
  "deploy",
  "deployment",
  "adoption",
  "partner",
  "partnership",
  "integrate",
  "integration",
  "platform",
  "copilot",
  "assistant",
  "business",
  "revenue",
  "funding",
  "acquire",
  "acquisition",
  "chip",
  "inference",
  "security",
  "发布",
  "上线",
  "开源",
  "接入",
  "落地",
  "客户",
  "企业",
  "生态",
  "合作",
  "平台",
  "融资",
  "并购",
  "推理",
  "算力",
  "豆包",
  "通义",
  "千帆",
  "混元"
];

const NEGATIVE_KEYWORDS = [
  "paper",
  "research paper",
  "benchmark",
  "dataset",
  "arxiv",
  "theory",
  "theoretical",
  "abstract",
  "evaluation",
  "论文",
  "基准",
  "数据集",
  "理论"
];

const CATEGORY_RULES = [
  {
    key: "大公司动向",
    match: ["openai", "anthropic", "google", "meta", "alibaba", "百度", "腾讯", "字节", "qwen", "claude", "gemini", "llama"]
  },
  {
    key: "国内落地",
    match: ["通义", "千帆", "混元", "豆包", "modelscope", "阿里", "百度", "腾讯", "火山", "36kr", "infoq 中文"]
  },
  {
    key: "开发者信号",
    match: ["api", "sdk", "agent", "workflow", "open source", "开源", "平台", "部署", "integration", "开发者"]
  },
  {
    key: "资本与生态",
    match: ["funding", "revenue", "partnership", "合作", "融资", "并购", "客户", "enterprise", "business", "market"]
  }
];

async function main() {
  await ensureDir(DATA_ROOT);

  const settled = await Promise.allSettled(SOURCES.map(fetchSourceItems));
  const collected = [];
  const sourceStatus = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      collected.push(...result.value.items);
      sourceStatus.push({
        source: result.value.source.name,
        url: result.value.source.url,
        count: result.value.items.length,
        ok: true
      });
    } else {
      sourceStatus.push({
        source: result.reason.source?.name ?? "unknown",
        url: result.reason.source?.url ?? "",
        count: 0,
        ok: false,
        error: result.reason.message
      });
    }
  }

  const curated = curateItems(collected);
  const enriched = await enrichItemsForChinese(curated);
  const digest = buildDigest(enriched, sourceStatus);

  const dailyJsonPath = path.join(DATA_ROOT, `${DATE_STAMP}.json`);
  const dailyPagePath = path.join(
    OUTPUT_ROOT,
    String(digest.dateParts.year),
    pad2(digest.dateParts.month),
    pad2(digest.dateParts.day),
    "index.html"
  );

  if (!DRY_RUN) {
    await ensureDir(path.dirname(dailyPagePath));
    await fs.writeFile(dailyJsonPath, JSON.stringify(digest, null, 2), "utf8");
    await fs.writeFile(dailyPagePath, renderDailyPage(digest), "utf8");

    const digestsIndex = await readDigestsIndex();
    const nextIndex = upsertDigest(digestsIndex, digest);
    await fs.writeFile(DIGESTS_INDEX_PATH, JSON.stringify(nextIndex, null, 2), "utf8");
    await fs.writeFile(ARCHIVE_PATH, renderArchivePage(nextIndex), "utf8");

    const homeHtml = await fs.readFile(INDEX_PATH, "utf8");
    const updatedHome = injectHomeCard(homeHtml, digest);
    await fs.writeFile(INDEX_PATH, updatedHome, "utf8");
  }

  console.log(
    JSON.stringify(
      {
        date: DATE_STAMP,
        itemsFetched: collected.length,
        curatedItems: enriched.length,
        aiEnhanced: OPENAI_API_KEY ? enriched.filter((item) => item.translationMode === "ai").length : 0,
        written: !DRY_RUN,
        sourceStatus
      },
      null,
      2
    )
  );
}

async function fetchSourceItems(source) {
  try {
    const html = await fetchText(source.url);
    const items = dedupeItems([
      ...extractFromFeedXml(html, source),
      ...extractFromJsonLd(html, source),
      ...extractFromHeadingLinks(html, source),
      ...extractFromGenericAnchors(html, source)
    ])
      .filter((item) => isValidItem(item, source))
      .slice(0, 20);

    return { source, items };
  } catch (error) {
    error.source = source;
    throw error;
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} for ${url}`);
  }

  return response.text();
}

function extractFromFeedXml(xml, source) {
  const items = [];
  const rssItems = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)];
  const atomEntries = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)];

  for (const match of rssItems) {
    const block = match[0];
    items.push(
      normalizeItem(source, {
        title: readXmlTag(block, "title"),
        url: readXmlTag(block, "link"),
        description: readXmlTag(block, "description"),
        date: readXmlTag(block, "pubDate")
      })
    );
  }

  for (const match of atomEntries) {
    const block = match[0];
    const linkMatch = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
    items.push(
      normalizeItem(source, {
        title: readXmlTag(block, "title"),
        url: linkMatch?.[1] || "",
        description: readXmlTag(block, "summary") || readXmlTag(block, "content"),
        date: readXmlTag(block, "updated") || readXmlTag(block, "published")
      })
    );
  }

  return items;
}

function extractFromJsonLd(html, source) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const items = [];

  for (const match of scripts) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      collectJsonLdNodes(parsed, source, items);
    } catch {
      const normalized = raw
        .replace(/[\u0000-\u001F]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      try {
        const parsed = JSON.parse(normalized);
        collectJsonLdNodes(parsed, source, items);
      } catch {
        continue;
      }
    }
  }

  return items;
}

function collectJsonLdNodes(node, source, items) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const child of node) collectJsonLdNodes(child, source, items);
    return;
  }

  if (typeof node !== "object") return;

  const type = `${node["@type"] ?? ""}`.toLowerCase();
  const maybeItem = node.item && typeof node.item === "object" ? node.item : null;

  if (maybeItem) {
    collectJsonLdNodes(maybeItem, source, items);
  }

  if (
    type.includes("article") ||
    type.includes("posting") ||
    (typeof node.headline === "string" && typeof node.url === "string") ||
    (typeof node.name === "string" && typeof node.url === "string")
  ) {
    items.push(normalizeItem(source, {
      title: node.headline || node.name,
      url: node.url,
      description: node.description || "",
      date:
        node.datePublished ||
        node.dateCreated ||
        node.dateModified ||
        node.uploadDate ||
        ""
    }));
  }

  if (Array.isArray(node.itemListElement)) {
    for (const item of node.itemListElement) {
      collectJsonLdNodes(item, source, items);
    }
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === "object") {
      collectJsonLdNodes(value, source, items);
    }
  }
}

function extractFromHeadingLinks(html, source) {
  const items = [];
  const headingPattern =
    /<(h[1-4])[^>]*>\s*(?:<a[^>]+href=["']([^"']+)["'][^>]*>)?([\s\S]*?)(?:<\/a>)?\s*<\/\1>/gi;

  for (const match of html.matchAll(headingPattern)) {
    const href = match[2] || "";
    const rawTitle = stripTags(match[3] || "");
    const normalizedTitle = normalizeWhitespace(decodeEntities(rawTitle));

    if (!href || normalizedTitle.length < 12) continue;

    const snippetStart = match.index ?? 0;
    const snippet = html.slice(snippetStart, snippetStart + 600);
    const date = findDateInText(stripTags(snippet));
    const description = normalizeWhitespace(decodeEntities(stripTags(snippet))).slice(0, 240);

    items.push(
      normalizeItem(source, {
        title: normalizedTitle,
        url: href,
        description,
        date
      })
    );
  }

  return items;
}

function extractFromGenericAnchors(html, source) {
  const items = [];
  const anchorPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1] || "";
    const rawTitle = stripTags(match[2] || "");
    const title = normalizeWhitespace(decodeEntities(rawTitle));

    if (!href || title.length < 18 || title.length > 140) continue;

    const snippetStart = Math.max(0, (match.index ?? 0) - 120);
    const snippet = html.slice(snippetStart, snippetStart + 500);
    const date = findDateInText(stripTags(snippet));

    items.push(
      normalizeItem(source, {
        title,
        url: href,
        description: "",
        date
      })
    );
  }

  return items;
}

function normalizeItem(source, item) {
  const url = resolveUrl(source.url, item.url || "");
  const title = normalizeWhitespace(item.title || "");
  const description = normalizeWhitespace(item.description || "");
  const date = normalizeDate(item.date || "");
  const score = scoreItem(title, description, source);
  const category = categorizeItem(title, description, source);

  return {
    source: source.name,
    sourceId: source.id,
    region: source.region,
    kind: source.kind,
    title,
    url,
    description,
    date,
    score,
    category
  };
}

function isValidItem(item, source) {
  if (!item.title || !item.url) return false;
  if (!item.url.startsWith("http")) return false;
  if (item.url === source.url) return false;
  if (item.title.length < 12) return false;

  try {
    const sourceHost = new URL(source.url).hostname.replace(/^www\./, "");
    const itemHost = new URL(item.url).hostname.replace(/^www\./, "");
    const sameFamily = itemHost === sourceHost || itemHost.endsWith(`.${sourceHost}`) || sourceHost.endsWith(`.${itemHost}`);
    if (!sameFamily) return false;
  } catch {
    return false;
  }

  const lower = `${item.title} ${item.description}`.toLowerCase();
  const blocked = [
    "home",
    "archive",
    "search",
    "privacy policy",
    "terms",
    "subscribe",
    "log in",
    "sign in",
    "contact us",
    "about us",
    "see all",
    "qcon",
    "aicon",
    "icp",
    "beian",
    "cookie"
  ];
  if (blocked.some((term) => lower.includes(term))) return false;

  return true;
}

function dedupeItems(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = `${item.url}::${item.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function curateItems(items) {
  const recent = items
    .filter((item) => {
      if (!item.date) return true;
      const age = daysBetween(item.date, DATE_STAMP);
      return age >= 0 && age <= 7;
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.date || "").localeCompare(a.date || "");
    });

  const capped = [];
  const perSourceCount = new Map();

  for (const item of recent) {
    const current = perSourceCount.get(item.source) ?? 0;
    if (current >= 3) continue;

    capped.push(item);
    perSourceCount.set(item.source, current + 1);

    if (capped.length >= 18) break;
  }

  return capped;
}

async function enrichItemsForChinese(items) {
  const detailedItems = await Promise.all(items.map(fetchDetailContext));
  if (OPENAI_API_KEY) {
    return summarizeItemsInChinese(detailedItems);
  }
  return detailedItems.map(applyFallbackChineseCopy);
}

async function fetchDetailContext(item) {
  try {
    const html = await fetchText(item.url);
    const detail = extractDetailText(html);
    return {
      ...item,
      detailText: detail,
      translationMode: "fallback"
    };
  } catch {
    return {
      ...item,
      detailText: item.description || "",
      translationMode: "fallback"
    };
  }
}

function extractDetailText(html) {
  const metaDescription =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    "";

  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => normalizeWhitespace(decodeEntities(stripTags(match[1] || ""))))
    .filter((text) => text.length >= 40 && text.length <= 500);

  const merged = [metaDescription, ...paragraphs].filter(Boolean).join("\n");
  return merged.slice(0, MAX_DETAIL_CHARS);
}

async function summarizeItemsInChinese(items) {
  const batches = chunk(items, 6);
  const translated = [];

  for (const batch of batches) {
    try {
      const result = await callOpenAIForBatch(batch);
      const mapped = new Map(result.map((entry) => [entry.id, entry]));
      for (const item of batch) {
        const localized = mapped.get(item.url);
        if (localized?.zhTitle && localized?.zhSummary) {
          translated.push({
            ...item,
            zhTitle: normalizeWhitespace(localized.zhTitle),
            zhSummary: normalizeWhitespace(localized.zhSummary),
            translationMode: "ai"
          });
        } else {
          translated.push(applyFallbackChineseCopy(item));
        }
      }
    } catch {
      translated.push(...batch.map(applyFallbackChineseCopy));
    }
  }

  return translated;
}

async function callOpenAIForBatch(items) {
  const system = [
    "你是中文科技媒体编辑，服务对象是中国投资者和开发者。",
    "请将输入条目统一改写成中文标题和中文摘要。",
    "标题要短，突出产品、商业、开发者价值，不要逐字翻译腔。",
    "摘要控制在2句内，优先说明发生了什么、为什么值得关注。",
    "保留必要的产品名、公司名、模型名英文专有名词。"
  ].join(" ");

  const payload = items.map((item) => ({
    id: item.url,
    source: item.source,
    category: item.category,
    title: item.title,
    description: item.description,
    detailText: item.detailText,
    takeaway: buildTakeaway(item)
  }));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: AI_DAILY_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: JSON.stringify({
            task: "为每条新闻生成中文标题和中文摘要，返回 JSON 对象，键为 items，值为数组；每项包含 id、zhTitle、zhSummary。",
            items: payload
          })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI summarize failed: ${response.status}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

function applyFallbackChineseCopy(item) {
  const topic = inferChineseTopic(item);
  const action = inferChineseAction(item);
  const sourceLabel = item.source;
  const zhTitle = item.region === "cn" && looksMostlyChinese(item.title)
    ? item.title
    : `${sourceLabel}${action}${topic}`;
  const detailBasis = normalizeWhitespace(item.detailText || item.description || item.title);
  const shortDetail = detailBasis
    ? trimSentence(detailBasis, 90)
    : `${sourceLabel}${action}${topic}，重点可结合原文判断具体产品节奏与商业化方向。`;
  const zhSummary = looksMostlyChinese(shortDetail)
    ? shortDetail
    : `${sourceLabel}${action}${topic}，重点涉及${topic}相关能力更新。建议重点关注其对开发者接入、企业落地或产业节奏的影响。`;

  return {
    ...item,
    zhTitle,
    zhSummary,
    translationMode: "fallback"
  };
}

function inferChineseAction(item) {
  const haystack = `${item.title} ${item.description} ${item.detailText || ""}`.toLowerCase();
  if (containsOneOf(haystack, ["funding", "raises", "series", "融资", "并购"])) return "披露了";
  if (containsOneOf(haystack, ["partner", "partnership", "合作"])) return "公布了";
  if (containsOneOf(haystack, ["launch", "released", "introducing", "update", "发布", "上线"])) return "发布了";
  if (containsOneOf(haystack, ["open source", "开源"])) return "开源了";
  return "带来了";
}

function inferChineseTopic(item) {
  const haystack = `${item.title} ${item.description} ${item.detailText || ""}`.toLowerCase();
  if (containsOneOf(haystack, ["agent", "workflow"])) return "Agent 能力更新";
  if (containsOneOf(haystack, ["api", "sdk", "developer"])) return "开发者工具更新";
  if (containsOneOf(haystack, ["funding", "series", "融资"])) return "融资进展";
  if (containsOneOf(haystack, ["chip", "mtia", "gpu", "算力"])) return "算力与基础设施进展";
  if (containsOneOf(haystack, ["partner", "customer", "enterprise", "合作", "客户", "企业"])) return "企业合作与落地进展";
  if (containsOneOf(haystack, ["model", "gemini", "claude", "llama", "qwen", "豆包", "混元", "千帆"])) return "模型与平台进展";
  return "AI 产品新动态";
}

function looksMostlyChinese(text) {
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  return chinese >= Math.max(8, Math.floor(text.length * 0.2));
}

function trimSentence(text, maxLength) {
  const normalized = normalizeWhitespace(text);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function chunk(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function buildDigest(items, sourceStatus) {
  const groups = new Map();
  for (const rule of CATEGORY_RULES) {
    groups.set(rule.key, []);
  }

  for (const item of items) {
    const bucket = groups.get(item.category) ?? groups.get("开发者信号");
    if (bucket.length < 5) {
      bucket.push({
        ...item,
        takeaway: buildTakeaway(item),
        displayTitle: item.zhTitle || item.title,
        displaySummary: item.zhSummary || item.description || ""
      });
    }
  }

  const dateParts = {
    year: NOW.getFullYear(),
    month: NOW.getMonth() + 1,
    day: NOW.getDate()
  };

  return {
    title: `AI 日报 ${DATE_STAMP}`,
    slug: `ai-daily-${DATE_STAMP}`,
    date: DATE_STAMP,
    isoDate: ISO_STAMP,
    dateParts,
    timezone: TIME_ZONE,
    heroSummary: buildHeroSummary(items),
    sections: [...groups.entries()]
      .map(([name, value]) => ({
        name,
        items: value
      }))
      .filter((section) => section.items.length > 0),
    sourceStatus,
    stats: {
      totalSources: SOURCES.length,
      successfulSources: sourceStatus.filter((item) => item.ok).length,
      curatedItems: items.length,
      domesticItems: items.filter((item) => item.region === "cn").length,
      officialItems: items.filter((item) => item.kind === "official").length,
      aiEnhancedItems: items.filter((item) => item.translationMode === "ai").length
    },
    pagePath: `/ai-daily/${dateParts.year}/${pad2(dateParts.month)}/${pad2(dateParts.day)}/`
  };
}

function buildHeroSummary(items) {
  if (items.length === 0) {
    return "今天没有抓到足够高置信度的新内容，建议手动补充重点公司财报、产品发布或企业落地案例。";
  }

  const topSources = [...new Set(items.slice(0, 6).map((item) => item.source))].slice(0, 3);
  const enhancementText = OPENAI_API_KEY ? "并已自动生成中文标题与摘要" : "当前未接入模型改写，部分摘要为规则生成";
  return `今天共筛出 ${items.length} 条高相关动态，重点偏向${topSources
    .map((source) => `${source}`)
    .join("、")}，${enhancementText}。整体上继续优先关注大公司产品上线、国内平台接入进展和开发者生态变化。`;
}

function buildTakeaway(item) {
  const lower = `${item.title} ${item.description}`.toLowerCase();

  if (containsOneOf(lower, ["funding", "revenue", "融资", "并购", "acquisition"])) {
    return "偏资本与产业信号，适合观察行业集中度和商业化节奏。";
  }
  if (containsOneOf(lower, ["api", "sdk", "agent", "workflow", "integration", "接入", "部署", "开源"])) {
    return "偏开发者和工程落地信号，适合关注接入门槛与平台能力变化。";
  }
  if (containsOneOf(lower, ["customer", "customers", "enterprise", "business", "企业", "客户", "合作", "落地"])) {
    return "偏企业落地信号，适合判断真实需求和付费场景。";
  }
  if (item.region === "cn") {
    return "偏国内市场观察，适合跟踪中国平台生态和企业采用趋势。";
  }
  return "偏大公司战略动作，适合持续跟踪产品节奏与生态布局。";
}

function categorizeItem(title, description, source) {
  const haystack = `${source.name} ${title} ${description}`.toLowerCase();
  if (containsOneOf(haystack, CATEGORY_RULES[2].match)) return "开发者信号";
  if (containsOneOf(haystack, CATEGORY_RULES[3].match)) return "资本与生态";
  if (source.region === "cn" || containsOneOf(haystack, CATEGORY_RULES[1].match)) return "国内落地";
  if (containsOneOf(haystack, CATEGORY_RULES[0].match)) return "大公司动向";
  return "开发者信号";
}

function scoreItem(title, description, source) {
  const haystack = `${title} ${description}`.toLowerCase();
  let score = 10;

  for (const keyword of POSITIVE_KEYWORDS) {
    if (haystack.includes(keyword.toLowerCase())) score += 3;
  }

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (haystack.includes(keyword.toLowerCase())) score -= 4;
  }

  if (source.region === "cn") score += 2;
  if (source.kind === "official") score += 2;
  if (!description) score -= 1;

  return score;
}

function renderDailyPage(digest) {
  const sectionsHtml = digest.sections
    .map(
      (section) => `
      <section class="post-block archive">
        <h2 class="post-title" style="margin-top: 0;">${escapeHtml(section.name)}</h2>
        ${section.items
          .map(
            (item) => `
          <article class="post post-type-normal" style="margin-bottom: 32px;">
            <header class="post-header">
              <h3 class="post-title" style="font-size: 24px; margin-bottom: 8px;">
                <a class="post-title-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noopener">${escapeHtml(
                  item.displayTitle
                )}</a>
              </h3>
              <div class="post-meta">
                <span class="post-time"><i class="fa fa-calendar-o"></i> ${escapeHtml(item.date || "日期未标注")}</span>
                <span class="post-meta-divider">|</span>
                <span><i class="fa fa-building-o"></i> ${escapeHtml(item.source)}</span>
                <span class="post-meta-divider">|</span>
                <span><i class="fa fa-map-marker"></i> ${item.region === "cn" ? "国内" : "海外"}</span>
              </div>
            </header>
            <div class="post-body">
              <p>${escapeHtml(item.displaySummary || "当前未能生成摘要，建议打开原文查看完整上下文。")}</p>
              <blockquote style="margin: 12px 0; padding: 8px 16px; border-left: 4px solid #222; background: #fafafa;">
                <strong>为什么值得看：</strong> ${escapeHtml(item.takeaway)}
              </blockquote>
            </div>
          </article>
        `
          )
          .join("")}
      </section>
    `
    )
    .join("");

  const sourceStatusHtml = digest.sourceStatus
    .map(
      (item) => `<li>${escapeHtml(item.source)}: ${item.ok ? `抓取 ${item.count} 条` : `失败 - ${item.error}`}</li>`
    )
    .join("");

  return renderShell({
    title: digest.title,
    canonical: `https://liuhd.github.io${digest.pagePath}`,
    description: digest.heroSummary,
    bodyClass: "page-post-detail",
    content: `
      <article class="post post-type-normal">
        <div class="post-block">
          <header class="post-header">
            <h1 class="post-title" style="text-align: center;">${escapeHtml(digest.title)}</h1>
            <div class="post-meta" style="text-align: center;">
              <span><i class="fa fa-calendar-o"></i> ${escapeHtml(digest.date)}</span>
              <span class="post-meta-divider">|</span>
              <span><i class="fa fa-signal"></i> ${digest.stats.curatedItems} 条重点动态</span>
              <span class="post-meta-divider">|</span>
              <span><i class="fa fa-flag"></i> 国内 ${digest.stats.domesticItems} 条</span>
            </div>
          </header>
          <div class="post-body">
            <p>${escapeHtml(digest.heroSummary)}</p>
            <p>
              <a href="/ai-daily/">查看历史 AI 日报</a>
            </p>
          </div>
        </div>
      </article>
      ${sectionsHtml}
      <section class="post-block archive">
        <h2 class="post-title" style="margin-top: 0;">抓取概况</h2>
        <ul>
          <li>数据源总数：${digest.stats.totalSources}</li>
          <li>成功抓取：${digest.stats.successfulSources}</li>
          <li>官方来源：${digest.stats.officialItems}</li>
          <li>AI 中文改写：${digest.stats.aiEnhancedItems}</li>
          <li>说明：当前摘要由规则生成，方便你再做二次编辑。</li>
        </ul>
        <ul>${sourceStatusHtml}</ul>
      </section>
    `
  });
}

function renderArchivePage(digests) {
  const rows = digests
    .slice(0, 30)
    .map(
      (digest) => `
      <article class="post post-type-normal" style="margin-bottom: 30px;">
        <header class="post-header">
          <h2 class="post-title" style="font-size: 28px;">
            <a class="post-title-link" href="${escapeAttribute(digest.pagePath)}">${escapeHtml(digest.title)}</a>
          </h2>
          <div class="post-meta">
            <span><i class="fa fa-calendar-o"></i> ${escapeHtml(digest.date)}</span>
            <span class="post-meta-divider">|</span>
            <span><i class="fa fa-list-ul"></i> ${digest.stats.curatedItems} 条精选</span>
            <span class="post-meta-divider">|</span>
            <span><i class="fa fa-flag"></i> 国内 ${digest.stats.domesticItems} 条</span>
          </div>
        </header>
        <div class="post-body">
          <p>${escapeHtml(digest.heroSummary)}</p>
        </div>
      </article>
    `
    )
    .join("");

  return renderShell({
    title: "AI 日报",
    canonical: "https://liuhd.github.io/ai-daily/",
    description: "面向投资者与开发者的 AI 日报，重点关注产品落地、大公司动向和国内生态。",
    bodyClass: "page-archive",
    content: `
      <section class="post-block archive">
        <h1 class="post-title" style="margin-top: 0;">AI 日报</h1>
        <p>面向投资者和开发者，优先追踪大公司产品发布、企业落地、开发者平台更新和国内生态进展。</p>
      </section>
      ${rows}
    `
  });
}

function renderShell({ title, canonical, description, bodyClass, content }) {
  return `<!DOCTYPE html>
<html class="theme-next pisces" lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <meta name="theme-color" content="#222">
  <meta name="description" content="${escapeAttribute(description)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeAttribute(title)}">
  <meta property="og:url" content="${escapeAttribute(canonical)}">
  <meta property="og:description" content="${escapeAttribute(description)}">
  <link href="/lib/fancybox/source/jquery.fancybox.css?v=2.1.5" rel="stylesheet" type="text/css">
  <link href="/lib/font-awesome/css/font-awesome.min.css?v=4.6.2" rel="stylesheet" type="text/css">
  <link href="/css/main.css?v=5.1.3" rel="stylesheet" type="text/css">
  <style>
    .post-block,
    .post-header,
    .post-body,
    .posts-expand .post,
    .posts-expand .post-block,
    .posts-expand .post-body,
    .posts-expand .post-header {
      opacity: 1 !important;
      visibility: visible !important;
      transform: none !important;
    }
  </style>
  <link rel="canonical" href="${escapeAttribute(canonical)}">
  <title>${escapeHtml(title)} | LiuHD</title>
</head>
<body itemscope itemtype="http://schema.org/WebPage" lang="zh-CN">
  <div class="container sidebar-position-left ${bodyClass}">
    <div class="headband"></div>
    <header id="header" class="header" itemscope itemtype="http://schema.org/WPHeader">
      <div class="header-inner">
        <div class="site-brand-wrapper">
          <div class="site-meta">
            <div class="custom-logo-site-title">
              <a href="/" class="brand" rel="start">
                <span class="logo-line-before"><i></i></span>
                <span class="site-title">LiuHD</span>
                <span class="logo-line-after"><i></i></span>
              </a>
            </div>
            <p class="site-subtitle">AI Daily Watch</p>
          </div>
        </div>
        <nav class="site-nav">
          <ul id="menu" class="menu">
            <li class="menu-item"><a href="/"><i class="menu-item-icon fa fa-fw fa-home"></i><br>Home</a></li>
            <li class="menu-item"><a href="/ai-daily/"><i class="menu-item-icon fa fa-fw fa-bolt"></i><br>AI日报</a></li>
            <li class="menu-item"><a href="/archives/"><i class="menu-item-icon fa fa-fw fa-archive"></i><br>Archives</a></li>
          </ul>
        </nav>
      </div>
    </header>
    <main id="main" class="main">
      <div class="main-inner">
        <div class="content-wrap">
          <div id="content" class="content">
            <div id="posts" class="posts-expand">
              ${content}
            </div>
          </div>
        </div>
      </div>
    </main>
    <footer id="footer" class="footer">
      <div class="footer-inner">
        <div class="copyright">由 GitHub Actions 每日自动更新，时区 ${TIME_ZONE}。</div>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

function injectHomeCard(homeHtml, digest) {
  const card = `
<!-- AI_DAILY_START -->
  <article class="post post-type-normal" itemscope itemtype="http://schema.org/Article">
    <div class="post-block">
      <header class="post-header">
        <h1 class="post-title" itemprop="name headline">
          <a class="post-title-link" href="${escapeAttribute(digest.pagePath)}" itemprop="url">AI 日报 ${escapeHtml(
            digest.date
          )}</a>
        </h1>
        <div class="post-meta">
          <span class="post-time">
            <span class="post-meta-item-icon"><i class="fa fa-calendar-o"></i></span>
            <span class="post-meta-item-text">Posted on</span>
            <time datetime="${escapeAttribute(digest.isoDate)}">${escapeHtml(digest.date)}</time>
          </span>
          <span class="post-meta-divider">|</span>
          <span><i class="fa fa-signal"></i> ${digest.stats.curatedItems} 条重点动态</span>
          <span class="post-meta-divider">|</span>
          <span><i class="fa fa-flag"></i> 国内 ${digest.stats.domesticItems} 条</span>
        </div>
      </header>
      <div class="post-body" itemprop="articleBody">
        <p>${escapeHtml(digest.heroSummary)}</p>
        <p><a href="${escapeAttribute(digest.pagePath)}">阅读全文</a> | <a href="/ai-daily/">查看历史日报</a></p>
      </div>
    </div>
  </article>
<!-- AI_DAILY_END -->`;

  if (homeHtml.includes("<!-- AI_DAILY_START -->")) {
    return homeHtml.replace(/<!-- AI_DAILY_START -->[\s\S]*?<!-- AI_DAILY_END -->/, card.trim());
  }

  return homeHtml.replace(
    /(<(?:div|section) id="posts" class="posts-expand">\s*)/,
    `$1\n${card}\n`
  );
}

async function readDigestsIndex() {
  try {
    const raw = await fs.readFile(DIGESTS_INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function upsertDigest(existing, digest) {
  const next = existing.filter((item) => item.date !== digest.date);
  next.unshift({
    title: digest.title,
    date: digest.date,
    heroSummary: digest.heroSummary,
    pagePath: digest.pagePath,
    stats: digest.stats
  });
  return next.sort((a, b) => b.date.localeCompare(a.date));
}

function resolveUrl(base, maybeRelative) {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return "";
  }
}

function findDateInText(text) {
  const patterns = [
    /\b(20\d{2}-\d{2}-\d{2})\b/,
    /\b(20\d{2}\/\d{2}\/\d{2})\b/,
    /\b(20\d{2}\.\d{2}\.\d{2})\b/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return normalizeDate(match[1]);
  }

  return "";
}

function normalizeDate(value) {
  if (!value) return "";
  const isoMatch = `${value}`.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const slashMatch = `${value}`.match(/\b(20\d{2}[/.]\d{2}[/.]\d{2})\b/);
  if (slashMatch) {
    return slashMatch[1].replace(/[/.]/g, "-");
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const cleaned = `${value}`.replace(/[/.]/g, "-").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(cleaned) ? cleaned : "";
}

function daysBetween(earlier, later) {
  const a = new Date(`${earlier}T00:00:00+08:00`);
  const b = new Date(`${later}T00:00:00+08:00`);
  return Math.round((b - a) / 86400000);
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ");
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readXmlTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (match?.[1]) return normalizeWhitespace(decodeEntities(match[1]));

  const plainMatch = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return plainMatch?.[1] ? normalizeWhitespace(decodeEntities(stripTags(plainMatch[1]))) : "";
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function containsOneOf(haystack, terms) {
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function getRunDate() {
  const envDate = process.env.AI_DAILY_DATE;
  if (envDate && /^\d{4}-\d{2}-\d{2}$/.test(envDate)) {
    return new Date(`${envDate}T09:00:00+08:00`);
  }
  return new Date();
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function escapeHtml(value) {
  return `${value}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
