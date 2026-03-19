# RikiTraki

RikiTraki is a geospatial web application for viewing GPS tracks and photos on a 3D globe. It provides a personal space for user data and a global view of public tracks. The system follows a simple rule: **fetch only the data relevant to the current search center**.

This repository contains the frontend, client‑side logic, and geospatial utilities.

---

## Overview

RikiTraki uses a **search‑center–driven data model**. The client maintains a search center (lat/lon) and requests only the nearest tracks and photos within a computed radius. This avoids global preloading and keeps memory and network usage predictable.

Version 2.0 removes the previous 2D/3D split and runs entirely on **CesiumJS**, simplifying rendering and reducing reloads.

---

## Core Concepts

### Search Center
All data requests originate from a search center:

- user interaction updates the center  
- the client computes a radius based on nearby tracks  
- the backend returns only data within that radius  

This keeps the system scalable and avoids unnecessary queries.

### Personal Spaces
Each user has a `/username` namespace.  
Personal tracks and photos are isolated from global data but follow the same indexing and rendering pipeline.

### Terrain Alignment
Tracks are draped over Cesium terrain to avoid floating/buried geometry and to produce accurate elevation profiles.

### Minimal Reloading
Most state transitions (search center changes, track selection, photo browsing) occur client‑side without full page reloads.

### Alpine.js for UI State
Alpine.js handles lightweight reactive state:

- modal visibility  
- track selection  
- search center updates  
- small UI interactions  

This avoids the overhead of a full SPA framework.

---

## What’s New in 2.0

- unified Cesium‑based 3D map  
- personal *username spaces*  
- improved track/photo upload pipeline  
- automatic region detection  
- terrain‑aligned rendering  
- fewer reloads and smoother state transitions  
- Alpine.js‑based UI components  
- improved performance on mobile and desktop  

---

## Tech Stack

### Frontend
- **Astro** for routing and templating  
- **CesiumJS** for 3D globe rendering  
- **Alpine.js** for reactive UI state  

### Backend
Backend is implemented as AWS Lambda functions with DynamoDB as the datastore.

Backend repository:  
**https://github.com/jimmyangel/rikitrakilambda**

The frontend communicates with the backend through a small set of stable API endpoints returning normalized track and photo data.

### Storage & Geospatial Utilities
- **S3‑compatible storage** for tracks and photos  
- Custom utilities for:  
  - region detection  
  - distance calculations  
  - track normalization  
  - photo alignment  
  - search‑center radius computation  

The system avoids heavy GIS servers.

---

## Project Structure (conceptual)


```

src/
  components/        UI elements (modals, panels, widgets)
  content/           Markdown-driven static content
  images/            Static image assets
  layouts/           Base Astro layouts
  pages/             Public routes and entry points
  scripts/           Alpine plugins, data access, mapper, stores, utils, vendor
  styles/            CSS/SCSS and vendor styles
  types/             TypeScript definitions

root/
  config/            Astro, TypeScript, workspace configs
  package/           Node package definitions and lockfile

```


---

## Development Notes

- Tracks are stored as raw GPX with optional metadata.  
- Photos are indexed by timestamp and approximate location.  
- Region detection uses a compact polygon set rather than a full GIS database.  
- Cesium entities are generated on demand based on the current search center.  
- Alpine.js handles small reactive UI states.  
- UI avoids unnecessary re-renders and minimizes global state.

---

## Feedback

Issues and suggestions:

- GitHub Issues: <https://github.com/jimmyangel/rikitraki/issues>  
- Twitter: <https://twitter.com/jimmieangel>  
- Blog: <https://morinricardo.com>  

---

*This project was developed with the assistance of Microsoft Copilot.*

