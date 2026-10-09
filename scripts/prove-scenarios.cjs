const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const cli = process.env.GENLAYER_CLI_PATH;
const passwordFile = process.env.REMITTANCE_PASSWORD_FILE;
const account = process.env.REMITTANCE_ACCOUNT;
const address = process.env.REMITTANCE_DEPLOYER_ADDRESS;
if (!cli || !fs.existsSync(cli) || !passwordFile || !fs.existsSync(passwordFile) || !account || !/^0x[0-9a-f]{40}$/i.test(address || '')) throw Error('Set GENLAYER_CLI_PATH, REMITTANCE_PASSWORD_FILE, REMITTANCE_ACCOUNT and REMITTANCE_DEPLOYER_ADDRESS.');
const password = fs.readFileSync(passwordFile, 'utf8').trim();
const hook = path.join(__dirname, 'cli-config.cjs');
const source = fs.readFileSync(path.join(root, 'contracts/remittance_kernel.py'));
const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
const revision = fs.readFileSync(path.join(root, 'config/fixture-revision.txt'), 'utf8').trim();
const repo = 'mohammadisina1988-jpg/remittance-kernel';
const journal = path.join(root, '.proof-journal/studionet');
const proofs = path.join(root, 'proofs');
fs.mkdirSync(journal, { recursive: true });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value,(_,item)=>item && !Array.isArray(item) && typeof item==='object' ? Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])) : item);
const equal = (a,b)=>canonical(a)===canonical(b);
const expected=JSON.parse(fs.readFileSync(path.join(root,'config/expected.json'),'utf8'));

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'node_config') continue;
    result[key] = /private.?key|api.?key|password|secret|authorization/i.test(key) ? 'REDACTED' : sanitize(item);
  }
  return result;
}
function save(name, value) { fs.writeFileSync(path.join(proofs, name + '.json'), JSON.stringify(sanitize(value), null, 2) + '\n'); }
function result(output) {
  const start = output.indexOf('Result:');
  if (start < 0) throw Error('CLI result missing: ' + output.slice(-300));
  return JSON.parse(output.slice(start + 7).trim());
}
function invoke(label, args, overrides = {}) {
  const file = path.join(journal, label + '.json');
  const prior = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  if (prior.complete && (!['receipt', 'call'].includes(args[0]) || prior.stdout.includes('Result:'))) return Promise.resolve(prior.stdout);
  if (prior.hash && args[0] === 'write') return Promise.resolve('Write Transaction Hash: ' + prior.hash);
  if (prior.hash && args[0] === 'deploy') overrides.REMITTANCE_RESUME_HASH = prior.hash;
  console.log('RUN', label);
  return new Promise((resolve, reject) => {
    const child = cp.spawn(process.execPath, ['--require', hook, cli, ...args], {
      cwd: root, windowsHide: true,
      env: { ...process.env, NO_COLOR: '1', REMITTANCE_ACCOUNT: account, ...overrides },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin.end(password + '\n');
    let stdout = '', stderr = '', hash = prior.hash;
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      const found = stdout.match(/(?:Deployment|Write) Transaction Hash:\s*(0x[0-9a-f]{64})/i)?.[1];
      if (found && found !== hash) {
        hash = found;
        fs.writeFileSync(file, JSON.stringify({ hash, complete: false }));
        console.log('SUBMITTED', label, hash);
      }
    });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      fs.writeFileSync(file, JSON.stringify({ hash, complete: code === 0, stdout, stderr }));
      if (code) reject(Error(label + ': ' + stderr.slice(-1200)));
      else resolve(stdout);
    });
  });
}
async function receipt(label, hash) {
  let output;
  for(let attempt=0;attempt<3;attempt++){
    try { output=await invoke(label+'-receipt',['receipt',hash,'--retries','300','--interval','4000']); break; }
    catch(error){ if(attempt===2) throw error; await new Promise(resolve=>setTimeout(resolve,20000)); }
  }
  const data = result(output);
  save(label + '-receipt', data);
  const status = data.statusName || data.status_name;
  const execution = data.txExecutionResultName || data.consensus_data?.leader_receipt?.[0]?.execution_result;
  if (status !== 'FINALIZED' || data.result_name !== 'MAJORITY_AGREE' || !['SUCCESS', 'FINISHED_WITH_RETURN'].includes(execution)) throw Error(label + ': ' + status + '/' + data.result_name + '/' + execution);
  console.log('FINALIZED', label, hash, execution);
  return data;
}
async function writeBeforeSubmission(label,args){
  for(let attempt=0;attempt<3;attempt++){
    try{return await invoke(label,args);}
    catch(error){
      const saved=JSON.parse(fs.readFileSync(path.join(journal,label+'.json'),'utf8'));
      const message=(saved.stdout||'')+'\n'+(saved.stderr||'');
      // Once a hash exists, recover its receipt; never send the write again.
      if(saved.hash)return 'Write Transaction Hash: '+saved.hash;
      // eth_gasPrice is read before signing; never retry submission errors.
      if(!/eth_gasPrice/.test(message) || attempt===2)throw error;
      console.log('PRE-SIGN RPC RETRY',label);
      await new Promise(resolve=>setTimeout(resolve,30000));
    }
  }
}
async function rpc(method, params) {
  if(!['eth_chainId','gen_getContractCode'].includes(method))throw Error('Read-only RPC helper');
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response = await fetch('https://studio.genlayer.com/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(30000) });
      const data = await response.json();
      if (!response.ok || data.error) throw Error(JSON.stringify(data.error || response.status));
      return data.result;
    }catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,15000));}
  }
}
async function invokeRead(label,args){
  if(!['call','code'].includes(args[0]))throw Error('Read-only CLI helper');
  for(let attempt=0;attempt<3;attempt++){
    try{return await invoke(label,args);}
    catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,15000));}
  }
}

(async()=>{
  if(await rpc('eth_chainId',[])!=='0xf22f') throw Error('Unexpected chain ID');
  const sources={};
  for(const name of Object.keys(expected)) {
    const body=fs.readFileSync(path.join(root,'records',name+'.json'));
    const url=`https://raw.githubusercontent.com/${repo}/${revision}/records/${name}.json`;
    const upstream=await fetch(url);
    if(!upstream.ok || !body.equals(Buffer.from(await upstream.arrayBuffer()))) throw Error('Fixture mismatch '+name);
    sources[name]={url,sha256:digest(body)};
  }
  const deployed=result(await invoke('pool-deploy',['deploy']));
  const contract=deployed['Contract Address'], deployHash=deployed['Transaction Hash'];
  const deployedCode=Buffer.from(await rpc('gen_getContractCode',[contract]),'base64');
  if(!source.equals(deployedCode))throw Error('Existing deployed source mismatch');
  await receipt('pool-deploy',deployHash);
  const transactions=[{label:'pool-deploy',action:'deploy',hash:deployHash}];
  const steps=Object.keys(expected).map(name=>({name,method:'reconcile_batch',source:name}));
  const initialState=result(await invokeRead('initial-state',['call',contract,'get_state']));
  const resumedFirstHash=process.env.REMITTANCE_RESUME_COMBINED_HASH;
  if(resumedFirstHash && !/^0x[0-9a-f]{64}$/i.test(resumedFirstHash))throw Error('Invalid combined resume hash');
  if(resumedFirstHash && initialState.batches.length>1)throw Error('Resume input requires at most the first scenario already recorded');
  for(const step of steps) {
    const cachedPath=path.join(proofs,step.name+'.json');
    if(process.env.REMITTANCE_RESUME_HASH && fs.existsSync(cachedPath)){
      const cached=JSON.parse(fs.readFileSync(cachedPath,'utf8'));
      const accepted=JSON.parse(fs.readFileSync(path.join(proofs,step.name+'-receipt.json'),'utf8'));
      const index=transactions.length-1;
      if(cached.contract_address!==contract || cached.source_sha256!==sourceHash || cached.transaction.hash!==accepted.hash || accepted.result_name!=='MAJORITY_AGREE' || (accepted.statusName||accepted.status_name)!=='FINALIZED' || !equal(initialState.batches[index],cached.state.batches[index]) || initialState.batches[index]?.sha256!==sources[step.source].sha256)throw Error('Unsafe cached proof resume '+step.name);
      transactions.push(cached.transaction);
      console.log('REUSED VERIFIED RECEIPT',step.name,cached.transaction.hash);
      continue;
    }
    // Leave room for receipt polls and shared gateway rate limits.
    await new Promise(resolve=>setTimeout(resolve,15000));
    const args=step.source ? ['--args',sources[step.source].url,sources[step.source].sha256] : [];
    const output=step.name==='combined' && resumedFirstHash ? 'Write Transaction Hash: '+resumedFirstHash : await writeBeforeSubmission(step.name,['write',contract,step.method,...args]);
    const hash=output.match(/Write Transaction Hash:\s*(0x[0-9a-f]{64})/i)?.[1];
    if(!hash) throw Error('Missing write hash');
    await receipt(step.name,hash);
    transactions.push({label:step.name,action:step.method,hash});
    const state=result(await invokeRead(step.name+'-state',['call',contract,'get_state']));
    const batch=state.batches.at(-1),target=expected[step.source];
    if(batch.sha256!==sources[step.source].sha256 || batch.result.status!==target.status || !equal(batch.entries,target.entries)) throw Error('Unexpected reconciliation: '+JSON.stringify(state));
    const consumed={};
    for(const priorBatch of state.batches)for(const entry of priorBatch.entries){
      if(!Object.hasOwn(consumed,entry.id)){
        await new Promise(resolve=>setTimeout(resolve,3500));
        consumed[entry.id]=result(await invokeRead(step.name+'-consumed-'+entry.id,['call',contract,'is_consumed','--args',entry.id]));
      }
    }
    save(step.name,{network:'studionet',chain_id:61999,contract_address:contract,source_sha256:sourceHash,fixture_revision:revision,transaction:transactions.at(-1),state,consumed});
    console.log('STATE VERIFIED',step.name);
  }
  const codeOutput=await invokeRead('pool-code',['code',contract]);
  const start=codeOutput.indexOf('# { "Depends":');
  if(start<0 || codeOutput.slice(start,start+source.length)!==source.toString()) throw Error('Deployed source mismatch');
  save('deployment',{network:'studionet',chain_id:61999,contract_address:contract,source_sha256:sourceHash,exact_source_match:true,fixture_revision:revision,sources,transactions});
  console.log('SOURCE VERIFIED',contract);
  cp.execFileSync(process.execPath,[path.join(__dirname,'verify-proofs.cjs')],{cwd:root,stdio:'inherit'});
})().catch(error=>{console.error(error.message);process.exitCode=1});
