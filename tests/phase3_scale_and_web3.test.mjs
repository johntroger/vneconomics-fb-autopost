import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('Phase 3 scalability adds paginated courses API, storage schema versioning, debounced search, and modular Bookshelf', () => {
  const coursesPhp = fs.readFileSync(path.join(ROOT, 'api/courses.php'), 'utf8');
  assert.match(coursesPhp, /vneCacheGet\(/);
  assert.match(coursesPhp, /total_pages/);

  const schemaTs = fs.readFileSync(path.join(ROOT, 'src/core/utils/storageSchema.ts'), 'utf8');
  assert.match(schemaTs, /export function runStorageMigrations/);
  assert.match(schemaTs, /export function useDebouncedValue/);

  const mainTsx = fs.readFileSync(path.join(ROOT, 'src/main.tsx'), 'utf8');
  assert.match(mainTsx, /runStorageMigrations\(\)/);

  const headerTsx = fs.readFileSync(path.join(ROOT, 'src/core/ui/Header.tsx'), 'utf8');
  assert.match(headerTsx, /useDebouncedValue\(/);

  assert.ok(fs.existsSync(path.join(ROOT, 'src/features/bookshelf/DailyReadingQuestsHud.tsx')));
  assert.ok(fs.existsSync(path.join(ROOT, 'src/features/bookshelf/BookshelfNftGalleryTab.tsx')));
});

test('Phase 3 smart contracts add ECDSA voucher minting, replay protection, and ReentrancyGuard', () => {
  const nftSol = fs.readFileSync(path.join(ROOT, 'contracts/VNECertificateNFT.sol'), 'utf8');
  assert.match(nftSol, /mapping\(bytes32 => bool\) public usedVoucherNonces;/);
  assert.match(nftSol, /function claimBookNFTWithVoucher\(/);
  assert.match(nftSol, /ecrecover\(/);
  assert.match(nftSol, /function setVoucherSigner\(/);

  const vaultSol = fs.readFileSync(path.join(ROOT, 'contracts/VNEDeFiVault.sol'), 'utf8');
  assert.match(vaultSol, /modifier nonReentrant\(\)/);
  assert.match(vaultSol, /function stakeTokens\(uint256 amount\) external nonReentrant/);
  assert.match(vaultSol, /function claimYield\(\) external nonReentrant/);
});
