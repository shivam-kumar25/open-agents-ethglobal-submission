/**
 * deploy-resolver.ts
 *
 * Deploys NeuralMeshResolver to ENS Sepolia testnet (chainId 11155111).
 *
 * Usage:
 *   npx hardhat run scripts/deploy-resolver.ts --network sepolia
 *
 * Environment variables required:
 *   SEPOLIA_PRIVATE_KEY   — deployer private key for Sepolia (falls back to PRIVATE_KEY)
 *   SEPOLIA_RPC_URL       — Sepolia RPC endpoint
 *   NEURALMESH_REGISTRY   — address of NeuralMeshRegistry on 0G Galileo
 *
 * Optional:
 *   ENS_REGISTRY_SEPOLIA  — override ENS Registry address (default: 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e)
 *   NEURALMESH_ENS_NODE   — namehash of neuralmesh.eth (if you want to call setParentNode automatically)
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Well-known ENS Registry address on Sepolia.
const ENS_REGISTRY_SEPOLIA = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

async function main(): Promise<void> {
  // ── Pre-flight checks ────────────────────────────────────────────────────
  const sepoliaKey = process.env.SEPOLIA_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!sepoliaKey) {
    throw new Error(
      "SEPOLIA_PRIVATE_KEY (or PRIVATE_KEY) environment variable is not set."
    );
  }

  const neuralMeshRegistry = process.env.NEURALMESH_REGISTRY;
  if (!neuralMeshRegistry) {
    throw new Error(
      "NEURALMESH_REGISTRY environment variable is not set. " +
        "Run deploy:registry first and export the deployed address."
    );
  }

  if (!ethers.isAddress(neuralMeshRegistry)) {
    throw new Error(
      `NEURALMESH_REGISTRY "${neuralMeshRegistry}" is not a valid Ethereum address.`
    );
  }

  const ensRegistryAddress =
    process.env.ENS_REGISTRY_SEPOLIA || ENS_REGISTRY_SEPOLIA;

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("─────────────────────────────────────────────────────────");
  console.log("  NeuralMeshResolver — Deployment");
  console.log("─────────────────────────────────────────────────────────");
  console.log(`  Network            : ${network.name} (chainId ${network.chainId})`);
  console.log(`  Deployer           : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Balance            : ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error(
      "Deployer balance is zero — fund the account with Sepolia ETH before deploying."
    );
  }

  console.log(`  ENS Registry       : ${ensRegistryAddress}`);
  console.log(`  NeuralMesh Registry: ${neuralMeshRegistry}`);

  // ── Deploy ───────────────────────────────────────────────────────────────
  console.log("\n  Deploying NeuralMeshResolver...");

  const Factory = await ethers.getContractFactory("NeuralMeshResolver");
  const resolver = await Factory.deploy(
    ensRegistryAddress,
    neuralMeshRegistry,
    deployer.address
  );

  console.log(`  Tx hash            : ${resolver.deploymentTransaction()?.hash}`);
  console.log("  Waiting for confirmation...");

  await resolver.waitForDeployment();
  const address = await resolver.getAddress();

  console.log(`\n  Deployed           : ${address}`);

  // ── Optional: set parent node ────────────────────────────────────────────
  const parentNodeEnv = process.env.NEURALMESH_ENS_NODE;
  if (parentNodeEnv) {
    console.log(`\n  Setting parent node: ${parentNodeEnv}`);
    const tx = await (resolver as unknown as {
      setParentNode(node: string): Promise<{ hash: string; wait(): Promise<unknown> }>;
    }).setParentNode(parentNodeEnv);
    console.log(`  Tx hash            : ${(tx as { hash: string }).hash}`);
    await (tx as { wait(): Promise<unknown> }).wait();
    console.log("  Parent node set.");
  } else {
    console.log(
      "\n  Tip: Set NEURALMESH_ENS_NODE=<namehash> and re-run to auto-configure the parent node."
    );
    console.log(
      "       Or call resolver.setParentNode(namehash) manually after deployment."
    );
  }

  // ── Persist deployment info ──────────────────────────────────────────────
  const deploymentsDir = path.resolve(__dirname, "../deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const deploymentPath = path.join(deploymentsDir, "sepolia.json");

  let existing: Record<string, unknown> = {};
  if (fs.existsSync(deploymentPath)) {
    existing = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  }

  const deployment = {
    ...existing,
    network: "sepolia",
    chainId: Number(network.chainId),
    NeuralMeshResolver: {
      address,
      deployer: deployer.address,
      ensRegistry: ensRegistryAddress,
      neuralMeshRegistry,
      deployedAt: new Date().toISOString(),
      txHash: resolver.deploymentTransaction()?.hash ?? "",
    },
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`\n  Saved to           : ${deploymentPath}`);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────────────────");
  console.log("  Deployment complete.");
  console.log(`  NeuralMeshResolver : ${address}`);
  console.log("  Next step: run 'npm run setup' to verify the deployment.");
  console.log("─────────────────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("\n  Deployment failed:", err.message);
  process.exitCode = 1;
});
