import { useEffect, useState } from 'react';
import './AnimatedRobot.css';

interface AnimatedRobotProps {
  modelName: string;
  isThinking?: boolean;
  isSpeaking?: boolean;
  size?: number;
}

export function AnimatedRobot({ modelName, isThinking = false, isSpeaking = false, size = 120 }: AnimatedRobotProps) {
  const [blink, setBlink] = useState(false);
  const model = modelName.toLowerCase();

  useEffect(() => {
    if (!isThinking && !isSpeaking) {
      const interval = setInterval(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
      }, 3000 + Math.random() * 2000);
      return () => clearInterval(interval);
    }
  }, [isThinking, isSpeaking]);

  if (model.includes('gpt') || model.includes('openai')) {
    return (
      <div className={`robot-container ${isThinking ? 'thinking' : ''} ${isSpeaking ? 'speaking' : ''}`} style={{ width: size, height: size }}>
        {isThinking && (
          <div className="thinking-popup">
            <span>Thinking...</span>
          </div>
        )}
        <svg viewBox="0 0 120 120" className="robot-gpt">
          <defs>
            <linearGradient id="gpt-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10a37f" />
              <stop offset="100%" stopColor="#0d8c6d" />
            </linearGradient>
          </defs>
          <rect x="30" y="20" width="60" height="70" rx="8" fill="url(#gpt-gradient)" className="robot-body"/>
          <circle cx="45" cy="45" r="6" fill="#fff" className={`robot-eye ${blink ? 'blink' : ''}`}/>
          <circle cx="75" cy="45" r="6" fill="#fff" className={`robot-eye ${blink ? 'blink' : ''}`}/>
          <circle cx="45" cy="45" r="3" fill="#000" className="robot-pupil"/>
          <circle cx="75" cy="45" r="3" fill="#000" className="robot-pupil"/>
          <path d="M 45 65 Q 60 75 75 65" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" className="robot-mouth"/>
          <circle cx="25" cy="35" r="8" fill="url(#gpt-gradient)" className="robot-antenna-ball"/>
          <rect x="23" y="28" width="4" height="12" fill="url(#gpt-gradient)" className="robot-antenna"/>
          <circle cx="95" cy="35" r="8" fill="url(#gpt-gradient)" className="robot-antenna-ball"/>
          <rect x="93" y="28" width="4" height="12" fill="url(#gpt-gradient)" className="robot-antenna"/>
          <rect x="20" y="90" width="15" height="25" rx="4" fill="url(#gpt-gradient)" className="robot-leg"/>
          <rect x="85" y="90" width="15" height="25" rx="4" fill="url(#gpt-gradient)" className="robot-leg"/>
        </svg>
      </div>
    );
  }

  if (model.includes('grok')) {
    return (
      <div className={`robot-container ${isThinking ? 'thinking' : ''} ${isSpeaking ? 'speaking' : ''}`} style={{ width: size, height: size }}>
        {isThinking && (
          <div className="thinking-popup">
            <span>Thinking...</span>
          </div>
        )}
        <svg viewBox="0 0 120 120" className="robot-grok">
          <defs>
            <linearGradient id="grok-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1d9bf0" />
              <stop offset="100%" stopColor="#1a8cd8" />
            </linearGradient>
          </defs>
          <rect x="25" y="25" width="70" height="65" rx="10" fill="url(#grok-gradient)" className="robot-body"/>
          <polygon points="40,35 50,45 40,55" fill="#fff" className={`robot-eye ${blink ? 'blink' : ''}`}/>
          <polygon points="80,35 70,45 80,55" fill="#fff" className={`robot-eye ${blink ? 'blink' : ''}`}/>
          <rect x="45" y="70" width="30" height="8" rx="4" fill="#fff" className="robot-mouth"/>
          <path d="M 35 20 L 40 10 L 45 20" stroke="#1d9bf0" strokeWidth="3" fill="none" className="robot-bolt"/>
          <path d="M 75 20 L 80 10 L 85 20" stroke="#1d9bf0" strokeWidth="3" fill="none" className="robot-bolt"/>
          <rect x="15" y="90" width="20" height="25" rx="5" fill="url(#grok-gradient)" className="robot-leg"/>
          <rect x="85" y="90" width="20" height="25" rx="5" fill="url(#grok-gradient)" className="robot-leg"/>
          <circle cx="60" cy="55" r="15" fill="rgba(255,255,255,0.1)" className="robot-badge"/>
          <path d="M 52 55 L 68 55 M 60 47 L 60 63" stroke="#fff" strokeWidth="2" className="robot-x"/>
        </svg>
      </div>
    );
  }

  if (model.includes('claude')) {
    return (
      <div className={`robot-container ${isThinking ? 'thinking' : ''} ${isSpeaking ? 'speaking' : ''}`} style={{ width: size, height: size }}>
        {isThinking && (
          <div className="thinking-popup">
            <span>Thinking...</span>
          </div>
        )}
        <svg viewBox="0 0 120 120" className="robot-claude">
          <defs>
            <linearGradient id="claude-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d97757" />
              <stop offset="100%" stopColor="#c56645" />
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="50" rx="35" ry="40" fill="url(#claude-gradient)" className="robot-body"/>
          <circle cx="45" cy="45" r="7" fill="#fff" className={`robot-eye ${blink ? 'blink' : ''}`}/>
          <circle cx="75" cy="45" r="7" fill="#fff" className={`robot-eye ${blink ? 'blink' : ''}`}/>
          <circle cx="45" cy="45" r="4" fill="#000" className="robot-pupil"/>
          <circle cx="75" cy="45" r="4" fill="#000" className="robot-pupil"/>
          <ellipse cx="60" cy="65" rx="12" ry="6" fill="rgba(0,0,0,0.2)" className="robot-mouth"/>
          <circle cx="40" cy="25" r="10" fill="url(#claude-gradient)" className="robot-ear"/>
          <circle cx="80" cy="25" r="10" fill="url(#claude-gradient)" className="robot-ear"/>
          <circle cx="40" cy="22" r="4" fill="#fff" opacity="0.5"/>
          <circle cx="80" cy="22" r="4" fill="#fff" opacity="0.5"/>
          <rect x="25" y="90" width="18" height="25" rx="9" fill="url(#claude-gradient)" className="robot-leg"/>
          <rect x="77" y="90" width="18" height="25" rx="9" fill="url(#claude-gradient)" className="robot-leg"/>
        </svg>
      </div>
    );
  }

  if (model.includes('llama')) {
    return (
      <div className={`robot-container ${isThinking ? 'thinking' : ''} ${isSpeaking ? 'speaking' : ''}`} style={{ width: size, height: size }}>
        {isThinking && (
          <div className="thinking-popup">
            <span>Thinking...</span>
          </div>
        )}
        <svg viewBox="0 0 120 120" className="robot-llama">
          <defs>
            <linearGradient id="llama-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0467df" />
              <stop offset="100%" stopColor="#0353b8" />
            </linearGradient>
          </defs>
          <rect x="35" y="30" width="50" height="55" rx="25" fill="url(#llama-gradient)" className="robot-body"/>
          <ellipse cx="50" cy="45" rx="8" ry="10" fill="#fff" className={`robot-eye ${blink ? 'blink' : ''}`}/>
          <ellipse cx="70" cy="45" rx="8" ry="10" fill="#fff" className={`robot-eye ${blink ? 'blink' : ''}`}/>
          <circle cx="50" cy="47" r="4" fill="#000" className="robot-pupil"/>
          <circle cx="70" cy="47" r="4" fill="#000" className="robot-pupil"/>
          <path d="M 45 60 Q 60 68 75 60" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" className="robot-mouth"/>
          <ellipse cx="35" cy="30" rx="8" ry="15" fill="url(#llama-gradient)" className="robot-ear"/>
          <ellipse cx="85" cy="30" rx="8" ry="15" fill="url(#llama-gradient)" className="robot-ear"/>
          <rect x="30" y="85" width="16" height="30" rx="8" fill="url(#llama-gradient)" className="robot-leg"/>
          <rect x="74" y="85" width="16" height="30" rx="8" fill="url(#llama-gradient)" className="robot-leg"/>
          <circle cx="60" cy="70" r="8" fill="rgba(255,255,255,0.2)" className="robot-badge"/>
        </svg>
      </div>
    );
  }

  if (model.includes('gemini')) {
    return (
      <div className={`robot-container ${isThinking ? 'thinking' : ''} ${isSpeaking ? 'speaking' : ''}`} style={{ width: size, height: size }}>
        {isThinking && (
          <div className="thinking-popup">
            <span>Thinking...</span>
          </div>
        )}
        <svg viewBox="0 0 120 120" className="robot-gemini">
          <defs>
            <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4285f4" />
              <stop offset="50%" stopColor="#9b72cb" />
              <stop offset="100%" stopColor="#d96570" />
            </linearGradient>
          </defs>
          <polygon points="60,20 90,50 60,80 30,50" fill="url(#gemini-gradient)" className="robot-body"/>
          <circle cx="50" cy="45" r="6" fill="#fff" className={`robot-eye ${blink ? 'blink' : ''}`}/>
          <circle cx="70" cy="45" r="6" fill="#fff" className={`robot-eye ${blink ? 'blink' : ''}`}/>
          <circle cx="50" cy="45" r="3" fill="#000" className="robot-pupil"/>
          <circle cx="70" cy="45" r="3" fill="#000" className="robot-pupil"/>
          <path d="M 50 60 L 70 60" stroke="#fff" strokeWidth="3" strokeLinecap="round" className="robot-mouth"/>
          <circle cx="30" cy="35" r="6" fill="url(#gemini-gradient)" className="robot-gem"/>
          <circle cx="90" cy="35" r="6" fill="url(#gemini-gradient)" className="robot-gem"/>
          <polygon points="45,90 50,110 55,90" fill="url(#gemini-gradient)" className="robot-leg"/>
          <polygon points="65,90 70,110 75,90" fill="url(#gemini-gradient)" className="robot-leg"/>
          <circle cx="60" cy="50" r="10" fill="rgba(255,255,255,0.15)" className="robot-core"/>
        </svg>
      </div>
    );
  }

  if (model.includes('deepseek')) {
    return (
      <div className={`robot-container ${isThinking ? 'thinking' : ''} ${isSpeaking ? 'speaking' : ''}`} style={{ width: size, height: size }}>
        {isThinking && (
          <div className="thinking-popup">
            <span>Calculating...</span>
          </div>
        )}
        <svg viewBox="0 0 120 120" className="robot-deepseek">
          <defs>
            <linearGradient id="deepseek-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a1a2e" />
              <stop offset="100%" stopColor="#0f0f1e" />
            </linearGradient>
            <linearGradient id="deepseek-accent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d4ff" />
              <stop offset="100%" stopColor="#0099ff" />
            </linearGradient>
          </defs>
          <rect x="28" y="22" width="64" height="66" rx="4" fill="url(#deepseek-gradient)" stroke="url(#deepseek-accent)" strokeWidth="2" className="robot-body"/>
          <rect x="42" y="38" width="14" height="18" rx="1" fill="url(#deepseek-accent)" className={`robot-eye ${blink ? 'blink' : ''}`} opacity="0.8"/>
          <rect x="64" y="38" width="14" height="18" rx="1" fill="url(#deepseek-accent)" className={`robot-eye ${blink ? 'blink' : ''}`} opacity="0.8"/>
          <rect x="46" y="42" width="6" height="10" fill="#fff" className="robot-pupil" opacity="0.9"/>
          <rect x="68" y="42" width="6" height="10" fill="#fff" className="robot-pupil" opacity="0.9"/>
          <rect x="45" y="68" width="30" height="4" rx="2" fill="url(#deepseek-accent)" className="robot-mouth" opacity="0.6"/>
          <line x1="35" y1="30" x2="85" y2="30" stroke="url(#deepseek-accent)" strokeWidth="1" opacity="0.5" className="robot-scan-line"/>
          <line x1="35" y1="78" x2="85" y2="78" stroke="url(#deepseek-accent)" strokeWidth="1" opacity="0.5" className="robot-scan-line"/>
          <circle cx="35" cy="50" r="3" fill="url(#deepseek-accent)" className="robot-depth-indicator" opacity="0.7"/>
          <circle cx="85" cy="50" r="3" fill="url(#deepseek-accent)" className="robot-depth-indicator" opacity="0.7"/>
          <circle cx="35" cy="60" r="2" fill="url(#deepseek-accent)" className="robot-depth-indicator" opacity="0.5"/>
          <circle cx="85" cy="60" r="2" fill="url(#deepseek-accent)" className="robot-depth-indicator" opacity="0.5"/>
          <rect x="32" y="88" width="18" height="27" rx="2" fill="url(#deepseek-gradient)" stroke="url(#deepseek-accent)" strokeWidth="2" className="robot-leg"/>
          <rect x="70" y="88" width="18" height="27" rx="2" fill="url(#deepseek-gradient)" stroke="url(#deepseek-accent)" strokeWidth="2" className="robot-leg"/>
          <rect x="56" y="12" width="8" height="12" rx="1" fill="url(#deepseek-accent)" className="robot-processor" opacity="0.8"/>
          <circle cx="60" cy="16" r="2" fill="#fff" className="robot-processor-light"/>
        </svg>
      </div>
    );
  }

  return (
    <div className={`robot-container ${isThinking ? 'thinking' : ''} ${isSpeaking ? 'speaking' : ''}`} style={{ width: size, height: size }}>
      {isThinking && (
        <div className="thinking-popup">
          <span>Thinking...</span>
        </div>
      )}
      <svg viewBox="0 0 120 120" className="robot-default">
        <defs>
          <linearGradient id="default-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <rect x="30" y="25" width="60" height="60" rx="8" fill="url(#default-gradient)" className="robot-body"/>
        <rect x="40" y="40" width="12" height="15" rx="2" fill="#fff" className={`robot-eye ${blink ? 'blink' : ''}`}/>
        <rect x="68" y="40" width="12" height="15" rx="2" fill="#fff" className={`robot-eye ${blink ? 'blink' : ''}`}/>
        <rect x="44" y="45" width="4" height="8" fill="#000" className="robot-pupil"/>
        <rect x="72" y="45" width="4" height="8" fill="#000" className="robot-pupil"/>
        <rect x="45" y="65" width="30" height="6" rx="3" fill="#fff" className="robot-mouth"/>
        <rect x="55" y="15" width="10" height="15" fill="url(#default-gradient)" className="robot-antenna"/>
        <circle cx="60" cy="12" r="6" fill="#fbbf24" className="robot-antenna-ball"/>
        <rect x="25" y="85" width="18" height="30" rx="4" fill="url(#default-gradient)" className="robot-leg"/>
        <rect x="77" y="85" width="18" height="30" rx="4" fill="url(#default-gradient)" className="robot-leg"/>
      </svg>
    </div>
  );
}
