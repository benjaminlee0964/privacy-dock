// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PrivacyDock
/// @notice Stores file metadata with an encrypted address used to protect IPFS hashes.
contract PrivacyDock is ZamaEthereumConfig {
    struct FileEntry {
        string name;
        string encryptedHash;
        eaddress encryptedAddress;
        uint256 timestamp;
    }

    mapping(address => FileEntry[]) private _files;

    event FileStored(
        address indexed user,
        uint256 indexed index,
        string name,
        string encryptedHash,
        bytes32 encryptedAddressHandle,
        uint256 timestamp
    );

    /// @notice Store a new file entry with an encrypted address payload.
    /// @param name The plaintext filename
    /// @param encryptedHash The IPFS hash encrypted with the plaintext address
    /// @param encryptedAddressInput The encrypted address handle (external input)
    /// @param inputProof Proof for the encrypted input
    function storeFile(
        string calldata name,
        string calldata encryptedHash,
        externalEaddress encryptedAddressInput,
        bytes calldata inputProof
    ) external returns (uint256 index) {
        eaddress encryptedAddress = FHE.fromExternal(encryptedAddressInput, inputProof);

        _files[msg.sender].push(
            FileEntry({
                name: name,
                encryptedHash: encryptedHash,
                encryptedAddress: encryptedAddress,
                timestamp: block.timestamp
            })
        );

        index = _files[msg.sender].length - 1;

        FHE.allowThis(encryptedAddress);
        FHE.allow(encryptedAddress, msg.sender);

        emit FileStored(
            msg.sender,
            index,
            name,
            encryptedHash,
            eaddress.unwrap(encryptedAddress),
            block.timestamp
        );
    }

    /// @notice Returns the number of files for a user.
    /// @param user The address to query
    function getFileCount(address user) external view returns (uint256) {
        return _files[user].length;
    }

    /// @notice Returns a file entry for a user at a given index.
    /// @param user The address to query
    /// @param index The file index
    function getFile(
        address user,
        uint256 index
    )
        external
        view
        returns (string memory name, string memory encryptedHash, eaddress encryptedAddress, uint256 timestamp)
    {
        FileEntry storage entry = _files[user][index];
        return (entry.name, entry.encryptedHash, entry.encryptedAddress, entry.timestamp);
    }
}
