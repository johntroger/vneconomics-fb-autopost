import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('Public profile service, page, and PHP API implement custom account URLs with one-time edit lock', () => {
  const svc = fs.readFileSync(path.join(ROOT, 'src/features/account/publicProfileService.ts'), 'utf8');
  assert.match(svc, /export function getUsernameFromEmail/);
  assert.match(svc, /export function saveOneTimeProfileEdit/);
  assert.match(svc, /has_edited_once/);
  assert.match(svc, /RESERVED_VNE_ROUTES/);
  assert.match(svc, /getPostBySlug/);

  const page = fs.readFileSync(path.join(ROOT, 'src/features/account/PublicProfilePage.tsx'), 'utf8');
  assert.match(page, /export const PublicProfilePage/);
  assert.match(page, /saveOneTimeProfileEdit/);
  assert.match(page, /getPublicProfileUrl/);

  const php = fs.readFileSync(path.join(ROOT, 'api/profiles.php'), 'utf8');
  assert.match(php, /ALREADY_EDITED_ONCE/);
  assert.match(php, /HANDLE_TAKEN/);

  const postDetail = fs.readFileSync(path.join(ROOT, 'src/features/blog/PostDetailPage.tsx'), 'utf8');
  assert.match(postDetail, /PublicProfilePage/);
});
