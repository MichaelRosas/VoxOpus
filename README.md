# VoxOpus

Run all commands from the project root.

## Install

```bash
npm install
```

## Development

Start each workspace in a separate terminal:

```bash
npm run dev --workspace shared
```

```bash
npm run dev --workspace backend
```

```bash
npm run dev --workspace frontend
```

## Checks

```bash
npm run typecheck --workspace shared
npm run typecheck --workspace backend
npm run lint --workspace frontend
npm run build --workspace frontend
```

## Build

```bash
npm run build --workspace shared
npm run build --workspace backend
npm run build --workspace frontend
```

## Run Builds

```bash
npm start --workspace backend
```

```bash
npm run preview --workspace frontend
```
