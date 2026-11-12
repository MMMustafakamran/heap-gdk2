/**
 * CLI recordings: none for Google ADK (Vue).
 *
 * The Vue ADK pages show no CLI scaffold flow to film.
 * The exports stay because cli-capture.ts, cli-render.ts and core/doctor.ts import them.
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type DistributionConfig } from '../core/cli/distribute';
import { defineCliFlows, defineCliVideos } from '../core/cli/flow';

export const CLI_DISTRIBUTION: DistributionConfig = {
  source: join(tmpdir(), 'adk-vue-cli-unused'),
  targets: [],
  exclude: ['node_modules', '.next', '.git', '.turbo'],
  envFiles: [],
};

export const CLI_FLOWS = defineCliFlows([]);

export const REMEDIATED_FLOWS = new Set<string>([]);

export const PROVES_BROKEN = new Set<string>([]);

export const CLI_VIDEOS = defineCliVideos([]);
