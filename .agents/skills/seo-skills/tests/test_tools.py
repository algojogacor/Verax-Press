"""Executable local utility tests. These do not evaluate an external language-model agent."""
from __future__ import annotations
from contextlib import redirect_stdout, redirect_stderr
import gzip
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.request import Request

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import inspect_html as html
import check_sitemap as sm
import route
import refresh_sources as refresh
import validate_bundle as bundle

class HtmlTests(unittest.TestCase):
    def test_good_fixture(self):
        r=html.inspect_file(ROOT/'tests/fixtures/page-good.html','https://example.com/guide')
        self.assertEqual(r['titles'],['Widget integration guide']);self.assertTrue(r['json_ld_syntax'][0]['valid_json'])
    def test_uppercase_attributes(self):
        r=html.inspect_text('<HEAD><TITLE>Example &amp; title</TITLE><META NAME="ROBOTS" CONTENT="NOINDEX"></HEAD>')
        self.assertEqual(r['titles'],['Example & title']);self.assertEqual(len(r['meta_index_restrictions']),1)
    def test_relative_canonical_base(self):
        r=html.inspect_text('<base href="/docs/"><link rel="canonical" href="topic">','https://example.com/a')
        self.assertEqual(r['canonical_annotations'][0]['resolved'],'https://example.com/docs/topic')
    def test_first_base_wins(self):
        r=html.inspect_text('<base href="/one/"><base href="/two/"><a href="x">x</a>','https://example.com')
        self.assertEqual(r['links'][0]['resolved'],'https://example.com/one/x')
    def test_multiple_canonicals(self):
        r=html.inspect_file(ROOT/'tests/fixtures/page-conflict.html')
        self.assertIn('MULTIPLE_CANONICALS',[f['code'] for f in r['findings']])
    def test_invalid_jsonld(self):
        r=html.inspect_file(ROOT/'tests/fixtures/page-conflict.html')
        self.assertFalse(r['json_ld_syntax'][0]['valid_json'])
    def test_valid_json_array(self):
        r=html.inspect_text('<script type="application/ld+json">[{"x":1}]</script>')
        self.assertTrue(r['json_ld_syntax'][0]['valid_json'])
    def test_noindex_in_text_not_directive(self):
        r=html.inspect_text('<title>noindex explained</title><p>noindex</p>')
        self.assertEqual(r['meta_index_restrictions'],[])
    def test_none_directive(self):
        r=html.inspect_text('<meta name="googlebot" content="none">')
        self.assertEqual(len(r['meta_index_restrictions']),1)
    def test_meta_outside_head_recorded(self):
        r=html.inspect_text('<body><meta name="robots" content="noindex"></body>')
        self.assertFalse(r['robots_meta'][0]['in_head']);self.assertEqual(len(r['meta_index_restrictions']),1)
    def test_script_not_executed(self):
        r=html.inspect_text('<script>document.write("<title>Injected</title>")</script>')
        self.assertEqual(r['titles'],[])
    def test_unclosed_jsonld(self):
        r=html.inspect_text('<script type="application/ld+json">{"x":1}')
        self.assertIn('UNCLOSED_JSON_LD',[f['code'] for f in r['findings']])
    def test_alt_missing_vs_empty(self):
        r=html.inspect_text('<img src="a"><img src="b" alt="">')
        self.assertIsNone(r['images'][0]['alt']);self.assertEqual(r['images'][1]['alt'],'')
    def test_utf8_bom(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'p.html';p.write_bytes(b'\xef\xbb\xbf<title>Hello</title>')
            self.assertEqual(html.inspect_file(p)['titles'],['Hello'])
    def test_size_limit(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'p.html';p.write_bytes(b'a'*20)
            with self.assertRaises(ValueError):html.inspect_file(p,max_bytes=10)
    def test_scope_limitations(self):
        r=html.inspect_text('<title>x</title>')
        self.assertIn('JavaScript rendering',r['not_assessed']);self.assertIn('actual indexing',r['not_assessed'])

class SitemapTests(unittest.TestCase):
    def xml(self,body,root='urlset'):
        return f'<{root} xmlns="{sm.NS}">{body}</{root}>'.encode()
    def test_good_fixture(self):
        r=sm.inspect_file(ROOT/'tests/fixtures/sitemap-good.xml');self.assertTrue(r['valid_basic_structure']);self.assertEqual(r['entry_count'],2)
    def test_invalid_xml(self):self.assertFalse(sm.inspect_bytes(b'<urlset>')['valid_basic_structure'])
    def test_dtd_rejected(self):
        r=sm.inspect_bytes(b'<!DOCTYPE x [<!ENTITY y "z">]><urlset/>');self.assertIn('DTD',r['errors'][0])
    def test_utf16_dtd_rejected(self):
        r=sm.inspect_bytes('<!DOCTYPE x><urlset/>'.encode('utf-16'));self.assertIn('DTD',r['errors'][0])
    def test_invalid_root(self):self.assertFalse(sm.inspect_bytes(self.xml('','other'))['valid_basic_structure'])
    def test_missing_namespace(self):self.assertFalse(sm.inspect_bytes(b'<urlset/>')['valid_basic_structure'])
    def test_relative_url(self):
        r=sm.inspect_bytes(self.xml('<url><loc>/x</loc></url>'));self.assertFalse(r['valid_basic_structure'])
    def test_credentials_rejected(self):self.assertFalse(sm.is_http_url('https://user:pw@example.com/a'))
    def test_bad_port_rejected(self):self.assertFalse(sm.is_http_url('https://example.com:bad/a'))
    def test_duplicates_warning(self):
        body='<url><loc>https://example.com/a</loc></url>'*2
        r=sm.inspect_bytes(self.xml(body));self.assertTrue(r['valid_basic_structure']);self.assertEqual(r['duplicate_count'],1)
    def test_image_extension_not_counted(self):
        body='<url xmlns:image="https://example.com/images"><loc>https://example.com/a</loc><image:image><image:loc>https://example.com/p.png</image:loc></image:image></url>'
        r=sm.inspect_bytes(self.xml(body));self.assertTrue(r['valid_basic_structure']);self.assertEqual(r['entry_count'],1)
    def test_multiple_direct_locs(self):
        r=sm.inspect_bytes(self.xml('<url><loc>https://example.com/a</loc><loc>https://example.com/b</loc></url>'))
        self.assertFalse(r['valid_basic_structure'])
    def test_gzip(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'s.xml.gz';p.write_bytes(gzip.compress(self.xml('<url><loc>https://example.com/a</loc></url>')))
            self.assertTrue(sm.inspect_file(p)['valid_basic_structure'])
    def test_gzip_decompressed_limit(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'s.gz';p.write_bytes(gzip.compress(b'a'*1000))
            r=sm.inspect_file(p,max_bytes=100);self.assertFalse(r['valid_basic_structure']);self.assertIn('byte limit',r['errors'][0])
    def test_entry_limit(self):
        body='<url><loc>https://example.com/a</loc></url>'*3
        self.assertFalse(sm.inspect_bytes(self.xml(body),max_entries=2)['valid_basic_structure'])
    def test_sitemapindex(self):
        r=sm.inspect_bytes(self.xml('<sitemap><loc>https://example.com/s.xml</loc></sitemap>','sitemapindex'))
        self.assertTrue(r['valid_basic_structure']);self.assertEqual(r['root_type'],'sitemapindex')
    def test_invalid_lastmod_warning(self):
        r=sm.inspect_bytes(self.xml('<url><loc>https://example.com/a</loc><lastmod>yesterday</lastmod></url>'))
        self.assertTrue(r['valid_basic_structure']);self.assertTrue(any('lastmod' in w for w in r['warnings']))
    def test_empty_warning(self):
        r=sm.inspect_bytes(self.xml(''));self.assertTrue(r['valid_basic_structure']);self.assertTrue(r['warnings'])
    def test_wrong_entry_namespace(self):
        r=sm.inspect_bytes(self.xml('<x:url xmlns:x="https://example.com/wrong"><loc>https://example.com/a</loc></x:url>'))
        self.assertFalse(r['valid_basic_structure'])

class RouteTests(unittest.TestCase):
    def test_canonical_route(self):self.assertIn('gsearch-canonicals',[x['name'] for x in route.suggest('canonical duplicate')])
    def test_javascript_route(self):self.assertIn('gsearch-javascript',[x['name'] for x in route.suggest('javascript rendering')])
    def test_limit_clamped(self):self.assertLessEqual(len(route.suggest('seo content search indexing',100)),6)
    def test_fallback(self):self.assertEqual(route.suggest('zzzzunmatched')[0]['name'],'gsearch-audit')
    def test_scores_not_probability(self):self.assertIn('routing_score',route.suggest('robots')[0])

class RefreshTests(unittest.TestCase):
    def test_allowed_url(self):self.assertEqual(refresh.safe_url('https://developers.google.com/search/docs'),'https://developers.google.com/search/docs')
    def test_reject_http(self):
        with self.assertRaises(ValueError):refresh.safe_url('http://developers.google.com/search/docs')
    def test_reject_private_host(self):
        with self.assertRaises(ValueError):refresh.safe_url('https://127.0.0.1/search/docs')
    def test_reject_lookalike(self):
        with self.assertRaises(ValueError):refresh.safe_url('https://developers.google.com.example.com/search/docs')
    def test_reject_credentials(self):
        with self.assertRaises(ValueError):refresh.safe_url('https://user@developers.google.com/search/docs')
    def test_reject_empty_credentials(self):
        with self.assertRaises(ValueError):refresh.safe_url('https://@developers.google.com/search/docs')
    def test_reject_other_path(self):
        with self.assertRaises(ValueError):refresh.safe_url('https://developers.google.com/unrelated')
    def test_reject_port(self):
        with self.assertRaises(ValueError):refresh.safe_url('https://developers.google.com:444/search/docs')
    def test_redirect_rechecked(self):
        h=refresh.SafeRedirects();req=Request('https://developers.google.com/search/docs')
        with self.assertRaises(ValueError):h.redirect_request(req,None,302,'',{},'https://example.com/steal')
    def test_allowed_redirect(self):
        h=refresh.SafeRedirects();req=Request('https://developers.google.com/search/docs')
        out=h.redirect_request(req,None,302,'',{},'https://developers.google.com/crawling/docs')
        self.assertEqual(out.full_url,'https://developers.google.com/crawling/docs')
    def test_new_baseline(self):
        r=refresh.compare({'id':'x','url':'u'},{'raw_body_sha256':'abc'},{});self.assertEqual(r['comparison'],'baseline_proposed')
    def test_unchanged(self):
        r=refresh.compare({'id':'x','url':'u'},{'raw_body_sha256':'abc'},{'x':{'raw_body_sha256':'abc'}});self.assertEqual(r['comparison'],'unchanged_bytes')
    def test_changed_not_semantic(self):
        r=refresh.compare({'id':'x','url':'u'},{'raw_body_sha256':'new'},{'x':{'raw_body_sha256':'old'}})
        self.assertEqual(r['comparison'],'content_changed_review_required');self.assertEqual(r['semantic_change'],'not_assessed')
    def test_dry_run_no_network(self):
        with patch.object(refresh,'fetch_url') as fetch,redirect_stdout(io.StringIO()):
            self.assertEqual(refresh.main(['--limit','1']),0);fetch.assert_not_called()
    def test_mocked_success(self):
        with patch.object(refresh,'fetch_url',return_value={'raw_body_sha256':'abc','final_url':'https://developers.google.com/search/docs'}),redirect_stdout(io.StringIO()):
            self.assertEqual(refresh.main(['--allow-network','--limit','1']),0)
    def test_mocked_failure(self):
        out=io.StringIO()
        with patch.object(refresh,'fetch_url',side_effect=OSError('fixture offline')),redirect_stdout(out):
            self.assertEqual(refresh.main(['--allow-network','--limit','1']),2)
        self.assertEqual(json.loads(out.getvalue())['results'][0]['comparison'],'fetch_failed')
    def test_existing_report_not_overwritten(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'report.json';p.write_text('keep')
            with redirect_stderr(io.StringIO()):self.assertEqual(refresh.main(['--out',str(p)]),2)
            self.assertEqual(p.read_text(),'keep')
    def test_baseline_preserved(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'old.json';p.write_text('{"results":[]}');before=p.read_bytes()
            with patch.object(refresh,'fetch_url',return_value={'raw_body_sha256':'abc'}),redirect_stdout(io.StringIO()):
                self.assertEqual(refresh.main(['--allow-network','--limit','1','--baseline',str(p),'--out',str(Path(td)/'new.json')]),0)
            self.assertEqual(p.read_bytes(),before)
    def test_bounded_response(self):
        class FakeHeaders:
            def get_content_type(self):return 'text/html'
        class FakeResponse:
            headers=FakeHeaders();status=200
            def geturl(self):return 'https://developers.google.com/search/docs'
            def read(self,n):return b'a'*n
            def __enter__(self):return self
            def __exit__(self,*args):return False
        class FakeOpener:
            def open(self,*args,**kwargs):return FakeResponse()
        with patch.object(refresh,'build_opener',return_value=FakeOpener()):
            with self.assertRaises(ValueError):refresh.fetch_url('https://developers.google.com/search/docs',max_bytes=10)

class PackageTests(unittest.TestCase):
    def test_registry_counts(self):
        m=json.loads((ROOT/'manifest.json').read_text());self.assertEqual(len(m['modules']),44);self.assertEqual(m['skill_count'],45)
    def test_sources_resolve(self):
        m=json.loads((ROOT/'manifest.json').read_text());s=json.loads((ROOT/'references/sources.json').read_text())['sources'];ids={x['id'] for x in s}
        self.assertEqual(len(ids),80)
        for mod in m['modules']:self.assertTrue(set(mod['source_ids'])<=ids)
    def test_explicit_unretrieved_source(self):
        s=json.loads((ROOT/'references/sources.json').read_text())['sources']
        self.assertEqual(sum(x['review_status']=='not_retrieved' for x in s),1)
        self.assertTrue(all(x['remote_content_sha256'] is None for x in s))
    def test_evaluation_count_and_status(self):
        ev=json.loads((ROOT/'evaluations/scenarios.json').read_text());self.assertEqual(len(ev['scenarios']),56)
        self.assertEqual(ev['status'],'authored_not_run_in_agent_harness')
    def test_issue_template_contract(self):
        schema=json.loads((ROOT/'templates/issue.schema.json').read_text());example=json.loads((ROOT/'examples/issue-illustrative.json').read_text())
        self.assertTrue(set(schema['required'])<=example.keys());self.assertEqual(example['evidence'][0]['class'],'ILLUSTRATIVE')
    def test_explicit_anchor_parser(self):self.assertIn('gs-test',bundle.anchors('<a id="gs-test"></a>\n# Other'))
    def test_complete_bundle(self):
        report=bundle.validate(ROOT);self.assertTrue(report['passed'],report['errors'])

if __name__=='__main__':unittest.main()
