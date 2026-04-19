# AnimatedPlayerName

Animated player-name renderer used in the leaderboard, friends list, 1v1 versus screen, and shop color-picker preview.

```tsx
<AnimatedPlayerName
  name="Abdo"
  colorEffect="rainbow"
  fontSize={18}     // default 18
  fontWeight="700"  // default '700'
  static={false}    // default false — true renders a still first frame
/>
```

## Data source

The `colorEffect` prop is the value of `profiles.username_color` in Supabase. Existing column, already populated — no migration needed. See `sql/animated_name_effects.sql` for the accepted values.

## Supported effects

| id        | behavior                                                             |
| --------- | -------------------------------------------------------------------- |
| `default` | solid white, no animation                                            |
| `red`/`cyan`/`green`/`pink` | solid color, no animation (legacy purchases)           |
| `gold`    | metallic base + bright shimmer sweep (2.5s loop, ~1s pause)          |
| `rainbow` | hue wave across letters (3s) + breathing outer glow (2s)             |
| `neon`    | solid neon core + pulsing glow with occasional flicker (1.8s)        |
| `fire`    | red→orange→yellow drift across letters + gentle opacity flicker (1.5s)|
| `ice`     | cyan→white→cyan drift + two sparkle dots (4s)                        |

## Performance notes

- All animations run via RN's `Animated` API.
- Transform/opacity animations use the native driver; color and `textShadowRadius` interpolations run on JS (necessary for those props).
- Each per-character effect (rainbow/gold/fire/ice) re-renders are avoided by using `flow.interpolate(...)` directly as the `style.color` — the animated driver updates the native view without React re-renders.
- If lists feel heavy, pass `static={true}` to render the first frame as a still image.

## RTL / scripts

- `writingDirection: 'auto'` lets the renderer decide based on the string.
- Per-character effects split the name with `.split('')`, so Arabic ligatures render in isolated form for rainbow/gold/fire/ice. This matches the previous `ColoredUsername` behavior. `neon` is rendered as a single `Text` so Arabic keeps cursive joining there.

## Adding a new effect

1. Create `src/components/AnimatedPlayerName/MyNewName.tsx` — follow the shape of `RainbowName.tsx` (Animated.Value + `useEffect` to start/stop the loop, interpolation in `style`).
2. Add the id to `ColorEffectId` in `effects.ts`.
3. Register the id in the `ANIMATED_EFFECTS` set and the `switch` in `index.tsx`.
4. Add the id to `UsernameColor` + `USERNAME_COLORS` in `../ColoredUsername.tsx` so it shows up in the shop picker.
5. (Optional) Add the id to the CHECK constraint in `sql/animated_name_effects.sql`.

No DB migration is required to add new effects — they're string values in the existing column.
