// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IBaseContentMonetization.sol";

contract BaseContentMonetization is IBaseContentMonetization {
    mapping(uint256 => uint256) public contentPrices;
    mapping(address => mapping(uint256 => bool)) public hasAccess;

    event AccessPurchased(address indexed user, uint256 indexed contentId);

    function purchaseAccess(uint256 contentId) external payable override {
        require(msg.value >= contentPrices[contentId], "Insufficient payment");
        hasAccess[msg.sender][contentId] = true;
        emit AccessPurchased(msg.sender, contentId);
    }

    function checkAccess(address user, uint256 contentId) external view override returns (bool) {
        return hasAccess[user][contentId];
    }
    
    function setContentPrice(uint256 contentId, uint256 price) external {
        contentPrices[contentId] = price;
    }
}
