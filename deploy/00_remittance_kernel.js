const fs=require('node:fs'),path=require('node:path');
module.exports=async function deployRemittanceKernel(client){
 const policy=JSON.parse(fs.readFileSync(path.join(__dirname,'../config/policy.json'),'utf8'));
 const code=fs.readFileSync(path.join(__dirname,'../contracts/remittance_kernel.py'),'utf8');
 if(process.env.REMITTANCE_RESUME_HASH && !/^0x[0-9a-f]{64}$/i.test(process.env.REMITTANCE_RESUME_HASH))throw Error('Invalid resume hash');
 const hash=process.env.REMITTANCE_RESUME_HASH || await client.deployContract({code,args:[policy.source_repository,policy.buyer,policy.supplier],leaderOnly:false});
 console.log('Deployment Transaction Hash:',hash);
 const r=await client.waitForTransactionReceipt({hash,retries:300,interval:3000,status:'FINALIZED'});
 const execution=r.consensus_data?.leader_receipt?.[0]?.execution_result ?? r.txExecutionResultName;
 if((r.status_name||r.statusName||r.status)!=='FINALIZED' || !['SUCCESS','FINISHED_WITH_RETURN'].includes(execution))throw Error('Deployment failed: '+execution);
 const address=r.data?.contract_address ?? r.txDataDecoded?.contractAddress;
 if(!/^0x[0-9a-f]{40}$/i.test(address||''))throw Error('Missing deployment address');
 console.log('Result:',{'Transaction Hash':hash,'Contract Address':address});
};
