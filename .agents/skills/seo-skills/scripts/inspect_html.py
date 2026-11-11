#!/usr/bin/env python3
"""Inspect saved HTML without networking or JavaScript execution (Python 3.10+)."""
from __future__ import annotations
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import urljoin, urlsplit

MAX_BYTES = 5 * 1024 * 1024

class Inspector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_head = False
        self.title_depth = 0
        self.title_parts: list[str] = []
        self.titles: list[str] = []
        self.base_href: str | None = None
        self.links: list[dict] = []
        self.images: list[dict] = []
        self.canonicals: list[str] = []
        self.meta: list[dict] = []
        self.ld_chunks: list[str] = []
        self.ld_parts: list[str] | None = None
        self.h1_parts: list[str] | None = None
        self.h1s: list[str] = []
        self._script = False
        self._style = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = {k.lower(): (v or '') for k, v in attrs}
        if tag == 'head': self.in_head = True
        if tag == 'title':
            self.title_depth += 1
            if self.title_depth == 1: self.title_parts = []
        if tag == 'base' and self.base_href is None and 'href' in a:
            self.base_href = a['href']
        if tag == 'link' and 'canonical' in a.get('rel', '').lower().split():
            self.canonicals.append(a.get('href', ''))
        if tag == 'meta':
            self.meta.append({'name': a.get('name', a.get('property', '')).lower(),
                              'content': a.get('content', ''), 'in_head': self.in_head})
        if tag == 'a' and 'href' in a:
            self.links.append({'href': a['href'], 'rel': a.get('rel', '')})
        if tag == 'img':
            self.images.append({'src': a.get('src', ''), 'srcset': a.get('srcset', ''),
                                'alt': a.get('alt'), 'loading': a.get('loading', '')})
        if tag == 'script':
            self._script = True
            if a.get('type', '').lower().split(';')[0].strip() == 'application/ld+json':
                self.ld_parts = []
        if tag == 'style': self._style = True
        if tag == 'h1': self.h1_parts = []

    def handle_endtag(self, tag: str) -> None:
        if tag == 'head': self.in_head = False
        if tag == 'title' and self.title_depth:
            self.title_depth -= 1
            if self.title_depth == 0: self.titles.append(' '.join(''.join(self.title_parts).split()))
        if tag == 'script':
            if self.ld_parts is not None:
                self.ld_chunks.append(''.join(self.ld_parts)); self.ld_parts = None
            self._script = False
        if tag == 'style': self._style = False
        if tag == 'h1' and self.h1_parts is not None:
            self.h1s.append(' '.join(''.join(self.h1_parts).split())); self.h1_parts = None

    def handle_data(self, data: str) -> None:
        if self.title_depth: self.title_parts.append(data)
        if self.ld_parts is not None: self.ld_parts.append(data)
        if self.h1_parts is not None and not self._script and not self._style:
            self.h1_parts.append(data)


def inspect_text(text: str, page_url: str = '') -> dict:
    p = Inspector(); p.feed(text); p.close()
    base = urljoin(page_url, p.base_href) if p.base_href is not None else page_url
    canonical_values = [{'raw': c, 'resolved': urljoin(base, c)} for c in p.canonicals]
    robots = [m for m in p.meta if m['name'] in ('robots','googlebot','googlebot-news','googlebot-image')]
    restrictions = [m for m in robots if {'noindex','none'} & set(re.split(r'[\s,]+',m['content'].lower()))]
    ld = []
    for i, chunk in enumerate(p.ld_chunks,1):
        try:
            value = json.loads(chunk)
            ld.append({'block': i, 'valid_json': True, 'top_level_type': type(value).__name__})
        except (ValueError, RecursionError) as e:
            ld.append({'block': i, 'valid_json': False, 'error': str(e)[:300]})
    findings = []
    def finding(code: str, text: str) -> None:
        findings.append({'code': code, 'kind': 'static_observation', 'message': text})
    if not p.titles or not any(p.titles): finding('MISSING_TITLE','No non-empty completed title element was found in this saved HTML.')
    if len(p.titles)>1: finding('MULTIPLE_TITLES','Multiple title elements were found; inspect the intended document structure.')
    if len(p.canonicals)>1: finding('MULTIPLE_CANONICALS','Multiple HTML canonical annotations were found; review consistency. This does not inspect HTTP headers.')
    if any(not c.strip() for c in p.canonicals): finding('EMPTY_CANONICAL','An empty canonical href was found.')
    if restrictions: finding('INDEX_RESTRICTION_PRESENT','A robots-related meta contains noindex or none. Applicability and effective indexing state require additional evidence.')
    if any(not d['valid_json'] for d in ld): finding('INVALID_JSON_LD','At least one application/ld+json block is not valid JSON.')
    if p.ld_parts is not None: finding('UNCLOSED_JSON_LD','An unclosed JSON-LD script was found; its body was not treated as a completed block.')
    for link in p.links: link['resolved'] = urljoin(base, link['href'])
    return {'analysis_type':'saved_html_only','page_url':page_url,'base_url':base,
            'titles':p.titles,'h1s':p.h1s,'descriptions':[m['content'] for m in p.meta if m['name']=='description'],
            'canonical_annotations':canonical_values,'robots_meta':robots,'meta_index_restrictions':restrictions,
            'links':p.links,'images':p.images,'json_ld_syntax':ld,'findings':findings,
            'not_assessed':['HTTP response and headers','robots.txt','live deployment','JavaScript rendering',
                            'Google-selected canonical','actual indexing','structured-data eligibility','actual search display']}


def inspect_file(path: Path, page_url: str = '', max_bytes: int = MAX_BYTES) -> dict:
    if max_bytes < 1: raise ValueError('max_bytes must be positive')
    with path.open('rb') as f: raw=f.read(max_bytes+1)
    if len(raw)>max_bytes: raise ValueError(f'HTML exceeds local limit of {max_bytes} bytes')
    # Decode a supplied snapshot; do not guess or fetch its original response encoding.
    return inspect_text(raw.decode('utf-8-sig',errors='replace'),page_url)


def main(argv: list[str] | None = None) -> int:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('html',type=Path); ap.add_argument('--url',default='',help='Original HTTP(S) page URL, for resolving relative references')
    args=ap.parse_args(argv)
    if args.url and (urlsplit(args.url).scheme not in ('http','https') or not urlsplit(args.url).hostname):
        ap.error('--url must be an absolute HTTP(S) URL')
    try: report=inspect_file(args.html,args.url)
    except (OSError,ValueError) as e:
        print(json.dumps({'error':str(e)}),file=sys.stderr); return 2
    print(json.dumps(report,indent=2,ensure_ascii=False)); return 0

if __name__=='__main__': raise SystemExit(main())
