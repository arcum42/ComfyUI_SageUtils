import asyncio
import json
import sys
import unittest
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import patch

from aiohttp import web

ROOT = Path(__file__).resolve().parent.parent
for name, path in (
    ('comfyui_sageutils', ROOT),
    ('comfyui_sageutils.utils', ROOT / 'utils'),
):
    if name not in sys.modules:
        package = ModuleType(name)
        package.__path__ = [str(path)]
        sys.modules[name] = package

from comfyui_sageutils.routes import notes_routes, wildcard_routes
import comfyui_sageutils.utils as utils


class Request:
    def __init__(self, data):
        self.data = data

    async def json(self):
        return self.data


class FileSaveRoutesTest(unittest.TestCase):
    def test_save_file_accepts_empty_text_and_rejects_invalid_content(self):
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as directory:
            root = Path(directory)
            path_module = ModuleType('comfyui_sageutils.utils.path_manager')
            path_module.path_manager = SimpleNamespace(notes_path=root)
            with patch.dict(sys.modules, {path_module.__name__: path_module}), \
                    patch.object(utils, 'sage_wildcard_path', root, create=True):
                for module, endpoint in (
                    (notes_routes, '/sage_utils/save_note'),
                    (wildcard_routes, '/sage_utils/wildcard/file/save'),
                ):
                    with self.subTest(endpoint=endpoint):
                        routes = web.RouteTableDef()
                        module.register_routes(routes)
                        handler = next(route.handler for route in routes if route.path == endpoint)
                        target = root / 'test.txt'
                        target.write_text('original', encoding='utf-8')

                        for data in (
                            {'filename': 'test.txt'},
                            {'filename': 'test.txt', 'content': None},
                            {'filename': 'test.txt', 'content': 42},
                        ):
                            response = asyncio.run(handler(Request(data)))
                            self.assertEqual(response.status, 400)
                            self.assertEqual(target.read_text(encoding='utf-8'), 'original')

                        for content in ('updated', ''):
                            response = asyncio.run(handler(Request({'filename': 'test.txt', 'content': content})))
                            self.assertEqual(response.status, 200)
                            self.assertTrue(json.loads(response.text)['success'])
                            self.assertEqual(target.read_text(encoding='utf-8'), content)
