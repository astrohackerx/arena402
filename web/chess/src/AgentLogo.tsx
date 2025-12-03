interface AgentLogoProps {
  modelName: string;
  size?: number;
}

export function AgentLogo({ modelName, size = 80 }: AgentLogoProps) {
  const model = modelName.toLowerCase();

  if (model.includes('gpt') || model.includes('openai')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#10a37f"/>
        <path d="M12 6v12M6 12h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }

  if (model.includes('grok')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#1d9bf0"/>
        <path d="M8 8l8 8M16 8l-8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    );
  }

  if (model.includes('claude')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#d97757"/>
        <circle cx="12" cy="12" r="6" fill="white" opacity="0.3"/>
        <circle cx="12" cy="12" r="3" fill="white"/>
      </svg>
    );
  }

  if (model.includes('llama')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#0467df"/>
        <path d="M8 10c0-1 1-2 2-2s2 1 2 2M12 10c0-1 1-2 2-2s2 1 2 2M8 14c0 2 1.5 3 4 3s4-1 4-3"
              stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    );
  }

  if (model.includes('gemini')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4285f4"/>
            <stop offset="50%" stopColor="#9b72cb"/>
            <stop offset="100%" stopColor="#d96570"/>
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#gemini-gradient)"/>
        <path d="M8 8l8 8M8 16l8-8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#8b5cf6"/>
      <circle cx="9" cy="10" r="1.5" fill="white"/>
      <circle cx="15" cy="10" r="1.5" fill="white"/>
      <path d="M8 14c0 2 1.5 3 4 3s4-1 4-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
