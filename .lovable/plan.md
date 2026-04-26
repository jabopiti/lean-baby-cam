## Default Baby Device to rear camera

### Root cause
In `src/routes/baby.tsx` (inside `requestPermissions`), the `getUserMedia` video constraints specify only `width`, `height`, and `frameRate` — no `facingMode`. Mobile browsers default to the front (selfie) camera in this case, which is wrong for a baby monitor pointed at the crib.

### Change
Update the video constraint object to request the rear camera:

```ts
video: {
  facingMode: { ideal: "environment" },
  width: { ideal: 854 },
  height: { ideal: 480 },
  frameRate: { ideal: 15 },
},
```

### Why `ideal` (not `exact`)
- `{ ideal: "environment" }` — browser picks the rear camera when available, gracefully falls back on laptops/desktops with only a front webcam.
- `{ exact: "environment" }` would throw `OverconstrainedError` on devices without a rear camera, breaking desktop pairing entirely.

### Out of scope
- No camera-switching UI (front/rear toggle).
- No changes to audio constraints, resolution, or framerate.
- Parent Device unchanged (it doesn't capture camera).

### Files touched
- `src/routes/baby.tsx` — single constraint object update inside `requestPermissions`.

### Verification
- Type check remains clean (standard `MediaTrackConstraints` shape).
- On a phone, the Baby route's local preview shows the rear camera after granting permissions.
- On a laptop with only a front webcam, pairing still succeeds.
