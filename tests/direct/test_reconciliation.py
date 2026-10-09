import ast
import hashlib
import itertools
import json
import re
from pathlib import Path
import pytest

ROOT=Path(__file__).resolve().parents[2]
REPO='mohammadisina1988-jpg/remittance-kernel'
EXPECTED=json.loads((ROOT/'config/expected.json').read_text())
BODY={name:(ROOT/'records'/f'{name}.json').read_bytes() for name in EXPECTED}

def source(name,body=None):
    return f'https://raw.githubusercontent.com/{REPO}/{"a"*40}/records/{name}.json',hashlib.sha256(BODY[name] if body is None else body).hexdigest()

def report(name):
    return {'entries':json.loads(json.dumps(EXPECTED[name]['entries']))}

def mock(vm,name,leader=None,own=None,body=None):
    vm.clear_mocks()
    vm.mock_web(re.escape(source(name)[0]),{'status':200,'body':BODY[name] if body is None else body})
    vm.mock_llm(r'.*REMITTANCE-LEADER.*',json.dumps(report(name) if leader is None else leader))
    vm.mock_llm(r'.*REMITTANCE-VALIDATOR.*',json.dumps(report(name) if own is None else own))

@pytest.fixture
def kernel(direct_deploy):
    return direct_deploy(str(ROOT/'contracts/remittance_kernel.py'),REPO,'Harbor Workshop','Cedar Tools')

def run(c,vm,name):
    mock(vm,name);c.reconcile_batch(*source(name))
    return c.get_state()['batches'][-1]['result']

@pytest.mark.parametrize('name',list(EXPECTED))
def test_cases_and_consumption(kernel,direct_vm,name):
    result=run(kernel,direct_vm,name)
    assert result['status']==EXPECTED[name]['status']
    for entry in EXPECTED[name]['entries']:
        assert kernel.is_consumed(entry['id'])==(name=='combined' and entry['role'] in ('INVOICE','PAYMENT'))
    if name=='combined':
        assert result['allocations']==[[{'payment':'C-P1','invoices':['C-I1','C-I2']},{'payment':'C-P2','invoices':['C-I3']}]]
    if name=='ambiguous':
        assert len(result['allocations'])==2 and result['allocations'][0]!=result['allocations'][1]
    assert direct_vm.run_validator() is True

@pytest.mark.parametrize('field,value',[('cents',9999),('allowed',None),('role','UNKNOWN')])
def test_validator_exact_consequential_fields(kernel,direct_vm,field,value):
    run(kernel,direct_vm,'combined')
    own=report('combined');own['entries'][3][field]=value
    if field=='role':own['entries'][3].update(cents=None,allowed=None)
    mock(direct_vm,'combined',own=own)
    assert direct_vm.run_validator() is False

def test_validator_negative_and_unknown_decisions(kernel,direct_vm):
    run(kernel,direct_vm,'review')
    own=report('review');own['entries'][1].update(role='PAYMENT',cents=5000)
    mock(direct_vm,'review',own=own)
    assert direct_vm.run_validator() is False

def test_validator_refetches_bytes(kernel,direct_vm):
    run(kernel,direct_vm,'combined');mock(direct_vm,'combined',body=BODY['combined']+b' ')
    assert direct_vm.run_validator() is False

@pytest.mark.parametrize('kind',['bool','fraction','reordered','missing','negative','duplicate-allowed','unknown-amount'])
def test_malformed_extraction_atomic(kernel,direct_vm,kind):
    bad=report('combined')
    if kind=='bool':bad['entries'][0]['cents']=True
    if kind=='fraction':bad['entries'][0]['cents']=4000.5
    if kind=='reordered':bad['entries'].reverse()
    if kind=='missing':bad['entries'].pop()
    if kind=='negative':bad['entries'][0]['cents']=-1
    if kind=='duplicate-allowed':bad['entries'][3]['allowed']=['C-I1','C-I1']
    if kind=='unknown-amount':bad['entries'][0]['role']='UNKNOWN'
    mock(direct_vm,'combined',leader=bad)
    with direct_vm.expect_revert():kernel.reconcile_batch(*source('combined'))
    assert kernel.get_state()['batches']==[] and not kernel.is_consumed('C-I1')

def test_source_replay_rejected(kernel,direct_vm):
    run(kernel,direct_vm,'combined')
    with direct_vm.expect_revert('already processed'):kernel.reconcile_batch(*source('combined'))

def test_document_reuse_different_commit_rejected(kernel,direct_vm):
    run(kernel,direct_vm,'combined')
    body=BODY['combined']+b'\n';mock(direct_vm,'combined',body=body)
    with direct_vm.expect_revert('already reconciled'):kernel.reconcile_batch(*source('combined',body))
    assert len(kernel.get_state()['batches'])==1

def test_ambiguity_does_not_consume_and_new_evidence_can_resolve(kernel,direct_vm):
    run(kernel,direct_vm,'ambiguous')
    data=json.loads(BODY['ambiguous']);data['entries'][2]['text']+=' It settles only invoice A-I1.'
    body=json.dumps(data).encode();fixed=report('ambiguous');fixed['entries'][2]['allowed']=['A-I1']
    mock(direct_vm,'ambiguous',leader=fixed,own=fixed,body=body)
    kernel.reconcile_batch(*source('ambiguous',body))
    assert kernel.get_state()['batches'][-1]['result']['status']=='UNIQUE'
    assert kernel.is_consumed('A-I1') and kernel.is_consumed('A-P2')

@pytest.mark.parametrize('replacement',['main','b'*39])
def test_unpinned_source(kernel,direct_vm,replacement):
    url,sha=source('combined')
    with direct_vm.expect_revert('Commit-pinned'):kernel.reconcile_batch(url.replace('a'*40,replacement),sha)

def test_source_hash_mismatch(kernel,direct_vm):
    mock(direct_vm,'combined',body=BODY['combined']+b' ')
    with direct_vm.expect_revert('commitment mismatch'):kernel.reconcile_batch(*source('combined'))

@pytest.mark.parametrize('kind',['duplicate-key','duplicate-id','too-many'])
def test_invalid_source(kernel,direct_vm,kind):
    data=json.loads(BODY['combined'])
    if kind=='duplicate-id':data['entries'][1]['id']=data['entries'][0]['id']
    if kind=='too-many':data['entries']*=2
    body=json.dumps(data).encode()
    if kind=='duplicate-key':body=body.replace(b'"batch":',b'"batch":"bad","batch":')
    mock(direct_vm,'combined',body=body)
    with direct_vm.expect_revert():kernel.reconcile_batch(*source('combined',body))

def pure_solver():
    tree=ast.parse((ROOT/'contracts/remittance_kernel.py').read_text())
    ns={}
    exec(compile(ast.Module(body=[x for x in tree.body if isinstance(x,ast.FunctionDef) and x.name=='reconcile'],type_ignores=[]),'solver','exec'),ns)
    return ns['reconcile']

def independent_partitions(invoices,payments):
    valid=[]
    for assignment in itertools.product(range(len(payments)),repeat=len(invoices)):
        if all(sum(x['cents'] for i,x in enumerate(invoices) if assignment[i]==j)==payment['cents'] and all(payment['allowed'] is None or x['id'] in payment['allowed'] for i,x in enumerate(invoices) if assignment[i]==j) for j,payment in enumerate(payments)):
            valid.append(tuple(tuple(x['id'] for i,x in enumerate(invoices) if assignment[i]==j) for j in range(len(payments))))
    return valid

def test_exhaustive_amount_and_restriction_domain():
    solve=pure_solver()
    for amounts in itertools.product(range(1,4),repeat=5):
        invoices=[{'id':f'I{i}','role':'INVOICE','cents':x,'allowed':None} for i,x in enumerate(amounts[:3])]
        for restricted in (False,True):
            payments=[{'id':f'P{i}','role':'PAYMENT','cents':x,'allowed':['I0','I1'] if restricted and i==0 else None} for i,x in enumerate(amounts[3:])]
            result=solve(invoices+payments);valid=independent_partitions(invoices,payments)
            expected='UNBALANCED' if sum(amounts[:3])!=sum(amounts[3:]) else 'UNMATCHABLE' if not valid else 'UNIQUE' if len(valid)==1 else 'AMBIGUOUS'
            assert result['status']==expected
            assert len(result['allocations'])==min(2,len(valid))
            for solution in result['allocations']:
                assert tuple(tuple(row['invoices']) for row in solution) in valid

def test_empty_and_unknown_fail_closed():
    solve=pure_solver()
    assert solve([{'id':'D','role':'IGNORE','cents':None,'allowed':None}])['status']=='EMPTY'
    assert solve([{'id':'D','role':'UNKNOWN','cents':None,'allowed':None}])['status']=='REVIEW'
