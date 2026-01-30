// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
    function balanceOf(address owner) external view returns (uint256);
}

contract MockERC721 is IERC721 {
    string public name = "Mock NFT";
    string public symbol = "MNFT";
    uint256 public nextTokenId;

    mapping(uint256 => address) public override ownerOf;
    mapping(address => uint256) public override balanceOf;

    function mint(address to) external returns (uint256) {
        uint256 tokenId = ++nextTokenId;
        ownerOf[tokenId] = to;
        balanceOf[to]++;
        return tokenId;
    }
}
