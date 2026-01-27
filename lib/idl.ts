export const IDL = {
    "address": "9MBsFdzmTYU93kDseX9mczoYPChfaoSMU3uS9tu5e4ax",
    "metadata": {
        "name": "donatrade_program",
        "version": "0.1.0",
        "spec": "0.1.0",
        "description": "Donatrade - Privacy-First Private Investment Platform on Solana"
    },
    "instructions": [
        {
            "name": "authorize_decryption",
            "discriminator": [
                114,
                245,
                30,
                117,
                209,
                140,
                74,
                121
            ],
            "accounts": [
                {
                    "name": "investor",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "allowance_account",
                    "writable": true
                },
                {
                    "name": "inco_lightning_program",
                    "address": "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj"
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                }
            ],
            "args": [
                {
                    "name": "handle",
                    "type": "u128"
                }
            ]
        },
        {
            "name": "buy_shares",
            "discriminator": [
                40,
                239,
                138,
                154,
                8,
                37,
                106,
                108
            ],
            "accounts": [
                {
                    "name": "investor",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "investor_vault",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    118,
                                    97,
                                    117,
                                    108,
                                    116
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "investor"
                            }
                        ]
                    }
                },
                {
                    "name": "company_account",
                    "writable": true
                },
                {
                    "name": "position",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    112,
                                    111,
                                    115,
                                    105,
                                    116,
                                    105,
                                    111,
                                    110
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "company_account.company_id",
                                "account": "CompanyAccount"
                            },
                            {
                                "kind": "account",
                                "path": "investor"
                            }
                        ]
                    }
                },
                {
                    "name": "inco_lightning_program",
                    "address": "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj"
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                }
            ],
            "args": [
                {
                    "name": "share_amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "create_company",
            "discriminator": [
                36,
                192,
                217,
                144,
                125,
                185,
                198,
                51
            ],
            "accounts": [
                {
                    "name": "admin",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "company_admin"
                },
                {
                    "name": "company_account",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    99,
                                    111,
                                    109,
                                    112,
                                    97,
                                    110,
                                    121
                                ]
                            },
                            {
                                "kind": "arg",
                                "path": "company_id"
                            }
                        ]
                    }
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                }
            ],
            "args": [
                {
                    "name": "company_id",
                    "type": "u64"
                },
                {
                    "name": "initial_shares",
                    "type": "u64"
                },
                {
                    "name": "price_per_share",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "deposit",
            "discriminator": [
                242,
                35,
                198,
                137,
                82,
                225,
                242,
                182
            ],
            "accounts": [
                {
                    "name": "investor",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "investor_vault",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    118,
                                    97,
                                    117,
                                    108,
                                    116
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "investor"
                            }
                        ]
                    }
                },
                {
                    "name": "investor_token_account",
                    "writable": true
                },
                {
                    "name": "vault_token_account",
                    "writable": true
                },
                {
                    "name": "inco_lightning_program",
                    "address": "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj"
                },
                {
                    "name": "token_program",
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "initialize_global_vault",
            "discriminator": [
                26,
                41,
                177,
                61,
                192,
                151,
                26,
                207
            ],
            "accounts": [
                {
                    "name": "admin",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "global_vault",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    118,
                                    97,
                                    117,
                                    108,
                                    116,
                                    95,
                                    97,
                                    117,
                                    116,
                                    104,
                                    111,
                                    114,
                                    105,
                                    116,
                                    121
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "usdc_token_account"
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                }
            ],
            "args": []
        },
        {
            "name": "sell_shares",
            "discriminator": [
                184,
                164,
                169,
                16,
                231,
                158,
                199,
                196
            ],
            "accounts": [
                {
                    "name": "investor",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "investor_vault",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    118,
                                    97,
                                    117,
                                    108,
                                    116
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "investor"
                            }
                        ]
                    }
                },
                {
                    "name": "company_account",
                    "writable": true
                },
                {
                    "name": "position",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    112,
                                    111,
                                    115,
                                    105,
                                    116,
                                    105,
                                    111,
                                    110
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "company_account.company_id",
                                "account": "CompanyAccount"
                            },
                            {
                                "kind": "account",
                                "path": "investor"
                            }
                        ]
                    }
                },
                {
                    "name": "inco_lightning_program",
                    "address": "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj"
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                }
            ],
            "args": [
                {
                    "name": "share_amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "withdraw",
            "discriminator": [
                183,
                18,
                70,
                156,
                148,
                109,
                161,
                34
            ],
            "accounts": [
                {
                    "name": "investor",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "investor_vault",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    118,
                                    97,
                                    117,
                                    108,
                                    116
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "investor"
                            }
                        ]
                    }
                },
                {
                    "name": "global_vault",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    118,
                                    97,
                                    117,
                                    108,
                                    116,
                                    95,
                                    97,
                                    117,
                                    116,
                                    104,
                                    111,
                                    114,
                                    105,
                                    116,
                                    121
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "investor_token_account",
                    "writable": true
                },
                {
                    "name": "vault_token_account",
                    "writable": true
                },
                {
                    "name": "inco_lightning_program",
                    "address": "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj"
                },
                {
                    "name": "token_program",
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        }
    ],
    "accounts": [
        {
            "name": "CompanyAccount",
            "discriminator": [
                37,
                215,
                171,
                200,
                8,
                141,
                69,
                96
            ]
        },
        {
            "name": "GlobalProgramVault",
            "discriminator": [
                107,
                141,
                240,
                80,
                96,
                78,
                174,
                190
            ]
        },
        {
            "name": "InvestorVault",
            "discriminator": [
                232,
                117,
                168,
                151,
                30,
                250,
                20,
                169
            ]
        },
        {
            "name": "PositionAccount",
            "discriminator": [
                60,
                125,
                250,
                193,
                181,
                109,
                238,
                86
            ]
        }
    ],
    "errors": [
        {
            "code": 6000,
            "name": "Inactive",
            "msg": "Inactive"
        },
        {
            "code": 6001,
            "name": "InsufficientShares",
            "msg": "Insufficient shares"
        },
        {
            "code": 6002,
            "name": "Overflow",
            "msg": "Arithmetic overflow"
        }
    ],
    "types": [
        {
            "name": "CompanyAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "company_id",
                        "type": "u64"
                    },
                    {
                        "name": "company_admin",
                        "type": "pubkey"
                    },
                    {
                        "name": "cusd",
                        "type": {
                            "defined": {
                                "name": "Euint128"
                            }
                        }
                    },
                    {
                        "name": "shares_available",
                        "type": "u64"
                    },
                    {
                        "name": "price_per_share",
                        "type": "u64"
                    },
                    {
                        "name": "active",
                        "type": "bool"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "Euint128",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "inner",
                        "type": "u128"
                    }
                ]
            }
        },
        {
            "name": "GlobalProgramVault",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "usdc_token_account",
                        "type": "pubkey"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "InvestorVault",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "owner",
                        "type": "pubkey"
                    },
                    {
                        "name": "cusd",
                        "type": {
                            "defined": {
                                "name": "Euint128"
                            }
                        }
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "PositionAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "owner",
                        "type": "pubkey"
                    },
                    {
                        "name": "company_id",
                        "type": "u64"
                    },
                    {
                        "name": "encrypted_shares",
                        "type": {
                            "defined": {
                                "name": "Euint128"
                            }
                        }
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        }
    ]
} as const;
