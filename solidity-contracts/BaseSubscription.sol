// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ISubscription.sol";

contract BaseSubscription is ISubscription {
    mapping(uint256 => Plan) public plans;
    mapping(address => uint256) public userExpiries;
    uint256 public planCount;

    function createPlan(uint256 price, uint256 duration) external override returns (uint256) {
        uint256 planId = ++planCount;
        plans[planId] = Plan(price, duration, true);
        emit PlanCreated(planId, price, duration);
        return planId;
    }

    function subscribe(uint256 planId) external payable override {
        Plan storage plan = plans[planId];
        require(plan.active, "Plan not active");
        require(msg.value >= plan.price, "Insufficient payment");

        uint256 currentExpiry = userExpiries[msg.sender];
        uint256 start = block.timestamp > currentExpiry ? block.timestamp : currentExpiry;
        userExpiries[msg.sender] = start + plan.duration;

        emit Subscribed(msg.sender, planId, userExpiries[msg.sender]);
    }

    function isSubscribed(address user) external view override returns (bool) {
        return userExpiries[user] > block.timestamp;
    }

    function getExpiry(address user) external view override returns (uint256) {
        return userExpiries[user];
    }
}
