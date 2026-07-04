"""Native CLIP support for SageUtils LLM routes."""

from typing import Any

import folder_paths
import nodes as comfy_nodes

from ..logger import get_logger
from .common import clean_response
from .errors import llm_raise

logger = get_logger('llm.native')


def get_native_models() -> list[str]:
    """Return available native CLIP text encoder models."""
    try:
        models = folder_paths.get_filename_list('text_encoders') or []
        return sorted([m for m in models if isinstance(m, str) and m])
    except Exception as e:
        logger.warning(f'Failed to list native CLIP models: {e}')
        return []


def _load_native_clip(clip_name: str):
    """Load a single native CLIP text encoder."""
    try:
        loader = comfy_nodes.CLIPLoader()
        loaded = loader.load_clip(clip_name=clip_name, type='stable_diffusion', device='default')
        if isinstance(loaded, (tuple, list)) and loaded:
            return loaded[0]
        return loaded
    except Exception as e:
        llm_raise(
            RuntimeError,
            f'Failed to load native CLIP model {clip_name}: {e}',
            provider='native',
            operation='load_native_clip',
            cause=e,
        )


def _native_chunk_text(text: str, chunk_size: int = 8):
    """Yield fixed-size chunks for simulated native streaming responses."""
    if not text:
        return
    for i in range(0, len(text), chunk_size):
        yield text[i:i + chunk_size]


def generate_native(model: str, prompt: str, system_prompt: str = '', options: dict[str, Any] | None = None) -> str:
    """Generate text with a native CLIP model."""
    if not model:
        raise ValueError('Missing CLIP model for native provider')

    clip = _load_native_clip(model)
    if clip is None:
        raise RuntimeError(f"Failed to load native CLIP model '{model}'")

    full_prompt = prompt or ''
    if system_prompt:
        full_prompt = f'{system_prompt.strip()}\n\n{full_prompt}'

    opts = options or {}
    seed = int(opts.get('seed', 0) or 0)
    sampling_seed = None if seed < 0 else seed
    max_length = int(opts.get('max_length', opts.get('max_tokens', 256)) or 256)
    max_length = max(1, min(max_length, 4096))

    tokens = clip.tokenize(
        full_prompt,
        skip_template=False,
        min_length=1,
        thinking=bool(opts.get('thinking', False)),
    )
    generated_ids = clip.generate(
        tokens,
        do_sample=bool(opts.get('do_sample', True)),
        max_length=max_length,
        temperature=float(opts.get('temperature', 0.7)),
        top_k=int(opts.get('top_k', 64)),
        top_p=float(opts.get('top_p', 0.95)),
        min_p=float(opts.get('min_p', 0.05)),
        repetition_penalty=float(opts.get('repetition_penalty', 1.05)),
        presence_penalty=float(opts.get('presence_penalty', 0.0)),
        seed=sampling_seed,
    )
    generated_text = clip.decode(generated_ids, skip_special_tokens=True)
    return clean_response(generated_text)


def generate_native_stream(model: str, prompt: str, system_prompt: str = '', options: dict[str, Any] | None = None):
    """Generate a native CLIP response as SSE-style chunk dictionaries."""
    response_text = generate_native(model, prompt, system_prompt=system_prompt, options=options)
    for chunk in _native_chunk_text(response_text):
        yield {
            'chunk': chunk,
            'done': False,
        }
    yield {
        'chunk': '',
        'done': True,
        'full_response': response_text,
    }
