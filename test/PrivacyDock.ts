import crypto from "crypto";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { PrivacyDock, PrivacyDock__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

function deriveKey(address: string): Buffer {
  return crypto.createHash("sha256").update(address.toLowerCase()).digest();
}

function encryptHash(plaintext: string, address: string): string {
  const iv = crypto.randomBytes(12);
  const key = deriveKey(address);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptHash(payload: string, address: string): string {
  const [ivHex, tagHex, encryptedHex] = payload.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const key = deriveKey(address);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

async function deployFixture() {
  const factory = (await ethers.getContractFactory("PrivacyDock")) as PrivacyDock__factory;
  const contract = (await factory.deploy()) as PrivacyDock;
  const address = await contract.getAddress();

  return { contract, address };
}

describe("PrivacyDock", function () {
  let signers: Signers;
  let contract: PrivacyDock;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, address: contractAddress } = await deployFixture());
  });

  it("stores file metadata with encrypted address handle", async function () {
    const fileName = "alpha.txt";
    const ipfsHash = "bafy-test-hash";
    const addressA = ethers.Wallet.createRandom().address;
    const encryptedHash = encryptHash(ipfsHash, addressA);

    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .addAddress(addressA)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .storeFile(fileName, encryptedHash, encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    const count = await contract.getFileCount(signers.alice.address);
    expect(count).to.eq(1);

    const file = await contract.getFile(signers.alice.address, 0);
    expect(file[0]).to.eq(fileName);
    expect(file[1]).to.eq(encryptedHash);
    expect(file[2]).to.not.eq(ethers.ZeroHash);
    expect(file[3]).to.be.greaterThan(0n);

    const decryptedHash = decryptHash(encryptedHash, addressA);
    expect(decryptedHash).to.eq(ipfsHash);
  });
});
