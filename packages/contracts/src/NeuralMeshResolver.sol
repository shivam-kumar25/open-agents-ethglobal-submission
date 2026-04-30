// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title NeuralMeshResolver
/// @notice Custom ENS resolver deployed on Sepolia that manages text records
///         and address mappings for NeuralMesh agent subnames under neuralmesh.eth.
///
///         This resolver supports:
///         - addr()  — forward resolution (node → address)
///         - text()  — arbitrary key/value metadata (e.g. axl-pubkey, model-cid)
///         - issueSubname() — called by the NeuralMesh deployer to mint a
///           new *.neuralmesh.eth subname and seed its initial records.
///
/// @dev    The ENS Registry is used to authorise writes: only the registered
///         owner of a node (in the ENS Registry) may call setAddr / setText
///         for that node, unless the caller is an authorised NeuralMesh agent
///         (checked against the trusted `neuralMeshRegistry` address set at
///         deploy time — cross-chain verification is intentionally off-scope
///         for this MVP; a LayerZero message could be added later).
///
///         Implements EIP-137 (ENS resolver) and EIP-2304 (multicoin addr) subset.
contract NeuralMeshResolver is Ownable {
    // -------------------------------------------------------------------------
    // Interfaces (inline to avoid extra imports)
    // -------------------------------------------------------------------------

    interface IENSRegistry {
        function owner(bytes32 node) external view returns (address);
        function setSubnodeOwner(
            bytes32 node,
            bytes32 label,
            address owner
        ) external returns (bytes32);
        function setResolver(bytes32 node, address resolver) external;
        function resolver(bytes32 node) external view returns (address);
    }

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice EIP-137 resolver interface ID (addr).
    bytes4 private constant INTERFACE_META_ID = 0x01ffc9a7;
    /// @notice EIP-137 addr(bytes32) interface.
    bytes4 private constant ADDR_INTERFACE_ID = 0x3b3b57de;
    /// @notice EIP-634 text(bytes32,string) interface.
    bytes4 private constant TEXT_INTERFACE_ID = 0x59d1d43c;

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    /// @notice The ENS Registry contract (Sepolia: 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e).
    IENSRegistry public immutable ensRegistry;

    /// @notice Trusted NeuralMeshRegistry address (on 0G Galileo — passed at deploy,
    ///         not verified across chains in this MVP).
    address public immutable neuralMeshRegistry;

    /// @notice Forward resolution mapping: ENS node → Ethereum address.
    mapping(bytes32 => address) private _addresses;

    /// @notice Text record mapping: ENS node → key → value.
    mapping(bytes32 => mapping(string => string)) private _texts;

    /// @notice Tracks the label strings that have been issued as subnames,
    ///         so the frontend can enumerate agents without a Graph.
    mapping(bytes32 => string) private _nodeToLabel;

    /// @notice Counter of issued subnames for enumeration.
    uint256 public subnameCount;

    /// @notice Index of issued subname nodes in order of issuance.
    bytes32[] private _issuedNodes;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when a new *.neuralmesh.eth subname is issued.
    /// @param node  The ENS namehash of the newly created subname.
    /// @param label The plain-text label (e.g. "agentbob" for agentbob.neuralmesh.eth).
    /// @param owner The address that owns the subname.
    event SubnameIssued(bytes32 indexed node, string label, address owner);

    /// @notice Emitted when the address record for a node changes.
    /// @param node The ENS node whose address was changed.
    /// @param addr The new address.
    event AddrChanged(bytes32 indexed node, address addr);

    /// @notice Emitted when a text record for a node changes.
    /// @param node  The ENS node whose text record was changed.
    /// @param key   The text record key.
    /// @param value The new value.
    event TextChanged(
        bytes32 indexed node,
        string indexed key,
        string value
    );

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param ensRegistry_        Address of the ENS Registry on the deployment chain.
    /// @param neuralMeshRegistry_ Trusted address of NeuralMeshRegistry (cross-chain,
    ///                            not enforced on-chain — used as an allowlist hint).
    /// @param initialOwner        Owner of this resolver (the NeuralMesh deployer).
    constructor(
        address ensRegistry_,
        address neuralMeshRegistry_,
        address initialOwner
    ) Ownable(initialOwner) {
        require(ensRegistry_ != address(0), "NMRes: zero ENS registry");
        require(neuralMeshRegistry_ != address(0), "NMRes: zero NM registry");
        ensRegistry = IENSRegistry(ensRegistry_);
        neuralMeshRegistry = neuralMeshRegistry_;
    }

    // -------------------------------------------------------------------------
    // EIP-165 supportsInterface
    // -------------------------------------------------------------------------

    /// @notice Returns true for ENS resolver interface IDs this contract supports.
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == INTERFACE_META_ID ||
            interfaceId == ADDR_INTERFACE_ID ||
            interfaceId == TEXT_INTERFACE_ID;
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /// @dev Returns true if msg.sender is the ENS-registered owner of `node`.
    function _isNodeOwner(bytes32 node) internal view returns (bool) {
        return ensRegistry.owner(node) == msg.sender;
    }

    /// @dev Returns true if msg.sender is the contract owner (NeuralMesh deployer)
    ///      OR the trusted NeuralMeshRegistry address.
    function _isNeuralMeshAuthority() internal view returns (bool) {
        return msg.sender == owner() || msg.sender == neuralMeshRegistry;
    }

    // -------------------------------------------------------------------------
    // addr() — forward resolution
    // -------------------------------------------------------------------------

    /// @notice Returns the Ethereum address for ENS `node`.
    /// @param node The ENS namehash to resolve.
    function addr(bytes32 node) external view returns (address) {
        return _addresses[node];
    }

    /// @notice Set the Ethereum address for ENS `node`.
    /// @dev    Caller must be the ENS-registered owner of `node`.
    /// @param node The ENS namehash.
    /// @param addr_ The Ethereum address to associate.
    function setAddr(bytes32 node, address addr_) external {
        require(
            _isNodeOwner(node) || _isNeuralMeshAuthority(),
            "NMRes: not authorised"
        );
        _addresses[node] = addr_;
        emit AddrChanged(node, addr_);
    }

    // -------------------------------------------------------------------------
    // text() — arbitrary metadata
    // -------------------------------------------------------------------------

    /// @notice Returns the text record for `node` at `key`.
    /// @param node The ENS namehash.
    /// @param key  The text record key (e.g. "axl-pubkey", "model-cid", "url").
    function text(
        bytes32 node,
        string calldata key
    ) external view returns (string memory) {
        return _texts[node][key];
    }

    /// @notice Set a text record for `node`.
    /// @dev    Caller must be the ENS-registered owner of `node` OR a NeuralMesh authority.
    /// @param node  The ENS namehash.
    /// @param key   The text record key.
    /// @param value The value to store.
    function setText(
        bytes32 node,
        string calldata key,
        string calldata value
    ) external {
        require(
            _isNodeOwner(node) || _isNeuralMeshAuthority(),
            "NMRes: not authorised"
        );
        _texts[node][key] = value;
        emit TextChanged(node, key, value);
    }

    // -------------------------------------------------------------------------
    // issueSubname — called by the NeuralMesh deployer / registry
    // -------------------------------------------------------------------------

    /// @notice Issue a new *.neuralmesh.eth subname and seed its initial records.
    /// @dev    Callable by the contract owner or the trusted neuralMeshRegistry.
    ///
    ///         Steps performed:
    ///         1. Compute the subname node from the parent node stored in
    ///            `_texts[bytes32(0)]["parent-node"]` (set via setParentNode).
    ///         2. Call ENS Registry setSubnodeOwner to transfer ownership to `subOwner`.
    ///         3. Set this contract as the resolver for the new node.
    ///         4. Write addr record for the agent wallet.
    ///         5. Write axl-pubkey text record with the Gensyn AXL public key.
    ///         6. Write token-id text record.
    ///         7. Emit SubnameIssued.
    ///
    /// @param label     Plain-text DNS label (e.g. "agentbob").
    /// @param subOwner  Address that will own the new subname.
    /// @param tokenId   ERC-7857 iNFT token ID — stored as a text record.
    /// @param axlPubkey Gensyn AXL P2P public key bytes — stored as a hex text record.
    function issueSubname(
        string calldata label,
        address subOwner,
        uint256 tokenId,
        bytes calldata axlPubkey
    ) external {
        require(_isNeuralMeshAuthority(), "NMRes: not authorised");
        require(subOwner != address(0), "NMRes: zero owner");
        require(bytes(label).length > 0, "NMRes: empty label");

        // Retrieve the neuralmesh.eth parent node (must be set via setParentNode).
        bytes32 parentNode = _parentNode;
        require(parentNode != bytes32(0), "NMRes: parent node not set");

        // Compute the subname node: namehash(label + "." + parent)
        bytes32 labelHash = keccak256(bytes(label));
        bytes32 subNode = keccak256(abi.encodePacked(parentNode, labelHash));

        // Ensure label is not already taken.
        require(
            bytes(_nodeToLabel[subNode]).length == 0,
            "NMRes: label already taken"
        );

        // Register the subnode in ENS Registry (this contract must own parentNode).
        ensRegistry.setSubnodeOwner(parentNode, labelHash, address(this));

        // Set this contract as resolver so addr/text calls work immediately.
        ensRegistry.setResolver(subNode, address(this));

        // Transfer ENS ownership to the agent owner (after setting resolver).
        ensRegistry.setSubnodeOwner(parentNode, labelHash, subOwner);

        // Seed records.
        _addresses[subNode] = subOwner;
        _texts[subNode]["axl-pubkey"] = _bytesToHex(axlPubkey);
        _texts[subNode]["token-id"] = _uint256ToString(tokenId);
        _texts[subNode]["url"] = string(
            abi.encodePacked("https://neuralmesh.xyz/agent/", label)
        );

        // Track label.
        _nodeToLabel[subNode] = label;
        _issuedNodes.push(subNode);
        subnameCount += 1;

        emit SubnameIssued(subNode, label, subOwner);
        emit AddrChanged(subNode, subOwner);
        emit TextChanged(subNode, "axl-pubkey", _texts[subNode]["axl-pubkey"]);
    }

    // -------------------------------------------------------------------------
    // Parent node management (owner-only)
    // -------------------------------------------------------------------------

    /// @dev The neuralmesh.eth parent node, stored separately for gas efficiency.
    bytes32 private _parentNode;

    /// @notice Set the neuralmesh.eth ENS parent node.
    /// @dev    Must be called once after deployment and before any issueSubname calls.
    ///         The deployer must also ensure this resolver contract is the owner of
    ///         (or authorised to call setSubnodeOwner on) the parent node in the ENS Registry.
    /// @param parentNode_ The namehash of neuralmesh.eth.
    function setParentNode(bytes32 parentNode_) external onlyOwner {
        require(_parentNode == bytes32(0), "NMRes: parent already set");
        require(parentNode_ != bytes32(0), "NMRes: zero parent node");
        _parentNode = parentNode_;
    }

    /// @notice Returns the neuralmesh.eth parent node.
    function parentNode() external view returns (bytes32) {
        return _parentNode;
    }

    // -------------------------------------------------------------------------
    // Enumeration helpers
    // -------------------------------------------------------------------------

    /// @notice Returns the ENS node for the subname at index `i`.
    function issuedNodeAt(uint256 i) external view returns (bytes32) {
        require(i < _issuedNodes.length, "NMRes: out of bounds");
        return _issuedNodes[i];
    }

    /// @notice Returns the plain-text label for a given node.
    function labelOf(bytes32 node) external view returns (string memory) {
        return _nodeToLabel[node];
    }

    // -------------------------------------------------------------------------
    // Internal utilities
    // -------------------------------------------------------------------------

    /// @dev Converts a bytes array to its lowercase hex string representation (no 0x prefix).
    function _bytesToHex(
        bytes memory data
    ) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(data.length * 2);
        for (uint256 i = 0; i < data.length; i++) {
            result[i * 2] = hexChars[uint8(data[i]) >> 4];
            result[i * 2 + 1] = hexChars[uint8(data[i]) & 0x0f];
        }
        return string(result);
    }

    /// @dev Converts a uint256 to its decimal string representation.
    function _uint256ToString(
        uint256 value
    ) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
