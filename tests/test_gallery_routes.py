import json
from pathlib import Path

import pytest
from aiohttp import web
from PIL import Image

from comfyui_sageutils.routes.gallery_routes import register_routes

pytestmark = pytest.mark.asyncio


@pytest.fixture
def app():
    app = web.Application()
    routes = web.RouteTableDef()
    register_routes(routes)
    app.add_routes(routes)
    return app


async def test_list_images_route_custom_folder(app, aiohttp_client, tmp_path):
    image_path = tmp_path / 'test.png'
    image_path.write_bytes(b'\x89PNG\r\n\x1a\n')
    subdir = tmp_path / 'subdir'
    subdir.mkdir()

    client = await aiohttp_client(app)
    response = await client.post(
        '/sage_utils/list_images',
        json={'folder': 'custom', 'path': str(tmp_path)}
    )
    assert response.status == 200
    data = await response.json()
    assert data['success'] is True
    assert data['image_count'] == 1
    assert data['folder_count'] == 1
    assert data['images'][0]['filename'] == 'test.png'
    assert data['folders'][0]['name'] == 'subdir'


async def test_full_image_route_returns_image_bytes(app, aiohttp_client, tmp_path):
    image_path = tmp_path / 'test.png'
    Image.new('RGB', (8, 8), color=(255, 0, 0)).save(image_path, format='PNG')

    client = await aiohttp_client(app)
    response = await client.post('/sage_utils/image', json={'image_path': str(image_path)})

    assert response.status == 200
    assert response.headers['Content-Type'] == 'image/png'
    body = await response.read()
    assert body.startswith(b'\x89PNG')


async def test_browse_directory_tree_route_returns_directories(app, aiohttp_client, tmp_path):
    subdir = tmp_path / 'subdir'
    subdir.mkdir()

    client = await aiohttp_client(app)
    response = await client.post('/sage_utils/browse_directory_tree', json={'path': str(tmp_path)})

    assert response.status == 200
    data = await response.json()
    assert data['success'] is True
    assert data['current_path'] == str(tmp_path)
    assert isinstance(data['directories'], list)
    assert any(d['name'] == 'subdir' for d in data['directories'])


async def test_thumbnail_route_missing_path_returns_400(app, aiohttp_client):
    client = await aiohttp_client(app)
    response = await client.post('/sage_utils/thumbnail', json={})
    assert response.status == 400
    text = await response.text()
    assert 'Image path is required' in text
