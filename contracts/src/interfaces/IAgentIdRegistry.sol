// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice SPACE ID "Agent ID" (.ai) registry on BSC: 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
///         (contract `HandleRegistry`, name "SPACE ID Agent ID", symbol "AI", source verified on Sourcify).
///         Soulbound ERC-721, at most one handle per address; tokenId = uint256(keccak256(handle)).
interface IAgentIdRegistry {
    function balanceOf(address owner) external view returns (uint256);
    function handleOf(address owner) external view returns (string memory);
    function ownerOfHandle(string calldata handle) external view returns (address);
}
