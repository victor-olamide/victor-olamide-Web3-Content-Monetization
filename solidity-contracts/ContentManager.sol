// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IContentAccess.sol";

contract ContentManager is IContentAccess {
    struct Content {
        address creator;
        uint256 price;
    }

    struct Access {
        bool hasAccess;
        uint256 purchaseTime;
    }

    mapping(uint256 => Content) public contents;
    mapping(address => mapping(uint256 => Access)) public userAccess;
    uint256 public contentCount;

    function addContent(uint256 price) external override returns (uint256) {
        uint256 contentId = ++contentCount;
        contents[contentId] = Content(msg.sender, price);
        emit ContentAdded(contentId, msg.sender, price);
        return contentId;
    }

    function purchaseContent(uint256 contentId) external payable virtual override {
        Content storage content = contents[contentId];
        require(content.creator != address(0), "Content not found");
        require(msg.value >= content.price, "Insufficient payment");

        userAccess[msg.sender][contentId] = Access(true, block.timestamp);
        emit ContentAccessed(contentId, msg.sender);
    }

    function hasAccess(address user, uint256 contentId) external view override returns (bool) {
        return userAccess[user][contentId].hasAccess || contents[contentId].creator == user;
    }
}
