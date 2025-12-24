import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { expect } from "chai";
import { PrivacyDock } from "../types";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("PrivacyDockSepolia", function () {
  let signers: Signers;
  let contract: PrivacyDock;
  let contractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deployment = await deployments.get("PrivacyDock");
      contractAddress = deployment.address;
      contract = await ethers.getContractAt("PrivacyDock", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("stores and reads a file entry", async function () {
    steps = 8;
    this.timeout(4 * 40000);

    const fileName = "sepolia-demo.txt";
    const encryptedHash = "bafy-sepolia-encrypted-hash";
    const addressA = ethers.Wallet.createRandom().address;

    progress("Encrypting address input...");
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .addAddress(addressA)
      .encrypt();

    progress("Sending storeFile transaction...");
    const tx = await contract
      .connect(signers.alice)
      .storeFile(fileName, encryptedHash, encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    progress("Reading file count...");
    const count = await contract.getFileCount(signers.alice.address);
    expect(count).to.be.greaterThan(0n);

    const index = count - 1n;
    progress(`Reading file at index ${index.toString()}...`);
    const file = await contract.getFile(signers.alice.address, index);
    expect(file[0]).to.eq(fileName);
    expect(file[1]).to.eq(encryptedHash);
    expect(file[2]).to.not.eq(ethers.ZeroHash);
  });
});
