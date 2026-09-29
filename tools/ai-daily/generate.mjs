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
  const signals = extractSignalsFromItem(item);
  const zhTitle = item.region === "cn" && looksMostlyChinese(item.title)
    ? trimSentence(item.title, 34)
    : buildFallbackTitle(item, signals);
  const zhSummary = buildFallbackSummary(item, signals);

  return {
    ...item,
    zhTitle,
    zhSummary,
    translationMode: "fallback",
    keySignals: signals.highlights
  };
}

function extractSignalsFromItem(item) {
  const haystack = `${item.title} ${item.description} ${item.detailText || ""}`;
  const lower = haystack.toLowerCase();
  const subject = localizePhrase(extractSubjectName(item.title, item.source));
  const topic = inferChineseTopicFromSignals(lower, item);
  const action = inferChineseActionFromSignals(lower);
  const amount = extractMoneySignal(haystack);
  const metrics = extractMetricSignals(haystack).slice(0, 2);
  const availability = extractAvailabilitySignals(lower);
  const features = extractFeatureSignals(haystack).slice(0, 3);
  const highlights = [
    amount ? `金额或规模：${amount}` : "",
    availability ? `上线状态：${availability}` : "",
    features.length ? `能力重点：${features.join("、")}` : "",
    metrics.length ? `关键指标：${metrics.join("、")}` : ""
  ].filter(Boolean).slice(0, 3);

  return {
    subject,
    topic,
    action,
    amount,
    metrics,
    availability,
    features,
    highlights
  };
}

function buildFallbackTitle(item, signals) {
  if (signals.amount && containsOneOf(`${item.title} ${item.detailText || ""}`.toLowerCase(), ["funding", "series", "融资"])) {
    return `${item.source}披露新一轮融资进展`;
  }
  const cleanedSubject = cleanHeadlineSubject(signals.subject, item.source);
  if (cleanedSubject && shouldUseSubjectAsHeadline(cleanedSubject, item.source)) {
    return `${item.source}${signals.action}${trimSentence(cleanedSubject, 24)}`;
  }
  return `${item.source}${signals.action}${signals.topic}`;
}

function buildFallbackSummary(item, signals) {
  const lines = [];
  const introSubject = cleanSummarySubject(signals.subject, item.source);
  const isFundingItem = containsWholeTerm(`${item.title} ${item.description} ${item.detailText || ""}`.toLowerCase(), [
    "funding",
    "series",
    "post-money",
    "financing"
  ]) || `${item.title} ${item.description}`.includes("融资");
  const introTarget = isFundingItem ? "新一轮融资与估值更新" : (introSubject || signals.topic);
  lines.push(`${item.source}${signals.action}${introTarget}，重点落在${signals.topic}。`);

  const evidenceSentence = buildEvidenceSentence(signals);
  if (evidenceSentence) {
    lines.push(evidenceSentence);
  }

  const contextSentence = buildContextSentence(item, signals);
  if (contextSentence) {
    lines.push(contextSentence);
  }

  lines.push(`${buildTakeaway(item)}`);
  return lines.join("");
}

function buildEvidenceSentence(signals) {
  const clauses = [];
  if (signals.features.length) clauses.push(`这次变化主要覆盖${signals.features.join("、")}`);
  if (signals.availability) clauses.push(`目前${signals.availability}`);
  if (signals.amount) clauses.push(`披露的金额或规模为${signals.amount}`);
  if (signals.metrics.length) clauses.push(`文中出现的关键指标包括${signals.metrics.join("、")}`);

  if (!clauses.length) return "";
  return `${clauses.slice(0, 3).join("，")}。`;
}

function buildContextSentence(item, signals) {
  const details = extractDetailHighlights(item.detailText, signals);
  if (details.length) {
    return `进一步看，${details.slice(0, 2).join("；")}。`;
  }
  const inferred = buildHeuristicContextSentence(item, signals);
  return inferred ? `进一步看，${inferred}。` : "";
}

function inferChineseActionFromSignals(lower) {
  if (containsOneOf(lower, ["funding", "raises", "series", "融资", "并购"])) return "披露";
  if (containsOneOf(lower, ["partner", "partnership", "合作", "hub", "network"])) return "公布";
  if (containsOneOf(lower, ["open source", "开源"])) return "开源";
  if (containsOneOf(lower, ["launch", "released", "introducing", "update", "preview", "api", "发布", "上线"])) return "推出";
  return "带来";
}

function inferChineseTopicFromSignals(lower, item) {
  if (containsOneOf(lower, ["funding", "series", "融资"])) return "融资与资本动作";
  if (containsOneOf(lower, ["chip", "mtia", "gpu", "infrastructure", "data center", "算力"])) return "算力与基础设施进展";
  if (containsOneOf(lower, ["partner", "customer", "enterprise", "部署", "落地", "合作", "客户"])) return "企业落地与生态合作";
  if (containsOneOf(lower, ["agent", "workflow", "tool-use", "multi-agent"])) return "Agent 能力升级";
  if (containsOneOf(lower, ["api", "sdk", "developer", "studio"])) return "开发者平台更新";
  if (containsOneOf(lower, ["model", "gemini", "claude", "llama", "qwen", "豆包", "混元", "千帆"])) return "模型与平台升级";
  return item.region === "cn" ? "国内 AI 产业动态" : "全球 AI 产品动态";
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

function slugify(text) {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractSubjectName(title, source) {
  const cleaned = normalizeWhitespace(title.replace(/^[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}\s+/, ""));
  const patterns = [
    /Introducing\s+(.+)/i,
    /Announcing\s+(.+)/i,
    /has\s+released\s+(.+)/i,
    /launch(?:es|ed|ing)?\s+(.+)/i,
    /release(?:s|d)?\s+(.+)/i
  ];
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match?.[1]) return match[1].split(":")[0].trim();
  }
  if (cleaned.includes(":")) return cleaned.split(":")[0].trim();
  return cleaned.replace(source, "").trim() || cleaned;
}

function shouldUseSubjectAsHeadline(subject, source) {
  if (!subject) return false;
  const normalized = normalizeWhitespace(subject);
  if (!normalized || normalized === source) return false;
  if (normalized.length > 28) return false;
  if (/\b(the|and|of|for|with)\b/i.test(normalized) && !/[A-Z]{2,}/.test(normalized)) return false;
  return true;
}

function extractMoneySignal(text) {
  return (
    text.match(/\$\s?\d+(?:\.\d+)?\s?(?:B|M|K)\b/i)?.[0] ||
    text.match(/\d+(?:\.\d+)?\s?(?:亿美元|亿元人民币|亿元|万亿元|亿美元)/)?.[0] ||
    text.match(/\d+\s?billion/i)?.[0] ||
    ""
  );
}

function extractMetricSignals(text) {
  return [...new Set((text.match(/\b\d+(?:\.\d+)?\s?(?:x|×|%|trillion|billion|million)\b/gi) || []).map((item) => item.trim()))];
}

function extractAvailabilitySignals(lower) {
  const labels = [];
  if (containsOneOf(lower, ["available today", "available now", "上线", "已发布"])) labels.push("已正式上线");
  if (containsOneOf(lower, ["preview", "private api preview", "预览"])) labels.push("开放预览");
  if (containsOneOf(lower, ["api", "via the api"])) labels.push("支持 API 接入");
  if (containsOneOf(lower, ["app", "studio", "claude.ai", "meta.ai"])) labels.push("已进入产品端");
  return labels.slice(0, 2).join("，");
}

function extractFeatureSignals(text) {
  const source = localizePhrase(text);
  const phrases = [];
  const supportMatch = source.match(/支持([^。；\n]{6,80})/);
  if (supportMatch?.[1]) phrases.push(trimSentence(`支持${supportMatch[1]}`, 28));

  const keywords = [
    ["tool-use", "工具调用"],
    ["multi-agent orchestration", "多 Agent 编排"],
    ["visual chain of thought", "视觉链路推理"],
    ["managed agents", "托管 Agents"],
    ["linux environment", "隔离 Linux 运行环境"],
    ["dynamic workflows", "动态工作流"],
    ["partner hub", "伙伴门户"],
    ["services track", "服务分层"],
    ["private api preview", "私有 API 预览"],
    ["health reasoning", "健康推理能力"],
    ["multimodal", "多模态能力"],
    ["inference", "推理能力"],
    ["training", "训练能力"]
  ];

  for (const [needle, label] of keywords) {
    if (text.toLowerCase().includes(needle) && !phrases.includes(label)) {
      phrases.push(label);
    }
  }

  return [...new Set(phrases)];
}

function buildChineseSentenceFromDetail(text) {
  const localized = localizePhrase(text);
  const firstSentence = localized.split(/[\.\n。！!？?]/).find((line) => normalizeWhitespace(line).length >= 18) || localized;
  return trimSentence(normalizeWhitespace(firstSentence), 80);
}

function extractDetailHighlights(detailText, signals) {
  if (!detailText) return [];
  const localized = localizePhrase(detailText);
  const rawSentences = localized
    .split(/[\.\n。！!？?]+/)
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length >= 20 && line.length <= 110);

  const filtered = [];
  for (const sentence of rawSentences) {
    if (filtered.length >= 3) break;
    if (looksLikeBoilerplate(sentence)) continue;
    if (isMostlyLatin(sentence)) continue;
    if (sentence.includes("今天上线") || sentence.includes("现已上线")) continue;
    if (signals.features.some((feature) => sentence.includes(feature)) && sentence.length < 26) continue;
    filtered.push(tightenChineseSentence(sentence));
  }
  return [...new Set(filtered)];
}

function buildHeuristicContextSentence(item, signals) {
  const lower = `${item.title} ${item.description} ${item.detailText || ""}`.toLowerCase();

  if (containsWholeTerm(lower, ["funding", "series", "post-money", "financing"]) || lower.includes("融资")) {
    return "原文核心在于融资规模、估值水平以及这笔资金会如何继续推高模型、算力和生态投入";
  }
  if (containsOneOf(lower, ["partner", "certification", "enterprise", "production", "deployment"])) {
    return "原文强调重点已从概念验证转向生产环境部署，合作伙伴认证、交付能力和客户筛选正在成为新门槛";
  }
  if (containsOneOf(lower, ["chip", "bandwidth", "flops", "inference", "training", "data center", "mtia"])) {
    return "原文把重点放在带宽、算力和推理成本改善上，说明基础设施效率仍是大厂争夺 AI 红利的关键";
  }
  if (containsOneOf(lower, ["agent", "workflow", "tool-use", "multi-agent"])) {
    return "原文突出的是让模型从单次回答走向长流程执行，工具联动和托管能力比单点模型分数更重要";
  }
  if (containsOneOf(lower, ["model", "opus", "gemini", "llama", "muse spark", "qwen"])) {
    return "原文关注的不只是模型分数，而是编码、推理和长任务稳定性是否已经足够支撑真实业务场景";
  }
  if (containsOneOf(lower, ["customer", "business", "adoption", "commercial"])) {
    return "原文更在意商业采用节奏，说明厂商正在把产品能力转成客户签约和付费扩张";
  }
  return "";
}

function looksLikeBoilerplate(text) {
  return containsOneOf(text.toLowerCase(), [
    "learn more",
    "read more",
    "for more details",
    "see our methodology",
    "click here",
    "了解更多",
    "更多详情"
  ]);
}

function tightenChineseSentence(text) {
  return trimSentence(
    text
      .replace(/^today[,，]?\s*/i, "")
      .replace(/^we\s+(are|re|\'re)\s+/i, "")
      .replace(/^in this post[,，]?\s*/i, "")
      .replace(/^the company says[,，]?\s*/i, "")
      .replace(/^原文提到[,，]?\s*/, "")
      .replace(/^\W+/, ""),
    96
  );
}

function isMostlyLatin(text) {
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  return latin > 0 && latin > chinese * 1.5;
}

function cleanHeadlineSubject(subject, source) {
  if (!subject) return "";
  return normalizeWhitespace(
    localizePhrase(subject)
      .replace(new RegExp(`^${escapeForRegExp(source)}\\s*`, "i"), "")
      .replace(/^[Tt]he\s+/, "")
      .replace(/^(a|an)\s+/i, "")
      .replace(/^(has\s+)?released\s+/i, "")
      .replace(/^has\s+/i, "")
      .replace(/\b(of|for|with|to)\b.*$/i, "")
      .replace(/\band\b/gi, "与")
      .replace(/\s+与\s+/g, "与")
      .replace(/[,:：-]\s*$/, "")
  );
}

function cleanSummarySubject(subject, source) {
  const cleaned = cleanHeadlineSubject(subject, source);
  if (!cleaned) return "";
  if (/\b(the|and|of|for|with|to)\b/i.test(cleaned)) return "";
  return cleaned;
}

function localizePhrase(text) {
  let output = `${text}`;
  const replacements = [
    [/intelligent O&M Agent/gi, "智能运维 Agent"],
    [/Evolution of the Agent Developer Paradigm/gi, "Agent 开发范式演进"],
    [/Ontology Is Trending Again/gi, "本体工程重新升温"],
    [/Bastion Host/gi, "堡垒机"],
    [/Managed Agents/gi, "托管 Agents"],
    [/Partner Network/gi, "合作伙伴网络"],
    [/Partner Hub/gi, "伙伴门户"],
    [/Services Track/gi, "服务分层"],
    [/tool-use/gi, "工具调用"],
    [/multi-agent orchestration/gi, "多 Agent 编排"],
    [/visual chain of thought/gi, "视觉链路推理"],
    [/reasoning model/gi, "推理模型"],
    [/private API preview/gi, "私有 API 预览"],
    [/preview/gi, "预览"],
    [/available today/gi, "今天上线"],
    [/available now/gi, "现已上线"],
    [/dynamic workflows/gi, "动态工作流"],
    [/cloud sandbox/gi, "云端沙箱"],
    [/multimodal/gi, "多模态"],
    [/inference/gi, "推理"],
    [/training/gi, "训练"],
    [/deployment/gi, "部署"],
    [/production/gi, "生产环境"],
    [/enterprise/gi, "企业"],
    [/developers?/gi, "开发者"],
    [/customers?/gi, "客户"],
    [/consultants?/gi, "顾问"],
    [/deploy(?:ed|ment|ments)?/gi, "部署"],
    [/certification/gi, "认证"],
    [/certified/gi, "已认证"],
    [/portal/gi, "门户"],
    [/tiered structure/gi, "分层体系"],
    [/ecosystem/gi, "生态体系"],
    [/capabilities/gi, "能力"],
    [/feature/gi, "功能"],
    [/features/gi, "功能"],
    [/partnerships?/gi, "合作"],
    [/funding/gi, "融资"],
    [/infrastructure/gi, "基础设施"]
  ];
  for (const [pattern, replacement] of replacements) {
    output = output.replace(pattern, replacement);
  }
  return normalizeWhitespace(output);
}

function buildDigest(items, sourceStatus) {
  const groups = new Map();
  for (const rule of CATEGORY_RULES) {
    groups.set(rule.key, []);
  }

  for (const item of items) {
    const bucket = groups.get(item.category) ?? groups.get("开发者信号");
    if (bucket.length < 5) {
      const fallbackSignals = extractSignalsFromItem(item);
      bucket.push({
        ...item,
        takeaway: buildTakeaway(item),
        displayTitle: item.zhTitle || item.title,
        displaySummary: item.zhSummary || item.description || "",
        keySignals: item.keySignals?.length ? item.keySignals : fallbackSignals.highlights
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
    return "今天没有抓到足够高置信度的新内容，建议优先手动补充大公司发布、融资事件和企业落地案例。";
  }

  const topSources = [...new Set(items.slice(0, 6).map((item) => item.source))].slice(0, 3);
  const enhancementText = OPENAI_API_KEY
    ? "本期已完成 AI 中文编译，可直接作为面向中文用户的晨报底稿。"
    : "当前部分摘要仍是规则生成版本，但已经尽量补齐了关键事实、上线状态和投资视角。";
  return `今天共筛出 ${items.length} 条高相关动态，信息最密集的来源集中在${topSources.join("、")}。${enhancementText}整体看，今天的主线仍是大厂平台升级、Agent 工具链演进，以及国内市场的融资和落地节奏。`;
}

function buildTakeaway(item) {
  const lower = `${item.title} ${item.description}`.toLowerCase();

  if (containsOneOf(lower, ["funding", "revenue", "融资", "并购", "acquisition"])) {
    return "更偏资本与产业信号，适合观察估值水平、行业集中度和商业化节奏。";
  }
  if (containsOneOf(lower, ["api", "sdk", "agent", "workflow", "integration", "接入", "部署", "开源"])) {
    return "更偏开发者与工程落地信号，值得关注接入门槛、托管能力和平台抽象层有没有继续下沉。";
  }
  if (containsOneOf(lower, ["customer", "customers", "enterprise", "business", "企业", "客户", "合作", "落地"])) {
    return "更偏企业落地信号，适合判断真实需求是否持续扩张，以及哪些场景开始进入付费阶段。";
  }
  if (item.region === "cn") {
    return "更偏国内市场观察，适合跟踪中国平台生态、政策节奏和企业采用趋势。";
  }
  return "更偏大公司战略动作，适合持续跟踪产品节奏、生态布局和竞争重点是否出现变化。";
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
  const sectionNav = digest.sections
    .map((section) => `<a class="section-link" href="#section-${slugify(section.name)}">${escapeHtml(section.name)}</a>`)
    .join("");

  const sectionsHtml = digest.sections
    .map(
      (section) => `
      <section class="daily-section" id="section-${slugify(section.name)}">
        <div class="section-header">
          <div>
            <p class="section-kicker">今日栏目</p>
            <h2 class="section-title">${escapeHtml(section.name)}</h2>
          </div>
          <span class="section-count">${section.items.length} 条</span>
        </div>
        <div class="entry-grid">
        ${section.items
          .map(
            (item) => `
          <article class="entry-card">
            <div class="entry-topline">
              <span class="source-badge">${escapeHtml(item.source)}</span>
              <span class="meta-inline">${escapeHtml(item.date || "日期未标注")}</span>
              <span class="meta-inline">${item.region === "cn" ? "国内" : "海外"}</span>
            </div>
            <h3 class="entry-title">
              <a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.displayTitle)}</a>
            </h3>
            <p class="entry-summary">${escapeHtml(item.displaySummary || "当前未能生成摘要，建议打开原文查看完整上下文。")}</p>
            ${
              item.keySignals?.length
                ? `<div class="signal-list">${item.keySignals
                    .map((signal) => `<span class="signal-chip">${escapeHtml(signal)}</span>`)
                    .join("")}</div>`
                : ""
            }
            <div class="entry-bottom">
              <p class="entry-takeaway"><span>为什么值得看</span>${escapeHtml(item.takeaway)}</p>
              <a class="entry-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noopener">查看原文</a>
            </div>
          </article>
        `
          )
          .join("")}
        </div>
      </section>
    `
    )
    .join("");

  const sourceStatusHtml = digest.sourceStatus
    .map(
      (item) => `
        <div class="status-card">
          <div class="status-name">${escapeHtml(item.source)}</div>
          <div class="status-value">${item.ok ? `抓取 ${item.count} 条` : `抓取失败`}</div>
          <div class="status-note">${escapeHtml(item.ok ? item.url : item.error || item.url)}</div>
        </div>
      `
    )
    .join("");

  return renderShell({
    title: digest.title,
    canonical: `https://liuhd.github.io${digest.pagePath}`,
    description: digest.heroSummary,
    bodyClass: "daily-page",
    content: `
      <section class="hero-card">
        <div class="hero-copy">
          <p class="hero-kicker">Investor + Developer Daily</p>
          <h1 class="hero-title">${escapeHtml(digest.title)}</h1>
          <p class="hero-summary">${escapeHtml(digest.heroSummary)}</p>
          <div class="hero-actions">
            <a class="primary-link" href="/ai-daily/">查看历史日报</a>
            <a class="secondary-link" href="#digest-sections">跳到正文</a>
          </div>
        </div>
        <div class="hero-stats">
          <div class="stat-card"><span class="stat-label">重点动态</span><strong>${digest.stats.curatedItems}</strong></div>
          <div class="stat-card"><span class="stat-label">国内占比</span><strong>${digest.stats.domesticItems}</strong></div>
          <div class="stat-card"><span class="stat-label">官方来源</span><strong>${digest.stats.officialItems}</strong></div>
          <div class="stat-card"><span class="stat-label">AI 编译</span><strong>${digest.stats.aiEnhancedItems}</strong></div>
        </div>
      </section>
      <section class="section-nav">${sectionNav}</section>
      <div id="digest-sections">${sectionsHtml}</div>
      <section class="status-panel">
        <div class="section-header">
          <div>
            <p class="section-kicker">运行状态</p>
            <h2 class="section-title">抓取概况</h2>
          </div>
        </div>
        <p class="status-summary">当前日报以大公司产品、开发者平台和国内产业动作为主线。若配置 \`OPENAI_API_KEY\`，后续会自动升级为更自然的中文编译版。</p>
        <div class="status-grid">${sourceStatusHtml}</div>
      </section>
    `
  });
}

function renderArchivePage(digests) {
  const rows = digests
    .slice(0, 30)
    .map(
      (digest) => `
      <article class="archive-card">
        <div class="entry-topline">
          <span class="source-badge">${escapeHtml(digest.date)}</span>
          <span class="meta-inline">${digest.stats.curatedItems} 条</span>
          <span class="meta-inline">国内 ${digest.stats.domesticItems} 条</span>
        </div>
        <h2 class="archive-title"><a href="${escapeAttribute(digest.pagePath)}">${escapeHtml(digest.title)}</a></h2>
        <p class="archive-summary">${escapeHtml(digest.heroSummary)}</p>
      </article>
    `
    )
    .join("");

  return renderShell({
    title: "AI 日报",
    canonical: "https://liuhd.github.io/ai-daily/",
    description: "面向投资者与开发者的 AI 日报，重点关注产品落地、大公司动向和国内生态。",
    bodyClass: "archive-page",
    content: `
      <section class="hero-card archive-hero">
        <div class="hero-copy">
          <p class="hero-kicker">Daily Archive</p>
          <h1 class="hero-title">AI 日报</h1>
          <p class="hero-summary">面向投资者和开发者，优先追踪大公司产品发布、企业落地、开发者平台更新和国内生态进展。每一期都尽量把“发生了什么”和“为什么重要”放在同一页里。</p>
        </div>
      </section>
      <section class="archive-grid">${rows}</section>
    `
  });
}

function renderShell({ title, canonical, description, bodyClass, content }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#102033">
  <meta name="description" content="${escapeAttribute(description)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeAttribute(title)}">
  <meta property="og:url" content="${escapeAttribute(canonical)}">
  <meta property="og:description" content="${escapeAttribute(description)}">
  <style>
    :root {
      --bg: #f4f8fc;
      --bg-accent: radial-gradient(circle at top left, rgba(55, 180, 255, 0.22), transparent 26%),
        radial-gradient(circle at top right, rgba(126, 92, 255, 0.18), transparent 24%),
        linear-gradient(180deg, #eef6ff 0%, #f6fbff 38%, #f5f7fb 100%);
      --ink: #15233a;
      --muted: #56657d;
      --line: rgba(21, 35, 58, 0.08);
      --card: rgba(255, 255, 255, 0.88);
      --card-strong: #ffffff;
      --accent: #0b84ff;
      --accent-2: #19c37d;
      --shadow: 0 24px 60px rgba(16, 32, 51, 0.12);
      --radius-xl: 28px;
      --radius-lg: 20px;
      --radius-md: 14px;
      --max: 1180px;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: "Segoe UI Variable", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      color: var(--ink);
      background: var(--bg-accent);
      line-height: 1.75;
    }
    a { color: inherit; text-decoration: none; }
    .page-shell { max-width: var(--max); margin: 0 auto; padding: 24px 20px 72px; }
    .topbar {
      display: flex; justify-content: space-between; align-items: center; gap: 16px;
      padding: 18px 22px; margin-bottom: 24px;
      background: rgba(10, 21, 38, 0.9); color: #fff; border-radius: 22px; box-shadow: var(--shadow);
    }
    .brand-title { font-size: 28px; font-weight: 700; letter-spacing: 0.02em; }
    .brand-subtitle { font-size: 14px; color: rgba(255,255,255,0.72); margin-top: 4px; }
    .topnav { display: flex; gap: 12px; flex-wrap: wrap; }
    .topnav a {
      padding: 10px 14px; border-radius: 999px; font-size: 14px;
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.92);
    }
    .hero-card, .status-panel, .daily-section, .archive-card {
      background: var(--card); backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,0.6);
      box-shadow: var(--shadow);
    }
    .hero-card {
      border-radius: var(--radius-xl); padding: 34px; display: grid; grid-template-columns: 1.5fr 1fr; gap: 22px;
      margin-bottom: 18px;
    }
    .archive-hero { grid-template-columns: 1fr; }
    .hero-kicker, .section-kicker {
      margin: 0 0 8px; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent);
      font-weight: 700;
    }
    .hero-title { margin: 0; font-size: clamp(34px, 5vw, 56px); line-height: 1.04; }
    .hero-summary { margin: 18px 0 0; font-size: 18px; color: var(--muted); max-width: 740px; }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 22px; }
    .primary-link, .secondary-link, .entry-link {
      display: inline-flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 999px; font-weight: 600;
    }
    .primary-link { background: linear-gradient(135deg, var(--accent), #5aa7ff); color: #fff; }
    .secondary-link { background: rgba(11, 132, 255, 0.08); color: var(--accent); }
    .hero-stats {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-content: start;
    }
    .stat-card {
      padding: 18px; border-radius: var(--radius-lg); background: var(--card-strong); border: 1px solid var(--line);
      display: flex; flex-direction: column; gap: 8px;
    }
    .stat-card strong { font-size: 36px; line-height: 1; }
    .stat-label { color: var(--muted); font-size: 13px; }
    .section-nav {
      display: flex; gap: 10px; flex-wrap: wrap; margin: 0 0 18px;
    }
    .section-link {
      padding: 10px 14px; border-radius: 999px; background: rgba(255,255,255,0.7); border: 1px solid var(--line);
      color: var(--muted); font-size: 14px; font-weight: 600;
    }
    .daily-section, .status-panel {
      border-radius: var(--radius-xl); padding: 26px; margin-top: 22px;
    }
    .section-header {
      display: flex; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 18px;
    }
    .section-title { margin: 0; font-size: 30px; line-height: 1.1; }
    .section-count {
      background: rgba(11, 132, 255, 0.08); color: var(--accent); border-radius: 999px; padding: 8px 12px; font-weight: 700;
    }
    .entry-grid, .archive-grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px;
    }
    .entry-card, .archive-card {
      border-radius: var(--radius-lg); padding: 22px; background: var(--card-strong); border: 1px solid var(--line);
    }
    .entry-topline {
      display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 14px;
    }
    .source-badge, .meta-inline, .signal-chip {
      border-radius: 999px; padding: 6px 10px; font-size: 12px;
    }
    .source-badge { background: linear-gradient(135deg, rgba(25,195,125,0.16), rgba(11,132,255,0.14)); color: #135f46; font-weight: 700; }
    .meta-inline { background: rgba(21,35,58,0.06); color: var(--muted); }
    .entry-title, .archive-title { margin: 0; font-size: 30px; line-height: 1.14; letter-spacing: -0.02em; }
    .entry-title a:hover, .archive-title a:hover { color: var(--accent); }
    .entry-summary, .archive-summary, .status-summary {
      margin: 16px 0 0; color: var(--muted); font-size: 16px;
    }
    .signal-list { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 18px; }
    .signal-chip { background: #eef5ff; color: #2559a7; }
    .entry-bottom {
      display: flex; flex-direction: column; gap: 14px; margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--line);
    }
    .entry-takeaway {
      margin: 0; color: var(--ink); font-size: 15px;
    }
    .entry-takeaway span { display: block; margin-bottom: 6px; color: var(--accent); font-weight: 700; }
    .entry-link {
      align-self: flex-start; background: rgba(21,35,58,0.06); color: var(--ink);
    }
    .status-grid {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 18px;
    }
    .status-card {
      border-radius: var(--radius-md); padding: 16px; background: #fff; border: 1px solid var(--line);
    }
    .status-name { font-weight: 700; }
    .status-value { color: var(--accent); margin-top: 6px; font-weight: 600; }
    .status-note { color: var(--muted); font-size: 13px; margin-top: 8px; word-break: break-word; }
    .page-footer {
      margin-top: 28px; padding: 16px 4px; color: var(--muted); font-size: 14px; text-align: center;
    }
    @media (max-width: 980px) {
      .hero-card, .entry-grid, .archive-grid, .status-grid { grid-template-columns: 1fr; }
      .hero-stats { grid-template-columns: repeat(2, minmax(0,1fr)); }
    }
    @media (max-width: 640px) {
      .page-shell { padding: 16px 14px 56px; }
      .topbar, .hero-card, .daily-section, .status-panel, .archive-card { padding: 18px; border-radius: 18px; }
      .brand-title { font-size: 22px; }
      .hero-title { font-size: 32px; }
      .entry-title, .archive-title, .section-title { font-size: 24px; }
      .hero-summary { font-size: 16px; }
      .hero-stats { grid-template-columns: 1fr 1fr; }
    }
  </style>
  <link rel="canonical" href="${escapeAttribute(canonical)}">
  <title>${escapeHtml(title)} | LiuHD</title>
</head>
<body class="${bodyClass}" itemscope itemtype="http://schema.org/WebPage" lang="zh-CN">
  <div class="page-shell">
    <header class="topbar">
      <div>
        <div class="brand-title">LiuHD AI Daily</div>
        <div class="brand-subtitle">给中文投资者和开发者看的高信息密度 AI 日报</div>
      </div>
      <nav class="topnav">
        <a href="/">首页</a>
        <a href="/ai-daily/">日报归档</a>
        <a href="/archives/">旧文归档</a>
      </nav>
    </header>
    <main>${content}</main>
    <footer class="page-footer">由 GitHub Actions 每日自动更新，时区 ${TIME_ZONE}。</footer>
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

function escapeForRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWholeTerm(haystack, terms) {
  return terms.some((term) => new RegExp(`\\b${escapeForRegExp(term.toLowerCase())}\\b`, "i").test(haystack));
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
