# Fragments Viewer

## Overview
A 3D BIM/IFC fragments viewer built with Three.js and the That Open Company's components library. This project allows visualization of Building Information Modeling (BIM) data.

## Project Structure
- `source/` - TypeScript source files
- `public/` - Built output and static HTML
- `docs/` - Documentation/demo build
- `esbuild.config.js` - Build configuration

## Build System
- **Bundler**: esbuild
- **Language**: TypeScript
- **Commands**:
  - `npm run start` - Start dev server on port 5000
  - `npm run build` - Build for production
  - `npm run publish` - Build and copy to docs folder

## Key Dependencies
- @thatopen/components - BIM component library
- @thatopen/fragments - Fragment loading library
- @thatopen/ui - UI components
- three - 3D rendering

## Development
The dev server runs on port 5000 using esbuild's built-in serve mode with hot reloading.

## Deployment
Configured as a static site deployment with `public/` as the output directory.
