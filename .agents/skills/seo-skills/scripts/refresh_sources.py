#!/usr/bin/env python3
"""Opt-in, report-only official documentation fetcher. Never rewrites skills or baselines."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, HTTPRedirectHandler, build_opener

ROOT=Path(__file__).resolve().parents[1]
MAX_BYTES=2*1024*1024
TIMEOUT=8


def safe_url(url: str) -> str:
    p=urlsplit(url)
    if p.scheme!='https' or p.username is not None or p.password is not None or p.port not in (None,443):
        raise ValueError('Only HTTPS official documentation URLs without credentials are permitted.')
    valid=(p.hostname=='developers.google.com' and p.path.startswith(('/search/','/crawling/'))) or \
          (p.hostname=='support.google.com' and p.path.startswith('/webmasters/answer/')) or \
          (p.hostname=='agentskills.io' and p.path=='/specification')
    if not valid: raise ValueError('URL is outside the official documentation host/path allowlist.')
    return url


class SafeRedirects(HTTPRedirectHandler):
    max_redirections=3
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        safe_url(newurl)
        return super().redirect_request(req,fp,code,msg,headers,newurl)


def fetch_url(url: str, max_bytes: int=MAX_BYTES) -> dict:
    safe_url(url)
    req=Request(url,headers={'User-Agent':'GSearchSkillDocCheck/1.0 (manual documentation validation)','Accept':'text/html,text/plain;q=0.8'})
    opener=build_opener(SafeRedirects())
    with opener.open(req,timeout=TIMEOUT) as response:
        final=safe_url(response.geturl())
        content_type=response.headers.get_content_type()
        if content_type not in ('text/html','text/plain','application/xhtml+xml'):
            raise ValueError('Unexpected documentation content type: '+content_type)
        raw=response.read(max_bytes+1)
        if len(raw)>max_bytes: raise ValueError('Response exceeded the bounded read limit.')
        return {'final_url':final,'status_code':getattr(response,'status',200),'bytes':len(raw),
                'content_type':content_type,'raw_body_sha256':hashlib.sha256(raw).hexdigest()}


def compare(source: dict, fetched: dict, baseline: dict) -> dict:
    previous=baseline.get(source['id'],{})
    old=previous.get('raw_body_sha256') if isinstance(previous,dict) else None
    new=fetched['raw_body_sha256']
    state='baseline_proposed' if not old else ('unchanged_bytes' if old==new else 'content_changed_review_required')
    return {'source_id':source['id'],'requested_url':source['url'],**fetched,'comparison':state,
            'semantic_change':'not_assessed','baseline_sha256':old}


def main(argv: list[str] | None=None) -> int:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--allow-network',action='store_true')
    ap.add_argument('--limit',type=int,default=3,help='1–10 source URLs per explicit run')
    ap.add_argument('--source-id',action='append',default=[],help='Restrict to one or more registry IDs')
    ap.add_argument('--baseline',type=Path,help='Prior report to compare; never overwritten')
    ap.add_argument('--out',type=Path,help='New report file; existing files are never overwritten')
    args=ap.parse_args(argv)
    if not 1<=args.limit<=10: ap.error('--limit must be between 1 and 10')
    try:
        if args.out and args.out.exists(): raise ValueError('Output already exists; choose a new report path.')
        if args.out and args.baseline and args.out.resolve()==args.baseline.resolve(): raise ValueError('Output must not be the baseline path.')
        registry=json.loads((ROOT/'references/sources.json').read_text(encoding='utf-8'))['sources']
        ids={s['id'] for s in registry}
        if set(args.source_id)-ids: raise ValueError('Unknown source ID: '+', '.join(sorted(set(args.source_id)-ids)))
        selection=[s for s in registry if not args.source_id or s['id'] in args.source_id][:args.limit]
        for s in selection: safe_url(s['url'])
        baseline={}
        if args.baseline:
            old=json.loads(args.baseline.read_text(encoding='utf-8'))
            baseline={r['source_id']:r for r in old.get('results',[]) if 'raw_body_sha256' in r}
        report={'generated_at':datetime.now(timezone.utc).isoformat(),'network_permitted':args.allow_network,
                'mode':'report_only','semantic_review':'required; byte differences do not prove policy changes',
                'plan':[{'source_id':s['id'],'url':s['url']} for s in selection],'results':[]}
        if args.allow_network:
            for i,s in enumerate(selection):
                if i: time.sleep(1)
                try: report['results'].append(compare(s,fetch_url(s['url']),baseline))
                except (OSError,HTTPError,URLError,ValueError,TimeoutError) as e:
                    report['results'].append({'source_id':s['id'],'requested_url':s['url'],'comparison':'fetch_failed',
                                              'error':str(e)[:500],'semantic_change':'unknown'})
        text=json.dumps(report,indent=2,ensure_ascii=False)+'\n'
        if args.out:
            args.out.parent.mkdir(parents=True,exist_ok=True)
            with args.out.open('x',encoding='utf-8') as f: f.write(text)
        print(text,end='')
        return 2 if any(r.get('comparison')=='fetch_failed' for r in report['results']) else 0
    except (OSError,ValueError,KeyError,TypeError) as e:
        print(json.dumps({'error':str(e)}),file=sys.stderr); return 2

if __name__=='__main__': raise SystemExit(main())
