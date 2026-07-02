# Sage_LogicalSwitch

**Switch**

Selects between two inputs based on a boolean condition. Useful for conditional logic in workflows.

## Inputs

- **condition** (BOOLEAN, required): Boolean value to determine which input to select
- **true_value** (ANY, required): Value to return when condition is true
- **false_value** (ANY, required): Value to return when condition is false

## Outputs

- **result** (ANY): The selected value based on the condition

## Usage

Use to route data or control flow based on conditions. When the condition is true, the node outputs `true_value`; when false, it outputs `false_value`. This enables conditional branching in workflows.

## Notes

- Accepts any data type for both value inputs (ANY type)
- Simple if-else logic: condition ? true_value : false_value
- Useful for creating conditional workflows and dynamic data routing
- Both value inputs are required even if only one may be used
