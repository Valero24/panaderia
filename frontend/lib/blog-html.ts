const allowedTags = new Set([
  "H1",
  "H2",
  "H3",
  "P",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "S",
  "STRIKE",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "A",
  "IMG",
  "TABLE",
  "THEAD",
  "TBODY",
  "TR",
  "TH",
  "TD",
  "BR",
  "HR",
  "SPAN",
  "DIV",
  "FIGURE",
  "FIGCAPTION",
  "IFRAME",
]);

const allowedAlignments = new Set(["left", "center", "right", "justify"]);
const allowedFontSizes = new Set(["14px", "16px", "18px", "20px", "24px", "28px", "32px"]);

export function videoEmbedUrl(value: string) {
  const raw = value.trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.replace("/", "").trim();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
    }

    if (host === "vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }

    if (
      host === "player.vimeo.com" &&
      /^\/video\/\d+/.test(url.pathname)
    ) {
      return url.toString();
    }

    if (
      (host === "youtube-nocookie.com" || host === "youtube.com") &&
      url.pathname.startsWith("/embed/")
    ) {
      return `https://www.youtube-nocookie.com${url.pathname}`;
    }
  } catch {
    return "";
  }

  return "";
}

function safeUrl(value: string, allowRelative = false) {
  const raw = value.trim();
  if (!raw) return "";
  if (allowRelative && raw.startsWith("/")) return raw;

  try {
    const url = new URL(raw);
    if (["http:", "https:", "mailto:"].includes(url.protocol)) return url.toString();
  } catch {
    return "";
  }

  return "";
}

function safeStyle(value: string) {
  const parts = value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  const safe: string[] = [];

  for (const part of parts) {
    const [rawName, ...rawValue] = part.split(":");
    const name = rawName?.trim().toLowerCase();
    const val = rawValue.join(":").trim();

    if (name === "text-align" && allowedAlignments.has(val)) {
      safe.push(`${name}: ${val}`);
    }

    if (
      (name === "color" || name === "background-color") &&
      (/^#[0-9a-f]{3,6}$/i.test(val) || /^rgb\((\s*\d{1,3}\s*,){2}\s*\d{1,3}\s*\)$/i.test(val))
    ) {
      safe.push(`${name}: ${val}`);
    }

    if (name === "font-size" && allowedFontSizes.has(val)) {
      safe.push(`${name}: ${val}`);
    }

    if (name === "width" && /^(25|50|75|100)%$/.test(val)) {
      safe.push(`${name}: ${val}`);
    }
  }

  return safe.join("; ");
}

function cleanNode(node: Node, documentRef: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return documentRef.createTextNode(node.textContent || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as HTMLElement;
  const tag = element.tagName;

  if (!allowedTags.has(tag)) {
    const fragment = documentRef.createDocumentFragment();
    Array.from(element.childNodes).forEach((child) => {
      const clean = cleanNode(child, documentRef);
      if (clean) fragment.appendChild(clean);
    });
    return fragment;
  }

  const output = documentRef.createElement(tag.toLowerCase());

  if (tag === "A") {
    const href = safeUrl(element.getAttribute("href") || "", true);
    if (!href) return documentRef.createTextNode(element.textContent || "");
    output.setAttribute("href", href);
    output.setAttribute("rel", "noopener noreferrer");
    if (!href.startsWith("/") && !href.startsWith("#")) {
      output.setAttribute("target", "_blank");
    }
    const title = element.getAttribute("title");
    if (title) output.setAttribute("title", title.slice(0, 120));
  }

  if (tag === "IMG") {
    const src = safeUrl(element.getAttribute("src") || "");
    if (!src) return null;
    output.setAttribute("src", src);
    output.setAttribute("alt", (element.getAttribute("alt") || "").slice(0, 160));
    output.setAttribute("title", (element.getAttribute("title") || "").slice(0, 160));
    output.setAttribute("loading", "lazy");
    const imgStyle = safeStyle(element.getAttribute("style") || "");
    if (imgStyle) output.setAttribute("style", imgStyle);
  }

  if (tag === "IFRAME") {
    const src = videoEmbedUrl(element.getAttribute("src") || "");
    if (!src) return null;
    output.setAttribute("src", src);
    output.setAttribute("title", (element.getAttribute("title") || "Video embebido").slice(0, 120));
    output.setAttribute("loading", "lazy");
    output.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
    output.setAttribute("allowfullscreen", "true");
    output.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  }

  const style = safeStyle(element.getAttribute("style") || "");
  if (style && tag !== "IMG") output.setAttribute("style", style);

  if (["FIGURE", "DIV"].includes(tag) && element.className === "blog-cta") {
    output.setAttribute("class", "blog-cta");
  }

  if (tag === "SPAN" && element.className === "blog-cta-label") {
    output.setAttribute("class", "blog-cta-label");
  }

  Array.from(element.childNodes).forEach((child) => {
    const clean = cleanNode(child, documentRef);
    if (clean) output.appendChild(clean);
  });

  return output;
}

export function sanitizeBlogHtml(html: string) {
  if (!html) return "";
  if (typeof window === "undefined") {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
      .replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, "")
      .replace(/<iframe(?![^>]+src=["']https:\/\/(?:www\.youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/video\/))[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
      .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
      .replace(/(href|src)\s*=\s*(['"])\s*(javascript:|data:)[\s\S]*?\2/gi, "")
      .trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, "text/html");
  const cleanDoc = document.implementation.createHTMLDocument("");
  const fragment = cleanDoc.createDocumentFragment();

  Array.from(doc.body.childNodes).forEach((node) => {
    const clean = cleanNode(node, cleanDoc);
    if (clean) fragment.appendChild(clean);
  });

  const container = cleanDoc.createElement("div");
  container.appendChild(fragment);
  return container.innerHTML.trim();
}

export function plainTextFromHtml(html: string) {
  if (typeof window === "undefined") return html.replace(/<[^>]+>/g, " ");
  const parser = new DOMParser();
  const doc = parser.parseFromString(html || "", "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

export function blogSeoWarnings(html: string) {
  if (typeof window === "undefined") return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html || "", "text/html");
  const text = (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  const words = text ? text.split(/\s+/).length : 0;
  const warnings: string[] = [];

  if (doc.querySelectorAll("h1").length > 1) {
    warnings.push("Hay mas de un H1. Mantén un solo H1 para SEO.");
  }
  if (doc.querySelectorAll("h2").length === 0) {
    warnings.push("El articulo no tiene H2. Usa H2 para secciones principales.");
  }
  if (Array.from(doc.querySelectorAll("img")).some((img) => !img.getAttribute("alt")?.trim())) {
    warnings.push("Faltan textos alternativos en una o mas imagenes.");
  }
  if (words < 500) {
    warnings.push("El contenido es corto. Para SEO turistico intenta superar 500 palabras.");
  }
  if (!Array.from(doc.querySelectorAll("a")).some((link) => (link.getAttribute("href") || "").startsWith("/"))) {
    warnings.push("No hay enlaces internos hacia destinos, alojamientos, experiencias o paquetes.");
  }

  return warnings;
}
