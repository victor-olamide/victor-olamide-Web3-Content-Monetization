// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISubscription {
    struct Plan {
        uint256 price;
        uint256 duration;
        bool active;
    }

    event PlanCreated(uint256 indexed planId, uint256 price, uint256 duration);
    event Subscribed(address indexed user, uint256 indexed planId, uint256 expiry);

    function createPlan(uint256 price, uint256 duration) external returns (uint256);
    function subscribe(uint256 planId) external payable;
    function isSubscribed(address user) external view returns (bool);
    function getExpiry(address user) external view returns (uint256);
}
