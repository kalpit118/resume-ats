import React, { useState } from 'react';
import { 
  ArrowLeft, 
  RotateCw, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Key, 
  Server, 
  AlertTriangle
} from 'lucide-react';
import FuzzyText, { type FuzzyTextProps } from './FuzzyText';
import ThemeToggle from './ThemeToggle';
import { navigate } from './navigation';
import './ErrorPage.css';

export type ErrorCode = 404 | 500 | 403 | 503 | (number & {}) | (string & {});

export interface ErrorPageProps {
  code?: ErrorCode;
  title?: string;
  description?: string;
  badge?: string;
  error?: Error | string | null;
  errorInfo?: React.ErrorInfo | null;
  onRetry?: () => void;
  onNavigateHome?: () => void;
  fuzzyProps?: Partial<FuzzyTextProps>;
}

interface ErrorPreset {
  badge: string;
  title: string;
  description: string;
  primaryAction: {
    label: string;
    icon: React.ReactNode;
    type: 'home' | 'retry' | 'settings' | 'health';
  };
  secondaryAction?: {
    label: string;
    icon: React.ReactNode;
    type: 'home' | 'retry' | 'settings' | 'health';
  };
  fuzzyConfig: Partial<FuzzyTextProps>;
}

const ERROR_PRESETS: Record<string, ErrorPreset> = {
  '404': {
    badge: '404 Not Found',
    title: 'Lost in the Digital Static',
    description: 'The requested page, resume route, or document template could not be found. It may have moved or evaporated into noise.',
    primaryAction: {
      label: 'Back to Resume Editor',
      icon: <ArrowLeft size={16} />,
      type: 'home'
    },
    fuzzyConfig: {
      colorSplit: 0.35,
      trigger: 'hover',
      direction: 'horizontal',
      baseIntensity: 0.2,
      hoverIntensity: 0.5,
      fuzzRange: 28,
      sliceSize: 1,
      fps: 60,
      intro: true,
      introDuration: 1200,
      letterSpacing: 4,
      enableHover: true,
      clickEffect: true,
      glitchMode: true,
      glitchInterval: 2400,
      glitchDuration: 200,
      fontSize: 'clamp(4rem, 14vw, 9.5rem)',
      fontWeight: 900
    }
  },
  '500': {
    badge: '500 Server Error',
    title: 'Internal Processing Anomaly',
    description: 'Our optimization engine or AI compiler hit an unexpected exception during execution. System telemetry has logged this event.',
    primaryAction: {
      label: 'Try Again',
      icon: <RotateCw size={16} />,
      type: 'retry'
    },
    secondaryAction: {
      label: 'Return to Workspace',
      icon: <ArrowLeft size={16} />,
      type: 'home'
    },
    fuzzyConfig: {
      colorSplit: 0.65,
      trigger: 'always',
      direction: 'both',
      baseIntensity: 0.3,
      hoverIntensity: 0.7,
      fuzzRange: 36,
      sliceSize: 2,
      fps: 60,
      transitionDuration: 10,
      intro: true,
      introDuration: 1000,
      letterSpacing: 6,
      enableHover: true,
      clickEffect: true,
      glitchMode: true,
      glitchInterval: 1600,
      glitchDuration: 280,
      fontSize: 'clamp(4rem, 14vw, 9.5rem)',
      fontWeight: 900
    }
  },
  '403': {
    badge: '403 Access Denied',
    title: 'Authorization Required',
    description: 'Access was declined. An active Groq or NVIDIA NIM API key is required to utilize AI optimization and model inference services.',
    primaryAction: {
      label: 'Configure API Keys',
      icon: <Key size={16} />,
      type: 'settings'
    },
    secondaryAction: {
      label: 'Back to Home',
      icon: <ArrowLeft size={16} />,
      type: 'home'
    },
    fuzzyConfig: {
      colorSplit: 0.2,
      trigger: 'hover',
      direction: 'horizontal',
      baseIntensity: 0.16,
      hoverIntensity: 0.45,
      fuzzRange: 22,
      sliceSize: 1,
      fps: 50,
      intro: true,
      introDuration: 1200,
      letterSpacing: 3,
      enableHover: true,
      clickEffect: true,
      fontSize: 'clamp(4rem, 14vw, 9.5rem)',
      fontWeight: 900
    }
  },
  '503': {
    badge: '503 Service Offline',
    title: 'Backend Engine Unreachable',
    description: 'The local ResumeFit backend server (port 3001) could not be contacted. Please verify that the API server is active with "npm run server".',
    primaryAction: {
      label: 'Check Server Health',
      icon: <Server size={16} />,
      type: 'health'
    },
    secondaryAction: {
      label: 'Back to Editor',
      icon: <ArrowLeft size={16} />,
      type: 'home'
    },
    fuzzyConfig: {
      colorSplit: 0.45,
      trigger: 'hover',
      direction: 'vertical',
      baseIntensity: 0.24,
      hoverIntensity: 0.58,
      fuzzRange: 32,
      sliceSize: 2,
      fps: 50,
      intro: true,
      introDuration: 1200,
      letterSpacing: 5,
      enableHover: true,
      clickEffect: true,
      glitchMode: true,
      glitchInterval: 2800,
      glitchDuration: 220,
      fontSize: 'clamp(4rem, 14vw, 9.5rem)',
      fontWeight: 900
    }
  }
};

const DEFAULT_PRESET: ErrorPreset = {
  badge: 'System Notice',
  title: 'Unexpected Application State',
  description: 'An unhandled state was encountered. You can return to the editor or retry the last operation.',
  primaryAction: {
    label: 'Back to Workspace',
    icon: <ArrowLeft size={16} />,
    type: 'home'
  },
  fuzzyConfig: {
    colorSplit: 0.3,
    trigger: 'hover',
    direction: 'horizontal',
    baseIntensity: 0.2,
    hoverIntensity: 0.5,
    fuzzRange: 26,
    sliceSize: 1,
    fps: 60,
    fontSize: 'clamp(4rem, 14vw, 9.5rem)',
    fontWeight: 900
  }
};

export const ErrorPage: React.FC<ErrorPageProps> = ({
  code = 404,
  title,
  description,
  badge,
  error,
  errorInfo,
  onRetry,
  onNavigateHome,
  fuzzyProps
}) => {
  const codeStr = String(code);
  const preset = ERROR_PRESETS[codeStr] || DEFAULT_PRESET;

  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const displayBadge = badge || preset.badge;
  const displayTitle = title || preset.title;
  const displayDescription = description || preset.description;

  const handleHomeClick = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      navigate('/');
    }
  };

  const handleActionClick = (type: 'home' | 'retry' | 'settings' | 'health') => {
    switch (type) {
      case 'home':
        handleHomeClick();
        break;
      case 'retry':
        if (onRetry) {
          onRetry();
        } else {
          window.location.reload();
        }
        break;
      case 'settings':
        handleHomeClick();
        // Give time for home route to mount, then trigger settings
        setTimeout(() => {
          const settingsBtn = document.querySelector('button[aria-label="Settings"]') as HTMLButtonElement | null;
          settingsBtn?.click();
        }, 150);
        break;
      case 'health':
        setIsCheckingHealth(true);
        setHealthStatus(null);
        fetch('/health')
          .then(res => {
            if (res.ok) {
              setHealthStatus('ONLINE: Backend responded successfully! You can return to the editor.');
            } else {
              setHealthStatus(`OFFLINE: Server returned status ${res.status}`);
            }
          })
          .catch(() => {
            setHealthStatus('OFFLINE: Connection refused on port 3001. Ensure backend is running.');
          })
          .finally(() => {
            setIsCheckingHealth(false);
          });
        break;
    }
  };

  const errorString = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack || ''}` : error ? String(error) : '';
  const componentStack = errorInfo?.componentStack || '';
  const fullDiagnostics = [errorString, componentStack].filter(Boolean).join('\n\nComponent Stack:\n');

  const handleCopyDiagnostics = () => {
    if (!fullDiagnostics) return;
    navigator.clipboard.writeText(fullDiagnostics).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const dotClass = `color-${codeStr}`;

  return (
    <div className="error-page-container">
      {/* Top Header / Nav */}
      <header className="error-page-nav">
        <div className="container error-page-nav-inner">
          <div className="error-page-logo" onClick={handleHomeClick} role="button" tabIndex={0}>
            <div className="error-page-logo-icon">R</div>
            <span className="error-page-logo-text">Resume Optimizer</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button 
              className="error-btn error-btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              onClick={handleHomeClick}
            >
              <ArrowLeft size={14} /> Back to App
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Error Content */}
      <main className="error-page-main animate-fade-up">
        {/* Status Pill Badge */}
        <div className="error-badge">
          <span className={`error-badge-dot ${dotClass}`} />
          <span>{displayBadge}</span>
        </div>

        {/* Dynamic Canvas Component from React Bits */}
        <div className="error-fuzzy-wrapper">
          <FuzzyText
            className="error-fuzzy-canvas"
            {...preset.fuzzyConfig}
            {...fuzzyProps}
          >
            {codeStr}
          </FuzzyText>
        </div>

        {/* Descriptive Text */}
        <h1 className="error-title">{displayTitle}</h1>
        <p className="error-description">{displayDescription}</p>

        {/* Backend health status response banner */}
        {healthStatus && (
          <div 
            style={{ 
              marginBottom: 'var(--space-4)', 
              padding: '10px 18px', 
              borderRadius: 'var(--radius-base)',
              fontSize: '0.85rem',
              fontWeight: 500,
              backgroundColor: healthStatus.startsWith('ONLINE') ? 'var(--plan-accepted-bg)' : 'var(--plan-rejected-bg)',
              color: healthStatus.startsWith('ONLINE') ? 'var(--plan-accepted-text)' : 'var(--plan-rejected-text)',
              border: `1px solid ${healthStatus.startsWith('ONLINE') ? 'var(--plan-accepted-border)' : 'var(--plan-rejected-border)'}`
            }}
          >
            {healthStatus}
          </div>
        )}

        {/* Action Buttons */}
        <div className="error-actions">
          <button
            className="error-btn error-btn-primary"
            onClick={() => handleActionClick(preset.primaryAction.type)}
            disabled={isCheckingHealth}
          >
            {isCheckingHealth ? <RotateCw size={16} className="animate-spin" /> : preset.primaryAction.icon}
            {preset.primaryAction.label}
          </button>

          {preset.secondaryAction && (
            <button
              className="error-btn error-btn-secondary"
              onClick={() => handleActionClick(preset.secondaryAction!.type)}
            >
              {preset.secondaryAction.icon}
              {preset.secondaryAction.label}
            </button>
          )}
        </div>

        {/* Technical Diagnostics Accordion (if error object exists) */}
        {fullDiagnostics && (
          <div className="error-diagnostics">
            <button 
              className="error-diagnostics-summary"
              onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
              type="button"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={15} style={{ color: 'var(--color-error)' }} />
                Technical Diagnostics & Trace
              </span>
              {isDiagnosticsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isDiagnosticsOpen && (
              <div className="error-diagnostics-content">
                <div>{fullDiagnostics}</div>
                <button className="error-copy-btn" onClick={handleCopyDiagnostics}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied to clipboard' : 'Copy stack trace'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// Specialized convenient wrapper exports
export const NotFoundPage: React.FC<Omit<ErrorPageProps, 'code'>> = props => (
  <ErrorPage code={404} {...props} />
);

export const ServerErrorPage: React.FC<Omit<ErrorPageProps, 'code'>> = props => (
  <ErrorPage code={500} {...props} />
);

export const ForbiddenPage: React.FC<Omit<ErrorPageProps, 'code'>> = props => (
  <ErrorPage code={403} {...props} />
);

export const ServiceUnavailablePage: React.FC<Omit<ErrorPageProps, 'code'>> = props => (
  <ErrorPage code={503} {...props} />
);

export default ErrorPage;
