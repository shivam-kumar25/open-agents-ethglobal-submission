import 'dotenv/config';
import { NeuralMesh, checkCapabilities, printStartupBanner } from '@neuralmesh/sdk';
export async function createBaseAgent(overrides) {
    const report = checkCapabilities();
    printStartupBanner(overrides.name, report);
    const config = {
        name: overrides.name,
        axlApiPort: overrides.axlApiPort,
        axlKeyPath: overrides.axlKeyPath,
        capabilities: overrides.capabilities ?? [],
        model: overrides.model
            ?? process.env['TOKENROUTER_MODEL']
            ?? 'meta-llama/Llama-3.1-8B-Instruct',
        privateKey: overrides.privateKey ?? process.env['PRIVATE_KEY'] ?? '',
        sepoliaRpcUrl: overrides.sepoliaRpcUrl ?? process.env['SEPOLIA_RPC_URL'] ?? 'https://rpc.sepolia.org',
    };
    const tokenrouterApiKey = overrides.tokenrouterApiKey ?? process.env['TOKENROUTER_API_KEY'];
    if (tokenrouterApiKey !== undefined) config.tokenrouterApiKey = tokenrouterApiKey;
    const tokenrouterBaseUrl = overrides.tokenrouterBaseUrl ?? process.env['TOKENROUTER_BASE_URL'];
    if (tokenrouterBaseUrl !== undefined) config.tokenrouterBaseUrl = tokenrouterBaseUrl;
    const keeperhubApiKey = overrides.keeperhubApiKey ?? process.env['KEEPERHUB_API_KEY'];
    if (keeperhubApiKey !== undefined) config.keeperhubApiKey = keeperhubApiKey;
    if (overrides.evolve !== undefined) config.evolve = overrides.evolve;
    if (overrides.evolutionThreshold !== undefined) config.evolutionThreshold = overrides.evolutionThreshold;
    return NeuralMesh.create(config);
}
//# sourceMappingURL=agent-base.js.map
