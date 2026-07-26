import type { AssetKind, CaptureInput, CreateAssetInput, CreateMemoryNoteInput } from "@chain-hub/contracts";
import {
  buildReflectionReport,
  captureEvent,
  writeReflectionMarkdown,
  createAsset,
  createMemoryNote,
  deleteAsset,
  deleteMemoryNote,
  getAsset,
  getIntegrations,
  getLearningsTimeline,
  getMemoryNote,
  getMemorySummary,
  getOverview,
  getSetupGuide,
  initializeHub,
  listAssets,
  listMemoryNotes,
  searchMemoryNotes,
  setupIntegrations,
  syncAssetToEditors,
  updateAsset,
  updateMemoryNote,
  validateHub
} from "@chain-hub/storage";

export async function initializeChainHub(chainHome?: string) {
  const result = await initializeHub(chainHome);
  return {
    message: `Initialized Chain Hub v2 at ${result.chainHome}`,
    chainHome: result.chainHome,
    isFirstRun: result.isFirstRun
  };
}

export async function getDashboardOverview(chainHome?: string) {
  return getOverview(chainHome);
}

export async function getLibrary(chainHome?: string, kind?: AssetKind) {
  return listAssets(chainHome, kind);
}

export async function getLibraryAsset(chainHome: string | undefined, kind: AssetKind, name: string) {
  return getAsset(chainHome, kind, name);
}

export async function createLibraryAsset(chainHome: string | undefined, input: CreateAssetInput) {
  const asset = await createAsset(chainHome, input);
  await syncAssetToEditors(chainHome, asset.kind, asset.name, asset);
  return asset;
}

export async function updateLibraryAsset(chainHome: string | undefined, kind: AssetKind, name: string, content: string) {
  const asset = await updateAsset(chainHome, kind, name, content);
  await syncAssetToEditors(chainHome, asset.kind, asset.name, asset);
  return asset;
}

export async function deleteLibraryAsset(chainHome: string | undefined, kind: AssetKind, name: string) {
  await deleteAsset(chainHome, kind, name);
  await syncAssetToEditors(chainHome, kind, name, null);
}

export async function getIntegrationStatus(chainHome?: string) {
  return getIntegrations(chainHome);
}

export async function connectEditors(chainHome?: string) {
  return setupIntegrations(chainHome);
}

export async function validateChainHub(chainHome?: string) {
  return validateHub(chainHome);
}

export async function getGuidedSetup(chainHome?: string) {
  return getSetupGuide(chainHome);
}

export async function getHubMemory(chainHome?: string) {
  return getMemorySummary(chainHome);
}

export async function listHubMemoryNotes(chainHome?: string) {
  return listMemoryNotes(chainHome);
}

export async function getHubMemoryNote(chainHome: string | undefined, relativePath: string) {
  return getMemoryNote(chainHome, relativePath);
}

export async function createHubMemoryNote(chainHome: string | undefined, input: CreateMemoryNoteInput) {
  return createMemoryNote(chainHome, input);
}

export async function updateHubMemoryNote(chainHome: string | undefined, relativePath: string, content: string) {
  return updateMemoryNote(chainHome, relativePath, content);
}

export async function deleteHubMemoryNote(chainHome: string | undefined, relativePath: string) {
  return deleteMemoryNote(chainHome, relativePath);
}

export async function searchHubMemoryNotes(chainHome: string | undefined, query: string) {
  return searchMemoryNotes(chainHome, query);
}

export async function captureHubEvent(chainHome: string | undefined, input: CaptureInput) {
  return captureEvent(chainHome, input);
}

export async function getHubLearningsTimeline(chainHome: string | undefined, limit?: number, offset?: number) {
  return getLearningsTimeline(chainHome, limit, offset);
}

export async function getHubReflectionReport(chainHome: string | undefined) {
  return buildReflectionReport(chainHome);
}

export async function writeHubReflection(chainHome: string | undefined) {
  return writeReflectionMarkdown(chainHome);
}
