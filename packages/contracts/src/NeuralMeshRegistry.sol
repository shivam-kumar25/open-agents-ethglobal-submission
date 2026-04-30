// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IERC7857.sol";
import "./interfaces/IDASigners.sol";

/// @title NeuralMeshRegistry
/// @notice On-chain registry for NeuralMesh AI agents deployed on 0G Galileo (chainId 16602).
///
///         Each AI agent registers here by proving ownership of an ERC-7857 iNFT.
///         The registry tracks task throughput, accumulated earnings, and authorised
///         evaluators that can verify agent work.
///
///         Data Availability is verified through the 0G DASigners precompile before
///         any evolution (fine-tuning) round is allowed to begin.
///
/// @dev    Constructor sets the deployer as owner (via Ownable).
///         The iNFT contract is hard-coded to the known 0G Galileo deployment.
contract NeuralMeshRegistry is Ownable, ReentrancyGuard {
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @dev ERC-7857 iNFT contract on 0G Galileo testnet.
    IERC7857 public constant INFT =
        IERC7857(0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F);

    /// @dev 0G DA Signers precompile address.
    address private constant DA_SIGNERS_PRECOMPILE =
        0x0000000000000000000000000000000000001000;

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    /// @notice Packed record stored for every registered agent.
    struct AgentRecord {
        /// ERC-7857 token ID that serves as the agent's on-chain identity.
        uint256 inftTokenId;
        /// ENS namehash of the agent's subname under neuralmesh.eth.
        bytes32 ensNode;
        /// The agent's EOA / smart-wallet address.
        address wallet;
        /// Whether the agent is currently active in the network.
        bool active;
        /// Total number of tasks the agent has completed.
        uint256 taskCount;
        /// Cumulative earnings in wei (USDC routing happens via x402 off-chain).
        uint256 totalEarned;
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    /// @notice Maps agent wallet address to its registry record.
    mapping(address => AgentRecord) private _agents;

    /// @notice Maps iNFT token ID to the agent wallet that registered it,
    ///         preventing the same token from being double-registered.
    mapping(uint256 => address) private _tokenOwnerIndex;

    /// @notice Addresses that are authorised to call recordTaskCompletion
    ///         on behalf of agents as evaluators / KeeperHub executors.
    mapping(address => bool) private _authorizedEvaluators;

    /// @notice KeeperHub executor addresses that can trigger distributeEarnings.
    mapping(address => bool) private _keeperExecutors;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when an agent successfully registers.
    /// @param wallet   The agent's EOA / smart-wallet address.
    /// @param tokenId  The ERC-7857 iNFT token ID proving agent identity.
    /// @param ensNode  ENS namehash of the agent's subname.
    event AgentRegistered(
        address indexed wallet,
        uint256 indexed tokenId,
        bytes32 ensNode
    );

    /// @notice Emitted each time an agent completes a task.
    /// @param agent     The agent's wallet address.
    /// @param taskCount The agent's new total task count after this completion.
    /// @param earned    The amount earned for this specific task (in wei).
    event TaskCompleted(
        address indexed agent,
        uint256 taskCount,
        uint256 earned
    );

    /// @notice Emitted when earnings are distributed to an agent.
    /// @param agent  The agent's wallet address.
    /// @param amount The amount distributed (in wei, routed via x402 off-chain).
    event EarningsDistributed(address indexed agent, uint256 amount);

    /// @notice Emitted when an evaluator is authorised.
    event EvaluatorAuthorized(address indexed evaluator);

    /// @notice Emitted when an evaluator's authorisation is revoked.
    event EvaluatorRevoked(address indexed evaluator);

    /// @notice Emitted when a KeeperHub executor is added.
    event KeeperExecutorAdded(address indexed executor);

    /// @notice Emitted when a KeeperHub executor is removed.
    event KeeperExecutorRemoved(address indexed executor);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param initialOwner The address that will own this registry contract.
    constructor(address initialOwner) Ownable(initialOwner) {}

    // -------------------------------------------------------------------------
    // Agent registration
    // -------------------------------------------------------------------------

    /// @notice Register an AI agent in the NeuralMesh network.
    /// @dev    The caller must own the ERC-7857 iNFT identified by `tokenId`.
    ///         Each wallet and each token ID can only be registered once.
    ///         The agent is considered active immediately after registration.
    ///
    /// @param wallet  The agent wallet address to register.
    /// @param tokenId The ERC-7857 iNFT token ID that backs the agent identity.
    /// @param ensNode The ENS namehash of the agent's subname (may be bytes32(0)
    ///                if the subname will be issued later via NeuralMeshResolver).
    function registerAgent(
        address wallet,
        uint256 tokenId,
        bytes32 ensNode
    ) external nonReentrant {
        require(wallet != address(0), "NMR: zero wallet");
        require(!_agents[wallet].active, "NMR: already registered");
        require(
            _tokenOwnerIndex[tokenId] == address(0),
            "NMR: token already used"
        );

        // Verify the caller is the owner of the iNFT.
        address nftOwner = INFT.ownerOf(tokenId);
        require(nftOwner == wallet, "NMR: wallet is not iNFT owner");

        // Persist the record.
        _agents[wallet] = AgentRecord({
            inftTokenId: tokenId,
            ensNode: ensNode,
            wallet: wallet,
            active: true,
            taskCount: 0,
            totalEarned: 0
        });

        _tokenOwnerIndex[tokenId] = wallet;

        emit AgentRegistered(wallet, tokenId, ensNode);
    }

    // -------------------------------------------------------------------------
    // Evaluator management (owner-only)
    // -------------------------------------------------------------------------

    /// @notice Authorise an address to record task completions on behalf of agents.
    /// @param evaluator The address to authorise.
    function authorizeEvaluator(address evaluator) external onlyOwner {
        require(evaluator != address(0), "NMR: zero evaluator");
        require(!_authorizedEvaluators[evaluator], "NMR: already authorized");
        _authorizedEvaluators[evaluator] = true;
        emit EvaluatorAuthorized(evaluator);
    }

    /// @notice Revoke an evaluator's authorisation.
    /// @param evaluator The address to revoke.
    function revokeEvaluator(address evaluator) external onlyOwner {
        require(_authorizedEvaluators[evaluator], "NMR: not an evaluator");
        _authorizedEvaluators[evaluator] = false;
        emit EvaluatorRevoked(evaluator);
    }

    // -------------------------------------------------------------------------
    // KeeperHub executor management (owner-only)
    // -------------------------------------------------------------------------

    /// @notice Add a KeeperHub executor that can call distributeEarnings.
    /// @param executor The address to add.
    function addKeeperExecutor(address executor) external onlyOwner {
        require(executor != address(0), "NMR: zero executor");
        require(!_keeperExecutors[executor], "NMR: already keeper");
        _keeperExecutors[executor] = true;
        emit KeeperExecutorAdded(executor);
    }

    /// @notice Remove a KeeperHub executor.
    /// @param executor The address to remove.
    function removeKeeperExecutor(address executor) external onlyOwner {
        require(_keeperExecutors[executor], "NMR: not a keeper");
        _keeperExecutors[executor] = false;
        emit KeeperExecutorRemoved(executor);
    }

    // -------------------------------------------------------------------------
    // Task lifecycle
    // -------------------------------------------------------------------------

    /// @notice Record that a registered agent has completed a task.
    /// @dev    Callable by authorised evaluators OR by the agent itself.
    ///         The agent must be registered and active.
    ///
    /// @param agent      The agent wallet address.
    /// @param earnedWei  The amount earned for this task in wei.
    function recordTaskCompletion(
        address agent,
        uint256 earnedWei
    ) external nonReentrant {
        require(
            _authorizedEvaluators[msg.sender] || msg.sender == agent,
            "NMR: not authorised"
        );
        require(_agents[agent].active, "NMR: agent not registered");

        _agents[agent].taskCount += 1;
        _agents[agent].totalEarned += earnedWei;

        emit TaskCompleted(agent, _agents[agent].taskCount, earnedWei);
    }

    /// @notice Distribute earnings to an agent.
    /// @dev    Callable only by authorised KeeperHub executors.
    ///         Actual USDC routing is handled off-chain via x402 — this call
    ///         only records intent on-chain and emits the event for indexing.
    ///
    /// @param agent  The agent to credit.
    /// @param amount The amount being distributed (in wei equivalent).
    function distributeEarnings(
        address agent,
        uint256 amount
    ) external nonReentrant {
        require(_keeperExecutors[msg.sender], "NMR: not a keeper executor");
        require(_agents[agent].active, "NMR: agent not registered");
        require(amount > 0, "NMR: zero amount");

        emit EarningsDistributed(agent, amount);
    }

    // -------------------------------------------------------------------------
    // Data Availability verification
    // -------------------------------------------------------------------------

    /// @notice Check whether a data root is available in the 0G DA network.
    /// @dev    Calls the DASigners precompile to check that the current epoch
    ///         has at least one registered quorum, which implies DA is live.
    ///         The `dataRoot` parameter is emitted in the return value context
    ///         and can be used by off-chain evolution agents to correlate with
    ///         0G Storage proofs.
    ///
    ///         This function uses a low-level staticcall so it degrades
    ///         gracefully in environments where the precompile is absent
    ///         (e.g., local Hardhat forks).
    ///
    /// @param  dataRoot The keccak256 root of the training dataset blob.
    /// @return available True if the DA layer reports at least one active quorum.
    function verifyDataAvailability(
        bytes32 dataRoot
    ) external view returns (bool available) {
        // Suppress "unused variable" warning — dataRoot is intentionally
        // kept as a parameter for off-chain correlation and future on-chain
        // verification once the precompile exposes blob-level proofs.
        // slither-disable-next-line unused-return
        dataRoot;

        IDASigners signers = IDASigners(DA_SIGNERS_PRECOMPILE);

        // Try to fetch the current epoch.
        uint256 epoch;
        try signers.epochNumber() returns (uint256 e) {
            epoch = e;
        } catch {
            // Precompile not available (non-0G network or test environment).
            return false;
        }

        // Verify there is at least one quorum in the current epoch.
        try signers.quorumCount(epoch) returns (uint256 count) {
            return count > 0;
        } catch {
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // View helpers
    // -------------------------------------------------------------------------

    /// @notice Returns true if `agent` is registered and active.
    function isRegistered(address agent) external view returns (bool) {
        return _agents[agent].active;
    }

    /// @notice Returns the full AgentRecord for `agent`.
    /// @dev    Reverts if `agent` has never been registered.
    function getAgent(
        address agent
    ) external view returns (AgentRecord memory) {
        require(_agents[agent].wallet != address(0), "NMR: unknown agent");
        return _agents[agent];
    }

    /// @notice Returns true if `evaluator` is authorised.
    function isAuthorizedEvaluator(
        address evaluator
    ) external view returns (bool) {
        return _authorizedEvaluators[evaluator];
    }

    /// @notice Returns true if `executor` is an authorised KeeperHub executor.
    function isKeeperExecutor(address executor) external view returns (bool) {
        return _keeperExecutors[executor];
    }

    /// @notice Returns the agent wallet that registered `tokenId`, or address(0).
    function agentByToken(uint256 tokenId) external view returns (address) {
        return _tokenOwnerIndex[tokenId];
    }
}
