// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

/**
 * @title VNECertificateNFT - Dynamic ERC-721 (Hộ chiếu Kinh tế số, Chứng chỉ Khóa học & Bằng chứng Học thuật)
 * @author VNEconomics.com
 * @notice 100% Testnet (Base Sepolia / Ethereum Sepolia / Polygon Amoy) - 0đ tiền thật.
 */
contract VNECertificateNFT is IERC721 {
    string private _name = "VNEconomics Digital Passport & Certificate";
    string private _symbol = "VNE-NFT";
    uint256 private _nextTokenId = 1;
    address public owner;
    address public voucherSigner;
    bool public requireVoucherSignature = false;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(bytes32 => bool) public usedVoucherNonces;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    struct CertificateRecord {
        string nftType;      // "passport" | "certificate" | "proof"
        string title;
        uint8 milestoneStage;
        string sha256Proof;
        uint256 mintedAt;
    }

    mapping(uint256 => CertificateRecord) public certificates;
    mapping(bytes32 => uint256) public bookClaimedTokenId;

    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        string nftType,
        string title,
        string sha256Proof,
        string tokenURI
    );

    event BookNFTClaimed(
        uint256 indexed tokenId,
        bytes32 indexed bookKeyHash,
        address indexed owner,
        string bookSlug,
        string sha256Proof
    );

    event MilestoneUpgraded(
        uint256 indexed tokenId,
        uint8 newStage,
        string newSha256Proof,
        string newUri,
        uint256 timestamp
    );

    constructor() {
        owner = msg.sender;
        voucherSigner = msg.sender;
    }

    function setVoucherSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid signer");
        voucherSigner = newSigner;
    }

    function setRequireVoucherSignature(bool required) external onlyOwner {
        requireVoucherSignature = required;
    }

    function _verifyVoucherSignature(bytes32 digest, bytes calldata signature) internal view returns (bool) {
        if (signature.length != 65) return false;
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return false;
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        return ecrecover(ethSignedHash, v, r, s) == voucherSigner;
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Nonexistent token");
        return _tokenURIs[tokenId];
    }

    function balanceOf(address account) public view override returns (uint256) {
        require(account != address(0), "Zero address");
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "Nonexistent token");
        return tokenOwner;
    }

    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f || interfaceId == 0x01ffc9a7;
    }

    function mintCertificate(
        address recipient,
        string calldata nftType,
        string calldata title,
        uint8 milestoneStage,
        string calldata sha256Proof,
        string calldata uri
    ) external returns (uint256) {
        require(!requireVoucherSignature, "Voucher signature required");
        require(recipient != address(0), "Invalid recipient");
        uint256 tokenId = _nextTokenId;
        _nextTokenId += 1;

        _owners[tokenId] = recipient;
        _balances[recipient] += 1;
        _tokenURIs[tokenId] = uri;

        certificates[tokenId] = CertificateRecord({
            nftType: nftType,
            title: title,
            milestoneStage: milestoneStage,
            sha256Proof: sha256Proof,
            mintedAt: block.timestamp
        });

        emit Transfer(address(0), recipient, tokenId);
        emit CertificateMinted(tokenId, recipient, nftType, title, sha256Proof, uri);
        return tokenId;
    }

    /**
     * @notice First-to-Mint Exclusive Book Ownership ("Ai NFT truoc, nguoi do so huu sach truoc").
     */
    function claimBookNFT(
        address recipient,
        string calldata bookSlug,
        string calldata title,
        string calldata sha256Proof,
        string calldata uri
    ) external returns (uint256) {
        require(!requireVoucherSignature, "Voucher signature required");
        require(recipient != address(0), "Invalid recipient");
        require(bytes(bookSlug).length > 0, "Book slug required");
        bytes32 keyHash = keccak256(abi.encodePacked(bookSlug));
        require(bookClaimedTokenId[keyHash] == 0, "Book already claimed by first minter");

        uint256 tokenId = _nextTokenId;
        _nextTokenId += 1;

        _owners[tokenId] = recipient;
        _balances[recipient] += 1;
        _tokenURIs[tokenId] = uri;
        bookClaimedTokenId[keyHash] = tokenId;

        certificates[tokenId] = CertificateRecord({
            nftType: "book",
            title: title,
            milestoneStage: 1,
            sha256Proof: sha256Proof,
            mintedAt: block.timestamp
        });

        emit Transfer(address(0), recipient, tokenId);
        emit CertificateMinted(tokenId, recipient, "book", title, sha256Proof, uri);
        emit BookNFTClaimed(tokenId, keyHash, recipient, bookSlug, sha256Proof);
        return tokenId;
    }

    function getBookClaimOwner(string calldata bookSlug) external view returns (address, uint256) {
        bytes32 keyHash = keccak256(abi.encodePacked(bookSlug));
        uint256 tokenId = bookClaimedTokenId[keyHash];
        if (tokenId == 0) {
            return (address(0), 0);
        }
        return (_owners[tokenId], tokenId);
    }

    /**
     * @notice Production-grade signed voucher minting for 1-of-1 Book NFTs (anti-bot & replay-protected).
     */
    function claimBookNFTWithVoucher(
        address recipient,
        string calldata bookSlug,
        string calldata title,
        string calldata sha256Proof,
        string calldata uri,
        bytes32 nonce,
        uint256 expiresAt,
        bytes calldata signature
    ) external returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(bytes(bookSlug).length > 0, "Book slug required");
        require(block.timestamp <= expiresAt, "Voucher expired");
        require(!usedVoucherNonces[nonce], "Voucher already used");

        bytes32 digest = keccak256(abi.encodePacked(address(this), block.chainid, recipient, bookSlug, sha256Proof, nonce, expiresAt));
        require(_verifyVoucherSignature(digest, signature), "Invalid voucher signature");

        bytes32 keyHash = keccak256(abi.encodePacked(bookSlug));
        require(bookClaimedTokenId[keyHash] == 0, "Book already claimed by first minter");

        usedVoucherNonces[nonce] = true;
        uint256 tokenId = _nextTokenId;
        _nextTokenId += 1;

        _owners[tokenId] = recipient;
        _balances[recipient] += 1;
        _tokenURIs[tokenId] = uri;
        bookClaimedTokenId[keyHash] = tokenId;

        certificates[tokenId] = CertificateRecord({
            nftType: "book",
            title: title,
            milestoneStage: 1,
            sha256Proof: sha256Proof,
            mintedAt: block.timestamp
        });

        emit Transfer(address(0), recipient, tokenId);
        emit CertificateMinted(tokenId, recipient, "book", title, sha256Proof, uri);
        emit BookNFTClaimed(tokenId, keyHash, recipient, bookSlug, sha256Proof);
        return tokenId;
    }

    function upgradeMilestone(
        uint256 tokenId,
        uint8 newStage,
        string calldata newSha256Proof,
        string calldata newUri
    ) external {
        require(_owners[tokenId] == msg.sender || msg.sender == owner, "Not authorized");
        require(newStage > certificates[tokenId].milestoneStage, "Stage must increase");
        certificates[tokenId].milestoneStage = newStage;
        certificates[tokenId].sha256Proof = newSha256Proof;
        _tokenURIs[tokenId] = newUri;
        emit MilestoneUpgraded(tokenId, newStage, newSha256Proof, newUri, block.timestamp);
    }

    function approve(address to, uint256 tokenId) public override {
        address tokenOwner = ownerOf(tokenId);
        require(msg.sender == tokenOwner || isApprovedForAll(tokenOwner, msg.sender), "Not approved");
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view override returns (address) {
        require(_owners[tokenId] != address(0), "Nonexistent token");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public override {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address tokenOwner, address operator) public view override returns (bool) {
        return _operatorApprovals[tokenOwner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        address tokenOwner = ownerOf(tokenId);
        require(tokenOwner == from, "Wrong owner");
        require(to != address(0), "Zero recipient");
        require(
            msg.sender == tokenOwner ||
            getApproved(tokenId) == msg.sender ||
            isApprovedForAll(tokenOwner, msg.sender),
            "Not authorized"
        );
        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }
}
