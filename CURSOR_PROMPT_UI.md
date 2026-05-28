# Cursor prompt — Native iOS UI layer

## Context

remindifier-rn er en Expo SDK 54 / React Native-app med NativeWind v4 og et etablert
designsystem (sand/slate tema, Lora + DM Sans, CSS-variabler via `global.css`).

Cursor har allerede bygget:
- Tab-navigasjon (`app/(tabs)/`), Clerk-auth, Drizzle + SQLCipher
- ThemeProvider (`src/theme/ThemeProvider.tsx`) med `darkMode: 'class'`
- BriefCard, AppShell, ThemeToggle i `src/ui/`
- Brief + People screens med reell data fra SQLite

**Ikke rør:**
- `tailwind.config.js` — CSS-variabel-tilnærmingen (`var(--bg)` etc.) er gyldig i NativeWind v4
- `global.css` — `:root` (sand) og `.dark` (slate) token-definisjoner er korrekte
- `ThemeProvider.tsx` — `.dark`-klasse på root View fungerer korrekt med NativeWind
- Eksisterende skjermkomponenter — vi bygger *under* dem, ikke om dem

---

## Oppgave

Installer og integrer to pakker, og bygg et sett delte UI-primitiver som gir appen
Apple-feel uten å ta over designsystemet.

---

## Steg 1 — Installer pakker

```bash
npx expo install @expo/ui @shopify/flash-list
```

- `@expo/ui`: Expo SDK 54-kompatibel. Gir SwiftUI-renderte sheets, knapper og
  pickers på iOS. Eksisterende `View`/`Text`-komponenter er uberørt.
- `@shopify/flash-list`: Drop-in erstatning for `FlatList` med native ytelse.
  Viktig for People-listen når den vokser.

---

## Steg 2 — Felles UI-primitiver i `src/ui/`

Opprett eller oppdater disse filene. Bruk kun NativeWind-klasser (`bg-card`,
`text-text1`, `rounded-lg` etc.) — aldri hardkodede hex-farger eller inline styles
for farger. Inline styles er OK for layout der Tailwind ikke strekker til.

### `src/ui/Card.tsx`

```tsx
// Standard innholdskort. Matcher web: bg-card, border-border, rounded-lg (20px).
// Valgfri venstre accent-stripe via prop: stripe?: "blue"|"amber"|"red"|"green"|"default"
// Stripe implementeres som en absolutt posisjonert View (w-[3px], full høyde, venstre kant).
// Ingen drop shadow på flate kort.
interface CardProps {
  stripe?: "blue" | "amber" | "red" | "green" | "dusk" | "default";
  children: React.ReactNode;
  style?: ViewStyle;
}
```

### `src/ui/Tag.tsx`

```tsx
// Liten etikett/chip. Varianter: "amber", "green", "blue", "dusk", "red"
// bg-amberLight text-amber rounded-[10px] px-3 py-1 text-xs font-bodySemi
interface TagProps {
  variant: "amber" | "green" | "blue" | "dusk" | "red";
  children: string;
}
```

### `src/ui/SectionLabel.tsx`

```tsx
// Seksjonsoverskrift: 11px, uppercase, letter-spacing 0.12em, font-bodySemi, text-text3
// Matcher web .section-label
interface SectionLabelProps {
  children: string;
  style?: TextStyle;
}
```

### `src/ui/Button.tsx`

```tsx
// Primær: bg-accent text-white rounded-lg
// Sekundær: bg-card border-border text-text1 rounded-lg
// Ghost: transparent, text-accent
// Bruk Pressable (ikke TouchableOpacity) for native press-feedback
interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
}
```

### `src/ui/BottomSheet.tsx`

```tsx
// Bruk @expo/ui sin Sheet-komponent (iOS: native SwiftUI sheet).
// Android fallback: Modal med animasjon nedenfra.
// Eksporter useBottomSheet-hook for kontroll utenfra.
//
// import { Sheet } from "@expo/ui";  ← iOS native
// Wrapper som håndterer iOS vs Android automatisk via Platform.OS.
interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  title?: string;
}
```

---

## Steg 3 — Bytt FlatList → FlashList

I alle eksisterende filer som bruker `FlatList` fra `react-native`:
- Erstatt `import { FlatList } from "react-native"` med
  `import { FlashList } from "@shopify/flash-list"`
- Legg til `estimatedItemSize` prop (bruk 80 som default for personkort)
- API er identisk ellers

---

## Steg 4 — Bruk @expo/ui for én konkret interaksjon

Velg confirm-dialogen ved sletting av timeline-entry (eksisterer allerede i People-
skjermen) og erstatt eventuell Alert.alert med en `@expo/ui`-basert Sheet:

```tsx
// Erstatt:
Alert.alert("Slett notat?", "...", [...])

// Med:
<BottomSheet visible={showConfirm} onDismiss={() => setShowConfirm(false)} title="Slett notat?">
  <Text>Dette kan ikke angres.</Text>
  <Button variant="primary" onPress={handleDelete}>Slett</Button>
  <Button variant="ghost" onPress={() => setShowConfirm(false)}>Avbryt</Button>
</BottomSheet>
```

---

## Steg 5 — Oppdater `src/ui/index.ts`

Eksporter alle primitiver fra ett sted:

```ts
export { Card } from "./Card";
export { Tag } from "./Tag";
export { SectionLabel } from "./SectionLabel";
export { Button } from "./Button";
export { BottomSheet } from "./BottomSheet";
// behold eksisterende eksporter
```

---

## Kvalitetskrav

- `npm run typecheck` skal passere uten feil
- `npm run lint` (Biome) skal passere uten feil
- Ingen hardkodede hex-farger i nye filer
- Ingen `any`-typer
- Alle nye komponenter er kompatible med både sand og slate tema
- Test visuelt i Expo Go på device i begge temaer

## Ikke gjør

- Ikke installer react-native-paper eller react-native-ios-kit
- Ikke endre tailwind.config.js eller global.css
- Ikke refaktorer eksisterende skjermer utover FlatList → FlashList-bytte
- Ikke legg til animasjonsbiblioteker (react-native-reanimated er OK om det allerede finnes)
