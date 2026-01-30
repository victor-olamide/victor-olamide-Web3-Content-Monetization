// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBaseContentMonetization {
    function purchaseAccess(uint256 contentId) external payable;
    function checkAccess(address user, uint256 contentId) external view returns (bool);
}
