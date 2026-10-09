# Omitted unrestricted decision

Deployment `0x8fA0F35FB22B9a0076d318F498a04d4DE33bd0ce` succeeded with MAJORITY_AGREE: [transaction](https://explorer-studio.genlayer.com/tx/0x72a74d68f7b563bcf46857b814a4c3b9823600a920d3db9bcb3a2230e0c02433).

[The combined case](https://explorer-studio.genlayer.com/tx/0xb10d026a421b124cc8a880bcd439c76af3925a292bd51edef35bd1513a6cdb2b) finalized MAJORITY_DISAGREE / ERROR. The recorded candidate correctly extracted positive amounts and the limited invoice list, but omitted all null-valued fields. Consequently the unrestricted `C-P2` lacked its required restriction decision. The leader rolled back with `[LLM_ERROR] Payment restriction decision required`; no allocation or consumption occurred.

The final protocol uses the mandatory non-null string UNRESTRICTED or LIMITED for every payment. Missing restriction still fails; unrestricted permission is never inferred from an omitted field. LIMITED also requires a nonempty invoice set. Both decisions are independently re-derived and compared through the normalized allowed set. The archived source and receipt document the failed version; they are not successful scenario proofs.
