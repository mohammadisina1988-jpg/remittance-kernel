# Deployment proofs

Network: **StudioNet**, chain **61999**, gasless development network.

Contract: **`0x0D955C282c1F6b718c642Ba0fEc6Db626020c385`**.

Deployed source matches [contracts/remittance_kernel.py](../contracts/remittance_kernel.py) byte-for-byte. SHA-256: `47419bff1924342096517c4748cf999f4c1b24994a60d03daa5f56853ed3ad18`. Fixtures are pinned to commit `cb68c573f66e91c13263386613a79417465e3f5f`; exact URLs and hashes are in [deployment.json](deployment.json).

| Case | Verified result | Transaction |
| --- | --- | --- |
| Deployment | Successful constructor | [Deploy](https://explorer-studio.genlayer.com/tx/0x60d76c6d578453ef715b4856e89c091aeba04daf5139c054ce192bef2c0b7590) |
| Bundled remittances | UNIQUE; five qualifying IDs consumed; forecast excluded | [Combined](https://explorer-studio.genlayer.com/tx/0x70eab29441daa8361a78e7e0403dff329c1ab5f7591f0e7417ec7eef647228e3) |
| Equal-value invoices | AMBIGUOUS; two distinct allocations; no consumption | [Ambiguous](https://explorer-studio.genlayer.com/tx/0x93a296429c592b9667344dfc4c06bff36e23a06105217517fdaf2bfb8d56b456) |
| Unequal totals | UNBALANCED; no consumption | [Unbalanced](https://explorer-studio.genlayer.com/tx/0xaec81cb962854ec805c6b4e5db98e20d9ff1fdc69b083f1d499ba823608a4955) |
| Illegible amount | REVIEW; no consumption | [Review](https://explorer-studio.genlayer.com/tx/0x4a85defebae1a3545b670b037dc8040b53fd8be81c7109d584d5a5ca10d818e7) |
| Binding invoice restriction | UNMATCHABLE despite equal totals; no consumption | [Restricted](https://explorer-studio.genlayer.com/tx/0x6fd5149b10e308da4d8eb98bdcb98c21e326e1efa53e4729591ec2f2cd77be15) |

All six receipts are FINALIZED with MAJORITY_AGREE and successful execution. Each scenario JSON preserves freshly read onchain state and consumption flags; each `*-receipt.json` preserves votes and execution output. Majority agreement does not mean unanimity: the combined receipt records two dissenting votes. Other receipts include IDLE votes after quorum cancellation.

[Successful CLI workflow](https://github.com/mohammadisina1988-jpg/remittance-kernel/actions/runs/38029527786). Run `node scripts/verify-proofs.cjs` to check source/fixture hashes, receipts, canonical extractions, state prefixes, independent allocation witnesses and consumption flags.

[Rejected earlier protocols](rejected/README.md) remain archived, including their source and failed receipts. They are not successful scenario proofs.

All fixtures are synthetic. This demonstrates documentary reconciliation under a trusted publisher's stable IDs, not physical delivery, bank-payment authenticity or money transfer. Uniqueness applies to the submitted closed batch.
