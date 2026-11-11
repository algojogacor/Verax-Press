#!/usr/bin/env python3
"""Transparent, local keyword routing; scores are neither confidence nor SEO ratings."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]

def tokens(text: str) -> set[str]: return set(re.findall(r'[a-z0-9]+',text.lower()))

def suggest(query: str, limit: int=4, root: Path=ROOT) -> list[dict]:
    manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
    q=tokens(query); scored=[]
    for m in manifest['modules']:
        tags=set(m['tags']); name=tokens(m['name']); title=tokens(m['title']); desc=tokens(m['description'])
        overlap=(tags|name|title|desc)&q
        score=6*len(q&tags)+3*len(q&name)+2*len(q&title)+len(q&desc)
        if score: scored.append((score,m['name'],m,overlap))
    scored.sort(key=lambda x:(-x[0],x[1]))
    if not scored:
        m=next(m for m in manifest['modules'] if m['name']=='gsearch-audit'); scored=[(0,m['name'],m,set())]
    return [{'name':m['name'],'path':m['path'],'routing_score':s,'matched_terms':sorted(overlap),'source_ids':m['source_ids']} for s,_,m,overlap in scored[:max(1,min(limit,6))]]

def main(argv: list[str] | None=None) -> int:
    ap=argparse.ArgumentParser(description=__doc__); ap.add_argument('query'); ap.add_argument('--limit',type=int,default=4)
    args=ap.parse_args(argv)
    print(json.dumps({'method':'deterministic keyword overlap; read root SKILL.md first','suggestions':suggest(args.query,args.limit)},indent=2)); return 0

if __name__=='__main__': raise SystemExit(main())
