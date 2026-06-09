type JsonLdProps = {
  data: object | object[] | null | undefined;
};

export default function JsonLd({ data }: JsonLdProps) {
  const items = (Array.isArray(data) ? data : [data]).filter(
    (item): item is object =>
      Boolean(item) &&
      typeof item === "object" &&
      Object.keys(item as Record<string, unknown>).length > 0
  );

  if (items.length === 0) return null;

  const payload = items.length === 1 ? items[0] : items;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export { JsonLd };
