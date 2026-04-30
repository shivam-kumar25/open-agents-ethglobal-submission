import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  "0x0000000000000000000000000000000000000000000000000000000000000001";

const SEPOLIA_PRIVATE_KEY =
  process.env.SEPOLIA_PRIVATE_KEY || process.env.PRIVATE_KEY ||
  "0x0000000000000000000000000000000000000000000000000000000000000001";

const ZG_RPC_URL =
  process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai";

const SEPOLIA_RPC_URL =
  process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    galileo: {
      url: ZG_RPC_URL,
      chainId: 16602,
      accounts: [PRIVATE_KEY],
      timeout: 120000,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: [SEPOLIA_PRIVATE_KEY],
      timeout: 120000,
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      galileo: process.env.ZG_EXPLORER_API_KEY || "",
    },
    customChains: [
      {
        network: "galileo",
        chainId: 16602,
        urls: {
          apiURL: "https://chainscan-galileo.0g.ai/api",
          browserURL: "https://chainscan-galileo.0g.ai",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
};

export default config;
