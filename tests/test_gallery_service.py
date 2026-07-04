import os
from pathlib import Path
import pytest
from PIL import Image

from comfyui_sageutils.utils.gallery_service import (
    check_dataset_text,
    delete_images,
    find_duplicates,
    get_full_image_bytes,
    get_image_metadata,
    get_thumbnail_bytes,
    list_images,
    read_dataset_text,
    save_dataset_text,
    browse_folder,
    browse_directory_tree,
)


def create_test_image(path: Path, size=(64, 64), color=(0, 128, 255)):
    img = Image.new('RGB', size, color=color)
    img.save(path, format='PNG')


def test_list_images_custom_folder(tmp_path):
    image_path = tmp_path / 'test.png'
    create_test_image(image_path)
    text_path = tmp_path / 'note.txt'
    text_path.write_text('not an image', encoding='utf-8')
    subdir = tmp_path / 'subdir'
    subdir.mkdir()

    result = list_images('custom', str(tmp_path))
    assert result['folder'] == 'custom'
    assert result['path'] == str(tmp_path)
    assert result['image_count'] == 1
    assert result['folder_count'] == 1
    assert result['images'][0]['filename'] == 'test.png'
    assert result['folders'][0]['name'] == 'subdir'


def test_get_thumbnail_bytes_returns_jpeg(tmp_path):
    image_path = tmp_path / 'test.png'
    create_test_image(image_path)

    thumbnail_data = get_thumbnail_bytes(str(image_path), 'small')
    assert isinstance(thumbnail_data, bytes)
    assert thumbnail_data.startswith(b'\xff\xd8\xff')


def test_get_image_metadata_returns_expected_fields(tmp_path):
    image_path = tmp_path / 'test.png'
    create_test_image(image_path)

    metadata = get_image_metadata(str(image_path))
    assert metadata['file_info']['filename'] == 'test.png'
    assert metadata['file_info']['dimensions']['width'] == 64
    assert metadata['file_info']['dimensions']['height'] == 64
    assert metadata['exif'] == {}
    assert isinstance(metadata['generation_params'], dict)


def test_get_image_metadata_sanitizes_bytes(tmp_path):
    image_path = tmp_path / 'test.jpg'
    create_test_image(image_path)

    # Add EXIF bytes metadata in a real Pillow-compatible way
    with Image.open(image_path) as img:
        exif = img.getexif()
        exif[0x9286] = b'hello'  # UserComment tag
        img.save(image_path, format='JPEG', exif=exif)

    metadata = get_image_metadata(str(image_path))
    assert metadata['exif']['UserComment'] == 'hello'

    # Ensure metadata is JSON serializable for route responses.
    import json
    json.dumps(metadata)


def test_dataset_text_lifecycle(tmp_path):
    image_path = tmp_path / 'test.png'
    create_test_image(image_path)

    check = check_dataset_text(str(image_path))
    assert check['exists'] is False
    assert check['text_path'].endswith('.txt')

    saved = save_dataset_text(str(image_path), 'hello world')
    assert saved['message'] == 'Text file saved successfully'
    assert Path(saved['text_path']).read_text(encoding='utf-8') == 'hello world'

    read = read_dataset_text(str(image_path))
    assert read['content'] == 'hello world'


def test_browse_folder_accessible(tmp_path):
    image_path = tmp_path / 'test.png'
    create_test_image(image_path)

    result = browse_folder(str(tmp_path))
    assert result['valid'] is True
    assert result['accessible'] is True
    assert result['image_count'] == 1


def test_browse_directory_tree(tmp_path):
    subdir = tmp_path / 'subdir'
    subdir.mkdir()
    (subdir / 'dummy.txt').write_text('dummy', encoding='utf-8')

    result = browse_directory_tree(str(tmp_path), max_depth=1)
    assert result['current_path'] == str(tmp_path)
    assert isinstance(result['directories'], list)
    assert any(d['name'] == 'subdir' for d in result['directories'])


def test_find_duplicates_detects_duplicate_files(tmp_path):
    image1 = tmp_path / 'a.png'
    image2 = tmp_path / 'b.png'
    image3 = tmp_path / 'c.png'
    create_test_image(image1, color=(1, 2, 3))
    create_test_image(image2, color=(1, 2, 3))
    create_test_image(image3, color=(5, 6, 7))

    result = find_duplicates(str(tmp_path), include_subfolders=False)
    assert result['total_images'] == 3
    assert result['total_duplicates'] == 1
    assert len(result['duplicates']) == 1
    duplicates = result['duplicates'][0]
    assert {Path(item['path']).name for item in duplicates} == {'a.png', 'b.png'}


def test_delete_images_removes_files(tmp_path):
    a = tmp_path / 'a.png'
    b = tmp_path / 'b.png'
    create_test_image(a)
    create_test_image(b)

    result = delete_images([str(a), str(b)])
    assert result['deleted'] == 2
    assert result['failed'] == 0
    assert not a.exists()
    assert not b.exists()


def test_get_full_image_bytes_content_type(tmp_path):
    image_path = tmp_path / 'test.png'
    create_test_image(image_path)

    result = get_full_image_bytes(str(image_path))
    assert result['content_type'] == 'image/png'
    assert isinstance(result['body'], bytes)
    assert len(result['body']) > 0


def test_list_images_invalid_folder_type_raises_value_error():
    with pytest.raises(ValueError):
        list_images('invalid_folder')
