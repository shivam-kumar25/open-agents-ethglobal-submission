// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDASigners
/// @notice Interface for the 0G Data Availability Signers precompile.
/// @dev    Deployed at the reserved precompile address
///         0x0000000000000000000000000000000000001000 on 0G Galileo.
///         DA Signers form a quorum that attests to data availability.
///         NeuralMeshRegistry queries this precompile to confirm that
///         fine-tuning datasets stored on 0G Storage are actually available
///         before triggering an agent evolution round.
///
///         NOTE: This precompile is only live on the 0G Galileo chain.
///         Calls from other networks (including local Hardhat) will revert
///         or return empty data; callers must wrap in try/catch.
interface IDASigners {
    /// @notice Returns the current DA epoch number.
    function epochNumber() external view returns (uint256);

    /// @notice Returns the number of DA quorums in `epoch`.
    /// @param epoch The epoch to query.
    function quorumCount(uint256 epoch) external view returns (uint256);

    /// @notice Returns true if `account` is a registered DA signer.
    /// @param account The address to check.
    function isSigner(address account) external view returns (bool);

    /// @notice Returns the list of signer addresses registered in `epoch`.
    /// @param epoch The epoch to query.
    function registeredSigners(
        uint256 epoch
    ) external view returns (address[] memory);
}
