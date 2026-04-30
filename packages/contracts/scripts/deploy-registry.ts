/**
 * deploy-registry.ts
 *
 * Deploys NeuralMeshRegistry to 0G Galileo testnet (chainId 16602).
 *
 * Usage:
 *   npx hardhat run scripts/deploy-registry.ts --network galileo
 *
 * Environment variables required:
 *   PRIVATE_KEY   — deployer private key (hex, with or without 0x prefix)
 *   ZG_RPC_URL    — 0G Galileo RPC endpoint (default: https://evmrpc-testnet.0g.ai)
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main(): Promise<void> {
  // ── Pre-flight checks ────────────────────────────────────────────────────
  if (!process.env.PRIVATE_KEY) {
    throw new Error(
      "PRIVATE_KEY environment variable is not set. " +
        "Create a .env file or export the variable before running."
    );
  }

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("─────────────────────────────────────────────────────────");
  console.log("  NeuralMeshRegistry — Deployment");
  console.log("─────────────────────────────────────────────────────────");
  console.log(`  Network   : ${network.name} (chainId ${network.chainId})`);
  console.log(`  Deployer  : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Balance   : ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error(
      "Deployer balance is zero — fund the account with 0G testnet ETH before deploying."
    );
  }

  // ── Deploy ───────────────────────────────────────────────────────────────
  console.log("\n  Deploying NeuralMeshRegistry...");

  const Factory = await ethers.getContractFactory("NeuralMeshRegistry");
  const registry = await Factory.deploy(deployer.address);

  console.log(`  Tx hash   : ${registry.deploymentTransaction()?.hash}`);
  console.log("  Waiting for confirmation...");

  await registry.waitForDeployment();
  const address = await registry.getAddress();

  console.log(`\n  Deployed  : ${address}`);

  // ── Verify ownership ─────────────────────────────────────────────────────
  const owner = await registry.owner();
  console.log(`  Owner     : ${owner}`);
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error("Owner mismatch after deployment — something went wrong.");
  }

  // ── Persist deployment info ──────────────────────────────────────────────
  const deploymentsDir = path.resolve(__dirname, "../deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const deploymentPath = path.join(deploymentsDir, "galileo.json");

  // Merge with existing data if present.
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(deploymentPath)) {
    existing = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  }

  const deployment = {
    ...existing,
    network: "galileo",
    chainId: Number(network.chainId),
    NeuralMeshRegistry: {
      address,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      txHash: registry.deploymentTransaction()?.hash ?? "",
    },
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`\n  Saved to  : ${deploymentPath}`);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────────────────");
  console.log("  Deployment complete.");
  console.log(`  NeuralMeshRegistry : ${address}`);
  console.log(
    "  Next step: set NEURALMESH_REGISTRY=" +
      address +
      " and run deploy:resolver"
  );
  console.log("─────────────────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("\n  Deployment failed:", err.message);
  process.exitCode = 1;
});
