import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { ElevenLabs } from '@elevenlabs/elevenlabs-js';
import { env } from './env';
import { withRetry } from './retry';
import { buildAgentSystemPrompt } from '@/prompts/agent-persona';
import { CONCIERGE_SYSTEM_PROMPT } from '@/prompts/concierge-persona';
import type { Character, Episode } from './types';

const client = new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY });

// Adam — professional narrator voice for the Concierge
const CONCIERGE_VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

// ── Knowledge Base ──────────────────────────────────────────────

export async function createEpisodeKnowledgeBase(
  researchData: string,
  episodeId: string
): Promise<{ id: string; name: string }> {
  const name = `episode-${episodeId}-research`;
  const kb = await withRetry(
    () =>
      client.conversationalAi.knowledgeBase.documents.createFromText({
        text: researchData,
        name,
      }),
    { maxRetries: 2, label: 'create-knowledge-base' }
  );
  console.log(`[agents] Knowledge base created: ${kb.id}`);
  return { id: kb.id, name: kb.name };
}

// ── Tool Definitions ────────────────────────────────────────────

function strProp(description: string): ElevenLabs.LiteralJsonSchemaProperty {
  return { type: 'string', description };
}

function numProp(description: string): ElevenLabs.LiteralJsonSchemaProperty {
  return { type: 'number', description };
}

function boolProp(description: string): ElevenLabs.LiteralJsonSchemaProperty {
  return { type: 'boolean', description };
}

function clientTool(
  name: string,
  description: string,
  properties?: Record<string, ElevenLabs.LiteralJsonSchemaProperty>,
  required?: string[]
): ElevenLabs.PromptAgentApiModelOutputToolsItem {
  const tool: ElevenLabs.PromptAgentApiModelOutputToolsItem = {
    type: 'client',
    name,
    description,
  };
  if (properties) {
    (tool as ElevenLabs.PromptAgentApiModelOutputToolsItem.Client).parameters = {
      type: 'object',
      properties,
      required: required ?? Object.keys(properties),
    };
  }
  return tool;
}

// Historical figure client tools
const HISTORICAL_TOOLS: ElevenLabs.PromptAgentApiModelOutputToolsItem[] = [
  clientTool(
    'navigate_timeline',
    'Jump to a specific moment in the documentary audio. Say "Let me take you to that moment..." before using.',
    { timestamp_seconds: numProp('Timestamp in seconds to navigate to') }
  ),
  clientTool(
    'show_illustration',
    'Display a scene illustration to the user. Say "Picture this..." before using.',
    {
      scene_number: numProp('The scene number to display'),
      description: strProp('Brief description of what to show'),
    },
    ['scene_number']
  ),
  clientTool(
    'show_source',
    'Display a research source or citation to the user.',
    {
      source_url: strProp('URL of the source document'),
      source_title: strProp('Title of the source'),
    },
    ['source_title']
  ),
  clientTool(
    'play_sound_effect',
    'Play an ambient sound effect for dramatic emphasis. Use sparingly.',
    { effect_name: strProp('Name or ID of the sound effect to play') }
  ),
];

// Concierge client tools
const CONCIERGE_TOOLS: ElevenLabs.PromptAgentApiModelOutputToolsItem[] = [
  clientTool(
    'generate_documentary',
    'Start generating a full documentary episode. Say "Let me build that for you..." before triggering. Confirm the event with the user first.',
    {
      event: strProp('Historical event description (e.g. "Moon Landing, July 1969")'),
      era: strProp('Time period of the event'),
      include_user_voice: boolProp('Whether to clone the user\'s voice into the story'),
    },
    ['event']
  ),
  clientTool(
    'check_generation_progress',
    'Check the current status of documentary generation. Use every few seconds after triggering generate_documentary to narrate updates naturally.',
    { episode_id: strProp('The episode ID being generated') }
  ),
  clientTool('start_playback', 'Begin playing the documentary audio. Say "Here we go..." before using.'),
  clientTool(
    'seek_to_scene',
    'Jump to a specific scene during playback. Say "Taking you to..." before using.',
    { scene_name: strProp('Name or description of the scene to jump to') }
  ),
  clientTool('identify_speaker', 'Tell the user who is currently speaking in the documentary. Use when asked "who is that?"'),
  clientTool('show_sources', 'Display the research sources and citations panel.'),
  clientTool('start_voice_clone', 'Activate the voice cloning recording flow. Say "I\'ll need about 30 seconds of your voice."'),
  clientTool(
    'dub_to_language',
    'Trigger translation/dubbing of the documentary to another language.',
    { language_code: strProp('Target language code (e.g. "hi" for Hindi, "es" for Spanish)') }
  ),
  clientTool('share_episode', 'Generate and display the share card for the current episode.'),
];

// ── Transfer Tool Builders ──────────────────────────────────────

function buildForwardTransferTool(
  characterAgentIds: Record<string, string>
): ElevenLabs.BuiltInToolsOutput['transferToAgent'] {
  const transfers = Object.entries(characterAgentIds).map(([name, agentId]) => ({
    agentId,
    condition: `Transfer to ${name} when the user explicitly asks to talk to, speak with, or interview ${name}.`,
    transferMessage: `Let me introduce you to ${name}...`,
    enableTransferredAgentFirstMessage: true,
  }));

  return {
    name: 'switch_to_character_agent',
    description:
      'Transfer the conversation to a historical figure agent when the user wants to talk to a specific character.',
    params: {
      systemToolType: 'transfer_to_agent',
      transfers,
    },
  };
}

function buildReturnTransferTool(
  conciergeAgentId: string
): ElevenLabs.BuiltInToolsOutput['transferToAgent'] {
  return {
    name: 'transfer_to_concierge',
    description: 'Return the conversation to the Concierge host.',
    params: {
      systemToolType: 'transfer_to_agent',
      transfers: [
        {
          agentId: conciergeAgentId,
          condition:
            "Transfer back to the Concierge when the user says \"take me somewhere else\", \"I'm done\", \"go back\", or wants to explore a different event.",
          transferMessage:
            'It was wonderful talking with you. Let me hand you back to your guide.',
          enableTransferredAgentFirstMessage: true,
        },
      ],
    },
  };
}

// ── Config Builders ─────────────────────────────────────────────

function buildHistoricalConfig(
  character: Character,
  episode: Episode,
  kbId: string,
  kbName: string,
  conciergeAgentId?: string
): ElevenLabs.ConversationalConfig {
  return {
    agent: {
      firstMessage: `You've reached me just after the event. What would you like to know?`,
      prompt: {
        prompt: buildAgentSystemPrompt(character, episode),
        llm: 'gemini-2.0-flash',
        knowledgeBase: [{ type: 'text', id: kbId, name: kbName }],
        tools: HISTORICAL_TOOLS,
        ...(conciergeAgentId
          ? { builtInTools: { transferToAgent: buildReturnTransferTool(conciergeAgentId) } }
          : {}),
      },
    },
    tts: {
      voiceId: episode.voice_ids?.[character.id] ?? undefined,
      expressiveMode: true,
    },
  };
}

function buildConciergeConfig(
  characterAgentIds: Record<string, string>
): ElevenLabs.ConversationalConfig {
  const hasCharacters = Object.keys(characterAgentIds).length > 0;
  return {
    agent: {
      firstMessage: 'Welcome to Time Machine Audio. Where in history would you like to go?',
      prompt: {
        prompt: CONCIERGE_SYSTEM_PROMPT,
        llm: 'gemini-2.0-flash',
        tools: CONCIERGE_TOOLS,
        ...(hasCharacters
          ? { builtInTools: { transferToAgent: buildForwardTransferTool(characterAgentIds) } }
          : {}),
      },
    },
    tts: {
      voiceId: CONCIERGE_VOICE_ID,
      expressiveMode: true,
    },
  };
}

// ── Main Setup Function ─────────────────────────────────────────

export async function setupEpisodeAgents(episode: Episode): Promise<{
  agentIds: Record<string, string>;
  conciergeAgentId: string;
  knowledgeBaseId: string;
}> {
  if (!episode.research_data) {
    throw new Error('Episode has no research data for knowledge base');
  }
  if (!episode.characters) {
    throw new Error('Episode has no characters');
  }

  // 1. Create knowledge base
  const kb = await createEpisodeKnowledgeBase(episode.research_data, episode.id);

  // Only create agents for non-narrator characters (they get their own voice conversations)
  const agentCharacters = episode.characters.filter((c) => c.role !== 'narrator');

  // 2. Create historical agents (without return transfer — we don't have concierge ID yet)
  const agentIds: Record<string, string> = {};
  await Promise.all(
    agentCharacters.map(async (character) => {
      const config = buildHistoricalConfig(character, episode, kb.id, kb.name);
      const response = await withRetry(
        () =>
          client.conversationalAi.agents.create({
            name: `${character.name} — ${episode.id.slice(0, 8)}`,
            conversationConfig: config,
          }),
        { maxRetries: 2, label: `create-agent-${character.id}` }
      );
      agentIds[character.id] = response.agentId;
      console.log(`[agents] Created historical agent for ${character.name}: ${response.agentId}`);
    })
  );

  // Build name → agentId map for Concierge transfer tool
  const characterNameToAgentId: Record<string, string> = {};
  for (const char of agentCharacters) {
    if (agentIds[char.id]) {
      characterNameToAgentId[char.name] = agentIds[char.id];
    }
  }

  // 3. Create Concierge agent (with forward transfers to all historical agents)
  const conciergeResponse = await withRetry(
    () =>
      client.conversationalAi.agents.create({
        name: `Concierge — ${episode.id.slice(0, 8)}`,
        conversationConfig: buildConciergeConfig(characterNameToAgentId),
      }),
    { maxRetries: 2, label: 'create-concierge' }
  );
  const conciergeAgentId = conciergeResponse.agentId;
  console.log(`[agents] Created Concierge agent: ${conciergeAgentId}`);

  // 4. Update historical agents with return transfer to Concierge
  await Promise.all(
    agentCharacters.map(async (character) => {
      const agentId = agentIds[character.id];
      if (!agentId) return;
      const configWithReturn = buildHistoricalConfig(
        character,
        episode,
        kb.id,
        kb.name,
        conciergeAgentId
      );
      await withRetry(
        () =>
          client.conversationalAi.agents.update(agentId, {
            conversationConfig: configWithReturn,
          }),
        { maxRetries: 2, label: `update-return-transfer-${character.id}` }
      );
      console.log(`[agents] Added return transfer for ${character.name}`);
    })
  );

  return { agentIds, conciergeAgentId, knowledgeBaseId: kb.id };
}

// ── Signed URL ──────────────────────────────────────────────────

export async function getAgentSignedUrl(agentId: string): Promise<string> {
  const response = await client.conversationalAi.conversations.getSignedUrl({ agentId });
  return response.signedUrl;
}
