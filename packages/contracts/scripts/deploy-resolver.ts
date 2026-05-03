/**
 * deploy-resolver.ts
 *
 * Deploys NeuralMeshResolver to ENS Sepolia testnet (chainId 11155111).
 *
 * Usage:
 *   npx hardhat run scripts/deploy-resolver.ts --network sepolia
 *
 * Environment variables required:
 *   SEPOLIA_PRIVATE_KEY (or PRIVATE_KEY)  — deployer wallet
 *   SEPOLIA_RPC_URL                       — Sepolia RPC endpoint
 *
 * Optional:
 *   ENS_REGISTRY_SEPOLIA  — override ENS Registry address (default: 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e)
 *   NEURALMESH_ENS_NODE   — namehash of neuralmesh.eth (triggers setParentNode automatically)
 *
 * After deploying:
 *   Run scripts/issue-subnames.ts to register all 5 agent subnames.
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const ENS_REGISTRY_SEPOLIA = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

async function main(): Promise<void> {
  const sepoliaKey = process.env.SEPOLIA_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!sepoliaKey) {
    throw new Error("SEPOLIA_PRIVATE_KEY (or PRIVATE_KEY) is not set.");
  }

  const ensRegistryAddress = process.env.ENS_REGISTRY_SEPOLIA || ENS_REGISTRY_SEPOLIA;
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("─────────────────────────────────────────────────────────");
  console.log("  NeuralMeshResolver — Deployment to Sepolia");
  console.log("─────────────────────────────────────────────────────────");
  console.log(`  Network  : ${network.name} (chainId ${network.chainId})`);
  console.log(`  Deployer : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Balance  : ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error(
      "Deployer balance is zero. Get Sepolia ETH at https://sepoliafaucet.com"
    );
  }

  console.log(`  ENS Registry: ${ensRegistryAddress}`);
  console.log("\n  Deploying NeuralMeshResolver...");

  const Factory = await ethers.getContractFactory("NeuralMeshResolver");
  // The second constructor arg is a "trusted authority" address — we use the deployer.
  // This means the deployer can call issueSubname() and setText() directly.
  const resolver = await Factory.deploy(
    ensRegistryAddress,
    deployer.address,
    deployer.address
  );

  console.log(`  Tx hash  : ${resolver.deploymentTransaction()?.hash}`);
  console.log("  Waiting for confirmation...");

  await resolver.waitForDeployment();
  const address = await resolver.getAddress();

  console.log(`\n  Deployed : ${address}`);

  // Optionally set the parent node (neuralmesh.eth namehash)
  const parentNodeEnv = process.env.NEURALMESH_ENS_NODE;
  if (parentNodeEnv) {
    console.log(`\n  Setting parent node: ${parentNodeEnv}`);
    const tx = await (resolver as unknown as {
      setParentNode(node: string): Promise<{ hash: string; wait(): Promise<unknown> }>;
    }).setParentNode(parentNodeEnv);
    await (tx as { wait(): Promise<unknown> }).wait();
    console.log("  Parent node set.");
  } else {
    const namehash = ethers.namehash("neuralmesh.eth");
    console.log(`\n  Next: set the parent node by running with:`);
    console.log(`    NEURALMESH_ENS_NODE=${namehash}`);
    console.log(`    Or call resolver.setParentNode('${namehash}') manually.`);
  }

  // Persist deployment info
  const deploymentsDir = path.resolve(__dirname, "../deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const deploymentPath = path.join(deploymentsDir, "sepolia.json");
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(deploymentPath)) {
    existing = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  }

  fs.writeFileSync(deploymentPath, JSON.stringify({
    ...existing,
    network: "sepolia",
    chainId: Number(network.chainId),
    NeuralMeshResolver: {
      address,
      deployer: deployer.address,
      ensRegistry: ensRegistryAddress,
      deployedAt: new Date().toISOString(),
      txHash: resolver.deploymentTransaction()?.hash ?? "",
    },
  }, null, 2));

  console.log(`\n  Saved to : ${deploymentPath}`);
  console.log("\n─────────────────────────────────────────────────────────");
  console.log("  Deployment complete.");
  console.log(`  Add to .env: NEURALMESH_RESOLVER=${address}`);
  console.log("  Next step: run scripts/issue-subnames.ts to register agents.");
  console.log("─────────────────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("\n  Deployment failed:", err.message);
  process.exitCode = 1;
});
