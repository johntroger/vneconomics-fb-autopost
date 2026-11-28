// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VNEDeFiVault - Hợp đồng DeFi & DAO Sandbox (100% Testnet - 0đ tiền thật)
 * @author VNEconomics.com
 * @notice Phục vụ học tập Staking, tính lợi suất APY mô phỏng và Biểu quyết DAO cộng đồng trên Testnet.
 */
contract VNEDeFiVault {
    string public constant NAME = "VNEconomics DeFi & DAO Sandbox";
    string public constant SYMBOL = "VNE-TEST";
    uint256 public constant APY_BASIS_POINTS = 1250; // 12.50% APY mô phỏng
    uint256 public constant SECONDS_PER_YEAR = 31536000;

    address public owner;
    uint256 private _reentrancyLock = 1;

    modifier nonReentrant() {
        require(_reentrancyLock == 1, "ReentrancyGuard: reentrant call");
        _reentrancyLock = 2;
        _;
        _reentrancyLock = 1;
    }

    struct StakePosition {
        uint256 stakedAmount;
        uint256 lastStakeTimestamp;
        uint256 unclaimedYield;
    }

    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 deadline;
        bool executed;
    }

    mapping(address => StakePosition) public stakes;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    uint256 public proposalCount;

    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 timestamp);
    event YieldClaimed(address indexed user, uint256 yieldAmount, uint256 timestamp);
    event ProposalCreated(uint256 indexed proposalId, string title, uint256 deadline);
    event VoteCast(address indexed voter, uint256 indexed proposalId, bool support, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        proposalCount = 1;
        proposals[1] = Proposal({
            id: 1,
            title: "Xuat ban Bao cao Chuyen sau Tai san so & AI Marketing Viet Nam 2027",
            description: "Bieu quyet chon chu de nghien cuu uu tien tiep theo tren VNEconomics.com",
            yesVotes: 42,
            noVotes: 3,
            deadline: block.timestamp + 30 days,
            executed: false
        });
        emit ProposalCreated(1, proposals[1].title, proposals[1].deadline);
    }

    function calculatePendingYield(address user) public view returns (uint256) {
        StakePosition memory pos = stakes[user];
        if (pos.stakedAmount == 0) return pos.unclaimedYield;
        uint256 elapsed = block.timestamp - pos.lastStakeTimestamp;
        uint256 accrued = (pos.stakedAmount * APY_BASIS_POINTS * elapsed) / (10000 * SECONDS_PER_YEAR);
        return pos.unclaimedYield + accrued;
    }

    function stakeTokens(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        StakePosition storage pos = stakes[msg.sender];
        if (pos.stakedAmount > 0) {
            pos.unclaimedYield = calculatePendingYield(msg.sender);
        }
        pos.stakedAmount += amount;
        pos.lastStakeTimestamp = block.timestamp;
        emit Staked(msg.sender, amount, block.timestamp);
    }

    function unstakeTokens(uint256 amount) external nonReentrant {
        StakePosition storage pos = stakes[msg.sender];
        require(pos.stakedAmount >= amount, "Insufficient staked balance");
        pos.unclaimedYield = calculatePendingYield(msg.sender);
        pos.stakedAmount -= amount;
        pos.lastStakeTimestamp = block.timestamp;
        emit Unstaked(msg.sender, amount, block.timestamp);
    }

    function claimYield() external nonReentrant {
        uint256 reward = calculatePendingYield(msg.sender);
        require(reward > 0, "No yield available");
        stakes[msg.sender].unclaimedYield = 0;
        stakes[msg.sender].lastStakeTimestamp = block.timestamp;
        emit YieldClaimed(msg.sender, reward, block.timestamp);
    }

    function createProposal(string calldata title, string calldata description, uint256 durationDays) external onlyOwner {
        proposalCount += 1;
        uint256 deadline = block.timestamp + (durationDays * 1 days);
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            title: title,
            description: description,
            yesVotes: 0,
            noVotes: 0,
            deadline: deadline,
            executed: false
        });
        emit ProposalCreated(proposalCount, title, deadline);
    }

    function voteProposal(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "Proposal not found");
        require(block.timestamp <= p.deadline, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        hasVoted[proposalId][msg.sender] = true;
        if (support) {
            p.yesVotes += 1;
        } else {
            p.noVotes += 1;
        }
        emit VoteCast(msg.sender, proposalId, support, block.timestamp);
    }
}
