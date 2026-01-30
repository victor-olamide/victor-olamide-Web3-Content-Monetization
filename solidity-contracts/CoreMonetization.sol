// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseSubscription.sol";
import "./ContentManager.sol";
import "./interfaces/IBaseMonetization.sol";

contract CoreMonetization is BaseSubscription, ContentManager, IBaseMonetization {
    address public owner;
    uint256 public platformFeeBps; // Base points (e.g., 250 = 2.5%)

    mapping(address => bool) public admins;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Not admin");
        _;
    }

    function setAdmin(address admin, bool status) external onlyOwner {
        admins[admin] = status;
    }

    constructor(uint256 _feeBps) {
        owner = msg.sender;
        platformFeeBps = _feeBps;
    }

    function setPlatformFee(uint256 feeBps) external override onlyOwner {
        require(feeBps <= 1000, "Fee too high");
        uint256 oldFee = platformFeeBps;
        platformFeeBps = feeBps;
        emit FeeUpdated(oldFee, feeBps);
    }

    function withdrawFunds() external override onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner).transfer(balance);
        emit FundsWithdrawn(owner, balance);
    }

    function getPlatformFee() external view override returns (uint256) {
        return platformFeeBps;
    }

    receive() external payable {}
}
