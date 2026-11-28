-- Migration 005: Strict Bilingual (Vietnamese + English) columns for VNEconomics MySQL 8
-- Ensures every future post, product, course, and glossary entry stores both VI and EN versions.

ALTER TABLE vne_posts
  ADD COLUMN IF NOT EXISTS title_en VARCHAR(500) DEFAULT NULL AFTER title,
  ADD COLUMN IF NOT EXISTS tldr_summary_en TEXT DEFAULT NULL AFTER tldr_summary,
  ADD COLUMN IF NOT EXISTS excerpt_en TEXT DEFAULT NULL AFTER excerpt,
  ADD COLUMN IF NOT EXISTS content_html_en LONGTEXT DEFAULT NULL AFTER content_html,
  ADD COLUMN IF NOT EXISTS seo_title_en VARCHAR(255) DEFAULT NULL AFTER seo_title,
  ADD COLUMN IF NOT EXISTS seo_desc_en VARCHAR(500) DEFAULT NULL AFTER seo_desc;

ALTER TABLE vne_products
  ADD COLUMN IF NOT EXISTS title_en VARCHAR(500) DEFAULT NULL AFTER title,
  ADD COLUMN IF NOT EXISTS category_name_en VARCHAR(255) DEFAULT NULL AFTER category_name,
  ADD COLUMN IF NOT EXISTS short_description_en TEXT DEFAULT NULL AFTER short_description,
  ADD COLUMN IF NOT EXISTS description_html_en LONGTEXT DEFAULT NULL AFTER description_html;

ALTER TABLE vne_courses
  ADD COLUMN IF NOT EXISTS title_en VARCHAR(500) DEFAULT NULL AFTER title,
  ADD COLUMN IF NOT EXISTS level_label_en VARCHAR(120) DEFAULT NULL AFTER level_label,
  ADD COLUMN IF NOT EXISTS description_html_en LONGTEXT DEFAULT NULL AFTER description_html;

ALTER TABLE vne_glossary_terms
  ADD COLUMN IF NOT EXISTS term_en VARCHAR(255) DEFAULT NULL AFTER term,
  ADD COLUMN IF NOT EXISTS short_definition_en TEXT DEFAULT NULL AFTER short_definition,
  ADD COLUMN IF NOT EXISTS full_explanation_en LONGTEXT DEFAULT NULL AFTER full_explanation,
  ADD COLUMN IF NOT EXISTS source_label_en VARCHAR(255) DEFAULT NULL AFTER source_label;
