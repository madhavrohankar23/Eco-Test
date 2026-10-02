# 🌿 Eco-Move Nagpur
### Intelligent Multimodal Public Transit & Carbon-Aware Journey Planner

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_Auth-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)

**Eco-Move Nagpur** is an advanced, WebGIS-powered multimodal urban transit planner designed specifically for Nagpur City, Maharashtra. Conceptualized like Google Maps but specialized for sustainable public transit, the platform connects **Pedestrian Walking, Aapli Bus corridors, and Nagpur Metro (Orange and Blue Lines)** into unified, multi-criteria optimized itineraries.

---

## 🚀 Key Highlights & Features

* **🧠 State-Aware A* Pathfinding:** Implements an admissible graph search algorithm that tracks physical nodes, active transit lines, and transfer penalties simultaneously.
* **🌐 2D Spatial Hash Grid Indexing:** Replaces slow O(n²) pairwise distance checks with an O(1) constant-time spatial bucketing grid (~800m cells) for sub-millisecond transfer walk discovery.
* **⚖️ 4D Pareto Frontier Optimization:** Computes non-dominated journey trade-offs balancing **Travel Time, Walking Fatigue, Number of Transfers, and CO₂ Emissions** without arbitrary linear weighting bias.
* **🛣️ Realistic Vector Geometry:** Slices high-resolution vector road and viaduct polylines (`lineGeometries.json`) to render realistic curved transit paths that follow actual Nagpur roads.
* **🌿 Real-Time Carbon Footprint Modeling:** Quantifies modal carbon emissions (15 g/km Metro, 68 g/km Bus) and calculates net green savings against private car baselines (192 g/km).
* **🗺️ Interactive WebGIS Interface:** Built on Leaflet and Google Maps raster tiles, featuring pulsing GPS location dots, boarding/alighting station badges, interactive layer toggles, and step-by-step itineraries.
* **🔐 Secure Supabase Authentication:** Fully protected transit dashboard with Email/Password, Mobile login, and **Google One-Click OAuth 2.0**.

---

## 🏗️ System Architecture & Data Flow

```
Commuter Input (Origin, Destination, Preference)
       │
       ▼
[ PlaceSearch Autocomplete / GPS Geolocation ]
       │
       ▼
[ SpatialIndex 2D Hash Grid ] ──> Fast O(1) Candidate Hubs
       │
       ▼
[ State-Aware A* Search (src/lib/routing.ts) ]
       ├── Graph: network.json (20 Bus Routes + 2 Metro Lines)
       ├── Pedestrian Routing: OpenRouteService (ORS) API
       └── Heuristic: h(n) = Haversine(n, dest) / 32 km/h
       │
       ▼
[ 4D Pareto Dominance Filter ] ──> Generates OPTION 1, OPTION 2
       │
       ▼
[ Leaflet GIS MapView & Step-by-Step Itinerary Dashboard ]
```

---

## 🧮 Algorithmic & Mathematical Specifications

### 1. State-Aware Graph Key
In our transit graph, nodes are state tuples:
$$\text{State Key} = (\text{Stop ID}) \mathbin{\Vert} (\text{Line ID}) \mathbin{\Vert} (\text{Transfer Count})$$

### 2. A* Evaluation Formula (f(n) = g(n) + h(n))
* **g(n) (Accumulated Cost):** Sum of elapsed walking time, vehicle transit time, boarding wait times, and transfer penalties.
* **h(n) (Admissible Heuristic):**
  $$h(n) = \left( \frac{\text{HaversineDistance}(n, \text{Destination})}{v_{\max}} \right) \times 60$$
  where $v_{\max} = 32.0\text{ km/h}$ (Nagpur Metro commercial speed). Since no transport mode exceeds $32\text{ km/h}$, $h(n) \le h^*(n)$ always holds true, guaranteeing shortest path optimality.

### 3. Model Constants & Speeds
| Parameter | Configured Value | Description |
|---|---|---|
| **Walking Speed** | `4.8 km/h` (1.33 m/s) | Standard urban pedestrian pace |
| **Aapli Bus Speed** | `17.0 km/h` | Nagpur road traffic average |
| **Metro Speed** | `32.0 km/h` | Commercial rapid rail average |
| **Bus Initial Wait** | `5.0 min` | Average headway at bus stops |
| **Metro Initial Wait**| `4.0 min` | Average platform headway |
| **Transfer Penalty** | `3.0 min` | Buffer time added per mode switch |
| **Max First/Last Walk** | `1,500 m` (1.5 km) | Maximum walking radius to transit |
| **Max Transfer Walk** | `700 m` (0.7 km) | Maximum walk to switch lines |
| **Metro CO₂** | `22 g/km` | Electric rail per passenger-km |
| **Bus CO₂** | `68 g/km` | Shared public transit bus |
| **Car Baseline CO₂** | `192 g/km` | Private ICE vehicle benchmark |

---

## 📁 Codebase Directory Structure

```
Eco-Move_Nagpur FYP/
├── public/                 # Favicons, background video & static assets
├── src/
│   ├── components/         # Reusable UI & Map components
│   │   ├── MapView.tsx         # Leaflet + Google Maps tile renderer & polylines
│   │   ├── PlaceSearch.tsx     # Fuzzy autocomplete search for 300+ stops
│   │   ├── ProtectedRoute.tsx  # Auth gatekeeper redirecting non-logged-in traffic
│   │   ├── Hero.tsx            # Video background hero & CTA
│   │   ├── Navbar.tsx          # Floating brand badge header
│   │   └── ui/                 # shadcn/ui design system primitives
│   ├── context/
│   │   └── AuthContext.tsx     # Supabase auth session & Google OAuth state
│   ├── data/
│   │   ├── network.json        # 20 Bus routes, 2 Metro lines, 300+ stop coordinates
│   │   └── lineGeometries.json # High-density curved road and track vectors
│   ├── lib/
│   │   ├── routing.ts          # Core A* search, SpatialIndex & 4D Pareto Engine
│   │   ├── nearby.ts           # Radial stop proximity search
│   │   ├── ors.ts              # OpenRouteService pedestrian walking client
│   │   ├── nagpurPlaces.ts     # Nagpur landmarks & presets database
│   │   └── utils.ts            # Tailwind class merger utility
│   ├── routes/
│   │   ├── __root.tsx          # Root shell layout with Auth & Theme providers
│   │   ├── index.tsx           # Public Landing Page ("/")
│   │   ├── app.tsx             # Protected Multimodal Transit Planner ("/app")
│   │   ├── login.tsx           # Sign In with Email, Phone, or Google
│   │   └── signup.tsx          # Account registration with password checklist
│   ├── supabaseClient.ts   # Live Supabase client connection
│   └── styles.css          # Global Tailwind CSS v4 & Inter font definition
├── .env                    # Secret Supabase project URL & API keys
├── package.json            # Dependencies and build scripts
├── tsconfig.json           # TypeScript configuration & "@/*" path alias
└── vite.config.ts          # Vite bundler & TanStack Start config
```

---

## ⚙️ Installation & Local Setup

### Prerequisites
* **Node.js**: `v20.0.0` or higher
* **npm**: `v10.0.0` or higher

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/eco-move-nagpur.git
cd eco-move-nagpur
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🚌 Adding New Bus Routes (Zero-Code Extensibility)

Append new bus corridors directly into `src/data/network.json`:

```json
{
  "route": "Sitabuldi - Hingna",
  "stops": [
    { "name": "Sitabuldi", "lat": 21.141195, "lon": 79.079900 },
    { "name": "Law College Chowk", "lat": 21.146782, "lon": 79.062013 },
    { "name": "Hingna Gramin Hospital", "lat": 21.074312, "lon": 78.954803 }
  ]
}
```

---

## 👥 Project & Institutional Affiliation

* **Project:** Final Year Project (FYP) — Department of Computer Science & Engineering
* **Institution:** G.H. Raisoni College of Engineering (GHRE), Nagpur
* **Domain:** Intelligent Transportation Systems (ITS), Sustainable Urban Mobility
