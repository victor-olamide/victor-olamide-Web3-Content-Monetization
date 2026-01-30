// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IContentGating.sol";
import "./MockERC20.sol";
import "./MockERC721.sol";

contract ContentGating is IContentGating {
    struct GatingRule {
        address tokenAddress;
        uint256 minBalance;
        bool isNFT;
    }

    mapping(uint256 => GatingRule) public rules;
    mapping(uint256 => bool) public gatedContent;

    function setGatingRule(uint256 contentId, address tokenAddress, uint256 minBalance, bool isNFT) external {
        rules[contentId] = GatingRule(tokenAddress, minBalance, isNFT);
        gatedContent[contentId] = true;
    }

    function isGated(uint256 contentId) external view override returns (bool) {
        return gatedContent[contentId];
    }

    function canAccess(address user, uint256 contentId) external view override returns (bool) {
        if (!gatedContent[contentId]) return true;
        
        GatingRule memory rule = rules[contentId];
        if (rule.isNFT) {
            return MockERC721(rule.tokenAddress).balanceOf(user) >= rule.minBalance;
        } else {
            return MockERC20(rule.tokenAddress).balanceOf(user) >= rule.minBalance;
        }
    }
}
