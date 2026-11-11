#!/usr/bin/env python3
"""Local structure/link/source checks. Not a full Agent Skills certification or SEO evaluator."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import unquote

ROOT=Path(__file__).resolve().parents[1]


def anchors(text: str) -> set[str]:
    explicit=set(re.findall(r'<a\s+id=[\'"]([^\'"]+)[\'"]',text))
    for heading in re.findall(r'^#{1,6}\s+(.+?)\s*#*$',text,flags=re.M):
        slug=re.sub(r'[^\w\- ]','',heading.lower()).replace(' ','-')
        explicit.add(slug)
    return explicit


def validate(root: Path=ROOT) -> dict:
    errors=[]; checks={}; root=root.resolve()
    try: manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
    except (OSError,ValueError) as e: return {'passed':False,'errors':[f'Manifest: {e}'],'checks':{}}
    records=json.loads((root/'references/sources.json').read_text(encoding='utf-8'))['sources']
    source_ids={s['id'] for s in records}
    if len(source_ids)!=len(records): errors.append('Duplicate source IDs.')
    skills=[root/'SKILL.md']+[root/m['path'] for m in manifest['modules']]
    declared_names=set()
    for p in skills:
        if not p.is_file(): errors.append(f'Missing skill {p}'); continue
        text=p.read_text(encoding='utf-8')
        fm=re.match(r'^---\n(.*?)\n---\n',text,re.S)
        if not fm: errors.append(f'Missing YAML frontmatter: {p.relative_to(root)}'); continue
        name_match=re.search(r'^name:\s*([a-z0-9-]+)\s*$',fm[1],re.M)
        desc_match=re.search(r'^description:\s*(.+)$',fm[1],re.M)
        if not name_match: errors.append(f'Invalid/missing name: {p.relative_to(root)}'); continue
        name=name_match[1]
        if not 1<=len(name)<=64 or name.startswith('-') or name.endswith('-') or '--' in name:
            errors.append('Invalid skill name: '+name)
        if name!=p.parent.name: errors.append(f'Folder/name mismatch: {p.relative_to(root)}')
        if name in declared_names: errors.append('Duplicate skill name: '+name)
        declared_names.add(name)
        if not desc_match: errors.append('Missing description: '+name)
        else:
            try: desc=json.loads(desc_match[1]) if desc_match[1].startswith('"') else desc_match[1].strip()
            except ValueError: desc=''
            if not isinstance(desc,str) or not 1<=len(desc)<=1024: errors.append('Invalid description: '+name)
    for m in manifest['modules']:
        if m['name'] not in declared_names: errors.append('Manifest name mismatch: '+m['name'])
        for sid in m['source_ids']:
            if sid not in source_ids: errors.append(f'Unresolved source {sid} in {m["name"]}')
    checks['skill_files']=len(skills); checks['specialist_modules']=len(manifest['modules'])
    if len(skills)!=manifest['skill_count']: errors.append('Manifest skill_count mismatch.')
    if len(manifest['modules'])!=manifest['specialist_module_count']: errors.append('Manifest specialist_module_count mismatch.')
    checks['source_records']=len(records)
    checks['reviewed_source_records']=sum(s['review_status']=='reviewed' for s in records)
    json_count=0
    for p in root.rglob('*.json'):
        try: json.loads(p.read_text(encoding='utf-8')); json_count+=1
        except (OSError,ValueError) as e: errors.append(f'JSON {p.relative_to(root)}: {e}')
    checks['json_files_parsed']=json_count
    py_count=0
    for p in root.rglob('*.py'):
        try: compile(p.read_text(encoding='utf-8'),str(p),'exec'); py_count+=1
        except (OSError,SyntaxError) as e: errors.append(f'Python {p.relative_to(root)}: {e}')
    checks['python_files_compiled']=py_count
    local_count=0
    for p in root.rglob('*.md'):
        text=p.read_text(encoding='utf-8')
        for match in re.finditer(r'(?<!!)\[[^\]]*\]\(([^)]+)\)',text):
            dest=match[1].split(' "',1)[0]
            if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:',dest): continue
            pathpart,_,fragment=dest.partition('#')
            q=(p.parent/unquote(pathpart)).resolve() if pathpart else p
            if root not in (q,*q.parents): errors.append(f'Link escapes bundle: {p.relative_to(root)} -> {dest}'); continue
            local_count+=1
            if not q.exists(): errors.append(f'Broken link: {p.relative_to(root)} -> {dest}'); continue
            if fragment and q.is_file() and q.suffix=='.md' and unquote(fragment) not in anchors(q.read_text(encoding='utf-8')):
                errors.append(f'Broken anchor: {p.relative_to(root)} -> {dest}')
    checks['local_markdown_links_checked']=local_count
    checksum=root/'CHECKSUMS.sha256'
    checked=0
    if checksum.exists():
        for line in checksum.read_text().splitlines():
            try: digest,rel=line.split('  ',1)
            except ValueError: errors.append('Malformed checksum line.'); continue
            p=(root/rel).resolve()
            if root not in p.parents or not p.is_file(): errors.append('Invalid checksum target: '+rel); continue
            if hashlib.sha256(p.read_bytes()).hexdigest()!=digest: errors.append('Checksum mismatch: '+rel)
            checked+=1
        expected={str(p.relative_to(root)) for p in root.rglob('*') if p.is_file() and p!=checksum and '__pycache__' not in p.parts and p.suffix!='.pyc'}
        listed={line.split('  ',1)[1] for line in checksum.read_text().splitlines() if '  ' in line}
        if expected!=listed: errors.append('Checksum inventory mismatch.')
    checks['checksums_verified']=checked
    return {'passed':not errors,'errors':errors,'checks':checks,
            'not_assessed':['external agent behavior','live Google feature validation','live site behavior','complete YAML/Agent Skills specification certification']}


def main(argv: list[str] | None=None) -> int:
    ap=argparse.ArgumentParser(description=__doc__); ap.add_argument('--root',type=Path,default=ROOT)
    args=ap.parse_args(argv)
    try: report=validate(args.root)
    except (OSError,ValueError,KeyError,TypeError) as e: report={'passed':False,'errors':[str(e)]}
    print(json.dumps(report,indent=2)); return 0 if report['passed'] else 1

if __name__=='__main__': raise SystemExit(main())
