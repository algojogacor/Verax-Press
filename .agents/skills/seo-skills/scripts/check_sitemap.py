#!/usr/bin/env python3
"""Bounded local XML sitemap checks; no network, no external entities, no indexing verdict."""
from __future__ import annotations
import argparse
from datetime import date, datetime
import gzip
import json
from pathlib import Path
import sys
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

MAX_BYTES=52_428_800
MAX_ENTRIES=50_000
NS='http://www.sitemaps.org/schemas/sitemap/0.9'

def local(tag: str) -> str: return tag.rsplit('}',1)[-1]

def is_http_url(value: str) -> bool:
    try:
        p=urlsplit(value)
        _ = p.port  # Validate any explicit port.
        return p.scheme in ('http','https') and bool(p.hostname) and p.username is None and p.password is None and not any(c.isspace() for c in value)
    except ValueError: return False

def valid_lastmod(value: str) -> bool:
    try:
        if len(value)==10: date.fromisoformat(value)
        else: datetime.fromisoformat(value.replace('Z','+00:00'))
        return True
    except ValueError: return False

def inspect_bytes(raw: bytes, max_entries: int=MAX_ENTRIES, max_bytes: int=MAX_BYTES) -> dict:
    errors=[]; warnings=[]
    result={'analysis_type':'local_sitemap_structure','valid_basic_structure':False,'root_type':None,
            'uncompressed_bytes':len(raw),'entry_count':0,'duplicate_count':0,'errors':errors,'warnings':warnings,
            'not_assessed':['URL responses','canonical or indexing state','submission scope','extension-specific schemas','actual Google processing']}
    if len(raw)>max_bytes:
        errors.append('Uncompressed sitemap exceeds the configured byte limit.'); return result
    # XML could be UTF-16: remove NUL bytes for conservative declaration detection as well.
    scan=raw.replace(b'\x00',b'').upper()
    if b'<!DOCTYPE' in scan or b'<!ENTITY' in scan:
        errors.append('DTD and entity declarations are not accepted.'); return result
    try: root=ET.fromstring(raw)
    except (ET.ParseError, ValueError, RecursionError) as e:
        errors.append('Invalid XML: '+str(e)); return result
    typ=local(root.tag); result['root_type']=typ
    if typ not in ('urlset','sitemapindex'):
        errors.append('Root must be urlset or sitemapindex.'); return result
    namespace=root.tag[1:].split('}')[0] if root.tag.startswith('{') else ''
    if namespace != NS: errors.append('The standard sitemap namespace is missing or incorrect.')
    entry_type='url' if typ=='urlset' else 'sitemap'
    entries=[c for c in root if local(c.tag)==entry_type]
    result['entry_count']=len(entries)
    if not entries: warnings.append('No entries found; confirm this is intentional.')
    if len(entries)>max_entries: errors.append(f'Entry count exceeds {max_entries}.')
    seen=set(); duplicate_examples=[]
    for i,item in enumerate(entries,1):
        if item.tag != f'{{{NS}}}{entry_type}': errors.append(f'Entry {i}: incorrect namespace.')
        locs=[c for c in item if c.tag==f'{{{NS}}}loc']
        if len(locs)!=1:
            errors.append(f'Entry {i}: expected exactly one direct sitemap loc.'); continue
        value=(locs[0].text or '').strip()
        if not is_http_url(value): errors.append(f'Entry {i}: loc must be an absolute HTTP(S) URL without credentials or whitespace.')
        elif urlsplit(value).fragment: warnings.append(f'Entry {i}: loc contains a fragment; review the intended canonical URL.')
        if value in seen:
            result['duplicate_count']+=1
            if len(duplicate_examples)<5: duplicate_examples.append(value)
        seen.add(value)
        dates=[c for c in item if c.tag==f'{{{NS}}}lastmod']
        if len(dates)>1: errors.append(f'Entry {i}: multiple lastmod elements.')
        if dates and not valid_lastmod((dates[0].text or '').strip()): warnings.append(f'Entry {i}: lastmod is not recognised as an ISO date/datetime.')
    if duplicate_examples: warnings.append('Duplicate loc examples: '+', '.join(duplicate_examples))
    if any(local(c.tag)!=entry_type for c in root): warnings.append('Unexpected root-level elements exist; inspect the exact schema.')
    result['valid_basic_structure']=not errors
    return result

def inspect_file(path: Path, max_bytes: int=MAX_BYTES) -> dict:
    if max_bytes<1: raise ValueError('max_bytes must be positive')
    with path.open('rb') as f: magic=f.read(2)
    opener=gzip.open if magic==b'\x1f\x8b' else open
    with opener(path,'rb') as f: raw=f.read(max_bytes+1)
    return inspect_bytes(raw,max_bytes=max_bytes)

def main(argv: list[str] | None=None) -> int:
    ap=argparse.ArgumentParser(description=__doc__); ap.add_argument('sitemap',type=Path)
    args=ap.parse_args(argv)
    try: report=inspect_file(args.sitemap)
    except (OSError,EOFError,ValueError) as e:
        print(json.dumps({'error':str(e)}),file=sys.stderr); return 2
    print(json.dumps(report,indent=2,ensure_ascii=False)); return 0 if report['valid_basic_structure'] else 2

if __name__=='__main__': raise SystemExit(main())
