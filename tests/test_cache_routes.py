from types import SimpleNamespace

from comfyui_sageutils.routes.scanning_routes import (
	apply_bulk_metadata_results,
	append_scan_error,
	normalize_rate_limit_delay,
	prepare_full_hash_batch,
	prepare_full_hash_batch_async,
	prepare_scan_paths,
	reconcile_cached_paths,
	get_scan_folder_groups,
	build_model_inventory,
	remove_missing_cache_paths,
)
from comfyui_sageutils.utils.file_utils import get_file_fingerprint, get_file_sha256_full
from comfyui_sageutils.utils.helpers_civitai import (
	_get_civitai_json,
	clear_civitai_response_cache,
	configure_civitai_request_interval,
	get_civitai_model_version_json_by_hash,
	get_civitai_model_versions_json_by_hashes,
)
from comfyui_sageutils.utils import helpers_civitai
from comfyui_sageutils.utils import file_utils
from comfyui_sageutils.utils.model_metadata import (
	CURRENT_SCHEMA_VERSION,
	SCHEMA_VERSION_KEY,
	merge_civitai_metadata,
	normalize_model_info,
)


def test_prepare_scan_paths_excludes_cached_entries_when_requested():
	cache = SimpleNamespace(
		hash={'cached.safetensors': 'cached-hash'},
		info={'cached-hash': {}},
		load=lambda: None,
	)

	paths, skipped, changed = prepare_scan_paths(
		['cached.safetensors', 'new.safetensors'],
		cache,
		force=False,
		include_cached=False,
	)

	assert paths == ['new.safetensors']
	assert skipped == 1
	assert changed == set()


def test_prepare_scan_paths_supports_targeted_profiles():
	cache = SimpleNamespace(
		hash={
			'fresh.safetensors': 'fresh-hash',
			'unmatched.safetensors': 'unmatched-hash',
			'failed.safetensors': 'failed-hash',
		},
		info={
			'fresh-hash': {'_sageutils_file_state': {}},
			'unmatched-hash': {'_sageutils_civitai_status': 'not_found_or_unpublished'},
			'failed-hash': {'_sageutils_civitai_status': 'temporary_error'},
		},
		load=lambda: None,
	)

	paths, skipped, _ = prepare_scan_paths(
		list(cache.hash), cache, force=False, include_cached=True, scan_mode='unmatched'
	)

	assert paths == ['unmatched.safetensors']
	assert skipped == 2


def test_normalize_rate_limit_delay_clamps_and_defaults():
	assert normalize_rate_limit_delay(None) == 1000
	assert normalize_rate_limit_delay('invalid') == 1000
	assert normalize_rate_limit_delay(50) == 100
	assert normalize_rate_limit_delay(6000) == 5000
	assert normalize_rate_limit_delay(750) == 750


def test_scan_folder_groups_include_registered_model_categories():
	folder_paths = SimpleNamespace(folder_names_and_paths={
		'checkpoints': (['/models/checkpoints'], {'.safetensors'}),
		'clip_vision': (['/models/clip_vision'], {'.safetensors'}),
		'configs': (['/models/configs'], {'.yaml'}),
		'diffusers': (['/models/diffusers'], {'folder'}),
	})

	groups = get_scan_folder_groups(folder_paths)

	assert groups['checkpoints'] == ['checkpoints']
	assert groups['clip_vision'] == ['clip_vision']
	assert 'configs' not in groups
	assert 'diffusers' not in groups


def test_append_scan_error_records_bounded_json_safe_details():
	from comfyui_sageutils.routes import scanning_routes

	scanning_routes.scan_progress_store['error_details'] = []
	append_scan_error('/models/a.safetensors', RuntimeError('failed'), phase='hashing')

	assert scanning_routes.scan_progress_store['error_details'] == [{
		'file': '/models/a.safetensors',
		'error': 'failed',
		'phase': 'hashing',
	}]


def test_normalize_model_info_adds_aliases_without_mutating_legacy_record():
	original = {
		'lastUsed': '2026-01-01T00:00:00',
		'update_available': True,
		'fileSize': 123,
		'custom': {'keep': True},
	}

	normalized = normalize_model_info(original)

	assert normalized['last_used'] == original['lastUsed']
	assert normalized['has_update'] is True
	assert normalized['file_size'] == 123
	assert normalized['_sageutils_schema_version'] == 1
	assert original == {
		'lastUsed': '2026-01-01T00:00:00',
		'update_available': True,
		'fileSize': 123,
		'custom': {'keep': True},
	}


def test_persist_scan_summary_retains_bounded_result_details(monkeypatch):
	from comfyui_sageutils.routes import scanning_routes

	stored = []
	scanning_routes.scan_progress_store.update({
		'start_time': 100.0,
		'scan_options': {'force': False},
		'discovered': 3,
		'processed': 2,
		'error_details': [{'file': 'bad.safetensors', 'error': 'failed', 'phase': 'hashing'}],
	})
	monkeypatch.setattr(scanning_routes, 'load_scan_history', lambda: [])
	monkeypatch.setattr(scanning_routes, 'save_scan_history', stored.extend)
	monkeypatch.setattr(scanning_routes.time, 'time', lambda: 200.0)

	summary = scanning_routes.persist_scan_summary('cancelled')

	assert summary['status'] == 'cancelled'
	assert summary['discovered'] == 3
	assert summary['error_details'][0]['phase'] == 'hashing'
	assert stored[0] == summary


def test_normalize_model_info_adds_metadata_status_aliases_without_mutating_legacy_record():
	original = {
		'civitai_status': 'matched',
		'provider_status': 'temporary_error',
		'lastUsed': '2026-01-01T00:00:00',
		'fileSize': 456,
	}

	normalized = normalize_model_info(original)

	assert normalized['metadata_status'] == 'temporary_error'
	assert normalized['provider_status'] == 'temporary_error'
	assert normalized['last_used'] == original['lastUsed']
	assert normalized['file_size'] == 456
	assert original == {
		'civitai_status': 'matched',
		'provider_status': 'temporary_error',
		'lastUsed': '2026-01-01T00:00:00',
		'fileSize': 456,
	}


def test_schema_marker_is_additive_for_new_records():
	assert SCHEMA_VERSION_KEY == '_sageutils_schema_version'
	assert CURRENT_SCHEMA_VERSION == 1
	legacy = {'notes': 'keep'}
	assert SCHEMA_VERSION_KEY not in legacy


def test_sage_cache_save_restores_hash_info_pair_on_failed_write(tmp_path, monkeypatch):
	from comfyui_sageutils.utils.model_cache import SageCache
	from comfyui_sageutils.utils.path_manager import file_manager

	cache = SageCache()
	cache.hash_path = tmp_path / 'sage_cache_hash.json'
	cache.info_path = tmp_path / 'sage_cache_info.json'
	cache.hash = {'a': 'hash-1'}
	cache.info = {'hash-1': {'hash': 'hash-1', 'notes': 'initial'}}
	cache.last_hash = {'a': 'old-hash'}
	cache.last_info = {'old-hash': {'hash': 'old-hash', 'notes': 'old'}}
	cache.hash_path.write_text('{"a": "hash-1"}', encoding='utf-8')
	cache.info_path.write_text('{"hash-1": {"hash": "hash-1", "notes": "initial"}}', encoding='utf-8')

	original_write = file_manager.atomic_write_json
	calls = []

	def flaky_write(path, data):
		calls.append(str(path))
		if str(path).endswith('sage_cache_info.json'):
			raise OSError('simulated write failure')
		return original_write(path, data)

	monkeypatch.setattr(file_manager, 'atomic_write_json', flaky_write)

	try:
		cache.save()
		raise AssertionError('save should have raised after the simulated write failure')
	except OSError:
		pass

	assert 'hash-1' in cache.info_path.read_text(encoding='utf-8')
	assert 'hash-1' in cache.hash_path.read_text(encoding='utf-8')
	assert 'a' in cache.hash_path.read_text(encoding='utf-8')


def test_remove_missing_cache_paths_preserves_metadata(tmp_path):
	missing_path = str(tmp_path / 'missing.safetensors')
	cache = SimpleNamespace(
		hash={missing_path: 'legacy-hash'},
		info={'legacy-hash': {'notes': 'keep this'}},
		load=lambda: None,
	)

	removed = remove_missing_cache_paths(cache, [missing_path])

	assert removed == [missing_path]
	assert missing_path not in cache.hash
	assert cache.info['legacy-hash']['notes'] == 'keep this'


def test_build_model_inventory_joins_live_files_and_stale_cache(tmp_path):
	model_dir = tmp_path / 'checkpoints'
	duplicate_dir = tmp_path / 'loras'
	model_dir.mkdir()
	duplicate_dir.mkdir()
	live_path = model_dir / 'live.safetensors'
	duplicate_path = duplicate_dir / 'live-copy.safetensors'
	live_path.write_bytes(b'live')
	duplicate_path.write_bytes(b'live')
	stale_path = str(tmp_path / 'old.safetensors')
	live_string = str(live_path.resolve())
	cache = SimpleNamespace(
		hash={live_string: 'live-hash', str(duplicate_path.resolve()): 'live-hash', stale_path: 'stale-hash'},
		info={
			'live-hash': {
				'_sageutils_file_state': {live_string: get_file_fingerprint(live_path)},
				'notes': 'live notes',
			},
			'stale-hash': {'notes': 'preserve stale notes'},
		},
		load=lambda: None,
	)
	folder_paths = SimpleNamespace(folder_names_and_paths={
		'checkpoints': ([str(model_dir)], {'.safetensors'}),
		'loras': ([str(duplicate_dir)], {'.safetensors'}),
	})

	inventory = build_model_inventory(folder_paths, cache)
	by_path = {item['path']: item for item in inventory}

	assert by_path[live_string]['filesystem_status'] == 'present'
	assert by_path[live_string]['exists'] is True
	assert by_path[live_string]['is_file'] is True
	assert by_path[live_string]['size'] == 4
	assert by_path[live_string]['metadata_status'] == 'unknown'
	assert by_path[live_string]['info']['notes'] == 'live notes'
	assert by_path[str(duplicate_path.resolve())]['hash'] == 'live-hash'
	assert by_path[stale_path]['stale'] is True
	assert by_path[stale_path]['filesystem_status'] == 'missing'
	assert by_path[stale_path]['exists'] is False
	assert by_path[stale_path]['is_file'] is False
	assert by_path[stale_path]['info']['notes'] == 'preserve stale notes'


def test_inventory_category_counts_are_derived_per_registered_type(tmp_path):
	model_dir = tmp_path / 'checkpoints'
	model_dir.mkdir()
	model_path = model_dir / 'model.safetensors'
	model_path.write_bytes(b'model')
	cache = SimpleNamespace(
		hash={},
		info={},
		load=lambda: None,
	)
	folder_paths = SimpleNamespace(folder_names_and_paths={
		'checkpoints': ([str(model_dir)], {'.safetensors'}),
	})

	from comfyui_sageutils.routes.scanning_routes import build_model_inventory
	inventory = build_model_inventory(folder_paths, cache)

	category_counts = {}
	for item in inventory:
		for category in item['registered_types']:
			category_counts[category] = category_counts.get(category, 0) + 1

	assert category_counts == {'checkpoints': 1}


def test_prepare_full_hash_batch_only_hashes_new_and_changed_files(tmp_path):
	new_path = tmp_path / 'new.safetensors'
	new_path.write_bytes(b'new model')
	legacy_path = tmp_path / 'legacy.safetensors'
	legacy_path.write_bytes(b'legacy model')
	changed_path = tmp_path / 'changed.safetensors'
	changed_path.write_bytes(b'changed model')

	legacy_string = str(legacy_path)
	changed_string = str(changed_path)
	cache = SimpleNamespace(
		hash={legacy_string: 'legacy-hash', changed_string: 'old-hash'},
		info={
			'legacy-hash': {},
			'old-hash': {},
		},
	)

	paths, full_hashes = prepare_full_hash_batch(
		[str(new_path), legacy_string, changed_string],
		{changed_string},
		cache,
	)

	assert paths == [str(new_path), changed_string]
	assert full_hashes[str(new_path)] == get_file_sha256_full(new_path)
	assert full_hashes[changed_string] == get_file_sha256_full(changed_path)
	assert legacy_string not in full_hashes
	assert cache.hash[changed_string] == full_hashes[changed_string][:10]


def test_prepare_full_hash_batch_isolates_hashing_io_failures(tmp_path, monkeypatch):
	good_path = str(tmp_path / 'good.safetensors')
	bad_path = str(tmp_path / 'bad.safetensors')
	cache = SimpleNamespace(hash={}, info={})
	failed_paths = set()
	errors = []

	def fake_full_hash(path, progress_callback=None):
		if path == bad_path:
			raise OSError(5, 'Input/output error')
		return 'a' * 64

	monkeypatch.setattr(file_utils, 'get_file_sha256_full', fake_full_hash)

	paths, full_hashes = prepare_full_hash_batch(
		[good_path, bad_path],
		set(),
		cache,
		failed_paths=failed_paths,
		error_callback=lambda path, error, phase: errors.append((path, str(error), phase)),
	)

	assert paths == [good_path]
	assert full_hashes == {good_path: 'a' * 64}
	assert failed_paths == {bad_path}
	assert errors == [(bad_path, '[Errno 5] Input/output error', 'hashing')]


def test_prepare_full_hash_batch_async_yields_between_chunks(monkeypatch):
	from comfyui_sageutils.routes import scanning_routes

	cache = SimpleNamespace(hash={}, info={})
	yields = []

	async def fake_yield():
		yields.append(True)

	monkeypatch.setattr(scanning_routes.asyncio, 'sleep', lambda _: fake_yield())
	monkeypatch.setattr(
		file_utils,
		'get_file_sha256_full',
		lambda path, progress_callback=None: ('a' * 64),
	)

	paths, hashes = __import__('asyncio').run(
		prepare_full_hash_batch_async(
			[f'model-{index}.safetensors' for index in range(5)],
			set(),
			cache,
		)
	)

	assert len(paths) == 5
	assert len(hashes) == 5
	assert len(yields) == 5


def test_civitai_bulk_lookup_posts_full_hashes(monkeypatch):
	request = {}

	class Response:
		def json(self):
			return [{'id': 42}]

		def raise_for_status(self):
			return None

	def fake_post(url, json, timeout):
		request.update(url=url, json=json, timeout=timeout)
		return Response()

	monkeypatch.setattr(helpers_civitai.requests, 'post', fake_post)
	hash_value = 'a' * 64

	assert get_civitai_model_versions_json_by_hashes([hash_value]) == [{'id': 42}]
	assert request['json'] == [hash_value.upper()]
	assert request['url'].endswith('/model-versions/by-hash')


def test_civitai_bulk_lookup_uses_success_cache(monkeypatch):
	clear_civitai_response_cache()
	calls = []

	class Response:
		status_code = 200
		headers = {}

		def json(self):
			return [{'id': 42}]

		def raise_for_status(self):
			return None

	def fake_post(*args, **kwargs):
		calls.append((args, kwargs))
		return Response()

	monkeypatch.setattr(helpers_civitai.requests, 'post', fake_post)
	hashes = ['a' * 64, 'b' * 64]

	assert get_civitai_model_versions_json_by_hashes(hashes) == [{'id': 42}]
	assert get_civitai_model_versions_json_by_hashes(list(reversed(hashes))) == [{'id': 42}]
	assert len(calls) == 1
	clear_civitai_response_cache()


def test_civitai_response_cache_persists_successful_lookup(monkeypatch, tmp_path):
	from comfyui_sageutils.utils import helpers_civitai
	cache_path = tmp_path / 'civitai_response_cache.json'
	monkeypatch.setattr(helpers_civitai, 'CIVITAI_CACHE_PATH', cache_path)
	monkeypatch.setattr(helpers_civitai, '_persistent_cache_loaded', False)
	helpers_civitai._civitai_response_cache.clear()
	payload = {'id': 42, 'files': [{'hashes': {'SHA256': 'a' * 64}}]}

	helpers_civitai._store_cached_response('persisted:lookup', payload)
	assert cache_path.exists()
	assert helpers_civitai._cached_response('persisted:lookup') == payload
	clear_civitai_response_cache()
	assert not cache_path.exists()


def test_civitai_single_hash_uses_success_cache(monkeypatch):
	clear_civitai_response_cache()
	configure_civitai_request_interval(0)
	calls = []

	class Response:
		status_code = 200
		headers = {}

		def json(self):
			return {'id': 42, 'files': []}

		def raise_for_status(self):
			return None

	def fake_get(*args, **kwargs):
		calls.append((args, kwargs))
		return Response()

	monkeypatch.setattr(helpers_civitai.requests, 'get', fake_get)
	hash_value = 'c' * 64

	assert get_civitai_model_version_json_by_hash(hash_value)['id'] == 42
	assert get_civitai_model_version_json_by_hash(hash_value.lower())['id'] == 42
	assert len(calls) == 1
	clear_civitai_response_cache()


def test_request_gate_accounts_for_elapsed_time(monkeypatch):
	from comfyui_sageutils.utils import helpers_civitai

	configure_civitai_request_interval(1000)
	times = iter([10.0, 10.0, 10.6, 11.0])
	sleeps = []
	monkeypatch.setattr(helpers_civitai.time, 'monotonic', lambda: next(times))
	monkeypatch.setattr(helpers_civitai.time, 'sleep', sleeps.append)

	helpers_civitai._last_request_at = None
	helpers_civitai._wait_for_request_gate()
	helpers_civitai._wait_for_request_gate()

	assert len(sleeps) == 1
	assert abs(sleeps[0] - 0.4) < 1e-9
	helpers_civitai._last_request_at = None
	configure_civitai_request_interval(0)


def test_request_gate_resets_when_interval_disabled():
	from comfyui_sageutils.utils import helpers_civitai

	helpers_civitai._last_request_at = 100.0
	configure_civitai_request_interval(0)
	assert helpers_civitai._last_request_at is None


def test_civitai_get_retries_transient_response_and_honors_retry_after(monkeypatch):
	configure_civitai_request_interval(0)
	helpers_civitai._last_request_at = None
	responses = iter([
		SimpleNamespace(
			status_code=503,
			headers={'Retry-After': '0'},
			json=lambda: {'error': 'temporary'},
			raise_for_status=lambda: None,
		),
		SimpleNamespace(
			status_code=200,
			headers={},
			json=lambda: {'id': 42},
			raise_for_status=lambda: None,
		),
	])
	sleeps = []
	monkeypatch.setattr(helpers_civitai.requests, 'get', lambda *args, **kwargs: next(responses))
	monkeypatch.setattr(helpers_civitai.time, 'sleep', sleeps.append)

	assert _get_civitai_json('https://example.test/model') == {'id': 42}
	assert sleeps == [0.0]


def test_civitai_get_does_not_retry_not_found(monkeypatch):
	response = SimpleNamespace(
		status_code=404,
		headers={},
		json=lambda: {'error': 'not found'},
		raise_for_status=lambda: (_ for _ in ()).throw(
			__import__('requests').exceptions.HTTPError('not found', response=response)
		),
	)
	calls = []
	monkeypatch.setattr(helpers_civitai.requests, 'get', lambda *args, **kwargs: calls.append(response) or response)

	result = _get_civitai_json('https://example.test/missing')

	assert result['http_status'] == 404
	assert len(calls) == 1


def test_bulk_results_classify_matched_and_unmatched(tmp_path):
	matched_path = tmp_path / 'matched.safetensors'
	matched_path.write_bytes(b'matched')
	unmatched_path = tmp_path / 'unmatched.safetensors'
	unmatched_path.write_bytes(b'unmatched')
	matched_hash = get_file_sha256_full(matched_path)
	unmatched_hash = get_file_sha256_full(unmatched_path)
	cache = SimpleNamespace(
		hash={str(matched_path): matched_hash[:10], str(unmatched_path): unmatched_hash[:10]},
		info={matched_hash[:10]: {}, unmatched_hash[:10]: {}},
		by_path=lambda path: cache.info[cache.hash[path]],
	)

	handled, counts = apply_bulk_metadata_results(
		[str(matched_path), str(unmatched_path)],
		{str(matched_path): matched_hash, str(unmatched_path): unmatched_hash},
		cache,
		[{
			'id': 42,
			'modelId': 7,
			'name': 'Version',
			'files': [{'hashes': {'SHA256': matched_hash}}],
		}],
	)

	assert handled == {str(matched_path), str(unmatched_path)}
	assert counts == {'matched': 1, 'unmatched': 1, 'temporary_errors': 0}
	assert cache.info[matched_hash[:10]]['civitai'] == 'True'
	assert cache.info[unmatched_hash[:10]]['_sageutils_civitai_status'] == 'not_found_or_unpublished'


def test_prepare_scan_paths_skips_blacklisted_entries_without_force():
	cache = SimpleNamespace(
		hash={'blocked.safetensors': 'blocked-hash'},
		info={'blocked-hash': {'blacklist': True}},
		load=lambda: None,
	)

	paths, skipped, changed = prepare_scan_paths(
		['blocked.safetensors', 'new.safetensors'],
		cache,
		force=False,
		include_cached=True,
	)

	assert paths == ['new.safetensors']
	assert skipped == 1
	assert changed == set()


def test_prepare_scan_paths_includes_blacklisted_entries_when_forced():
	cache = SimpleNamespace(
		hash={'blocked.safetensors': 'blocked-hash'},
		info={'blocked-hash': {'blacklist': True}},
		load=lambda: None,
	)

	paths, skipped, changed = prepare_scan_paths(
		['blocked.safetensors'],
		cache,
		force=True,
		include_cached=True,
	)

	assert paths == ['blocked.safetensors']
	assert skipped == 0
	assert changed == set()


def test_prepare_scan_paths_includes_cached_file_when_fingerprint_changes(tmp_path):
	model_path = tmp_path / 'changed.safetensors'
	model_path.write_bytes(b'old')
	old_fingerprint = get_file_fingerprint(model_path)
	model_path.write_bytes(b'changed')

	file_path = str(model_path)
	cache = SimpleNamespace(
		hash={file_path: 'cached-hash'},
		info={'cached-hash': {'_sageutils_file_state': {file_path: old_fingerprint}}},
		load=lambda: None,
	)

	paths, skipped, changed = prepare_scan_paths(
		[file_path],
		cache,
		force=False,
		include_cached=False,
	)

	assert paths == [file_path]
	assert skipped == 0
	assert changed == {file_path}


def test_reconcile_cached_paths_classifies_files_without_mutating_cache(tmp_path):
	present_path = tmp_path / 'present.safetensors'
	present_path.write_bytes(b'present')
	changed_path = tmp_path / 'changed.safetensors'
	changed_path.write_bytes(b'old')
	changed_fingerprint = get_file_fingerprint(changed_path)
	changed_path.write_bytes(b'changed')
	missing_path = tmp_path / 'missing.safetensors'
	unknown_path = tmp_path / 'unknown.safetensors'
	unknown_path.write_bytes(b'unknown')

	present_path_string = str(present_path)
	changed_path_string = str(changed_path)
	missing_path_string = str(missing_path)
	unknown_path_string = str(unknown_path)
	cache = SimpleNamespace(
		hash={
			present_path_string: 'present-hash',
			changed_path_string: 'changed-hash',
			missing_path_string: 'missing-hash',
			unknown_path_string: 'unknown-hash',
		},
		info={
			'present-hash': {
				'_sageutils_file_state': {
					present_path_string: get_file_fingerprint(present_path),
				}
			},
			'changed-hash': {
				'_sageutils_file_state': {
					changed_path_string: changed_fingerprint,
				}
			},
			'missing-hash': {},
			'unknown-hash': {},
		},
		load=lambda: None,
	)

	statuses = reconcile_cached_paths(cache)

	assert statuses['present'] == [present_path_string]
	assert statuses['changed'] == [changed_path_string]
	assert statuses['missing'] == [missing_path_string]
	assert statuses['unknown'] == [unknown_path_string]
	assert cache.hash[missing_path_string] == 'missing-hash'


def test_civitai_merge_preserves_local_and_unknown_fields():
	existing = {
		'name': 'My local model name',
		'baseModel': 'My local base model',
		'model': {'name': 'Local model name', 'type': 'LORA', 'custom': 'keep'},
		'trainedWords': ['legacy keyword'],
		'notes': 'Important local notes',
		'favorite': True,
		'is_favorite': True,
		'blacklist': True,
		'custom_field': {'source': 'user'},
	}
	provider_fields = {
		'name': 'Civitai version name',
		'baseModel': 'SDXL 1.0',
		'model': {'name': 'Civitai model name', 'type': 'Checkpoint'},
		'trainedWords': ['provider keyword'],
		'notes': 'Provider notes should not replace local notes',
		'favorite': False,
		'is_favorite': False,
		'blacklist': False,
		'custom_field': {'source': 'provider'},
		'id': 42,
	}

	merged = merge_civitai_metadata(existing, provider_fields)

	assert merged['name'] == 'My local model name'
	assert merged['baseModel'] == 'My local base model'
	assert merged['model'] == {'name': 'Local model name', 'type': 'LORA', 'custom': 'keep'}
	assert merged['trainedWords'] == ['legacy keyword']
	assert merged['notes'] == 'Important local notes'
	assert merged['favorite'] is True
	assert merged['is_favorite'] is True
	assert merged['blacklist'] is True
	assert merged['custom_field'] == {'source': 'user'}
	assert merged['id'] == 42


def test_civitai_merge_populates_missing_ambiguous_fields():
	merged = merge_civitai_metadata({}, {
		'name': 'Provider version',
		'baseModel': 'SDXL 1.0',
		'model': {'name': 'Provider model', 'type': 'Checkpoint'},
		'trainedWords': ['keyword'],
	})

	assert merged['name'] == 'Provider version'
	assert merged['baseModel'] == 'SDXL 1.0'
	assert merged['model'] == {'name': 'Provider model', 'type': 'Checkpoint'}
	assert merged['trainedWords'] == ['keyword']
