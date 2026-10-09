# Initial format rejection

The initial deployment at `0x5663aC1240D5e221beC5b9f4A930752BE3fbFe66` succeeded: [deployment](https://explorer-studio.genlayer.com/tx/0xb60e521854b639839064640bb09cc3de10743727d6e3511d2c8555ea86d34bdf).

[The first scenario](https://explorer-studio.genlayer.com/tx/0xa4acb0910e7ee7924298bc70197fdad561f2fbe55f44b3e7d9adbe9c9921a8a7) finalized with MAJORITY_DISAGREE and ERROR. Both recorded leader rounds rolled back with `[LLM_ERROR] Extraction entry`. It is not an accepted functional proof and changed no reconciliation state. A subsequent workflow recovered this exact hash after the CLI's RPC polling returned HTML; it did not duplicate the write.

The receipt omitted the raw malformed model response, so its precise formatting defect cannot be proven. The revised parser handles source-keyed entry ordering, bounded explanation metadata, enum casing, exact integer strings and explicit UNKNOWN/IGNORE omitted null fields. All material amounts, roles and payment restrictions remain independently re-derived and compared exactly. A payment still must explicitly provide its restriction decision. The revised code must be deployed at a new address; these receipts retain the original source snapshot for audit.
