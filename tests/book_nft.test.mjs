import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

test('VNECertificateNFT smart contract enforces 1-of-1 first-to-mint Book NFT ownership', () => {
  const sol = fs.readFileSync(path.join(ROOT, 'contracts', 'VNECertificateNFT.sol'), 'utf8');
  assert.ok(sol.includes('bookClaimedTokenId'), 'Missing bookClaimedTokenId mapping');
  assert.ok(sol.includes('function claimBookNFT('), 'Missing claimBookNFT function');
  assert.ok(sol.includes('Book already claimed by first minter'), 'Missing first-minter exclusivity require');
  assert.ok(sol.includes('event BookNFTClaimed('), 'Missing BookNFTClaimed event');
});

test('PHP api/book_nfts.php enforces write-once immutability and 409 conflict on duplicate book claims', () => {
  const php = fs.readFileSync(path.join(ROOT, 'api', 'book_nfts.php'), 'utf8');
  assert.ok(php.includes('vne_book_nfts'), 'Missing vne_book_nfts table');
  assert.ok(php.includes('ALREADY_CLAIMED'), 'Missing ALREADY_CLAIMED conflict code');
  assert.ok(php.includes('409'), 'Missing HTTP 409 status on duplicate claim');
});

test('Frontend bookNftRegistryService and BookNftMintModal enforce First-to-Mint exclusivity', () => {
  const svc = fs.readFileSync(
    path.join(ROOT, 'src', 'features', 'library', 'bookNftRegistryService.ts'),
    'utf8',
  );
  const modal = fs.readFileSync(
    path.join(ROOT, 'src', 'features', 'library', 'BookNftMintModal.tsx'),
    'utf8',
  );
  const lib = fs.readFileSync(
    path.join(ROOT, 'src', 'features', 'library', 'LibraryPage.tsx'),
    'utf8',
  );

  assert.ok(svc.includes('deduplicateBookNfts'), 'Missing deduplicateBookNfts');
  assert.ok(svc.includes('mintExclusiveBookNft'), 'Missing mintExclusiveBookNft');
  assert.ok(svc.includes('ACTIVE_ORIGINAL'), 'Missing ACTIVE_ORIGINAL status');
  assert.ok(modal.includes('BookNftMintModal'), 'Missing BookNftMintModal component');
  assert.ok(lib.includes('BookNftMintModal'), 'LibraryPage must integrate BookNftMintModal');
});
