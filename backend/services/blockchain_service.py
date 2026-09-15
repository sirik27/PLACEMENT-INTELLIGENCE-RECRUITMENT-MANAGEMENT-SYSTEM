import os
import json
from eth_account import Account
from web3 import Web3

POLYGON_AMOY_RPC = os.getenv("POLYGON_AMOY_RPC", "https://rpc-amoy.polygon.technology/")
RELAYER_PRIVATE_KEY = os.getenv("TPO_RELAYER_PRIVATE_KEY", "")
CONTRACT_ADDRESS = os.getenv("PLACEMENT_PASSPORT_CONTRACT", "")
EXPLORER_BASE = "https://amoy.polygonscan.com/tx/"

# PlacementPassport ABI (minimal — only the functions we need)
CONTRACT_ABI = [
    {
        "inputs": [
            {"name": "rollNo", "type": "string"},
            {"name": "docHash", "type": "bytes32"},
            {"name": "credType", "type": "string"},
        ],
        "name": "anchorCredential",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "docHash", "type": "bytes32"}],
        "name": "verifyCredential",
        "outputs": [
            {"name": "exists", "type": "bool"},
            {"name": "rollNo", "type": "string"},
            {"name": "credType", "type": "string"},
            {"name": "timestamp", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "institutionAuthority",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
]


def get_web3():
    """Get Web3 instance connected to Polygon Amoy."""
    return Web3(Web3.HTTPProvider(POLYGON_AMOY_RPC))


def get_contract():
    """Get the PlacementPassport contract instance."""
    w3 = get_web3()
    if not CONTRACT_ADDRESS:
        raise ValueError("PLACEMENT_PASSPORT_CONTRACT not set in .env")
    return w3.eth.contract(
        address=Web3.to_checksum_address(CONTRACT_ADDRESS),
        abi=CONTRACT_ABI,
    )


async def anchor_credential(roll_no, doc_hash_hex, credential_type):
    """
    Anchor a credential on-chain.
    Signs with the TPO relayer key — students never pay gas.
    Returns { txHash, explorerLink }.
    """
    if not RELAYER_PRIVATE_KEY:
        raise ValueError("TPO_RELAYER_PRIVATE_KEY not set in .env")

    w3 = get_web3()
    contract = get_contract()
    account = Account.from_key(RELAYER_PRIVATE_KEY)

    # Convert hex string to bytes32
    if doc_hash_hex.startswith("0x"):
        doc_hash_bytes = bytes.fromhex(doc_hash_hex[2:])
    else:
        doc_hash_bytes = bytes.fromhex(doc_hash_hex)

    # Build transaction
    nonce = w3.eth.get_transaction_count(account.address)
    tx = contract.functions.anchorCredential(
        roll_no,
        doc_hash_bytes,
        credential_type,
    ).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 200000,
        "gasPrice": w3.to_wei("30", "gwei"),
        "chainId": 80002,  # Polygon Amoy chain ID
    })

    # Sign and send
    signed_tx = w3.eth.account.sign_transaction(tx, RELAYER_PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    tx_hash_hex = tx_hash.hex()

    return {
        "txHash": tx_hash_hex,
        "explorerLink": f"{EXPLORER_BASE}{tx_hash_hex}",
    }


async def verify_credential(doc_hash_hex):
    """
    Verify a credential on-chain.
    Returns { exists, rollNo, credentialType, timestamp }.
    """
    contract = get_contract()

    if doc_hash_hex.startswith("0x"):
        doc_hash_bytes = bytes.fromhex(doc_hash_hex[2:])
    else:
        doc_hash_bytes = bytes.fromhex(doc_hash_hex)

    result = contract.functions.verifyCredential(doc_hash_bytes).call()
    return {
        "exists": result[0],
        "rollNo": result[1],
        "credentialType": result[2],
        "timestamp": result[3],
    }
