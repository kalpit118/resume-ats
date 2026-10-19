import { useState, useRef, useEffect } from 'react';
import { Settings, CheckCircle2, Zap, Loader2, Info, Eye, EyeOff, X, Check, Pencil, AlertCircle, FileUp } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import CustomSelect from './CustomSelect';
import ModelLogo from './ModelLogo';
import UploadDropzone from './UploadDropzone';

// Strips LaTeX commands & macros so plain text is cleanly presented in the UI
function cleanLatex(s: string): string {
  if (!s || typeof s !== 'string') return '';
  let res = s;
  for (let i = 0; i < 3; i++) {
    res = res
      .replace(/\\(?:textbf|textit|emph|underline|texttt|textrm|textsc)\{([^}]*)\}/gi, '$1')
      .replace(/\\href\{[^}]*\}\{([^}]*)\}/gi, '$1')
      .replace(/\\url\{[^}]*\}/gi, '')
      .replace(/\\[a-zA-Z]+(?:\*|\[[^\]]*\])?\{([^}]*)\}/g, '$1');
  }
  return res
    .replace(/\\(?:item|resumeItem|cvitem|cvlistitem|denseitem|entry)\b\s*/gi, '')
    .replace(/\\[a-zA-Z]+\b/g, '')
    .replace(/\\\\/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function App() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Optimization Rules State
  const [intensity, setIntensity] = useState('Balanced (Recommended)');
  const [writingStyle, setWritingStyle] = useState('Professional');
  const [targetLength, setTargetLength] = useState('One page');
  const [contentPreferences, setContentPreferences] = useState({
    'Optimize Summary': true,
    'Reorder Sections': false,
    'Improve Bullet Points': false,
    'Condense Content': true
  });

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 95) return p;
          return p + Math.random() * 5;
        });
      }, 500);
    } else {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);
  
  // Phase 5: Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editableResume, setEditableResume] = useState<any>(null);

  // Track which plan changes the user has accepted (by index). Defaults to all accepted.
  const [acceptedChanges, setAcceptedChanges] = useState<Set<number>>(new Set());
  // Track any manual text edits made via the pencil icon per change index
  const [customOptimized, setCustomOptimized] = useState<Record<number, string>>({});
  // Inline editor state
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const toggleChange = (idx: number, accept: boolean) => {
    setAcceptedChanges(prev => {
      const next = new Set(prev);
      if (accept) next.add(idx); else next.delete(idx);
      return next;
    });
  };

  const startEditing = (idx: number, currentText: string) => {
    setEditingIdx(idx);
    setEditingText(currentText);
  };

  const saveEdit = (idx: number) => {
    setCustomOptimized(prev => ({ ...prev, [idx]: editingText }));
    setEditingIdx(null);
  };

  const cancelEdit = () => setEditingIdx(null);

  const resetEdit = (idx: number) => {
    setCustomOptimized(prev => { const n = { ...prev }; delete n[idx]; return n; });
    setEditingIdx(null);
  };

  // LaTeX Resume Template Picker State
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('modern');
  const [customLatexContent, setCustomLatexContent] = useState<string | null>(null);
  const [customLatexFileName, setCustomLatexFileName] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([
    {
      id: 'classic',
      name: 'Classic Professional',
      description: 'Traditional serif layout — ideal for finance, law, and consulting.',
      previewUrl: '/templates/classic.svg',
    },
    {
      id: 'modern',
      name: 'Modern Minimal',
      description: 'Clean navy-accent design — great for tech and product roles.',
      previewUrl: '/templates/modern.svg',
    },
    {
      id: 'minimal',
      name: 'ATS Minimal',
      description: 'Plain formatting optimized for Applicant Tracking Systems.',
      previewUrl: '/templates/minimal.svg',
    },
    {
      id: 'academic',
      name: 'Academic / CV',
      description: 'Research-oriented CV with green accent — for academia and R&D.',
      previewUrl: '/templates/academic.svg',
    },
  ]);
  const customTexInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/export/templates')
      .then(res => res.json())
      .then(data => {
        if (data?.templates && Array.isArray(data.templates) && data.templates.length > 0) {
          setAvailableTemplates(data.templates);
        }
      })
      .catch(() => {});
  }, [isTemplatePickerOpen]);

  // Phase 7: AI Provider Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('aiProvider') || 'groq');
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groqApiKey') || '');
  const [nimApiKey, setNimApiKey] = useState(() => localStorage.getItem('nimApiKey') || '');
  const [aiModel, setAiModel] = useState(() => localStorage.getItem('aiModel') || 'llama-3.1-8b-instant');
  const [groqModels, setGroqModels] = useState<string[]>([]);
  const [nimModels, setNimModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Modal Draft States (so opening Settings doesn't force saving or mutate until user clicks Save)
  const [draftProvider, setDraftProvider] = useState(aiProvider);
  const [draftGroqApiKey, setDraftGroqApiKey] = useState(groqApiKey);
  const [draftNimApiKey, setDraftNimApiKey] = useState(nimApiKey);
  const [draftAiModel, setDraftAiModel] = useState(aiModel);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Sync draft when modal opens
  const handleOpenSettings = () => {
    setDraftProvider(aiProvider);
    setDraftGroqApiKey(groqApiKey);
    setDraftNimApiKey(nimApiKey);
    setDraftAiModel(aiModel);
    setSavedFeedback(false);
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
    setSavedFeedback(false);
  };

  const handleSaveSettings = () => {
    setAiProvider(draftProvider);
    localStorage.setItem('aiProvider', draftProvider);

    setGroqApiKey(draftGroqApiKey);
    localStorage.setItem('groqApiKey', draftGroqApiKey);

    setNimApiKey(draftNimApiKey);
    localStorage.setItem('nimApiKey', draftNimApiKey);

    setAiModel(draftAiModel);
    localStorage.setItem('aiModel', draftAiModel);

    setSavedFeedback(true);
    setTimeout(() => {
      setIsSettingsOpen(false);
      setSavedFeedback(false);
    }, 400);
  };

  // Determine active API key based on selected provider
  const currentApiKey = aiProvider === 'groq' ? groqApiKey : nimApiKey;

  const activeKeyForFetch = isSettingsOpen
    ? (draftProvider === 'groq' ? draftGroqApiKey : draftNimApiKey)
    : (aiProvider === 'groq' ? groqApiKey : nimApiKey);
  const activeProviderForFetch = isSettingsOpen ? draftProvider : aiProvider;

  useEffect(() => {
    if (activeProviderForFetch === 'groq' && activeKeyForFetch) {
      setIsLoadingModels(true);
      fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${activeKeyForFetch}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          const models = data.data.map((m: any) => m.id).sort();
          setGroqModels(models);
          if (isSettingsOpen) {
            if (models.length > 0 && !models.includes(draftAiModel)) {
              setDraftAiModel(models[0]);
            }
          } else {
            if (models.length > 0 && !models.includes(aiModel)) {
              setAiModel(models[0]);
              localStorage.setItem('aiModel', models[0]);
            }
          }
        }
      })
      .catch(err => console.error("Failed to fetch groq models:", err))
      .finally(() => setIsLoadingModels(false));
    } else if (activeProviderForFetch === 'nim' && activeKeyForFetch) {
      setIsLoadingModels(true);
      fetch('/api/models?provider=nim', {
        headers: {
          'Authorization': `Bearer ${activeKeyForFetch}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          const models = data.data.map((m: any) => m.id).sort();
          setNimModels(models);
          if (isSettingsOpen) {
            if (models.length > 0 && !models.includes(draftAiModel)) {
              setDraftAiModel(models[0]);
            }
          } else {
            if (models.length > 0 && !models.includes(aiModel)) {
              setAiModel(models[0]);
              localStorage.setItem('aiModel', models[0]);
            }
          }
        }
      })
      .catch(err => console.error("Failed to fetch nim models:", err))
      .finally(() => setIsLoadingModels(false));
    }
  }, [activeProviderForFetch, activeKeyForFetch, isSettingsOpen]);


  const runOptimization = async () => {
    if (!resumeFile && !resumeText.trim()) {
      alert("Please provide your resume (file or text).");
      return;
    }
    if (!jdText.trim()) {
      alert("Please provide the Job Description.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      if (resumeFile) formData.append('resume', resumeFile);
      if (resumeText) formData.append('resumeText', resumeText);
      formData.append('jdText', jdText);
      formData.append('rules', JSON.stringify({
        intensity,
        writingStyle,
        targetLength,
        contentPreferences: Object.entries(contentPreferences)
          .filter(([_, enabled]) => enabled)
          .map(([pref]) => pref)
      }));
      formData.append('aiProvider', aiProvider);
      formData.append('aiApiKey', currentApiKey);
      formData.append('aiModel', aiModel);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (jsonErr) {
        if (!response.ok) {
          throw new Error(`Server returned ${response.status} ${response.statusText}. Please ensure the backend server is running on port 3001.`);
        }
        throw jsonErr;
      }

      if (response.ok) {
        // Defensive filter: Ensure no-op proposals (where original and optimized are identical) are excluded
        if (data.data?.validatedPlan) {
          data.data.validatedPlan = data.data.validatedPlan.filter((plan: any) => {
            const orig = cleanLatex(plan.original || '').trim();
            const opt = cleanLatex(plan.optimized || '').trim();
            return orig !== opt;
          });
        }
        setAnalysisResult(data);
        // Default: accept all changes
        const allIndices = new Set<number>((data.data.validatedPlan || []).map((_: any, i: number) => i));
        setAcceptedChanges(allIndices);
        setCustomOptimized({});
        setEditingIdx(null);
        // Initialize editor state with the original parsed profile.
        // AI changes are applied dynamically during export or display.
        const profile = data.data.profile;
        if (profile) {
          setEditableResume({
            name: profile.name || "User Name",
            email: profile.email || "email@example.com",
            phone: profile.phone || "",
            location: profile.location || "",
            summary: profile.summary || "",
            sections: profile.sections || [],
            // Legacy compat: if AI still returns experience, keep it
            experience: profile.experience || []
          });
        } else {
          setEditableResume({
            name: "Jane Doe",
            email: "jane.doe@example.com",
            phone: "",
            location: "",
            summary: "An optimized professional.",
            sections: [],
            experience: []
          });
        }

        
        // Auto-scroll to results
        setTimeout(() => {
          document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        alert("Error: " + (data?.error || response.statusText || "Request failed"));
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to connect to server.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Dynamically apply accepted/custom AI changes to the clean profile
  const getFinalResumeContent = () => {
    if (!editableResume) return null;
    const finalResume = JSON.parse(JSON.stringify(editableResume)); // deep copy

    if (analysisResult?.data?.validatedPlan) {
      analysisResult.data.validatedPlan.forEach((plan: any, idx: number) => {
        if (!acceptedChanges.has(idx)) return;
        const optimizedText = customOptimized[idx] ?? plan.optimized;
        const originalText = plan.original;

        // Apply to summary
        if (finalResume.summary && finalResume.summary.includes(originalText)) {
          finalResume.summary = finalResume.summary.replace(originalText, optimizedText);
        }

        // Apply to dynamic sections (projects, skills, education, etc.)
        if (finalResume.sections && Array.isArray(finalResume.sections)) {
          finalResume.sections.forEach((sec: any) => {
            if (!sec.items) return;
            sec.items = sec.items.map((item: any) => {
              // Apply to bullets array
              if (item.bullets && Array.isArray(item.bullets)) {
                item.bullets = item.bullets.map((b: string) =>
                  b.includes(originalText) ? b.replace(originalText, optimizedText) : b
                );
              }
              // Apply to flat content field (e.g. skills section)
              if (item.content && item.content.includes(originalText)) {
                item.content = item.content.replace(originalText, optimizedText);
              }
              // Apply to title
              if (item.title && item.title.includes(originalText)) {
                item.title = item.title.replace(originalText, optimizedText);
              }
              return item;
            });
          });
        }

        // Legacy: Apply to experience bullets (for backward compatibility)
        if (finalResume.experience && Array.isArray(finalResume.experience)) {
          finalResume.experience.forEach((exp: any) => {
            if (exp.bullets) {
              exp.bullets = exp.bullets.map((b: string) =>
                b.includes(originalText) ? b.replace(originalText, optimizedText) : b
              );
            }
          });
        }
      });
    }
    return finalResume;
  };


  const handleExport = async (format: string) => {
    const isLatexSource = analysisResult?.data?.isLatexSource === true;
    const rawLatex = analysisResult?.data?.rawLatex as string | undefined;

    // When exporting to PDF and input was not a .tex file, open the LaTeX Template Picker popup
    if (format === 'PDF' && (!isLatexSource || !rawLatex)) {
      setExportError(null);
      setIsTemplatePickerOpen(true);
      return;
    }

    // Direct export for TXT or native LaTeX uploads
    await executeExport(format);
  };

  const executeExport = async (format: string, templateIdOverride?: string, customLatexOverride?: string) => {
    try {
      if (format === 'PDF') {
        setIsExportingPdf(true);
        setExportError(null);
      }

      const isLatexSource = analysisResult?.data?.isLatexSource === true;
      const rawLatex = analysisResult?.data?.rawLatex as string | undefined;

      // Build the changes array — server will apply these to the template source smartly
      const changes = (analysisResult?.data?.validatedPlan || []).map((plan: any, idx: number) => ({
        original: plan.original,
        optimized: customOptimized[idx] ?? plan.optimized,  // prefer user's manual edit
        accepted: acceptedChanges.has(idx)
      }));

      const activeTemplateId = templateIdOverride || selectedTemplateId;
      const activeCustomLatex = customLatexOverride !== undefined ? customLatexOverride : customLatexContent;

      const bodyPayload: any = {
        format,
        resumeContent: getFinalResumeContent(),
        rawLatex: (format === 'PDF' && isLatexSource && rawLatex) ? rawLatex : undefined,
        changes: changes,
        template: 'SwissModernism',
        aiProvider,
        apiKey: currentApiKey,
        aiModel
      };

      if (format === 'PDF' && (!isLatexSource || !rawLatex)) {
        if (activeCustomLatex) {
          bodyPayload.customLatex = activeCustomLatex;
        } else {
          bodyPayload.templateId = activeTemplateId;
        }
      }

      console.log(`[Export] isLatexSource: ${isLatexSource} | rawLatex: ${!!rawLatex} | templateId: ${bodyPayload.templateId} | customLatex: ${!!bodyPayload.customLatex}`);

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        let errorMsg = 'Export failed';
        try {
          const errData = await response.json();
          errorMsg = errData.details || errData.error || errorMsg;
        } catch {
          errorMsg = await response.text();
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Successfully exported PDF -> close template picker
      if (format === 'PDF') {
        setIsTemplatePickerOpen(false);
      }
    } catch (err: any) {
      console.error('[Export Error]', err);
      const msg = err.message || 'Failed to export document.';
      if (format === 'PDF' && isTemplatePickerOpen) {
        setExportError(msg);
      } else {
        alert(msg);
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCustomTexUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCustomLatexContent(text);
        setCustomLatexFileName(file.name);
        setSelectedTemplateId('custom');
      }
    };
    reader.readAsText(file);
  };


  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <nav style={{ borderBottom: '1px solid var(--color-border)', padding: 'var(--space-2) 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <div style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-secondary)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontWeight: 'bold' }}>
              R
            </div>
            <span className="text-small" style={{ fontWeight: 700, fontSize: '1.2rem' }}>Resume Optimizer</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <a href="#" className="text-small" style={{ textDecoration: 'none', color: 'var(--color-text-muted)' }}>How it Works</a>
            <a href="#" className="text-small" style={{ textDecoration: 'none', color: 'var(--color-text-muted)' }}>Pricing</a>
            <button onClick={handleOpenSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }} aria-label="Settings">
              <Settings size={20} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="container section" style={{ flex: 1, paddingBottom: 'var(--space-8)' }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: 'var(--space-6)', maxWidth: '800px' }} className="animate-fade-up">
          <h1 className="text-hero" style={{ marginBottom: 'var(--space-2)' }}>
            Precision match <br/>your resume.
          </h1>
          <p className="text-body" style={{ color: 'var(--color-text-muted)', fontSize: '1.25rem' }}>
            Mathematical optimization for your career. We analyze the job description and restructure your experience without fabricating qualifications.
          </p>
        </div>

        {/* Two Column Layout for Inputs */}
        <div className="grid-12 animate-fade-up delay-100" style={{ gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--space-4)' }}>
          
          {/* Left Column: Inputs (8 cols) */}
          <div style={{ gridColumn: 'span 8' }}>
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <h2 className="text-h2" style={{ marginBottom: 'var(--space-3)' }}>1. Your Resume</h2>
              
              <UploadDropzone
                file={resumeFile}
                onFileSelect={(file) => setResumeFile(file)}
                onClear={() => setResumeFile(null)}
                disabled={!!resumeText.trim()}
                accept=".pdf,.docx,.txt,.tex"
              />

              <div style={{ marginTop: 'var(--space-3)' }}>
                <p className="text-small" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)', textAlign: 'center' }}>Or paste text directly</p>
                <textarea 
                  className="form-input" 
                  placeholder={resumeFile ? "File selected above" : "Paste your existing resume content here..."} 
                  disabled={!!resumeFile}
                  style={{ 
                    width: '100%', 
                    minHeight: '120px', 
                    resize: 'vertical',
                    backgroundColor: resumeFile ? 'var(--color-tertiary)' : 'var(--color-secondary)',
                    cursor: resumeFile ? 'not-allowed' : 'text',
                    opacity: resumeFile ? 0.5 : 1
                  }}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
              </div>
              <div style={{ marginTop: 'var(--space-2)', textAlign: 'center' }}>
                <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>🔒 Privacy Note: Files are processed securely and deleted immediately.</span>
              </div>
            </div>

            <div className="card">
              <h2 className="text-h2" style={{ marginBottom: 'var(--space-3)' }}>2. Target Job Description</h2>
              <textarea 
                className="form-input" 
                placeholder="Paste the target job description here..." 
                style={{ width: '100%', minHeight: '200px', resize: 'vertical' }}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
              />
            </div>
          </div>

          {/* Right Column: Settings (4 cols) */}
          <div style={{ gridColumn: 'span 4' }}>
            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
                <Settings size={20} />
                <h2 className="text-h2" style={{ fontSize: '1.25rem' }}>Optimization Rules</h2>
              </div>

              <div style={{ flex: 1 }}>
                <div className="form-group">
                  <label className="form-label">Intensity</label>
                  <CustomSelect
                    value={intensity}
                    onChange={setIntensity}
                    options={[
                      'Balanced (Recommended)',
                      'Conservative',
                      'Aggressive'
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Writing Style</label>
                  <CustomSelect
                    value={writingStyle}
                    onChange={setWritingStyle}
                    options={[
                      'Professional',
                      'Concise',
                      'Technical',
                      'Achievement-focused',
                      'ATS-focused'
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Length</label>
                  <CustomSelect
                    value={targetLength}
                    onChange={setTargetLength}
                    options={[
                      'One page',
                      'Two pages',
                      'Keep original length'
                    ]}
                  />
                </div>

                <div style={{ margin: 'var(--space-4) 0' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Content Preferences</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { name: 'Optimize Summary', desc: 'Tailors your summary paragraph to highlight skills matching the job description.' },
                      { name: 'Reorder Sections', desc: 'Moves sections with the highest keyword matches to the top of your resume.' },
                      { name: 'Improve Bullet Points', desc: 'Rewrites bullets to include relevant keywords and action verbs naturally.' },
                      { name: 'Condense Content', desc: 'Makes phrasing more concise to fit length constraints without losing impact.' }
                    ].map(pref => (
                      <label
                        key={pref.name}
                        className="custom-tooltip-container"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                          width: 'fit-content',
                          userSelect: 'none'
                        }}
                      >
                        <span className="ios-checkbox red">
                          <input 
                            type="checkbox" 
                            checked={(contentPreferences as any)[pref.name]}
                            onChange={(e) => setContentPreferences({...contentPreferences, [pref.name]: e.target.checked})}
                          />
                          <span className="checkbox-wrapper">
                            <span className="checkbox-bg"></span>
                            <svg className="checkbox-icon" viewBox="0 0 24 24" fill="none">
                              <path
                                className="check-path"
                                d="M4.5 11.5L9.5 16.5L19.5 6.5"
                                stroke="currentColor"
                                strokeWidth="3.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              ></path>
                            </svg>
                          </span>
                        </span>
                        <span className="text-small">{pref.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)' }}>
                          <Info size={14} />
                        </div>
                        <div className="custom-tooltip-content">{pref.desc}</div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
                <button 
                  className={`btn ${isAnalyzing ? 'btn-progress' : 'btn-primary'}`}
                  style={{ width: '100%', '--progress-value': progress } as React.CSSProperties}
                  onClick={runOptimization}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing && <div className="progress-indicator"></div>}
                  {isAnalyzing && <div className="progress-indicator"></div>}
                  <span className={isAnalyzing ? "btn-text" : ""} style={!isAnalyzing ? { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' } : {}}>
                    {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                    {isAnalyzing ? `Analyzing... ${Math.floor(progress)}%` : 'Run Optimization Engine'}
                  </span>
                </button>
                <p className="text-small" style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', textAlign: 'center', fontSize: '0.75rem' }}>
                  * We never fabricate qualifications or experience.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Results Area Stub */}
        {analysisResult && analysisResult.data && (
          <div className="card animate-fade-up" style={{ marginTop: 'var(--space-6)' }} id="results">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <CheckCircle2 size={28} style={{ color: 'var(--guard-passed-color)' }} />
              <h2 className="text-h1">Analysis Complete</h2>
            </div>
            
            <div className="grid-12" style={{ gap: 'var(--space-4)' }}>
              <div style={{ gridColumn: 'span 4' }}>
                <div style={{ backgroundColor: 'var(--color-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-base)', textAlign: 'center' }}>
                  <h3 className="text-small" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>Job Match Score</h3>
                  <div className="text-hero" style={{ color: 'var(--color-primary)' }}>{analysisResult.data.scoreBreakdown.score}<span style={{ fontSize: '1.5rem', color: 'var(--color-text-muted)' }}>/100</span></div>
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <p className="text-small">Keyword Coverage: {analysisResult.data.scoreBreakdown.keywordCoverage}%</p>
                  </div>
                </div>
              </div>

              <div style={{ gridColumn: 'span 8' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  
                  {/* Matched */}
                  <div>
                    <h3 className="text-h2" style={{ marginBottom: 'var(--space-2)' }}>Matched</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                      {analysisResult.data.matches.filter((m: any) => m.status === 'matched').map((m: any, i: number) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <CheckCircle2 size={16} style={{ color: 'var(--guard-passed-color)' }} /> 
                          <span>{m.requirement}</span>
                          <span className="text-small" style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>({m.type})</span>
                        </li>
                      ))}
                      {analysisResult.data.matches.filter((m: any) => m.status === 'matched').length === 0 && (
                        <li className="text-small" style={{ color: 'var(--color-text-muted)' }}>No matches found</li>
                      )}
                    </ul>
                  </div>

                  {/* Missing */}
                  <div>
                    <h3 className="text-h2" style={{ marginBottom: 'var(--space-2)' }}>Missing</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                      {analysisResult.data.matches.filter((m: any) => m.status === 'missing').map((m: any, i: number) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ color: 'var(--color-error)' }}>✕</span>
                          <span>{m.requirement}</span>
                        </li>
                      ))}
                      {analysisResult.data.matches.filter((m: any) => m.status === 'missing').length === 0 && (
                        <li className="text-small" style={{ color: 'var(--color-text-muted)' }}>No missing skills detected</li>
                      )}
                    </ul>
                  </div>
                  
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: 'var(--space-6)' }}>
              <h3 className="text-h2" style={{ marginBottom: 'var(--space-3)' }}>AI Optimization Plan & Evidence Guard</h3>
              
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>Powered by: <strong>{analysisResult.data.providerUsed}</strong></span>
              </div>

              {(!analysisResult.data.validatedPlan || analysisResult.data.validatedPlan.length === 0) ? (
                (() => {
                  const matchScore = analysisResult.data.scoreBreakdown?.score ?? 0;
                  const missingMatches = (analysisResult.data.matches || []).filter((m: any) => m.status === 'missing');
                  const isQualificationGap = matchScore < 70 || missingMatches.length > 2;

                  if (isQualificationGap) {
                    return (
                      <div className="card" style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-base)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--guard-warning-color)', marginBottom: '10px', fontWeight: 600, fontSize: '1.05rem' }}>
                          <AlertCircle size={22} />
                          <span>No Automated Rewrites Proposed (Evidence Guard Protected)</span>
                        </div>
                        <p className="text-body" style={{ margin: '0 0 var(--space-3) 0', color: 'var(--color-text-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                          Your current match score is <strong>{matchScore}/100</strong> with <strong>{missingMatches.length} missing qualifications</strong> from the job description.
                          To maintain strict resume integrity and prevent candidate misrepresentation, the <strong>AI Evidence Guard</strong> will not fabricate unverified skills (such as {missingMatches.slice(0, 4).map((m: any) => m.requirement).join(', ')}) that are absent from your source resume.
                        </p>

                        {missingMatches.length > 0 && (
                          <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-secondary)', borderRadius: 'var(--radius-base)', border: '1px solid var(--color-border)' }}>
                            <div className="text-small" style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                              Missing Job Requirements Requiring Candidate Input:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {missingMatches.map((m: any, idx: number) => (
                                <span 
                                  key={idx} 
                                  className="text-small"
                                  style={{ 
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px', 
                                    borderRadius: '4px', 
                                    backgroundColor: 'var(--color-tertiary)', 
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-muted)'
                                  }}
                                >
                                  <span style={{ color: 'var(--color-error)', fontSize: '0.8rem' }}>✕</span>
                                  {m.requirement}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px dashed var(--color-border)', paddingTop: 'var(--space-3)' }}>
                          <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>
                            💡 <strong>Next Step:</strong> If you have experience with any of these skills, add them manually to your resume.
                          </span>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => {
                              setEditableResume(getFinalResumeContent());
                              setIsEditorOpen(true);
                            }}
                          >
                            <Pencil size={13} /> Edit Resume Manually
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center', backgroundColor: 'var(--color-tertiary)', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--guard-passed-color)', marginBottom: '8px', fontWeight: 600 }}>
                        <CheckCircle2 size={20} />
                        <span>Strong Match — No Content Changes Required</span>
                      </div>
                      <p className="text-body" style={{ margin: '0 auto', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                        Your resume already closely aligns with this job description ({matchScore}/100). All core qualifications and required keywords are well-represented.
                      </p>
                    </div>
                  );
                })()
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {(() => {
                    const matchScore = analysisResult.data.scoreBreakdown?.score ?? 0;
                    const missingMatches = (analysisResult.data.matches || []).filter((m: any) => m.status === 'missing');
                    const isQualificationGap = matchScore < 70 || missingMatches.length > 2;
                    if (!isQualificationGap) return null;
                    return (
                      <div style={{
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-base)',
                        backgroundColor: 'var(--color-tertiary)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        fontSize: '0.88rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.5
                      }}>
                        <Info size={16} style={{ color: 'var(--guard-warning-color)', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <span style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>Evidence Guard Notice: </span>
                          The AI optimized your existing experience below. However, <strong>{missingMatches.length} required skills</strong> (such as {missingMatches.slice(0, 4).map((m: any) => m.requirement).join(', ')}) were not found in your resume and cannot be fabricated. If you possess these skills, please add them via <strong>Edit Manually</strong>.
                        </div>
                      </div>
                    );
                  })()}
                  {analysisResult.data.validatedPlan.map((plan: any, idx: number) => {
                    const isAccepted = acceptedChanges.has(idx);
                    const hasCustomEdit = customOptimized[idx] !== undefined;
                    const displayOptimized = customOptimized[idx] ?? plan.optimized;
                    const isEditingThis = editingIdx === idx;
                    return (
                    <div 
                      key={idx} 
                      className={`plan-item-card ${isAccepted ? 'is-accepted' : 'is-rejected'}`}
                    >
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <span className="text-small" style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                          Section: {
                            (plan.section || '').split('.').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' › ')
                          }
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {plan.validation?.isValid ? (
                            <span className="text-small" style={{ color: 'var(--guard-passed-color)', display: 'flex', gap: '4px', alignItems: 'center', fontWeight: 500 }}>
                              <CheckCircle2 size={14} /> Evidence Guard Passed
                            </span>
                          ) : (
                            <span className="text-small" style={{ color: 'var(--color-error)', display: 'flex', gap: '4px', alignItems: 'center', fontWeight: 500 }}>
                              <AlertCircle size={14} /> Requires Confirmation
                            </span>
                          )}
                          <span className={`plan-status-badge ${isAccepted ? 'is-accepted' : 'is-rejected'}`}>
                            {isAccepted ? <Check size={12} strokeWidth={2.5} /> : <X size={12} strokeWidth={2.5} />}
                            {isAccepted ? 'Accepted' : 'Rejected'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Content columns */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                        {/* Original */}
                        <div className="plan-box-original">
                          <div className="text-small" style={{ color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 500 }}>Original</div>
                          <div className="plan-box-text" style={{ opacity: isAccepted ? 0.65 : 1 }}>
                            {cleanLatex(plan.original)}
                          </div>
                        </div>

                        {/* Optimized — with pencil icon */}
                        <div className={`plan-box-optimized ${isAccepted ? 'is-accepted' : 'is-rejected'}`}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="text-small" style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Optimized</span>
                              {hasCustomEdit && (
                                <span className="plan-edited-badge">Edited</span>
                              )}
                            </div>
                            {!isEditingThis && (
                              <button
                                title="Edit optimized text"
                                onClick={() => startEditing(idx, displayOptimized)}
                                className="plan-edit-btn"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                          </div>

                          {isEditingThis ? (
                            <div>
                              <textarea
                                value={editingText}
                                onChange={e => setEditingText(e.target.value)}
                                autoFocus
                                className="plan-edit-textarea"
                              />
                              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                  onClick={() => saveEdit(idx)}
                                >
                                  <Check size={13} strokeWidth={2.5} /> Save
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                  onClick={cancelEdit}
                                >
                                  <X size={13} strokeWidth={2.5} /> Cancel
                                </button>
                                {hasCustomEdit && (
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}
                                    onClick={() => resetEdit(idx)}
                                  >
                                    ↺ Reset to AI
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="plan-box-text" style={{ opacity: isAccepted ? 1 : 0.55 }}>
                              {cleanLatex(displayOptimized)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Reasoning */}
                      <div className="text-small" style={{ color: 'var(--color-text-muted)', borderTop: '1px dashed var(--color-border)', paddingTop: 'var(--space-2)', lineHeight: 1.5 }}>
                        <strong style={{ color: 'var(--color-text-main)' }}>AI Reasoning:</strong> {plan.reasoning} <br/>
                        <strong style={{ color: 'var(--color-text-main)' }}>Guard Reasoning:</strong> {plan.validation?.reasoning}
                      </div>

                      {/* Accept / Reject buttons */}
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                        <button 
                          className={`plan-btn-action plan-btn-accept ${isAccepted ? 'is-active' : ''}`}
                          onClick={() => toggleChange(idx, true)}
                        >
                          <Check size={14} strokeWidth={2.5} /> Accept
                        </button>
                        <button 
                          className={`plan-btn-action plan-btn-reject ${!isAccepted ? 'is-active' : ''}`}
                          onClick={() => toggleChange(idx, false)}
                        >
                          <X size={14} strokeWidth={2.5} /> Reject
                        </button>
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </div>

            <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={() => {
                setEditableResume(getFinalResumeContent());
                setIsEditorOpen(true);
              }}>Edit Manually</button>
              <button className="btn btn-primary" onClick={() => handleExport('PDF')}>Export to PDF</button>
              <button className="btn btn-secondary" onClick={() => handleExport('TXT')}>Export TXT</button>
            </div>
          </div>
        )}

        {/* Phase 5: Resume Editor Modal */}
        {isEditorOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'var(--space-4)' }}>
            <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <h2 className="text-h2">Manual Resume Editor</h2>
                <button className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => setIsEditorOpen(false)}>Close</button>
              </div>
              
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editableResume.name} 
                  onChange={(e) => setEditableResume({...editableResume, name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Summary</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '100px' }}
                  value={editableResume.summary} 
                  onChange={(e) => setEditableResume({...editableResume, summary: e.target.value})}
                />
              </div>

              <div style={{ marginTop: 'var(--space-4)' }}>
                {/* Dynamic sections (projects, skills, education, etc.) */}
                {editableResume.sections && editableResume.sections.length > 0 ? (
                  editableResume.sections.map((sec: any, sIdx: number) => (
                    <div key={sIdx} style={{ marginBottom: 'var(--space-4)' }}>
                      <h3 className="text-h2" style={{ fontSize: '1.2rem', marginBottom: 'var(--space-2)', textTransform: 'capitalize' }}>{sec.name}</h3>
                      {sec.items && sec.items.map((item: any, iIdx: number) => (
                        <div key={iIdx} style={{ border: '1px solid var(--color-border)', padding: 'var(--space-3)', borderRadius: 'var(--radius-base)', marginBottom: 'var(--space-2)' }}>
                          {(item.title !== undefined || item.subtitle !== undefined) && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                              {item.title !== undefined && (
                                <input className="form-input" placeholder="Title" value={item.title || ''} onChange={(e) => {
                                  const newSections = JSON.parse(JSON.stringify(editableResume.sections));
                                  newSections[sIdx].items[iIdx].title = e.target.value;
                                  setEditableResume({...editableResume, sections: newSections});
                                }} />
                              )}
                              {item.subtitle !== undefined && (
                                <input className="form-input" placeholder="Subtitle / Link" value={item.subtitle || ''} onChange={(e) => {
                                  const newSections = JSON.parse(JSON.stringify(editableResume.sections));
                                  newSections[sIdx].items[iIdx].subtitle = e.target.value;
                                  setEditableResume({...editableResume, sections: newSections});
                                }} />
                              )}
                            </div>
                          )}
                          {item.bullets !== undefined && (
                            <div>
                              <label className="form-label">Bullets (one per line)</label>
                              <textarea
                                className="form-input"
                                style={{ width: '100%', minHeight: '100px' }}
                                value={(item.bullets || []).join('\n')}
                                onChange={(e) => {
                                  const newSections = JSON.parse(JSON.stringify(editableResume.sections));
                                  newSections[sIdx].items[iIdx].bullets = e.target.value.split('\n');
                                  setEditableResume({...editableResume, sections: newSections});
                                }}
                              />
                            </div>
                          )}
                          {item.content !== undefined && (
                            <div>
                              <textarea
                                className="form-input"
                                style={{ width: '100%', minHeight: '60px' }}
                                value={item.content || ''}
                                onChange={(e) => {
                                  const newSections = JSON.parse(JSON.stringify(editableResume.sections));
                                  newSections[sIdx].items[iIdx].content = e.target.value;
                                  setEditableResume({...editableResume, sections: newSections});
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                ) : editableResume.experience && editableResume.experience.length > 0 ? (
                  // Legacy fallback: experience-only format
                  <div>
                    <h3 className="text-h2" style={{ fontSize: '1.2rem', marginBottom: 'var(--space-2)' }}>Experience</h3>
                    {editableResume.experience.map((exp: any, idx: number) => (
                      <div key={idx} style={{ border: '1px solid var(--color-border)', padding: 'var(--space-3)', borderRadius: 'var(--radius-base)', marginBottom: 'var(--space-2)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                          <input className="form-input" value={exp.role} onChange={(e) => {
                            const newExp = [...editableResume.experience];
                            newExp[idx].role = e.target.value;
                            setEditableResume({...editableResume, experience: newExp});
                          }} />
                          <input className="form-input" value={exp.company} onChange={(e) => {
                            const newExp = [...editableResume.experience];
                            newExp[idx].company = e.target.value;
                            setEditableResume({...editableResume, experience: newExp});
                          }} />
                        </div>
                        <div>
                          <label className="form-label">Bullets (one per line)</label>
                          <textarea
                            className="form-input"
                            style={{ width: '100%', minHeight: '100px' }}
                            value={exp.bullets.join('\n')}
                            onChange={(e) => {
                              const newExp = [...editableResume.experience];
                              newExp[idx].bullets = e.target.value.split('\n');
                              setEditableResume({...editableResume, experience: newExp});
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>


              <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button className="btn btn-secondary" onClick={() => setIsEditorOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => { setIsEditorOpen(false); handleExport('PDF'); }}>Save & Export PDF</button>
              </div>
            </div>
          </div>
        )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-3)'
        }}>
          <div style={{
            backgroundColor: 'var(--color-secondary)',
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-base)',
            width: '100%',
            maxWidth: '520px',
            position: 'relative',
            boxShadow: 'var(--shadow-lift)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <h2 className="text-h2" style={{ margin: 0 }}>AI Configuration</h2>
              <button 
                type="button"
                onClick={handleCloseSettings} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--color-text-muted)',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all var(--transition-base)'
                }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--color-primary)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                aria-label="Close settings"
                title="Close without saving"
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label className="text-small" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>Provider</label>
              <CustomSelect
                value={draftProvider}
                onChange={val => {
                  setDraftProvider(val);
                }}
                options={[
                  { value: 'groq', label: 'Groq', icon: <ModelLogo modelId="groq" size={18} /> },
                  { value: 'nim', label: 'NVIDIA NIM', icon: <ModelLogo modelId="nvidia" size={18} /> }
                ]}
              />
            </div>
            
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label className="text-small" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>API Key</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showApiKey ? "text" : "password"} 
                  placeholder={`Enter ${draftProvider === 'groq' ? 'Groq' : 'NVIDIA'} API Key`} 
                  className="form-input" 
                  style={{ width: '100%', paddingRight: '40px' }} 
                  value={draftProvider === 'groq' ? draftGroqApiKey : draftNimApiKey} 
                  onChange={e => { 
                    const val = e.target.value;
                    if (draftProvider === 'groq') {
                      setDraftGroqApiKey(val);
                    } else {
                      setDraftNimApiKey(val);
                    }
                  }} 
                />
                <button 
                  type="button"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  onClick={() => setShowApiKey(!showApiKey)}
                  title={showApiKey ? "Hide API Key" : "Show API Key"}
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>Keys are stored securely in your browser's local storage upon saving.</span>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label className="text-small" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>Model Name</label>
              {draftProvider === 'groq' ? (
                <CustomSelect
                  value={draftAiModel}
                  onChange={val => {
                    setDraftAiModel(val);
                  }}
                  disabled={isLoadingModels || groqModels.length === 0}
                  isLoading={isLoadingModels}
                  placeholder={draftGroqApiKey ? 'Loading models...' : 'Enter valid API Key'}
                  options={
                    groqModels.length === 0
                      ? [{ value: draftAiModel, label: `${draftAiModel} ${draftGroqApiKey ? '(Loading...)' : '(Enter valid API Key)'}`, icon: <ModelLogo modelId={draftAiModel} size={18} /> }]
                      : groqModels.map(m => ({ 
                          value: m, 
                          label: m,
                          icon: <ModelLogo modelId={m} size={18} />
                        }))
                  }
                />
              ) : draftProvider === 'nim' ? (
                <CustomSelect
                  value={draftAiModel}
                  onChange={val => {
                    setDraftAiModel(val);
                  }}
                  disabled={isLoadingModels || nimModels.length === 0}
                  isLoading={isLoadingModels}
                  placeholder={draftNimApiKey ? 'Loading models...' : 'Enter valid API Key'}
                  options={
                    nimModels.length === 0
                      ? [{ value: draftAiModel, label: `${draftAiModel} ${draftNimApiKey ? '(Loading...)' : '(Enter valid API Key)'}`, icon: <ModelLogo modelId={draftAiModel} size={18} /> }]
                      : nimModels.map(m => ({ 
                          value: m, 
                          label: `${m} (Free Endpoint)`,
                          icon: <ModelLogo modelId={m} size={18} />
                        }))
                  }
                />
              ) : (
                <input 
                  type="text" 
                  placeholder="e.g. meta/llama-3.1-8b-instruct" 
                  className="form-input" 
                  style={{ width: '100%' }} 
                  value={draftAiModel} 
                  onChange={e => { 
                    setDraftAiModel(e.target.value); 
                  }} 
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleCloseSettings}
                style={{ padding: '8px 18px' }}
              >
                Close
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSaveSettings}
                style={{ padding: '8px 20px', minWidth: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {savedFeedback ? (
                  <>
                    <Check size={16} /> Saved!
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LaTeX Resume Template Picker Modal */}
      {isTemplatePickerOpen && (
        <div 
          className="tpl-overlay" 
          onClick={(e) => { 
            if (e.target === e.currentTarget && !isExportingPdf) setIsTemplatePickerOpen(false); 
          }}
        >
          <div className="tpl-modal" role="dialog" aria-modal="true">
            {/* Header */}
            <div className="tpl-modal__header">
              <div>
                <h2 className="tpl-modal__title">Choose a LaTeX Resume Template</h2>
                <p className="tpl-modal__subtitle">
                  Select a professional design below, or upload your own .tex file. Our AI will automatically place your optimized content into the template.
                </p>
              </div>
              <button
                onClick={() => !isExportingPdf && setIsTemplatePickerOpen(false)}
                disabled={isExportingPdf}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: isExportingPdf ? 'not-allowed' : 'pointer', 
                  color: 'var(--color-text-muted)', 
                  display: 'flex', 
                  alignItems: 'center' 
                }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="tpl-modal__body">
              {/* Custom .tex upload option */}
              <div
                className={`tpl-upload-zone ${selectedTemplateId === 'custom' ? 'is-selected' : ''}`}
                onClick={() => customTexInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={customTexInputRef}
                  accept=".tex"
                  style={{ display: 'none' }}
                  onChange={handleCustomTexUpload}
                />
                <div className="tpl-upload-zone__icon">
                  <FileUp size={22} />
                </div>
                <div className="tpl-upload-zone__text">
                  <div className="tpl-upload-zone__label">
                    {customLatexFileName ? `Uploaded: ${customLatexFileName}` : 'Upload your own LaTeX template (.tex)'}
                  </div>
                  <div className="tpl-upload-zone__hint">
                    {customLatexFileName
                      ? 'Click to change file · AI will inject your resume content into this template'
                      : 'Have a favorite LaTeX template? Upload it and AI will populate it with your resume content'}
                  </div>
                </div>
                {customLatexFileName && (
                  <span className="tpl-upload-zone__filename" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Selected
                  </span>
                )}
              </div>

              <div style={{ margin: 'var(--space-2) 0 var(--space-2) 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-small" style={{ fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.72rem' }}>
                  Or select a built-in template
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              </div>

              {/* Template Grid */}
              <div className="tpl-grid">
                {availableTemplates.map((t) => {
                  const isSelected = selectedTemplateId === t.id && !customLatexContent;
                  return (
                    <div
                      key={t.id}
                      className={`tpl-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        setSelectedTemplateId(t.id);
                        setCustomLatexContent(null);
                        setCustomLatexFileName(null);
                      }}
                    >
                      <div className="tpl-card__preview">
                        <img 
                          src={t.previewUrl} 
                          alt={t.name} 
                          loading="lazy" 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/templates/default-preview.svg';
                          }}
                        />
                      </div>
                      <div className="tpl-card__name">{t.name}</div>
                      <div className="tpl-card__desc">{t.description}</div>
                      {isSelected && (
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--plan-accepted-text)', fontSize: '0.72rem', fontWeight: 600 }}>
                          <Check size={12} strokeWidth={3} /> Selected
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Compilation Spinner */}
              {isExportingPdf && (
                <div className="tpl-compiling">
                  <Loader2 size={28} className="animate-spin" />
                  <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                    Arranging content in LaTeX & compiling PDF...
                  </div>
                  <div style={{ fontSize: '0.78rem' }}>
                    AI is formatting sections and generating the PDF via Texapi cloud compiler.
                  </div>
                </div>
              )}

              {/* Error Message */}
              {exportError && (
                <div className="tpl-error-msg">
                  <strong>Export failed:</strong> {exportError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="tpl-modal__footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsTemplatePickerOpen(false)}
                disabled={isExportingPdf}
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => executeExport('PDF')}
                  disabled={isExportingPdf || (!selectedTemplateId && !customLatexContent)}
                  style={{ padding: '8px 22px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px', justifyContent: 'center' }}
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Compiling...
                    </>
                  ) : (
                    'Generate & Export PDF'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}

export default App;
