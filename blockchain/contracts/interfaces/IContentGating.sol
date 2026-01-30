// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IContentGating {
    function isGated(uint256 contentId) external view returns (bool);
    function canAccess(address user, uint256 contentId) external view returns (bool);
}
