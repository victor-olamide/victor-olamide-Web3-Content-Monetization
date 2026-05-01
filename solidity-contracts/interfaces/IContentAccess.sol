// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IContentAccess {
    event ContentAdded(uint256 indexed contentId, address indexed creator, uint256 price);
    event ContentAccessed(uint256 indexed contentId, address indexed user);

    function addContent(uint256 price) external returns (uint256);
    function purchaseContent(uint256 contentId) external payable;
    function hasAccess(address user, uint256 contentId) external view returns (bool);
}
