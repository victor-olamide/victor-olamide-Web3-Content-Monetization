// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ISubscription.sol";

contract Subscription is ISubscription {
    mapping(address => mapping(address => uint256)) public subscriptionEnd;
    uint256 public constant SUB_DURATION = 30 days;
    uint256 public subPrice = 0.001 ether;

    event Subscribed(address indexed user, address indexed creator, uint256 expiry);

    function subscribe(address creator) external payable override {
        require(msg.value >= subPrice, "Insufficient payment");
        uint256 currentEnd = subscriptionEnd[msg.sender][creator];
        uint256 start = currentEnd > block.timestamp ? currentEnd : block.timestamp;
        subscriptionEnd[msg.sender][creator] = start + SUB_DURATION;
        emit Subscribed(msg.sender, creator, subscriptionEnd[msg.sender][creator]);
    }

    function isSubscribed(address user, address creator) external view override returns (bool) {
        return subscriptionEnd[user][creator] > block.timestamp;
    }
}
