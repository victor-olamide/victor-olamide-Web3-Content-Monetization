// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISubscription {
    function subscribe(address creator) external payable;
    function isSubscribed(address user, address creator) external view returns (bool);
}
