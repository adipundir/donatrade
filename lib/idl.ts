export const IDL = {
    "version": "0.1.0",
    "name": "donatrade_program",
    "instructions": [
        {
            "name": "initialize_global_vault",
            "accounts": [
                { "name": "admin", "writable": true, "signer": true },
                { "name": "globalVault", "writable": true, "signer": false, "type": "globalProgramVault" },
                { "name": "usdcTokenAccount", "writable": false, "signer": false },
                { "name": "systemProgram", "writable": false, "signer": false }
            ],
            "args": []
        },
        {
            "name": "create_company",
            "accounts": [
                { "name": "admin", "writable": true, "signer": true },
                { "name": "companyAdmin", "writable": false, "signer": false },
                { "name": "companyAccount", "writable": true, "signer": false, "type": "companyAccount" },
                { "name": "systemProgram", "writable": false, "signer": false }
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
                { "name": "investor", "writable": true, "signer": true },
                { "name": "investorVault", "writable": true, "signer": false, "type": "investorVault" },
                { "name": "investorTokenAccount", "writable": true, "signer": false },
                { "name": "vaultTokenAccount", "writable": true, "signer": false },
                { "name": "incoLightningProgram", "writable": false, "signer": false },
                { "name": "tokenProgram", "writable": false, "signer": false },
                { "name": "systemProgram", "writable": false, "signer": false }
            ],
            "args": [{ "name": "amount", "type": "u64" }]
        },
        {
            "name": "withdraw",
            "accounts": [
                { "name": "investor", "writable": true, "signer": true },
                { "name": "investorVault", "writable": true, "signer": false, "type": "investorVault" },
                { "name": "globalVault", "writable": false, "signer": false, "type": "globalProgramVault" },
                { "name": "investorTokenAccount", "writable": true, "signer": false },
                { "name": "vaultTokenAccount", "writable": true, "signer": false },
                { "name": "incoLightningProgram", "writable": false, "signer": false },
                { "name": "tokenProgram", "writable": false, "signer": false },
                { "name": "systemProgram", "writable": false, "signer": false }
            ],
            "args": [{ "name": "amount", "type": "u64" }]
        },
        {
            "name": "buyShares",
            "accounts": [
                { "name": "investor", "writable": true, "signer": true },
                { "name": "investorVault", "writable": true, "signer": false, "type": "investorVault" },
                { "name": "companyAccount", "writable": true, "signer": false, "type": "companyAccount" },
                { "name": "position", "writable": true, "signer": false, "type": "positionAccount" },
                { "name": "incoLightningProgram", "writable": false, "signer": false },
                { "name": "systemProgram", "writable": false, "signer": false }
            ],
            "args": [{ "name": "shareAmount", "type": "u64" }]
        },
        {
            "name": "sellShares",
            "accounts": [
                { "name": "investor", "writable": true, "signer": true },
                { "name": "investorVault", "writable": true, "signer": false, "type": "investorVault" },
                { "name": "companyAccount", "writable": true, "signer": false, "type": "companyAccount" },
                { "name": "position", "writable": true, "signer": false, "type": "positionAccount" },
                { "name": "incoLightningProgram", "writable": false, "signer": false },
                { "name": "systemProgram", "writable": false, "signer": false }
            ],
            "args": [{ "name": "shareAmount", "type": "u64" }]
        }
    ],
    "accounts": [
        {
            "name": "investorVault",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "owner", "type": "pubkey" },
                    { "name": "cusd", "type": { "defined": "euint128" } },
                    { "name": "bump", "type": "u8" }
                ]
            }
        },
        {
            "name": "companyAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "companyId", "type": "u64" },
                    { "name": "companyAdmin", "type": "pubkey" },
                    { "name": "cusd", "type": { "defined": "euint128" } },
                    { "name": "sharesAvailable", "type": "u64" },
                    { "name": "pricePerShare", "type": "u64" },
                    { "name": "active", "type": "bool" },
                    { "name": "bump", "type": "u8" }
                ]
            }
        },
        {
            "name": "positionAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "owner", "type": "pubkey" },
                    { "name": "companyId", "type": "u64" },
                    { "name": "encryptedShares", "type": { "defined": "euint128" } },
                    { "name": "bump", "type": "u8" }
                ]
            }
        },
        {
            "name": "globalProgramVault",
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
            "name": "euint128",
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
    "address": "9MBsFdzmTYU93kDseX9mczoYPChfaoSMU3uS9tu5e4ax"
};
