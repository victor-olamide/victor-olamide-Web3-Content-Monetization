// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockERC721 {
    string public name = "Mock NFT";
    string public symbol = "MNFT";
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => address) public ownerOf;
    uint256 public nextTokenId;

    function mint(address to) external {
        uint256 tokenId = nextTokenId++;
        ownerOf[tokenId] = to;
        balanceOf[to]++;
    }
}
