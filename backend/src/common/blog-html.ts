import sanitizeHtml from "sanitize-html";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isProbablyHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/g, '<a href="$2">$1</a>');
}

export function textOrMarkdownToHtml(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isProbablyHtml(raw)) return raw;

  const blocks: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push(`<p>${inlineMarkdown(text)}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (list.length) {
      blocks.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      list = [];
    }
  };

  raw.split(/\r?\n/).forEach((line) => {
    const clean = line.trim();
    if (!clean) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = clean.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length, 3);
      blocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    if (/^[-*]\s+/.test(clean)) {
      flushParagraph();
      list.push(clean.replace(/^[-*]\s+/, ""));
      return;
    }

    flushList();
    paragraph.push(clean);
  });

  flushParagraph();
  flushList();

  return blocks.join("\n");
}

function safeIframeHost(src: string) {
  try {
    const url = new URL(src);
    return (
      ["https:"].includes(url.protocol) &&
      [
        "www.youtube.com",
        "www.youtube-nocookie.com",
        "player.vimeo.com",
      ].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function sanitizeBlogHtml(value?: string | null) {
  const html = textOrMarkdownToHtml(value);

  return sanitizeHtml(html, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "p",
      "strong",
      "em",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "br",
      "hr",
      "span",
      "div",
      "figure",
      "figcaption",
      "iframe",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      iframe: [
        "src",
        "title",
        "width",
        "height",
        "allow",
        "allowfullscreen",
        "loading",
        "referrerpolicy",
      ],
      "*": ["class", "style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
      iframe: ["https"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
        color: [/^#[0-9a-f]{3,6}$/i, /^rgb\((\s*\d{1,3}\s*,){2}\s*\d{1,3}\s*\)$/],
        "background-color": [
          /^#[0-9a-f]{3,6}$/i,
          /^rgb\((\s*\d{1,3}\s*,){2}\s*\d{1,3}\s*\)$/,
        ],
        "font-size": [/^(14|16|18|20|24|28|32)px$/],
        width: [/^(25|50|75|100)%$/],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: {
          src: attribs.src || "",
          alt: attribs.alt || "",
          title: attribs.title || "",
          style: attribs.style || "",
          loading: "lazy",
        },
      }),
      iframe: ((tagName, attribs) => {
        if (!attribs.src || !safeIframeHost(attribs.src)) {
          return { tagName: "span", attribs: {}, text: "" };
        }
        return {
          tagName,
          attribs: {
            src: attribs.src,
            title: attribs.title || "Video embebido",
            loading: "lazy",
            allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
            allowfullscreen: "true",
            referrerpolicy: "strict-origin-when-cross-origin",
          },
        };
      }) as sanitizeHtml.Transformer,
    },
  }).trim();
}
