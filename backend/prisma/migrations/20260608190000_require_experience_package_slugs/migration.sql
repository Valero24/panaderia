CREATE OR REPLACE FUNCTION "_tmp_normalize_seo_slug"(value text)
RETURNS text AS $$
  SELECT trim(both '-' from regexp_replace(
    regexp_replace(
      lower(translate(
        coalesce(value, ''),
        U&'\00C1\00C0\00C2\00C3\00C4\00C5\00E1\00E0\00E2\00E3\00E4\00E5\00C9\00C8\00CA\00CB\00E9\00E8\00EA\00EB\00CD\00CC\00CE\00CF\00ED\00EC\00EE\00EF\00D3\00D2\00D4\00D5\00D6\00F3\00F2\00F4\00F5\00F6\00DA\00D9\00DB\00DC\00FA\00F9\00FB\00FC\00D1\00F1\00C7\00E7',
        'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc'
      )),
      '[^a-z0-9[:space:]-]',
      '',
      'g'
    ),
    '[[:space:]]+|-+',
    '-',
    'g'
  ));
$$ LANGUAGE sql IMMUTABLE;

UPDATE "Experience"
SET "slug" = concat(
  coalesce(nullif("_tmp_normalize_seo_slug"("title"), ''), 'experiencia'),
  '-',
  "id"
)
WHERE "slug" IS NULL OR btrim("slug") = '';

UPDATE "Package"
SET "slug" = concat(
  coalesce(nullif("_tmp_normalize_seo_slug"("title"), ''), 'paquete'),
  '-',
  "id"
)
WHERE "slug" IS NULL OR btrim("slug") = '';

ALTER TABLE "Experience" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Package" ALTER COLUMN "slug" SET NOT NULL;

DROP FUNCTION "_tmp_normalize_seo_slug"(text);
