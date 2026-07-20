# Nexaflow Smart AC Controller - Web UI Dashboard

This is the Next.js frontend web interface for managing multi-property Smart AC Remote hardware devices.

## Key Features

- **Property & Room Console**: Real-time management of properties, floors, rooms, and climate telemetry.
- **AC Controls**: Interactive dial controls for temperature, operating mode (Cool, Heat, Fan, Auto, Dry), fan speed, and power toggles.
- **Brand Auto-Detection**: Auto-detect AC brand profiles directly from physical remotes using hardware TSOP IR receivers.
  - Triggered via the **Room Settings** modal when a device is online.
  - Interactive 30-second listening window with high-frequency status polling and automatic selection of decoded IR protocols (Daikin, Mitsubishi, Panasonic, LG, Samsung, Voltas/Kelon, Hitachi, Carrier, Toshiba, Midea, Gree, Coolix).
- **Live Device Telemetry Logs**: MQTT web console for real-time debugging and payload verification.

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to launch the dashboard console.
