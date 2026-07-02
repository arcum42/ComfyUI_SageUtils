# Sage_CheckLorasForUpdates

**Check Loras for Updates**

Checks LoRAs in your stack for available updates from Civitai and provides download information.

## Inputs

### Required

- **lora_stack** (LORA_STACK): The stack of LoRAs to check for updates
- **force** (BOOLEAN): Force a check for updates, even if the LoRA is up to date (default: False)

## Outputs

- **lora_stack** (LORA_STACK): The original LoRA stack (passed through)
- **path** (STRING): List of local paths for LoRAs that have updates available
- **latest_url** (STRING): List of Civitai URLs for the latest versions of updated LoRAs

## Usage

Use to keep your LoRA library up to date with the latest versions. The node doesn't automatically download updates but provides the information needed to manually update.

## Notes

- Checks each LoRA in the stack against Civitai for newer versions
- Only reports LoRAs that have updates available
- Force option will re-check even recently checked LoRAs
- Returns Civitai URLs in format: `https://civitai.com/models/{modelId}?modelVersionId={versionId}`
- Does not automatically download or replace LoRAs
- Useful for maintenance workflows and keeping models current
- Requires LoRAs to have Civitai metadata for update checking
