import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the PrivacyDock address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const deployment = await deployments.get("PrivacyDock");
  console.log("PrivacyDock address is " + deployment.address);
});

task("task:store-file", "Stores a file entry in PrivacyDock")
  .addOptionalParam("name", "Filename to store", "demo.txt")
  .addOptionalParam("encryptedhash", "Encrypted IPFS hash string", "bafy-demo-hash")
  .addOptionalParam("address", "Plaintext address used for encryption")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = await deployments.get("PrivacyDock");
    const [signer] = await ethers.getSigners();

    const plaintextAddress = taskArguments.address ?? ethers.Wallet.createRandom().address;
    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, signer.address)
      .addAddress(plaintextAddress)
      .encrypt();

    const contract = await ethers.getContractAt("PrivacyDock", deployment.address);
    const tx = await contract.storeFile(
      taskArguments.name,
      taskArguments.encryptedhash,
      encryptedInput.handles[0],
      encryptedInput.inputProof,
    );
    console.log(`Waiting for tx:${tx.hash}...`);
    await tx.wait();

    console.log("Stored file:", {
      name: taskArguments.name,
      encryptedHash: taskArguments.encryptedhash,
      plaintextAddress,
    });
  });

task("task:get-file", "Reads a file entry from PrivacyDock")
  .addParam("user", "User address to query")
  .addParam("index", "File index")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const deployment = await deployments.get("PrivacyDock");
    const contract = await ethers.getContractAt("PrivacyDock", deployment.address);

    const file = await contract.getFile(taskArguments.user, taskArguments.index);
    console.log("File entry:", {
      name: file[0],
      encryptedHash: file[1],
      encryptedAddressHandle: file[2],
      timestamp: file[3]?.toString(),
    });
  });
