import { ethers } from "hardhat";
import fs from "fs";
import path from "path";


async function main() {
    try {

        const [CREATE2_DEPLOYER, SMART_CONTRACT_DEPLOYER, executor, user, attacker] = await ethers.getSigners();

        const deployer = SMART_CONTRACT_DEPLOYER;


        console.log("Deploying ExampleContract (Implementation + Proxy) with account:", deployer.address);

        // Load the factory address from deployments
        const network = process.env.HARDHAT_NETWORK || "local";
        const factoryDeploymentFile = path.join(__dirname, `../deployments/factory-${network}.json`);

        if (!fs.existsSync(factoryDeploymentFile)) {
            console.error(`Factory deployment not found at ${factoryDeploymentFile}`);
            console.error("Please run deploy-create3-factory.ts first");
            process.exit(1);
        }

        const factoryDeployment = JSON.parse(fs.readFileSync(factoryDeploymentFile, "utf8"));
        const factoryAddress = factoryDeployment.factoryAddress;

        console.log("Using CREATE3Factory at:", factoryAddress);
        const factory = await ethers.getContractAt("ICREATE3Factory", factoryAddress);

        // Step 1: Deploy the ExampleContract implementation
        console.log("\n📄 Deploying ExampleContract implementation...");
        const ExampleContract = await ethers.getContractFactory("ExampleContract");
        const implementationBytecode = ExampleContract.bytecode;

        // Choose a salt for deterministic addressing
        const implementationSalt = ethers.id("EXAMPLECONTRACT_IMPLEMENTATION_V1");

        // Use CREATE3 to deploy the implementation
        const implementationTx = await factory.deploy(
            implementationSalt,
            implementationBytecode,
            { gasLimit: 5000000 }
        );

        await implementationTx.wait();

        // Get the implementation address
        const implementationAddress = await factory.getDeployed(
            deployer.address,
            implementationSalt
        );

        console.log("✅ ExampleContract implementation deployed to:", implementationAddress);

        // Step 2: Deploy the UUPS Proxy
        console.log("\n🔄 Deploying UUPS Proxy with CREATE3...");

        // Get the ERC1967Proxy contract factory
        const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");

        // Create initialization data for the proxy
        const initializerData = ExampleContract.interface.encodeFunctionData("initialize", [deployer.address]);

        // Create the ERC1967Proxy constructor arguments
        const proxyConstructorArgs = [
            implementationAddress,  // implementation address
            initializerData         // initialization data
        ];

        // Encode the proxy constructor with its arguments
        const proxyBytecode = ethers.concat([
            ERC1967Proxy.bytecode,
            ERC1967Proxy.interface.encodeDeploy(proxyConstructorArgs)
        ]);

        // Deploy using CREATE3
        const proxySalt = ethers.id("EXAMPLECONTRACT_PROXY_V1");
        const proxyTx = await factory.deploy(proxySalt, proxyBytecode, { gasLimit: 5000000 });
        await proxyTx.wait();

        // Get deployed proxy address
        const proxyAddress = await factory.getDeployed(deployer.address, proxySalt);
        console.log("✅ Proxy deployed at:", proxyAddress);

        // Verify ownership
        const examplecontract = await ethers.getContractAt("ExampleContract", proxyAddress);
        const owner = await examplecontract.owner();
        console.log("Contract owner:", owner);

        if (owner === deployer.address) {
            console.log("✅ Deployment successful!");
        } else {
            console.log("⚠️ Owner mismatch. Check the deployment.");
            console.log("Expected owner:", deployer.address);
        }

        // Save deployment info to a JSON file
        const deploymentInfo = {
            network,
            factoryAddress,
            implementationAddress,
            implementationSalt: implementationSalt.toString(),
            proxyAddress,
            proxySalt: proxySalt.toString(),
            owner: deployer.address,
            deploymentDate: new Date().toISOString()
        };

        const deploymentsDir = path.join(__dirname, "../deployments");
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir, { recursive: true });
        }

        fs.writeFileSync(
            path.join(deploymentsDir, `examplecontract-deployment-${network}.json`),
            JSON.stringify(deploymentInfo, null, 2)
        );

        console.log(`\n📝 Deployment info saved to ./deployments/examplecontract-deployment-${network}.json`);

        // For verification on BscScan
        console.log("\n🔍 For verification on BscScan:");
        console.log(`npx hardhat verify --network ${network} ${implementationAddress}`);
    }
    catch (error) {
        console.log(error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });