// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IContentAccess {
    event ContentAdded(uint256 indexed contentId, address indexed creator, uint256 price);
    event ContentAccessed(uint256 indexed contentId, address indexed user);
    event ContentRemoved(uint256 indexed contentId, address indexed creator);
    event ContentRefunded(uint256 indexed contentId, address indexed user, uint256 amount);

    function addContent(uint256 price) external returns (uint256);
    function purchaseContent(uint256 contentId) external payable;
    function hasAccess(address user, uint256 contentId) external view returns (bool);
    function removeContent(uint256 contentId) external;
    function refundUser(uint256 contentId, address user) external payable;
    function isEligibleForRefund(uint256 contentId, address user) external view returns (bool);
}
