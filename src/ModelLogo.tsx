import React from 'react';

export function getModelCompany(modelId: string): string {
  if (!modelId) return 'default';
  const id = modelId.toLowerCase().trim();
  if (id.includes('llama') || id.includes('meta-llama') || id.startsWith('meta/') || id.startsWith('meta-')) return 'meta';
  if (id.includes('mistral') || id.includes('mixtral')) return 'mistral';
  if (id.includes('gemma') || id.includes('google')) return 'google';
  if (id.includes('nemotron') || id.includes('nvidia')) return 'nvidia';
  if (id.includes('deepseek')) return 'deepseek';
  if (id.includes('qwen') || id.includes('alibaba')) return 'qwen';
  if (id.includes('phi') || id.includes('microsoft')) return 'microsoft';
  if (id.includes('whisper') || id.includes('gpt') || id.includes('openai')) return 'openai';
  if (id.includes('allam')) return 'allam';
  if (id.includes('canopy') || id.includes('orpheus')) return 'canopy';
  if (id.includes('snowflake') || id.includes('arctic')) return 'snowflake';
  if (id.includes('baichuan')) return 'baichuan';
  if (id.includes('ibm') || id.includes('granite')) return 'ibm';
  if (id === 'groq') return 'groq';
  return 'default';
}

interface ModelLogoProps {
  modelId: string;
  size?: number;
  className?: string;
}

export default function ModelLogo({ modelId, size = 18, className = '' }: ModelLogoProps) {
  const company = getModelCompany(modelId);

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    flexShrink: 0,
    verticalAlign: 'middle',
  };

  switch (company) {
    case 'meta':
      // Meta official infinity logo in Meta blue
      return (
        <span style={style} className={className} title="Meta">
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
            <path
              d="M12 5.5c-2.4 0-4.4 1.3-5.6 3.2C5.3 10.5 4.5 12.8 4.5 15c0 2.2 1.4 3.8 3.3 3.8 1.9 0 3.3-1.4 4.2-3.1.9 1.7 2.3 3.1 4.2 3.1 1.9 0 3.3-1.6 3.3-3.8 0-2.2-.8-4.5-1.9-6.3-1.2-1.9-3.2-3.2-5.6-3.2zm0 2.1c1.9 0 3.5 1 4.4 2.6.9 1.5 1.5 3.5 1.5 5.1 0 1.1-.6 1.8-1.5 1.8-1.3 0-2.4-1.2-3.1-2.7l-.8-1.7-.8 1.7c-.7 1.5-1.8 2.7-3.1 2.7-.9 0-1.5-.7-1.5-1.8 0-1.6.6-3.6 1.5-5.1.9-1.6 2.5-2.6 4.4-2.6z"
              fill="#0866FF"
            />
          </svg>
        </span>
      );

    case 'mistral':
      // Mistral AI official pixel flame logo
      return (
        <span style={style} className={className} title="Mistral AI">
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
            <rect x="2.5" y="3.5" width="4" height="4" fill="#FA520F" rx="0.5" />
            <rect x="17.5" y="3.5" width="4" height="4" fill="#FA520F" rx="0.5" />
            <rect x="2.5" y="7.5" width="4" height="4" fill="#FA520F" rx="0.5" />
            <rect x="6.5" y="7.5" width="4" height="4" fill="#FA520F" rx="0.5" />
            <rect x="13.5" y="7.5" width="4" height="4" fill="#FA520F" rx="0.5" />
            <rect x="17.5" y="7.5" width="4" height="4" fill="#FA520F" rx="0.5" />
            <rect x="2.5" y="11.5" width="19" height="4" fill="#FA520F" rx="0.5" />
            <rect x="2.5" y="15.5" width="4" height="4" fill="#FA520F" rx="0.5" />
            <rect x="10" y="15.5" width="4" height="4" fill="#FA520F" rx="0.5" />
            <rect x="17.5" y="15.5" width="4" height="4" fill="#FA520F" rx="0.5" />
            <rect x="2.5" y="19.5" width="4" height="4" fill="#FA520F" rx="0.5" />
            <rect x="17.5" y="19.5" width="4" height="4" fill="#FA520F" rx="0.5" />
          </svg>
        </span>
      );

    case 'google':
      // Google official 4-color 'G'
      return (
        <span style={style} className={className} title="Google">
          <svg viewBox="0 0 24 24" width={size} height={size}>
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.06h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.06c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.28v3.16C3.26 21.31 7.34 24 12 24z" />
            <path fill="#FBBC05" d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.58H1.28C.46 8.21 0 10.05 0 12s.46 3.79 1.28 5.42l4-3.16z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.69 1.28 6.58l4 3.16c.95-2.83 3.6-4.99 6.72-4.99z" />
          </svg>
        </span>
      );

    case 'nvidia':
      // NVIDIA green eye logo
      return (
        <span style={style} className={className} title="NVIDIA">
          <svg viewBox="0 0 24 24" width={size} height={size} fill="#76B900">
            <path d="M7.784 7.42c-.08-.03-.22-.05-.33-.05-1.74 0-3.16 1.4-3.16 3.14 0 1.63 1.25 2.97 2.85 3.11l.05.01v-1.63c-.76-.11-1.35-.74-1.35-1.5 0-.84.68-1.52 1.52-1.52.12 0 .23.01.35.04l.07.02V7.44l-.07-.02zm3.33-2.61c-.13-.02-.32-.04-.51-.04-3.17 0-5.75 2.56-5.75 5.73 0 3.01 2.34 5.48 5.3 5.7l.09.01v-1.69c-2.02-.2-3.6-1.89-3.6-3.99 0-2.22 1.8-4.02 4.02-4.02.26 0 .52.03.77.08l.12.03v-1.76l-.12-.02c-.11-.01-.21-.02-.32-.03zm3.76-2.82c-.22-.03-.54-.05-.85-.05-4.63 0-8.39 3.73-8.39 8.36 0 4.41 3.43 8.02 7.78 8.34l.14.01v-1.71c-3.39-.31-6.07-3.16-6.07-6.64 0-3.69 3-6.68 6.69-6.68.46 0 .91.05 1.34.14l.17.04V3.62l-.18-.03c-.22-.03-.43-.05-.63-.07zM16.5 12c0 2.48-2.02 4.5-4.5 4.5v1.65c3.4 0 6.15-2.75 6.15-6.15S15.4 5.85 12 5.85v1.65c2.48 0 4.5 2.02 4.5 4.5z" />
          </svg>
        </span>
      );

    case 'deepseek':
      // DeepSeek electric blue whale
      return (
        <span style={style} className={className} title="DeepSeek">
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
            <path
              d="M3 14c0 3.5 2.8 6 7 6 5 0 9-3.2 11-7-1.6.6-3.8.6-6 .6C9.5 13.6 6.5 11 5.5 7.8c-.6 1.1-1.6 2.6-2.5 3.7-.6.8-1 1.7-1 2.5z"
              fill="#0284C7"
            />
            <path
              d="M14.5 7.5C13 5.5 10.5 4 8 4c0 2 1 4 2.5 5.5 1.5 1.5 3 2 4 2z"
              fill="#38BDF8"
            />
            <circle cx="7" cy="14" r="1.2" fill="#FFFFFF" />
          </svg>
        </span>
      );

    case 'microsoft':
      // Microsoft 4-square logo
      return (
        <span style={style} className={className} title="Microsoft">
          <svg viewBox="0 0 24 24" width={size} height={size}>
            <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" rx="1" />
            <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" rx="1" />
            <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" rx="1" />
            <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" rx="1" />
          </svg>
        </span>
      );

    case 'qwen':
      // Qwen / Alibaba Cloud hexagon
      return (
        <span style={style} className={className} title="Qwen">
          <svg viewBox="0 0 24 24" width={size} height={size} fill="#6366F1">
            <path d="M12 2L3.5 7v10L12 22l8.5-5V7L12 2zm0 2.4l6.5 3.8-6.5 3.8-6.5-3.8L12 4.4zM5.5 9.8l5.5 3.2v6.6l-5.5-3.2V9.8zm8 9.8v-6.6l5.5-3.2v6.6l-5.5 3.2z" />
          </svg>
        </span>
      );

    case 'openai':
      // OpenAI spiral
      return (
        <span style={style} className={className} title="OpenAI">
          <svg viewBox="0 0 24 24" width={size} height={size} fill="#10A37F">
            <path d="M22.28 9.9a5.98 5.98 0 0 0-.52-4.92 6.05 6.05 0 0 0-6.49-2.9A6.07 6.07 0 0 0 10.6.43a6.04 6.04 0 0 0-5.8 4.22 6.06 6.06 0 0 0-4.08 2.97 6.02 6.02 0 0 0 .73 7.07 5.98 5.98 0 0 0 .52 4.92 6.05 6.05 0 0 0 6.49 2.9A6.07 6.07 0 0 0 13.4 23.57a6.04 6.04 0 0 0 5.8-4.22 6.06 6.06 0 0 0 4.08-2.97 6.02 6.02 0 0 0-.73-7.07zM13.4 22.1c-1.14 0-2.2-.33-3.12-.91l.16-.09 5.18-2.99a1.05 1.05 0 0 0 .53-.91v-7.3l2.2 1.27a.08.08 0 0 1 .05.06v6.07a4.67 4.67 0 0 1-4.66 4.67c-.12 0-.23-.01-.34-.02v.15zm-9.33-4.08a4.63 4.63 0 0 1-.6-3.23l.16.1 5.18 2.99c.32.18.72.18 1.05 0l6.32-3.65v2.54a.09.09 0 0 1-.03.07l-5.26 3.04a4.68 4.68 0 0 1-6.82-1.86zm-1.5-8.47c.43-1.07 1.2-1.95 2.19-2.52l-.16.27v5.98c0 .37.2.71.52.9l6.33 3.65-2.2 1.27a.08.08 0 0 1-.08 0l-5.26-3.04a4.68 4.68 0 0 1-1.34-6.51zm15.42 2.15l-6.32-3.65 2.2-1.27a.09.09 0 0 1 .08 0l5.26 3.04a4.68 4.68 0 0 1-.85 8.37v-5.59a1.05 1.05 0 0 0-.53-.9h.16zm2.34-3.56l-.16-.1-5.18-2.99a1.05 1.05 0 0 0-1.05 0L7.52 8.64V6.1a.08.08 0 0 1 .04-.07l5.26-3.04a4.68 4.68 0 0 1 6.82 1.86c.42.74.63 1.57.63 2.42 0 .28-.02.56-.07.83v-.01zm-10.4-3.5v7.3l-2.2-1.27a.08.08 0 0 1-.05-.06V3.53a4.67 4.67 0 0 1 4.66-4.67c.12 0 .24.01.35.03v.15c-1.14 0-2.2.33-3.12.91l.36-.21zm1.2 5.62l2.84 1.64v3.28l-2.84 1.64-2.84-1.64v-3.28l2.84-1.64z" />
          </svg>
        </span>
      );

    case 'allam':
      // SDAIA / Allam emerald emblem
      return (
        <span style={style} className={className} title="Allam / SDAIA">
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
            <rect width="24" height="24" rx="5" fill="#047857" />
            <path
              d="M12 4.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7L12 4.5z"
              fill="#6EE7B7"
            />
          </svg>
        </span>
      );

    case 'canopy':
      // Canopy Labs nature emblem
      return (
        <span style={style} className={className} title="Canopy Labs">
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
            <rect width="24" height="24" rx="5" fill="#0F766E" />
            <path
              d="M12 5.5c-3 0-5.5 2.2-5.5 5 0 2.2 1.5 4 3.6 4.7V18h3.8v-2.8c2.1-.7 3.6-2.5 3.6-4.7 0-2.8-2.5-5-5.5-5z"
              fill="#2DD4BF"
            />
          </svg>
        </span>
      );

    case 'snowflake':
      // Snowflake Arctic cyan snowflake
      return (
        <span style={style} className={className} title="Snowflake">
          <svg viewBox="0 0 24 24" width={size} height={size} fill="#29B5E8">
            <path d="M12 1.5a1 1 0 0 1 1 1V5.08l1.62-.93a1 1 0 0 1 1 1.73l-1.62.94 1.94 1.12a1 1 0 1 1-1 1.73L13 7.55v2.9a1 1 0 0 1-2 0V7.55l-1.94 1.12a1 1 0 0 1-1-1.73l1.94-1.12-1.62-.94a1 1 0 0 1 1-1.73l1.62.93V2.5a1 1 0 0 1 1-1zM4.7 6.13a1 1 0 0 1 1.37.37l1.79 3.1-1.62.94a1 1 0 0 1-1-1.73l1.62-.94-1.79-1.03a1 1 0 0 1-.37-1.37zm14.6 0a1 1 0 0 1-.37 1.37l-1.79 1.03 1.62.94a1 1 0 0 1-1 1.73l-1.62-.94 1.79-3.1a1 1 0 0 1 1.37-.37zM1.5 12a1 1 0 0 1 1-1h2.58l-.93-1.62a1 1 0 0 1 1.73-1l.94 1.62 1.12-1.94a1 1 0 1 1 1.73 1L6.55 11h2.9a1 1 0 0 1 0 2H6.55l1.12 1.94a1 1 0 0 1-1.73 1L4.82 14.8l-.94 1.62a1 1 0 0 1-1.73-1l.93-1.62H2.5a1 1 0 0 1-1-1zm17.92 1h2.58a1 1 0 0 0 0-2h-2.58l.93-1.62a1 1 0 1 0-1.73-1l-.94 1.62-1.12-1.94a1 1 0 0 0-1.73 1L17.45 11h-2.9a1 1 0 0 0 0 2h2.9l-1.12 1.94a1 1 0 0 0 1.73 1l1.12-1.94.94 1.62a1 1 0 0 0 1.73-1l-.93-1.62zM4.7 17.87a1 1 0 0 1 .37-1.37l1.79-1.03-1.62-.94a1 1 0 0 1 1-1.73l1.62.94-1.79 3.1a1 1 0 0 1-1.37.37zm14.6 0a1 1 0 0 1-1.37-.37l-1.79-3.1 1.62-.94a1 1 0 0 1 1 1.73l-1.62.94 1.79 1.03a1 1 0 0 1 .37 1.37zM12 13.55l1.94 1.12a1 1 0 0 1 1 1.73l-1.94 1.12 1.62.94a1 1 0 0 1-1 1.73L13 19.26V21.5a1 1 0 0 1-2 0v-2.24l-1.62.93a1 1 0 1 1-1-1.73l1.62-.94-1.94-1.12a1 1 0 0 1 1-1.73L11 14.67v-1.12z" />
          </svg>
        </span>
      );

    case 'groq':
      // Groq official electric orange 'G' mark
      return (
        <span style={style} className={className} title="Groq">
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
            <rect width="24" height="24" rx="5" fill="#F05A28" />
            <path
              d="M17 12a5 5 0 1 1-2.2-4.1l-1.7 1.7A2.6 2.6 0 1 0 14.4 12H11v-2.4h6V12z"
              fill="#FFFFFF"
            />
          </svg>
        </span>
      );

    default:
      // Generic AI neural chip / spark
      return (
        <span style={style} className={className} title="AI Model">
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
            <rect width="24" height="24" rx="5" fill="#6366F1" />
            <path
              d="M12 5l1.6 4.4L18 11l-4.4 1.6L12 17l-1.6-4.4L6 11l4.4-1.6L12 5z"
              fill="#FFFFFF"
            />
          </svg>
        </span>
      );
  }
}
