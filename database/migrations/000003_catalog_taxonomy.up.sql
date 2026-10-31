CREATE TABLE catalog.releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  version integer NOT NULL CHECK (version > 0),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'published', 'retired')),
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(source_metadata) = 'object'),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  published_at timestamptz,
  retired_at timestamptz,
  CONSTRAINT catalog_release_version_unique UNIQUE (tenant_id, version),
  CONSTRAINT catalog_release_lifecycle CHECK (
    (state = 'draft' AND published_at IS NULL AND retired_at IS NULL) OR
    (state = 'published' AND published_at IS NOT NULL AND retired_at IS NULL) OR
    (state = 'retired' AND published_at IS NOT NULL AND retired_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX catalog_one_published_release_idx
ON catalog.releases (tenant_id) WHERE state = 'published';

CREATE TABLE catalog.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  release_id uuid NOT NULL REFERENCES catalog.releases(id) ON DELETE CASCADE,
  external_key text NOT NULL,
  parent_id uuid REFERENCES catalog.categories(id) ON DELETE RESTRICT,
  slug citext NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(icon) = 'object'),
  search_keywords text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  depth smallint NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 8),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT category_external_key_unique UNIQUE (release_id, external_key),
  CONSTRAINT category_slug_unique UNIQUE (release_id, slug),
  CONSTRAINT category_not_self_parent CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT category_slug_format CHECK (slug::text ~ '^[a-z0-9][a-z0-9-]{0,95}$')
);

CREATE INDEX categories_tree_idx ON catalog.categories (release_id, parent_id, sort_order, id);
CREATE INDEX categories_active_slug_idx ON catalog.categories (tenant_id, slug) WHERE is_active;
CREATE INDEX categories_keywords_gin_idx ON catalog.categories USING gin (search_keywords);
CREATE TRIGGER categories_touch_updated_at
BEFORE UPDATE ON catalog.categories
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE OR REPLACE FUNCTION catalog.guard_category_parent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_release uuid;
  parent_tenant uuid;
  parent_depth smallint;
  cycle_found boolean;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.depth := 0;
    RETURN NEW;
  END IF;
  SELECT release_id, tenant_id, depth INTO parent_release, parent_tenant, parent_depth
  FROM catalog.categories WHERE id = NEW.parent_id;
  IF parent_release IS NULL OR parent_release <> NEW.release_id OR parent_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'category parent must belong to the same tenant and release';
  END IF;
  NEW.depth := parent_depth + 1;
  IF NEW.depth > 8 THEN RAISE EXCEPTION 'category depth exceeds 8'; END IF;
  WITH RECURSIVE ancestors(id, parent_id) AS (
    SELECT id, parent_id FROM catalog.categories WHERE id = NEW.parent_id
    UNION ALL
    SELECT category.id, category.parent_id
    FROM catalog.categories category JOIN ancestors ON category.id = ancestors.parent_id
  )
  SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = NEW.id) INTO cycle_found;
  IF cycle_found THEN RAISE EXCEPTION 'category cycle detected'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER categories_guard_parent
BEFORE INSERT OR UPDATE OF parent_id, release_id, tenant_id ON catalog.categories
FOR EACH ROW EXECUTE FUNCTION catalog.guard_category_parent();

CREATE TABLE catalog.field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  release_id uuid NOT NULL REFERENCES catalog.releases(id) ON DELETE CASCADE,
  key text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'textarea', 'integer', 'decimal', 'boolean', 'single_select', 'multi_select', 'date', 'location', 'media')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  placeholder text NOT NULL DEFAULT '',
  validators jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(validators) = 'object'),
  ui jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(ui) = 'object'),
  is_filterable boolean NOT NULL DEFAULT false,
  is_searchable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT field_key_unique UNIQUE (release_id, key),
  CONSTRAINT field_key_format CHECK (key ~ '^[a-z][a-z0-9_-]{1,63}$')
);

CREATE TABLE catalog.field_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  field_id uuid NOT NULL REFERENCES catalog.field_definitions(id) ON DELETE CASCADE,
  value text NOT NULL,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT field_option_value_unique UNIQUE (field_id, value)
);

CREATE TABLE catalog.category_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  category_id uuid NOT NULL REFERENCES catalog.categories(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES catalog.field_definitions(id) ON DELETE CASCADE,
  section text NOT NULL DEFAULT 'main',
  position integer NOT NULL CHECK (position >= 0),
  required boolean NOT NULL DEFAULT false,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(overrides) = 'object'),
  CONSTRAINT category_field_unique UNIQUE (category_id, field_id),
  CONSTRAINT category_field_position_unique UNIQUE (category_id, section, position)
);

CREATE TABLE catalog.field_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  category_field_id uuid NOT NULL REFERENCES catalog.category_fields(id) ON DELETE CASCADE,
  depends_on_field_id uuid NOT NULL REFERENCES catalog.field_definitions(id) ON DELETE CASCADE,
  operator text NOT NULL CHECK (operator IN ('eq', 'neq', 'in', 'not_in', 'exists', 'gt', 'gte', 'lt', 'lte')),
  operand jsonb NOT NULL,
  effect text NOT NULL CHECK (effect IN ('show', 'hide', 'require', 'disable')),
  priority integer NOT NULL DEFAULT 0,
  CONSTRAINT field_rule_not_self CHECK (category_field_id IS NOT NULL)
);

CREATE TABLE catalog.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id),
  release_id uuid REFERENCES catalog.releases(id) ON DELETE SET NULL,
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  source_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('validated', 'imported', 'failed')),
  counts jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(counts) = 'object'),
  errors jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(errors) = 'array'),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz,
  CONSTRAINT catalog_import_checksum_unique UNIQUE (tenant_id, checksum)
);

CREATE INDEX category_fields_form_idx ON catalog.category_fields (category_id, section, position);
CREATE INDEX field_options_order_idx ON catalog.field_options (field_id, sort_order, id);
CREATE INDEX field_rules_order_idx ON catalog.field_rules (category_field_id, priority, id);

DO $$
DECLARE relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'releases', 'categories', 'field_definitions', 'field_options',
    'category_fields', 'field_rules', 'import_jobs'
  ] LOOP
    EXECUTE format('ALTER TABLE catalog.%I ENABLE ROW LEVEL SECURITY', relation_name);
    EXECUTE format('ALTER TABLE catalog.%I FORCE ROW LEVEL SECURITY', relation_name);
    EXECUTE format(
      'CREATE POLICY %I ON catalog.%I USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid)',
      relation_name || '_tenant_isolation', relation_name
    );
  END LOOP;
END;
$$;
