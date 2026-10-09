// Independent oracle enumerates invoice-to-payment assignments, not subset masks.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'proofs',name+'.json')));
const canonical=v=>JSON.stringify(v,(_,x)=>x&&!Array.isArray(x)&&typeof x==='object'?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const same=(a,b)=>assert.equal(canonical(a),canonical(b));
const expected=JSON.parse(fs.readFileSync(path.join(root,'config/expected.json')));
function solve(entries){
 const invoices=entries.filter(x=>x.role==='INVOICE'),payments=entries.filter(x=>x.role==='PAYMENT');
 if(entries.some(x=>x.role==='UNKNOWN'))return {status:'REVIEW',invoice_total:null,payment_total:null,allocations:[]};
 const invoice_total=invoices.reduce((n,x)=>n+x.cents,0),payment_total=payments.reduce((n,x)=>n+x.cents,0);
 const base={invoice_total,payment_total};
 if(!invoices.length||!payments.length)return {...base,status:'EMPTY',allocations:[]};
 if(invoice_total!==payment_total)return {...base,status:'UNBALANCED',allocations:[]};
 const valid=[];
 for(let code=0;code<payments.length**invoices.length;code++){
  let digits=code;const groups=payments.map(()=>[]);
  for(const invoice of invoices){groups[digits%payments.length].push(invoice);digits=Math.floor(digits/payments.length);}
  if(groups.every((group,j)=>group.reduce((n,x)=>n+x.cents,0)===payments[j].cents && group.every(x=>payments[j].allowed===null||payments[j].allowed.includes(x.id))))valid.push(groups.map((group,j)=>({payment:payments[j].id,invoices:group.map(x=>x.id)})));
 }
 return {...base,status:valid.length===0?'UNMATCHABLE':valid.length===1?'UNIQUE':'AMBIGUOUS',allocations:valid};
}
const m=read('deployment');
assert.equal(m.chain_id,61999);assert.equal(m.network,'studionet');assert.equal(m.exact_source_match,true);
assert.equal(m.source_sha256,hash(fs.readFileSync(path.join(root,'contracts/remittance_kernel.py'))));
assert.equal(m.fixture_revision,fs.readFileSync(path.join(root,'config/fixture-revision.txt'),'utf8').trim());
assert.equal(m.transactions.length,6);
let previous=[];const consumed=new Set();
for(const [index,tx] of m.transactions.entries()){
 const receipt=read(tx.label+'-receipt');assert.equal(receipt.hash,tx.hash);
 assert.equal(receipt.status_name||receipt.statusName,'FINALIZED');assert.equal(receipt.result_name,'MAJORITY_AGREE');
 assert.ok(['SUCCESS','FINISHED_WITH_RETURN'].includes(receipt.txExecutionResultName||receipt.consensus_data?.leader_receipt?.[0]?.execution_result));
 const votes=Object.values(receipt.consensus_data.votes);assert.ok(votes.filter(v=>v==='agree').length>votes.length/2);
 if(tx.action==='deploy')continue;
 assert.equal(tx.action,'reconcile_batch');assert.equal(receipt.to_address.toLowerCase(),m.contract_address.toLowerCase());
 const proof=read(tx.label),state=proof.state,batch=state.batches.at(-1);
 assert.equal(proof.transaction.hash,tx.hash);assert.equal(proof.contract_address,m.contract_address);assert.equal(proof.source_sha256,m.source_sha256);
 assert.equal(state.publisher,'mohammadisina1988-jpg/remittance-kernel');assert.equal(state.buyer,'Harbor Workshop');assert.equal(state.supplier,'Cedar Tools');
 assert.equal(state.batches.length,index);same(state.batches.slice(0,-1),previous);previous=state.batches;
 const body=fs.readFileSync(path.join(root,'records',tx.label+'.json'));
 same(batch.document,JSON.parse(body));assert.equal(batch.sha256,hash(body));assert.equal(batch.sha256,m.sources[tx.label].sha256);
 assert.equal(batch.url,`https://raw.githubusercontent.com/mohammadisina1988-jpg/remittance-kernel/${m.fixture_revision}/records/${tx.label}.json`);
 assert.ok(receipt.data.calldata.readable.includes(batch.url));assert.ok(receipt.data.calldata.readable.includes(batch.sha256));
 same(batch.entries,expected[tx.label].entries);
 const oracle=solve(batch.entries);assert.equal(batch.result.status,oracle.status);assert.equal(oracle.status,expected[tx.label].status);
 assert.equal(batch.result.invoice_total,oracle.invoice_total);assert.equal(batch.result.payment_total,oracle.payment_total);
 assert.equal(batch.result.allocations.length,Math.min(2,oracle.allocations.length));
 const witnesses=batch.result.allocations.map(canonical);assert.equal(new Set(witnesses).size,witnesses.length);
 for(const solution of batch.result.allocations)assert.ok(oracle.allocations.some(x=>canonical(x)===canonical(solution)));
 if(oracle.status==='UNIQUE')batch.entries.filter(x=>['INVOICE','PAYMENT'].includes(x.role)).forEach(x=>consumed.add(x.id));
 for(const [id,value] of Object.entries(proof.consumed))assert.equal(value,consumed.has(id));
 for(const entry of batch.entries)assert.ok(Object.hasOwn(proof.consumed,entry.id));
}
console.log('Verified deployment and five finalized scenario receipts, exact extractions, independent allocation witnesses and consumption reads.');
