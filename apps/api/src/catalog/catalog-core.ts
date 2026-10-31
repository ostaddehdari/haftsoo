import { createHash } from "node:crypto";

export const FIELD_TYPES = [
  "text", "textarea", "integer", "decimal", "boolean", "single_select",
  "multi_select", "date", "location", "media"
] as const;

export type CatalogFieldType = typeof FIELD_TYPES[number];
export type RuleOperator = "eq" | "neq" | "in" | "not_in" | "exists" | "gt" | "gte" | "lt" | "lte";
export type RuleEffect = "show" | "hide" | "require" | "disable";

export interface CategoryInput {
  key: string;
  parentKey?: string;
  slug: string;
  title: string;
  description?: string;
  sortOrder?: number;
  icon?: Record<string, unknown>;
  searchKeywords?: string[];
  metadata?: Record<string, unknown>;
}

export interface FieldOptionInput {
  value: string;
  title: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface FieldInput {
  key: string;
  type: CatalogFieldType;
  title: string;
  description?: string;
  placeholder?: string;
  validators?: Record<string, unknown>;
  ui?: Record<string, unknown>;
  filterable?: boolean;
  searchable?: boolean;
  options?: FieldOptionInput[];
}

export interface FieldRuleInput {
  dependsOn: string;
  operator: RuleOperator;
  operand?: unknown;
  effect: RuleEffect;
  priority?: number;
}

export interface CategoryFieldInput {
  fieldKey: string;
  section?: string;
  position: number;
  required?: boolean;
  overrides?: Record<string, unknown>;
  rules?: FieldRuleInput[];
}

export interface CategoryFormInput {
  categoryKey: string;
  fields: CategoryFieldInput[];
}

export interface CatalogImportDocument {
  schemaVersion: 1;
  source: { name: string; generatedAt: string; license?: string };
  categories: CategoryInput[];
  fields: FieldInput[];
  forms: CategoryFormInput[];
}

export interface CatalogValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface CategoryNode extends CategoryInput {
  depth: number;
  children: CategoryNode[];
}

export interface ResolvedFormField extends FieldInput {
  section: string;
  position: number;
  required: boolean;
  disabled: boolean;
  overrides: Record<string, unknown>;
}

const keyPattern = /^[a-z][a-z0-9_-]{1,63}$/;
const slugPattern = /^[a-z0-9][a-z0-9-]{0,95}$/;
const operators = new Set<RuleOperator>(["eq", "neq", "in", "not_in", "exists", "gt", "gte", "lt", "lte"]);
const effects = new Set<RuleEffect>(["show", "hide", "require", "disable"]);

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function catalogChecksum(document: CatalogImportDocument): string {
  return createHash("sha256").update(stable(document)).digest("hex");
}

export function validateCatalogImport(document: CatalogImportDocument): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const categoryKeys = new Set<string>();
  const categorySlugs = new Set<string>();
  const fields = new Map<string, FieldInput>();
  const forms = new Set<string>();
  const issue = (code: string, path: string, message: string) => issues.push({ code, path, message });

  if (document.schemaVersion !== 1) issue("schema.unsupported", "schemaVersion", "schemaVersion must be 1");
  if (!document.source?.name?.trim()) issue("source.required", "source.name", "source name is required");
  if (Number.isNaN(Date.parse(document.source?.generatedAt))) issue("source.date", "source.generatedAt", "generatedAt must be ISO-8601");

  document.categories.forEach((category, index) => {
    const path = `categories[${index}]`;
    if (!keyPattern.test(category.key)) issue("category.key", `${path}.key`, "invalid category key");
    if (!slugPattern.test(category.slug)) issue("category.slug", `${path}.slug`, "invalid category slug");
    if (!category.title.trim()) issue("category.title", `${path}.title`, "title is required");
    if (categoryKeys.has(category.key)) issue("category.duplicate_key", `${path}.key`, "duplicate category key");
    if (categorySlugs.has(category.slug)) issue("category.duplicate_slug", `${path}.slug`, "duplicate category slug");
    categoryKeys.add(category.key);
    categorySlugs.add(category.slug);
  });

  document.categories.forEach((category, index) => {
    if (category.parentKey && !categoryKeys.has(category.parentKey)) {
      issue("category.parent_missing", `categories[${index}].parentKey`, "parent category does not exist");
    }
    const visited = new Set<string>([category.key]);
    let current = category;
    let depth = 0;
    while (current.parentKey) {
      if (visited.has(current.parentKey)) {
        issue("category.cycle", `categories[${index}].parentKey`, "category hierarchy contains a cycle");
        break;
      }
      visited.add(current.parentKey);
      const parent = document.categories.find((candidate) => candidate.key === current.parentKey);
      if (!parent) break;
      current = parent;
      depth += 1;
      if (depth > 8) {
        issue("category.depth", `categories[${index}].parentKey`, "category depth exceeds 8");
        break;
      }
    }
  });

  document.fields.forEach((field, index) => {
    const path = `fields[${index}]`;
    if (!keyPattern.test(field.key)) issue("field.key", `${path}.key`, "invalid field key");
    if (!FIELD_TYPES.includes(field.type)) issue("field.type", `${path}.type`, "unsupported field type");
    if (!field.title.trim()) issue("field.title", `${path}.title`, "title is required");
    if (fields.has(field.key)) issue("field.duplicate_key", `${path}.key`, "duplicate field key");
    fields.set(field.key, field);
    const optionValues = new Set<string>();
    for (const [optionIndex, option] of (field.options ?? []).entries()) {
      if (!option.value.trim() || optionValues.has(option.value)) issue("field.option", `${path}.options[${optionIndex}]`, "option values must be non-empty and unique");
      optionValues.add(option.value);
    }
    const select = field.type === "single_select" || field.type === "multi_select";
    if (select && !(field.options?.length)) issue("field.options_required", `${path}.options`, "select fields require options");
    if (!select && field.options?.length) issue("field.options_forbidden", `${path}.options`, "only select fields accept options");
  });

  document.forms.forEach((form, index) => {
    const path = `forms[${index}]`;
    if (!categoryKeys.has(form.categoryKey)) issue("form.category_missing", `${path}.categoryKey`, "form category does not exist");
    if (forms.has(form.categoryKey)) issue("form.duplicate", `${path}.categoryKey`, "category form is duplicated");
    forms.add(form.categoryKey);
    const assigned = new Set<string>();
    const positions = new Set<string>();
    form.fields.forEach((assignment, assignmentIndex) => {
      const assignmentPath = `${path}.fields[${assignmentIndex}]`;
      if (!fields.has(assignment.fieldKey)) issue("form.field_missing", `${assignmentPath}.fieldKey`, "field does not exist");
      if (assigned.has(assignment.fieldKey)) issue("form.field_duplicate", `${assignmentPath}.fieldKey`, "field is assigned twice");
      assigned.add(assignment.fieldKey);
      const positionKey = `${assignment.section ?? "main"}:${assignment.position}`;
      if (assignment.position < 0 || positions.has(positionKey)) issue("form.position", `${assignmentPath}.position`, "positions must be non-negative and unique per section");
      positions.add(positionKey);
      for (const [ruleIndex, rule] of (assignment.rules ?? []).entries()) {
        if (!fields.has(rule.dependsOn)) issue("rule.dependency_missing", `${assignmentPath}.rules[${ruleIndex}].dependsOn`, "rule dependency does not exist");
        if (rule.dependsOn === assignment.fieldKey) issue("rule.self_dependency", `${assignmentPath}.rules[${ruleIndex}].dependsOn`, "field cannot depend on itself");
        if (!operators.has(rule.operator)) issue("rule.operator", `${assignmentPath}.rules[${ruleIndex}].operator`, "invalid rule operator");
        if (!effects.has(rule.effect)) issue("rule.effect", `${assignmentPath}.rules[${ruleIndex}].effect`, "invalid rule effect");
      }
    });
  });
  return issues;
}

export function buildCategoryTree(categories: readonly CategoryInput[]): CategoryNode[] {
  const nodes = new Map(categories.map((category) => [category.key, { ...category, depth: 0, children: [] } as CategoryNode]));
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentKey ? nodes.get(node.parentKey) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (nodesToSort: CategoryNode[], depth: number) => {
    nodesToSort.sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.key.localeCompare(right.key));
    for (const node of nodesToSort) {
      node.depth = depth;
      sort(node.children, depth + 1);
    }
  };
  sort(roots, 0);
  return roots;
}

function compare(actual: unknown, operator: RuleOperator, expected: unknown): boolean {
  if (operator === "exists") return actual !== undefined && actual !== null && actual !== "";
  if (operator === "eq") return actual === expected;
  if (operator === "neq") return actual !== expected;
  if (operator === "in") return Array.isArray(expected) && expected.includes(actual);
  if (operator === "not_in") return Array.isArray(expected) && !expected.includes(actual);
  if (typeof actual !== "number" || typeof expected !== "number") return false;
  return operator === "gt" ? actual > expected : operator === "gte" ? actual >= expected : operator === "lt" ? actual < expected : actual <= expected;
}

export function resolveCategoryForm(document: CatalogImportDocument, categoryKey: string, values: Record<string, unknown> = {}): ResolvedFormField[] {
  const form = document.forms.find((candidate) => candidate.categoryKey === categoryKey);
  if (!form) return [];
  const fields = new Map(document.fields.map((field) => [field.key, field]));
  const resolved: ResolvedFormField[] = [];
  for (const assignment of form.fields) {
    const field = fields.get(assignment.fieldKey);
    if (!field) continue;
    let visible = true;
    let required = assignment.required ?? false;
    let disabled = false;
    for (const rule of [...(assignment.rules ?? [])].sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0))) {
      if (!compare(values[rule.dependsOn], rule.operator, rule.operand)) continue;
      if (rule.effect === "show") visible = true;
      if (rule.effect === "hide") visible = false;
      if (rule.effect === "require") required = true;
      if (rule.effect === "disable") disabled = true;
    }
    if (visible) resolved.push({ ...field, section: assignment.section ?? "main", position: assignment.position, required, disabled, overrides: assignment.overrides ?? {} });
  }
  return resolved.sort((left, right) => left.section.localeCompare(right.section) || left.position - right.position);
}
