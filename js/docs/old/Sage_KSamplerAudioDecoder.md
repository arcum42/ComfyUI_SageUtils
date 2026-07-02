# Sage_KSamplerAudioDecoder

**KSampler + Audio Decoder**

A specialized KSampler node designed for audio generation workflows. It performs sampling on latent audio data and automatically decodes it to audio format, outputting both the denoised latent and decoded audio.

## Inputs

### Required
- **model** (MODEL): The model used for denoising the input latent
- **sampler_info** (SAMPLER_INFO): Most of the KSampler options. Should be piped both here and to the Construct Metadata node
- **positive** (CONDITIONING): The conditioning describing the attributes you want to include in the audio
- **negative** (CONDITIONING): The conditioning describing the attributes you want to exclude from the audio
- **latent_audio** (LATENT): The latent audio to denoise
- **vae** (VAE): The VAE used for decoding the latent audio
- **denoise** (FLOAT): The amount of denoising applied, lower values will maintain the structure of the initial audio allowing for audio to audio sampling (default: 1.0, range: 0.0-1.0)

### Optional

- **advanced_info** (ADV_SAMPLER_INFO): Optional. Adds in the options an advanced KSampler would have

## Outputs

- **LATENT**: The denoised latent
- **AUDIO**: The decoded audio (44.1kHz sample rate with normalized waveform)

## Usage

This node is specifically designed for audio generation workflows using latent diffusion models. It combines the sampling and decoding steps into a single node for convenience.

Key features:

- Automatic audio normalization (scales by 5x standard deviation, minimum 1.0)
- Fixed 44.1kHz sample rate output
- Supports advanced sampling options when connected to Sage_AdvSamplerInfo
- Works with the Sage_SamplerInfo node for consistent workflow integration

## Notes

- The audio output includes automatic normalization to prevent clipping
- This node is optimized for audio generation workflows
- Use with audio-specific VAE models for best results
- The latent_audio input should come from audio-compatible latent sources
