// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PlacementPassport
 * @dev Anchors verifiable placement credentials on-chain (Polygon Amoy).
 *      Only the institution authority (TPO) can anchor credentials.
 *      Students never pay gas — the TPO relayer signs all transactions server-side.
 */
contract PlacementPassport {
    address public institutionAuthority;

    struct Credential {
        string rollNo;
        bytes32 docHash;
        string credentialType;
        uint256 timestamp;
    }

    mapping(bytes32 => Credential) public credentials;

    event CredentialAnchored(
        string indexed rollNo,
        bytes32 indexed docHash,
        string credentialType
    );

    modifier onlyAuthority() {
        require(msg.sender == institutionAuthority, "Not authorized");
        _;
    }

    constructor() {
        institutionAuthority = msg.sender;
    }

    /**
     * @dev Anchor a credential hash on-chain.
     * @param rollNo Student roll number (e.g., "23P61A6701")
     * @param docHash SHA-256 hash of the credential document
     * @param credType Type of credential (e.g., "offer_letter", "internship_cert", "skill_badge")
     */
    function anchorCredential(
        string calldata rollNo,
        bytes32 docHash,
        string calldata credType
    ) external onlyAuthority {
        require(credentials[docHash].timestamp == 0, "Credential already anchored");
        credentials[docHash] = Credential(rollNo, docHash, credType, block.timestamp);
        emit CredentialAnchored(rollNo, docHash, credType);
    }

    /**
     * @dev Verify if a credential exists on-chain.
     * @param docHash The document hash to verify
     * @return exists Whether the credential is anchored
     * @return rollNo The associated student roll number
     * @return credType The credential type
     * @return timestamp When it was anchored
     */
    function verifyCredential(bytes32 docHash)
        external
        view
        returns (
            bool exists,
            string memory rollNo,
            string memory credType,
            uint256 timestamp
        )
    {
        Credential memory cred = credentials[docHash];
        if (cred.timestamp == 0) {
            return (false, "", "", 0);
        }
        return (true, cred.rollNo, cred.credentialType, cred.timestamp);
    }

    /**
     * @dev Transfer institution authority (e.g., new TPO).
     */
    function transferAuthority(address newAuthority) external onlyAuthority {
        require(newAuthority != address(0), "Invalid address");
        institutionAuthority = newAuthority;
    }
}
