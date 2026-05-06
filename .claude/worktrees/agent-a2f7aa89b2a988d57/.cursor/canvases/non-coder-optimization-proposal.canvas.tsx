// @ts-nocheck — Cursor canvas runtime provides `cursor/canvas`; this file is not part of apps/web.
/// <reference path="./cursor-canvas.d.ts" />
import { Card, CardBody, CardHeader, Divider, Grid, H1, H2, Stack, Text, useHostTheme } from "cursor/canvas";

export default function NonCoderOptimizationProposal() {
  const theme = useHostTheme();

  return (
    <Stack gap={24} padding={24}>
      <Stack gap={8}>
        <H1>Proposal: Bridge the Gap for Non-Coders</H1>
        <Text tone="secondary">Strategisch voorstel om Chain Hub toegankelijk te maken voor een breder publiek.</Text>
      </Stack>

      <Divider />

      <Grid columns={2} gap={20}>
        <Card>
          <CardHeader>
            <Text weight="bold">Huidige Focus (Technisch)</Text>
          </CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text size="small">• Symlinks & Config paden</Text>
              <Text size="small">• CLI Commands (npm, setup, init)</Text>
              <Text size="small">• Developer Editors (Cursor, Windsurf, Antigravity, …)</Text>
              <Text size="small">• "Single Source of Truth" (Jargon)</Text>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Text weight="bold" color={theme.textAccent}>
              Nieuwe Focus (Toegankelijk)
            </Text>
          </CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text size="small">• "Eén Brein voor al je AI"</Text>
              <Text size="small">• Visuele installatie (Web/Desktop)</Text>
              <Text size="small">• Gebruikers: Copywriters, PMs, Creators</Text>
              <Text size="small">• Voordelen: Consistentie & Tijdwinst</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <H2>Geadviseerde Aanpassingen</H2>

      <Stack gap={16}>
        <Stack gap={4}>
          <Text weight="bold">1. Herzie de "Hero" Sectie</Text>
          <Text size="small" tone="secondary">
            Vervang technisch jargon door resultaatgerichte taal. In plaats van "Your AI assistants in sync", gebruik
            "Your AI, Shared Knowledge."
          </Text>
        </Stack>

        <Stack gap={4}>
          <Text weight="bold">2. Visuele Metafoor: De "Centrale Bibliotheek"</Text>
          <Text size="small" tone="secondary">
            Voeg een sectie toe die Chain Hub vergelijkt met een boekenplank waar al je AI-assistenten hun kennis vandaan
            halen.
          </Text>
        </Stack>

        <Stack gap={4}>
          <Text weight="bold">3. "No-Code" Use Cases</Text>
          <Text size="small" tone="secondary">
            Toon voorbeelden die niet over code gaan:
            <br />- Brand Voice (Marketing)
            <br />- Project Context (Management)
            <br />- Writing Style (Creative)
          </Text>
        </Stack>

        <Stack gap={4}>
          <Text weight="bold">4. Interactieve "Skill" Verkenner</Text>
          <Text size="small" tone="secondary">
            Laat gebruikers zien wat ze kunnen 'installeren' zonder een terminal te openen (bijv. een lijst met menselijke
            beschrijvingen van skills).
          </Text>
        </Stack>
      </Stack>

      <Divider />

      <Card>
        <CardHeader>
          <Text weight="bold">Volgende Stappen</Text>
        </CardHeader>
        <CardBody>
          <Stack gap={8}>
            <Text size="small">1. Refactor Hero component voor betere messaging.</Text>
            <Text size="small">2. Creëer een "Non-Coder Mode" sectie op de homepagina.</Text>
            <Text size="small">3. Update documentatie met een "Beginners Guide".</Text>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
