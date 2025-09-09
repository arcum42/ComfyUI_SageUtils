# Reports Directory

This directory contains modules responsible for generating various types of reports within SageUtils.

## Files

### reportGenerator.js

**Purpose**: HTML report generation for model collections  
**Lines**: 677  
**Complexity**: High  

**Key Functions:**

- `generateHtmlReport(allModels, reportConfig)`: Main report generation
- `createReportHeader(reportConfig, modelStats)`: Creates report header with statistics
- `formatModelRow(model, config)`: Formats individual model table rows
- `addSortingJavaScript()`: Adds interactive sorting functionality
- `getFileSize(filePath)`: Retrieves file size from server

**Features:**

- **Interactive Sorting**: Client-side table sorting with visual indicators
- **Responsive Design**: Mobile-friendly report layout
- **Image Integration**: Automatic image loading from Civitai
- **Filter Integration**: Reflects current filter settings in report
- **Statistics**: Model count and distribution statistics

**Dependencies:**

- `../shared/civitai.js` - For Civitai API integration
- `../shared/constants.js` - For configuration constants and utility functions

**Usage**: Imported by sidebar components and other modules that need to generate HTML reports for model collections.

## Architecture

The reports directory is organized to separate reporting functionality from core shared utilities:

```text
js/reports/
└── reportGenerator.js (depends on ../shared/civitai.js, ../shared/constants.js)
```

## Development Guidelines

When adding new report types or generators:

1. Follow the established pattern of exporting functions for report generation
2. Maintain consistency with the existing HTML styling and JavaScript features
3. Ensure proper dependency management with shared utilities
4. Include comprehensive JSDoc comments for all public functions
5. Consider performance implications for large model collections

## Future Enhancements

Potential additions to this directory could include:

- CSV/Excel report generators
- PDF report generators
- Custom report templates
- Report scheduling and automation features
