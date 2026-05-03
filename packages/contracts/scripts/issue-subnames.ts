/**
 * issue-subnames.ts
 *
 * Registers all 5 NeuralMesh agents as *.neuralmesh.eth subnames on the
 * NeuralMeshResolver contract on Sepolia.
 *
 * Run this ONCE after deploying the resolver and after all agents have
 * printed their AXL pubkeys (from: curl http://localhost:9003/api/self).
 *
 * Usage:
 *   npx hardhat run scripts/issue-subnames.ts --network sepolia
 *
 * Required env vars:
 *   PRIVATE_KEY or SEPOLIA_PRIVATE_KEY   — deployer wallet (must own neuralmesh.eth)
 *   SEPOLIA_RPC_URL                      — Sepolia RPC
 *   NEURALMESH_RESOLVER                  — address of the deployed NeuralMeshResolver
 *
 *   Per-agent AXL pubkeys (get from: curl http://localhost:9003/api/self | jq .pubkey):
 *   PLANNER_AXL_PUBKEY
 *   RESEARCHER_AXL_PUBKEY
 *   EXECUTOR_AXL_PUBKEY
 *   EVALUATOR_AXL_PUBKEY
 *   EVOLUTION_AXL_PUBKEY
 *
 *   Per-agent wallet addresses (the same PRIVATE_KEY is fine for a local demo):
 *   PLANNER_WALLET
 *   RESEARCHER_WALLET
 *   EXECUTOR_WALLET
 *   EVALUATOR_WALLET
 *   EVOLUTION_WALLET
 */

import { ethers } from "hardhat";

const RESOLVER_ABI = [
  "function issueSubname(string label, address subOwner, uint256 tokenId, bytes axlPubkey) external",
  "function subnameCount() external view returns (uint256)",
  "function parentNode() external view returns (bytes32)",
] as const;

interface AgentDef {
  label: string;
  walletEnv: string;
  pubkeyEnv: string;
  tokenId: number;
}

const AGENTS: AgentDef[] = [
  { label: "planner",    walletEnv: "PLANNER_WALLET",    pubkeyEnv: "PLANNER_AXL_PUBKEY",    tokenId: 1 },
  { label: "researcher", walletEnv: "RESEARCHER_WALLET", pubkeyEnv: "RESEARCHER_AXL_PUBKEY", tokenId: 2 },
  { label: "executor",   walletEnv: "EXECUTOR_WALLET",   pubkeyEnv: "EXECUTOR_AXL_PUBKEY",   tokenId: 3 },
  { label: "evaluator",  walletEnv: "EVALUATOR_WALLET",  pubkeyEnv: "EVALUATOR_AXL_PUBKEY",  tokenId: 4 },
  { label: "evolution",  walletEnv: "EVOLUTION_WALLET",  pubkeyEnv: "EVOLUTION_AXL_PUBKEY",  tokenId: 5 },
];

async function main(): Promise<void> {
  const resolverAddress = process.env.NEURALMESH_RESOLVER;
  if (!resolverAddress) throw new Error("NEURALMESH_RESOLVER not set");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("─────────────────────────────────────────────────────────");
  console.log("  NeuralMesh — Issue Agent Subnames on Sepolia ENS");
  console.log("─────────────────────────────────────────────────────────");
  console.log(`  Network    : ${network.name} (chainId ${network.chainId})`);
  console.log(`  Deployer   : ${deployer.address}`);
  console.log(`  Resolver   : ${resolverAddress}`);

  const resolver = new ethers.Contract(resolverAddress, RESOLVER_ABI, deployer);

  const parentNode = await (resolver as unknown as {
    parentNode(): Promise<string>
  }).parentNode();

  if (parentNode === ethers.ZeroHash) {
    throw new Error(
      "Parent node not set on resolver. Call resolver.setParentNode(namehash('neuralmesh.eth')) first.\n" +
      "  namehash: 0x" + ethers.namehash("neuralmesh.eth").slice(2)
    );
  }

  const subnameCount = await (resolver as unknown as {
    subnameCount(): Promise<bigint>
  }).subnameCount();

  console.log(`  Parent node: ${parentNode}`);
  console.log(`  Existing subnames: ${subnameCount}`);
  console.log("");

  let issued = 0;
  for (const agent of AGENTS) {
    const walletAddr = process.env[agent.walletEnv] ?? deployer.address;
    const pubkeyHex  = process.env[agent.pubkeyEnv] ?? "";

    if (!pubkeyHex) {
      console.warn(`  ⚠  ${agent.label}: no AXL pubkey set (${agent.pubkeyEnv}) — skipping`);
      continue;
    }

    const pubkeyBytes = pubkeyHex.startsWith("0x") ? pubkeyHex : `0x${pubkeyHex}`;

    try {
      console.log(`  Issuing ${agent.label}.neuralmesh.eth → ${walletAddr}`);
      const tx = await (resolver as unknown as {
        issueSubname(
          label: string,
          subOwner: string,
          tokenId: number,
          axlPubkey: string,
        ): Promise<{ hash: string; wait(): Promise<unknown> }>
      }).issueSubname(agent.label, walletAddr, agent.tokenId, pubkeyBytes);

      console.log(`    tx: ${tx.hash}`);
      await tx.wait();
      console.log(`    ✓ ${agent.label}.neuralmesh.eth issued`);
      issued++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("label already taken")) {
        console.log(`    ✓ ${agent.label}.neuralmesh.eth already registered — skipping`);
      } else {
        console.error(`    ✗ Failed: ${msg}`);
      }
    }
  }

  console.log("");
  console.log(`  Done. ${issued} new subnames issued.`);
  console.log("─────────────────────────────────────────────────────────");
  console.log("  Next: agents will now be discoverable by name on Sepolia ENS.");
  console.log("  Dashboard will show live ENS records at /axl-*");
  console.log("─────────────────────────────────────────────────────────");
}

main().catch((err) => {
  console.error("\n  Failed:", err.message);
  process.exitCode = 1;
});
