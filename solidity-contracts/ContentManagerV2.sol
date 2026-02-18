// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "../interfaces/IContentAccess.sol";

contract ContentManagerV2 is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, IContentAccess {
    struct Content {
        address creator;
        uint256 price;
        string title;
        string description;
        bool isActive;
        uint256 createdAt;
        uint256 category; // New field for content categorization
    }

    struct Access {
        bool hasAccess;
        uint256 purchaseTime;
        uint256 accessCount;
        uint256 lastAccessTime; // New field for tracking last access
    }

    struct CreatorStats {
        uint256 totalContent;
        uint256 totalRevenue;
        uint256 totalPurchases;
        uint256 averageRating; // New field for creator ratings
    }

    mapping(uint256 => Content) public contents;
    mapping(address => mapping(uint256 => Access)) public userAccess;
    mapping(address => CreatorStats) public creatorStats;

    uint256 public contentCount;
    uint256 public totalRevenue;
    uint256 public totalPlatformFees;
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 5; // 5% platform fee

    // New features in V2
    mapping(uint256 => string[]) public contentTags; // Tags for content discovery
    mapping(address => uint256[]) public creatorContent; // Content by creator
    mapping(uint256 => uint256) public contentRating; // Content ratings
    mapping(uint256 => uint256) public contentRatingCount; // Number of ratings

    event ContentAdded(uint256 indexed contentId, address indexed creator, uint256 price, uint256 category);
    event ContentAccessed(uint256 indexed contentId, address indexed user);
    event ContentUpdated(uint256 indexed contentId, uint256 newPrice);
    event ContentRated(uint256 indexed contentId, address indexed user, uint256 rating);
    event RevenueGenerated(address indexed creator, uint256 amount);
    event ContentTagged(uint256 indexed contentId, string tag);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
    }

    function addContent(
        uint256 price,
        string memory title,
        string memory description,
        uint256 category,
        string[] memory tags
    ) external returns (uint256) {
        uint256 contentId = ++contentCount;
        contents[contentId] = Content({
            creator: msg.sender,
            price: price,
            title: title,
            description: description,
            isActive: true,
            createdAt: block.timestamp,
            category: category
        });

        // Set tags
        contentTags[contentId] = tags;

        // Update creator stats
        creatorStats[msg.sender].totalContent++;
        creatorContent[msg.sender].push(contentId);

        emit ContentAdded(contentId, msg.sender, price, category);
        return contentId;
    }

    function purchaseContent(uint256 contentId) external payable virtual override nonReentrant {
        Content storage content = contents[contentId];
        require(content.creator != address(0), "Content not found");
        require(content.isActive, "Content is not active");
        require(msg.value >= content.price, "Insufficient payment");

        Access storage access = userAccess[msg.sender][contentId];
        if (!access.hasAccess) {
            access.hasAccess = true;
            access.purchaseTime = block.timestamp;
        }
        access.accessCount++;
        access.lastAccessTime = block.timestamp;

        // Calculate fees
        uint256 platformFee = (msg.value * PLATFORM_FEE_PERCENTAGE) / 100;
        uint256 creatorPayment = msg.value - platformFee;

        totalRevenue += msg.value;
        totalPlatformFees += platformFee;

        // Update creator stats
        creatorStats[content.creator].totalRevenue += creatorPayment;
        creatorStats[content.creator].totalPurchases++;

        // Transfer payment to creator
        payable(content.creator).transfer(creatorPayment);

        emit ContentAccessed(contentId, msg.sender);
        emit RevenueGenerated(content.creator, creatorPayment);
    }

    function rateContent(uint256 contentId, uint256 rating) external {
        require(userAccess[msg.sender][contentId].hasAccess, "No access to content");
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");

        // Simple rating system - in production, you'd want more sophisticated logic
        contentRating[contentId] = (contentRating[contentId] * contentRatingCount[contentId] + rating) / (contentRatingCount[contentId] + 1);
        contentRatingCount[contentId]++;

        emit ContentRated(contentId, msg.sender, rating);
    }

    function updateContent(uint256 contentId, uint256 newPrice) external {
        Content storage content = contents[contentId];
        require(content.creator == msg.sender, "Not content creator");
        require(content.isActive, "Content is not active");

        content.price = newPrice;
        emit ContentUpdated(contentId, newPrice);
    }

    function addTags(uint256 contentId, string[] memory newTags) external {
        Content storage content = contents[contentId];
        require(content.creator == msg.sender, "Not content creator");

        for (uint256 i = 0; i < newTags.length; i++) {
            contentTags[contentId].push(newTags[i]);
            emit ContentTagged(contentId, newTags[i]);
        }
    }

    function deactivateContent(uint256 contentId) external {
        Content storage content = contents[contentId];
        require(content.creator == msg.sender || msg.sender == owner(), "Not authorized");

        content.isActive = false;
    }

    function hasAccess(address user, uint256 contentId) external view override returns (bool) {
        return userAccess[user][contentId].hasAccess || contents[contentId].creator == user;
    }

    function getContent(uint256 contentId) external view returns (
        address creator,
        uint256 price,
        string memory title,
        string memory description,
        bool isActive,
        uint256 createdAt,
        uint256 category
    ) {
        Content memory content = contents[contentId];
        return (content.creator, content.price, content.title, content.description,
                content.isActive, content.createdAt, content.category);
    }

    function getContentTags(uint256 contentId) external view returns (string[] memory) {
        return contentTags[contentId];
    }

    function getCreatorStats(address creator) external view returns (
        uint256 totalContent,
        uint256 totalRevenue,
        uint256 totalPurchases,
        uint256 averageRating
    ) {
        CreatorStats memory stats = creatorStats[creator];
        return (stats.totalContent, stats.totalRevenue, stats.totalPurchases, stats.averageRating);
    }

    function getUserAccess(address user, uint256 contentId) external view returns (
        bool hasAccess,
        uint256 purchaseTime,
        uint256 accessCount,
        uint256 lastAccessTime
    ) {
        Access memory access = userAccess[user][contentId];
        return (access.hasAccess, access.purchaseTime, access.accessCount, access.lastAccessTime);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}