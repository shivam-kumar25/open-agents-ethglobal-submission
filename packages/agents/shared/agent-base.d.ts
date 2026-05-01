import 'dotenv/config';
import type { NeuralMeshConfig, Agent } from '@neuralmesh/sdk';
/**
 * createBaseAgent — shared startup logic for all 5 NeuralMesh agents.
 *
 * What this does:
 *   1. Checks which capabilities are available (based on env vars in .env)
 *   2. Prints a friendly startup banner showing what's ready and what's missing
 *   3. Starts the agent with whatever is available — never crashes on missing keys
 *
 * Why not crash on missing keys?
 *   We want agents to be usable even with partial configuration.
 *   If you only have SEPOLIA_RPC_URL, you can still see agents discover each other.
 *   Each missing capability shows a clear message about what to add.
 *
 * What are the `overrides`?
 *   Each agent (planner, researcher, etc.) passes its own name, ports, and capabilities.
 *   This function fills in the rest from .env variables.
 */
export declare function createBaseAgent(overrides: Partial<NeuralMeshConfig> & {
    name: string;
    axlApiPort: number;
    axlKeyPath: string;
}): Promise<Agent>;
//# sourceMappingURL=agent-base.d.ts.map