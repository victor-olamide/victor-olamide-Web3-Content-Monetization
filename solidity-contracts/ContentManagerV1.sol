// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IContentAccess.sol";

contract ContentManagerV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable, IContentAccess {
    struct Content {
        address creator;
        uint256 price;
        string title;
        string description;
        bool isActive;
    }

    struct Access {
        bool hasAccess;
        uint256 purchaseTime;
        uint256 accessCount;
    }

    mapping(uint256 => Content) public contents;
    mapping(address => mapping(uint256 => Access)) public userAccess;
    uint256 public contentCount;
    uint256 public totalRevenue;

    event ContentAdded(uint256 indexed contentId, address indexed creator, uint256 price);
    event ContentAccessed(uint256 indexed contentId, address indexed user);
    event ContentUpdated(uint256 indexed contentId, uint256 newPrice);
    event RevenueGenerated(address indexed creator, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }

    function addContent(uint256 price, string memory title, string memory description)
        external
        returns (uint256)
    {
        uint256 contentId = ++contentCount;
        contents[contentId] = Content({
            creator: msg.sender,
            price: price,
            title: title,
            description: description,
            isActive: true
        });
        emit ContentAdded(contentId, msg.sender, price);
        return contentId;
    }

    function purchaseContent(uint256 contentId) external payable virtual override {
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

        totalRevenue += msg.value;

        // Transfer payment to creator (minus platform fee)
        uint256 platformFee = msg.value / 20; // 5% platform fee
        uint256 creatorPayment = msg.value - platformFee;

        payable(content.creator).transfer(creatorPayment);

        emit ContentAccessed(contentId, msg.sender);
        emit RevenueGenerated(content.creator, creatorPayment);
    }

    function updateContent(uint256 contentId, uint256 newPrice) external {
        Content storage content = contents[contentId];
        require(content.creator == msg.sender, "Not content creator");
        require(content.isActive, "Content is not active");

        content.price = newPrice;
        emit ContentUpdated(contentId, newPrice);
    }

    function deactivateContent(uint256 contentId) external {
        Content storage content = contents[contentId];
        require(content.creator == msg.sender, "Not content creator");

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
        bool isActive
    ) {
        Content memory content = contents[contentId];
        return (content.creator, content.price, content.title, content.description, content.isActive);
    }

    function getUserAccess(address user, uint256 contentId) external view returns (
        bool hasAccess,
        uint256 purchaseTime,
        uint256 accessCount
    ) {
        Access memory access = userAccess[user][contentId];
        return (access.hasAccess, access.purchaseTime, access.accessCount);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}