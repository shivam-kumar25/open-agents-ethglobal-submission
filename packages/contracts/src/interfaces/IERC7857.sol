// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC7857
/// @notice Interface for the ERC-7857 intelligent NFT (iNFT) contract deployed at
///         0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F on 0G Galileo (chainId 16602).
/// @dev    ERC-7857 extends ERC-721 with encrypted metadata and delegated execution.
///         Agents hold an iNFT as their on-chain identity. The encrypted URI stores
///         model weights or capability manifests; the metadataHash commits to the
///         plaintext schema so verifiers can confirm authenticity without decryption.
interface IERC7857 {
    // -------------------------------------------------------------------------
    // Minting
    // -------------------------------------------------------------------------

    /// @notice Mint a new iNFT.
    /// @param to           Recipient of the newly minted token.
    /// @param encryptedURI IPFS / 0G-storage URI pointing to encrypted agent metadata.
    /// @param metadataHash keccak256 of the plaintext metadata (for off-chain verification).
    /// @return tokenId     The ID of the newly minted token.
    function mint(
        address to,
        string calldata encryptedURI,
        bytes32 metadataHash
    ) external returns (uint256 tokenId);

    // -------------------------------------------------------------------------
    // Authorisation
    // -------------------------------------------------------------------------

    /// @notice Grant an executor the right to act on behalf of the token.
    /// @param tokenId     Token whose usage is being authorised.
    /// @param executor    Address that will be allowed to act on behalf of the token.
    /// @param permissions Opaque permission bitmap / encoded struct (protocol-defined).
    function authorizeUsage(
        uint256 tokenId,
        address executor,
        bytes calldata permissions
    ) external;

    /// @notice Revoke a previously granted authorisation.
    /// @param tokenId  Token whose authorisation is being revoked.
    /// @param executor Address whose authorisation should be removed.
    function revokeAuthorization(uint256 tokenId, address executor) external;

    // -------------------------------------------------------------------------
    // Identity-preserving transfer
    // -------------------------------------------------------------------------

    /// @notice Transfer an iNFT while re-encrypting the metadata key for the new owner.
    /// @param from      Current owner.
    /// @param to        New owner.
    /// @param tokenId   Token to transfer.
    /// @param sealedKey Metadata key re-encrypted for `to` using their public key.
    /// @param proof     ZK proof that `sealedKey` correctly re-encrypts the original key.
    function iTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata sealedKey,
        bytes calldata proof
    ) external;

    // -------------------------------------------------------------------------
    // View helpers
    // -------------------------------------------------------------------------

    /// @notice Returns the current owner of `tokenId`.
    function ownerOf(uint256 tokenId) external view returns (address);

    /// @notice Returns the metadata commitment hash for `tokenId`.
    function metadataHash(uint256 tokenId) external view returns (bytes32);

    /// @notice Returns true if `executor` has been authorised to act for `tokenId`.
    function isAuthorized(
        uint256 tokenId,
        address executor
    ) external view returns (bool);
}
