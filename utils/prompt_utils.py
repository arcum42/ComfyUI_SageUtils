"""Prompt and text utility helpers extracted from helpers.py."""

import datetime
import pathlib
import re

import folder_paths
import torch
import comfy.model_management

from .logger import get_logger

logger = get_logger('utils.prompt_utils')


def normalize_prompt_weights(text):
    """Parse and normalize text prompts with weight formatting."""
    open_count = text.count('(')
    close_count = text.count(')')

    if open_count > close_count:
        text = text + ')' * (open_count - close_count)
    elif close_count > open_count:
        text = '(' * (close_count - open_count) + text

    def parse_weighted_text(value):
        result = []
        i = 0

        while i < len(value):
            paren_start = value.find('(', i)

            if paren_start == -1:
                if i < len(value):
                    result.append((value[i:], 1.0, False))
                break

            if paren_start > i:
                result.append((value[i:paren_start], 1.0, False))

            paren_depth = 0
            j = paren_start

            while j < len(value):
                if value[j] == '(':
                    paren_depth += 1
                elif value[j] == ')':
                    paren_depth -= 1
                    if paren_depth == 0:
                        break
                j += 1

            if paren_depth != 0:
                result.append((value[i:], 1.0, False))
                break

            content = value[paren_start + 1:j]
            weight_match = re.match(r'^(.*?):\s*([0-9]*\.?[0-9]+)\s*$', content)

            if weight_match:
                inner_content = weight_match.group(1).strip()
                weight = float(weight_match.group(2))
                result.append((inner_content, weight, True))
            else:
                nested_parts = parse_weighted_text(content)
                for nested_content, nested_weight, is_explicit in nested_parts:
                    result.append((nested_content, nested_weight + 0.1, is_explicit))

            i = j + 1

        return result

    def format_output(parts):
        output = []

        for content, weight, is_explicit in parts:
            weight = round(weight, 10)

            if '(' in content:
                formatted = format_output(parse_weighted_text(content))
                if weight == 1.0:
                    output.append(formatted)
                elif weight == 1.1:
                    output.append(f'({formatted})')
                else:
                    output.append(f'({formatted}:{weight})')
            else:
                content = content.strip()
                if content:
                    if weight == 1.0:
                        output.append(content)
                    elif weight == 1.1:
                        output.append(f'({content})')
                    else:
                        output.append(f'({content}:{weight})')

        return ' '.join(output)

    parts = parse_weighted_text(text)
    result = format_output(parts)

    result = re.sub(r' +', ' ', result)
    result = re.sub(r',\s*', ', ', result)
    result = re.sub(r'\(\s+', '(', result)
    result = re.sub(r'\s+\)', ')', result)
    result = re.sub(r'\)\s+', ')', result)
    result = re.sub(r'\)(?=[a-zA-Z0-9(])', ') ', result)
    result = re.sub(r'\n\s*\n\s*\n+', '\n\n', result)

    return result.strip()


def clean_keywords(keywords):
    keywords = set(filter(None, (x.strip() for x in keywords)))
    return ', '.join(keywords)


def clean_text(text):
    return normalize_prompt_weights(text)


def clean_if_needed(text, clean):
    return clean_text(text) if clean and text is not None else text


def condition_text(clip, text=None):
    zero_text = text is None
    text = text or ''

    tokens = clip.tokenize(text)
    output = clip.encode_from_tokens(tokens, return_pooled=True, return_dict=True)
    cond = output.pop('cond')
    device = comfy.model_management.intermediate_device()
    dtype = comfy.model_management.intermediate_dtype()

    if zero_text:
        pooled_output = output.get('pooled_output')
        if pooled_output is not None:
            output['pooled_output'] = torch.zeros_like(pooled_output, device=device, dtype=dtype)
        return [[torch.zeros_like(cond, device=device, dtype=dtype), output]]

    return [[cond, output]]


def get_save_file_path(filename_prefix: str = 'text', filename_ext: str = 'txt') -> str:
    """Generate a safe file path for saving files with automatic counter increment."""

    def _extract_counter_from_filename(filename: str) -> tuple[int, str]:
        base_name = pathlib.Path(filename_prefix).name
        prefix_len = len(base_name)

        if len(filename) <= prefix_len + 1:
            return 0, filename[:prefix_len + 1]

        prefix = filename[:prefix_len + 1]
        try:
            filename_no_ext = pathlib.Path(filename).stem
            counter_part = filename_no_ext[prefix_len + 1:]
            digits = int(counter_part)
        except (ValueError, IndexError):
            digits = 0
        return digits, prefix

    def _replace_date_variables(text: str) -> str:
        now = datetime.datetime.now()
        replacements = {
            '%year%': str(now.year),
            '%month%': str(now.month).zfill(2),
            '%day%': str(now.day).zfill(2),
            '%hour%': str(now.hour).zfill(2),
            '%minute%': str(now.minute).zfill(2),
            '%second%': str(now.second).zfill(2),
        }

        for placeholder, value in replacements.items():
            text = text.replace(placeholder, value)
        return text

    output_dir = folder_paths.get_output_directory()

    if '%' in filename_prefix:
        filename_prefix = _replace_date_variables(filename_prefix)

    filename_prefix_path = pathlib.Path(filename_prefix)
    subfolder = filename_prefix_path.parent
    base_filename = filename_prefix_path.name

    output_path = pathlib.Path(output_dir)
    full_output_folder = output_path / subfolder

    try:
        full_output_folder.resolve().relative_to(output_path.resolve())
    except ValueError:
        error_msg = (
            'ERROR: Saving outside the output folder is not allowed.\n'
            f'  Target folder: {full_output_folder.resolve()}\n'
            f'  Output directory: {output_path.resolve()}'
        )
        logger.error(error_msg)
        raise ValueError(error_msg)

    full_output_folder.mkdir(parents=True, exist_ok=True)

    counter = 1
    try:
        existing_files = [f.name for f in full_output_folder.iterdir() if f.is_file()]
        matching_counters = []

        for file in existing_files:
            digits, prefix = _extract_counter_from_filename(file)
            if (prefix[:-1].lower() == base_filename.lower() and len(prefix) > 0 and prefix[-1] == '_'):
                matching_counters.append(digits)

        if matching_counters:
            counter = max(matching_counters) + 1

    except Exception as e:
        logger.warning(f'Error finding existing files, using counter=1: {e}')
        counter = 1

    final_filename = f'{base_filename}_{counter:05d}.{filename_ext}'
    return str(full_output_folder / final_filename)


def unwrap_tuple(value):
    """Unwrap single-item tuples to their contained value."""
    return value[0] if isinstance(value, tuple) and len(value) == 1 else value
