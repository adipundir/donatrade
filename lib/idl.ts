export const IDL = {
    "version": "0.1.0",
    "name": "donatrade_program",
    "instructions": [
        {
            "name": "initializeGlobalVault",
            "accounts": [
                { "name": "admin", "isMut": true, "isSigner": true },
                { "name": "globalVault", "isMut": true, "isSigner": false },
                { "name": "usdcTokenAccount", "isMut": false, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": []
        },
        {
            "name": "createCompany",
            "accounts": [
                { "name": "admin", "isMut": true, "isSigner": true },
                { "name": "companyAdmin", "isMut": false, "isSigner": false },
                { "name": "companyAccount", "isMut": true, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [
                { "name": "companyId", "type": "u64" },
                { "name": "initialShares", "type": "u64" },
                { "name": "pricePerShare", "type": "u64" }
            ]
        },
        {
            "name": "deposit",
            "accounts": [
                { "name": "investor", "isMut": true, "isSigner": true },
                { "name": "investorVault", "isMut": true, "isSigner": false },
                { "name": "investorTokenAccount", "isMut": true, "isSigner": false },
                { "name": "vaultTokenAccount", "isMut": true, "isSigner": false },
                { "name": "incoLightningProgram", "isMut": false, "isSigner": false },
                { "name": "tokenProgram", "isMut": false, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [{ "name": "amount", "type": "u64" }]
        },
        {
            "name": "withdraw",
            "accounts": [
                { "name": "investor", "isMut": true, "isSigner": true },
                { "name": "investorVault", "isMut": true, "isSigner": false },
                { "name": "globalVault", "isMut": false, "isSigner": false },
                { "name": "investorTokenAccount", "isMut": true, "isSigner": false },
                { "name": "vaultTokenAccount", "isMut": true, "isSigner": false },
                { "name": "incoLightningProgram", "isMut": false, "isSigner": false },
                { "name": "tokenProgram", "isMut": false, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [{ "name": "amount", "type": "u64" }]
        },
        {
            "name": "buyShares",
            "accounts": [
                { "name": "investor", "isMut": true, "isSigner": true },
                { "name": "investorVault", "isMut": true, "isSigner": false },
                { "name": "companyAccount", "isMut": true, "isSigner": false },
                { "name": "position", "isMut": true, "isSigner": false },
                { "name": "incoLightningProgram", "isMut": false, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [{ "name": "shareAmount", "type": "u64" }]
        },
        {
            "name": "sellShares",
            "accounts": [
                { "name": "investor", "isMut": true, "isSigner": true },
                { "name": "investorVault", "isMut": true, "isSigner": false },
                { "name": "companyAccount", "isMut": true, "isSigner": false },
                { "name": "position", "isMut": true, "isSigner": false },
                { "name": "incoLightningProgram", "isMut": false, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [{ "name": "shareAmount", "type": "u64" }]
        }
    ],
    "accounts": [
        {
            "name": "InvestorVault",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "owner", "type": "pubkey" },
                    { "name": "cusd", "type": { "defined": "Euint128" } },
                    { "name": "bump", "type": "u8" }
                ]
            }
        },
        {
            "name": "CompanyAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "companyId", "type": "u64" },
                    { "name": "companyAdmin", "type": "pubkey" },
                    { "name": "cusd", "type": { "defined": "Euint128" } },
                    { "name": "sharesAvailable", "type": "u64" },
                    { "name": "pricePerShare", "type": "u64" },
                    { "name": "active", "type": "bool" },
                    { "name": "bump", "type": "u8" }
                ]
            }
        },
        {
            "name": "PositionAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "owner", "type": "pubkey" },
                    { "name": "companyId", "type": "u64" },
                    { "name": "encryptedShares", "type": { "defined": "Euint128" } },
                    { "name": "bump", "type": "u8" }
                ]
            }
        },
        {
            "name": "GlobalProgramVault",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "usdcTokenAccount", "type": "pubkey" },
                    { "name": "bump", "type": "u8" }
                ]
            }
        }
    ],
    "types": [
        {
            "name": "Euint128",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "inner", "type": { "array": ["u8", 16] } }
                ]
            }
        }
    ],
    "errors": [
        { "code": 6000, "name": "Inactive", "msg": "Inactive" },
        { "code": 6001, "name": "InsufficientShares", "msg": "Insufficient shares" },
        { "code": 6002, "name": "Overflow", "msg": "Arithmetic overflow" }
    ],
    "metadata": {
        "address": "9MBsFdzmTYU93kDseX9mczoYPChfaoSMU3uS9tu5e4ax"
    },
    "address": "9MBsFdzmTYU93kDseX9mczoYPChfaoSMU3uS9tu5e4ax"
};
