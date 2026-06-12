"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eye,
  Highlighter,
  ImagePlus,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Strikethrough,
  Table2,
  Type,
  Underline,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  blogSeoWarnings,
  sanitizeBlogHtml,
  videoEmbedUrl,
} from "@/lib/blog-html";

type RichBlogEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const headingOptions = [
  { label: "Parrafo", value: "P" },
  { label: "H1", value: "H1" },
  { label: "H2", value: "H2" },
  { label: "H3", value: "H3" },
];

const fontSizes = ["14px", "16px", "18px", "20px", "24px", "28px", "32px"];
const widths = ["100%", "75%", "50%", "25%"];

function toolbarButtonClass(active = false) {
  return active
    ? "h-9 rounded-lg border-[#0D2B52] bg-[#0D2B52] px-3 text-white hover:bg-[#12396d]"
    : "h-9 rounded-lg px-3";
}

export default function RichBlogEditor({
  value,
  onChange,
  disabled = false,
}: RichBlogEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imagePanelOpen, setImagePanelOpen] = useState(false);
  const [videoPanelOpen, setVideoPanelOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageTitle, setImageTitle] = useState("");
  const [imageAlign, setImageAlign] = useState("center");
  const [imageWidth, setImageWidth] = useState("100%");
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const warnings = useMemo(() => blogSeoWarnings(value), [value]);

  function emitChange() {
    if (!editorRef.current) return;
    onChange(sanitizeBlogHtml(editorRef.current.innerHTML));
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function command(name: string, argument?: string) {
    if (disabled) return;
    focusEditor();
    document.execCommand(name, false, argument);
    emitChange();
  }

  function insertHtml(html: string) {
    if (disabled) return;
    focusEditor();
    document.execCommand("insertHTML", false, sanitizeBlogHtml(html));
    emitChange();
  }

  function applySpanStyle(style: string) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      insertHtml(`<span style="${style}">Texto destacado</span>`);
      return;
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.setAttribute("style", style);
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    emitChange();
  }

  function addLink() {
    const href = window.prompt("URL del enlace interno o externo");
    if (!href) return;
    command("createLink", href);
  }

  function addImage() {
    if (!imageUrl.trim()) return;
    insertHtml(`
      <figure style="text-align: ${imageAlign}">
        <img src="${imageUrl.trim()}" alt="${imageAlt.trim()}" title="${imageTitle.trim()}" style="width: ${imageWidth}" />
        ${imageTitle.trim() ? `<figcaption>${imageTitle.trim()}</figcaption>` : ""}
      </figure>
    `);
    setImageUrl("");
    setImageAlt("");
    setImageTitle("");
    setImagePanelOpen(false);
  }

  function addVideo() {
    const embed = videoEmbedUrl(videoUrl);
    if (!embed) return;
    insertHtml(`
      <figure class="blog-video">
        <iframe src="${embed}" title="Video embebido" loading="lazy" allowfullscreen></iframe>
      </figure>
    `);
    setVideoUrl("");
    setVideoPanelOpen(false);
  }

  function addTable() {
    insertHtml(`
      <table>
        <tbody>
          <tr><th>Encabezado</th><th>Encabezado</th></tr>
          <tr><td>Contenido</td><td>Contenido</td></tr>
        </tbody>
      </table>
    `);
  }

  function addCta() {
    insertHtml(`
      <div class="blog-cta">
        <span class="blog-cta-label">Cartagena Tailored Travel</span>
        <h2>Planifica tu experiencia en Cartagena</h2>
        <p>Habla con nuestro equipo para crear una propuesta personalizada segun tu estilo de viaje.</p>
        <p><a href="/contacto">Contactar un asesor</a></p>
      </div>
    `);
  }

  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-[#D4AF37]/20 p-3">
        <select
          aria-label="Formato"
          disabled={disabled}
          onChange={(event) => command("formatBlock", event.target.value)}
          className="h-9 rounded-lg border border-[#D4AF37]/30 bg-white px-3 text-sm"
          defaultValue="P"
        >
          {headingOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <Button type="button" variant="outline" disabled={disabled} onClick={() => command("bold")} className={toolbarButtonClass()}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => command("italic")} className={toolbarButtonClass()}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => command("underline")} className={toolbarButtonClass()}>
          <Underline className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => command("strikeThrough")} className={toolbarButtonClass()}>
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => command("insertUnorderedList")} className={toolbarButtonClass()}>
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => command("insertOrderedList")} className={toolbarButtonClass()}>
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => command("formatBlock", "blockquote")} className={toolbarButtonClass()}>
          <Quote className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={addLink} className={toolbarButtonClass()}>
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => command("justifyLeft")} className={toolbarButtonClass()}>
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => command("justifyCenter")} className={toolbarButtonClass()}>
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => command("justifyRight")} className={toolbarButtonClass()}>
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => command("justifyFull")} className={toolbarButtonClass()}>
          <AlignJustify className="h-4 w-4" />
        </Button>

        <select
          aria-label="Tamaño"
          disabled={disabled}
          onChange={(event) => applySpanStyle(`font-size: ${event.target.value}`)}
          className="h-9 rounded-lg border border-[#D4AF37]/30 bg-white px-3 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Tamano
          </option>
          {fontSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D4AF37]/30 px-3 text-sm">
          <Palette className="h-4 w-4" />
          <input
            type="color"
            disabled={disabled}
            onChange={(event) => applySpanStyle(`color: ${event.target.value}`)}
            className="h-5 w-7"
          />
        </label>

        <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D4AF37]/30 px-3 text-sm">
          <Highlighter className="h-4 w-4" />
          <input
            type="color"
            disabled={disabled}
            onChange={(event) => applySpanStyle(`background-color: ${event.target.value}`)}
            className="h-5 w-7"
          />
        </label>

        <Button type="button" variant="outline" disabled={disabled} onClick={() => insertHtml("<hr />")} className={toolbarButtonClass()}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={addTable} className={toolbarButtonClass()}>
          <Table2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={addCta} className={toolbarButtonClass()}>
          <Pilcrow className="h-4 w-4" />
          CTA
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => setImagePanelOpen((open) => !open)} className={toolbarButtonClass()}>
          <ImagePlus className="h-4 w-4" />
          Imagen
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => setVideoPanelOpen((open) => !open)} className={toolbarButtonClass()}>
          <Video className="h-4 w-4" />
          Video
        </Button>
        <Button type="button" variant="outline" onClick={() => setPreviewOpen((open) => !open)} className={toolbarButtonClass()}>
          <Eye className="h-4 w-4" />
          Previsualizar
        </Button>
      </div>

      {imagePanelOpen && (
        <div className="grid gap-3 border-b border-[#D4AF37]/20 bg-[#F8F6F2] p-4 md:grid-cols-2">
          <Input placeholder="URL de imagen" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
          <Input placeholder="Texto alternativo alt" value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} />
          <Input placeholder="Titulo opcional" value={imageTitle} onChange={(event) => setImageTitle(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <select value={imageAlign} onChange={(event) => setImageAlign(event.target.value)} className="h-10 rounded-lg border border-[#D4AF37]/30 bg-white px-3 text-sm">
              <option value="left">Izquierda</option>
              <option value="center">Centrada</option>
              <option value="right">Derecha</option>
            </select>
            <select value={imageWidth} onChange={(event) => setImageWidth(event.target.value)} className="h-10 rounded-lg border border-[#D4AF37]/30 bg-white px-3 text-sm">
              {widths.map((width) => (
                <option key={width} value={width}>
                  {width}
                </option>
              ))}
            </select>
            <Button type="button" onClick={addImage} className="rounded-lg bg-[#0D2B52]">
              Agregar imagen
            </Button>
          </div>
        </div>
      )}

      {videoPanelOpen && (
        <div className="flex flex-col gap-3 border-b border-[#D4AF37]/20 bg-[#F8F6F2] p-4 md:flex-row">
          <Input
            placeholder="URL de YouTube o Vimeo"
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
          />
          <Button type="button" onClick={addVideo} className="rounded-lg bg-[#0D2B52]">
            Insertar video seguro
          </Button>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        className="blog-rich-content min-h-[420px] w-full px-5 py-4 text-base leading-8 text-slate-700 outline-none"
      />

      {warnings.length > 0 && (
        <div className="border-t border-[#D4AF37]/20 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Advertencias SEO de contenido</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {previewOpen && (
        <div className="border-t border-[#D4AF37]/20 bg-[#F8F6F2] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#B48A5A]">
            <Type className="h-4 w-4" />
            Previsualizacion
          </div>
          <div
            className="blog-public-content rounded-2xl bg-white p-6 shadow-sm"
            dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(value) }}
          />
        </div>
      )}
    </div>
  );
}
