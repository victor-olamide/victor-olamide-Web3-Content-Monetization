// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBaseMonetization {
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    function setPlatformFee(uint256 feeBps) external;
    function withdrawFunds() external;
    function getPlatformFee() external view returns (uint256);
}
