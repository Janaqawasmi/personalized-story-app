// client/src/pages/AdminStoryBriefForm.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLangNavigate } from '../i18n/navigation';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  FormHelperText,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Fade,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Add as AddIcon, Delete as DeleteIcon, WarningAmberOutlined } from '@mui/icons-material';
import { createStoryBrief, StoryBriefInput } from '../api/api';
import { normalizeStoryBriefInput } from '../utils/briefNormalize';
import SpecialistNav from '../components/SpecialistNav';
import {
  loadReferenceItems,
  loadReferenceConfig,
  loadSituationsByTopic,
  ReferenceDataItem,
  CopingToolReferenceItem,
  CopingToolGroupReferenceItem,
  TherapeuticMechanismReferenceItem,
  ReferencePlatformConfig,
  SituationReferenceItem,
} from '../services/referenceData.service';

// Helper function for multilingual labels
function getLabel(item: any, lang: "en" | "ar" | "he" = "en"): string {
  return item[`label_${lang}`] || item.label_en || '';
}

/** Informational only: story min age is below tool's suggested minimum (selected tools only). */
function shouldShowCopingToolAgeWarning(
  tool: CopingToolReferenceItem,
  isSelected: boolean,
  storyAgeMin: number,
  storyAgeMax: number,
): boolean {
  if (!isSelected) return false;
  const smin = tool.suggestedAgeMin;
  if (typeof smin !== "number" || !Number.isFinite(smin)) return false;
  if (!Number.isInteger(storyAgeMin) || !Number.isInteger(storyAgeMax)) return false;
  if (storyAgeMin < 0 || storyAgeMax > 12 || storyAgeMin >= storyAgeMax) return false;
  return storyAgeMin < smin;
}

// TabPanel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`step-tabpanel-${index}`}
      aria-labelledby={`step-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function getDescription(item: ReferenceDataItem, lang: "en" | "ar" | "he" = "en"): string {
  return (item as any)[`description_${lang}`] || item.description_en || '';
}

const AdminStoryBriefForm: React.FC = () => {
  const navigate = useLangNavigate();
  const DEFAULT_PLATFORM_MIN_AGE = 0;
  const DEFAULT_PLATFORM_MAX_AGE = 12;
  
  // Reference data state
  const [topics, setTopics] = useState<ReferenceDataItem[]>([]);
  const [generalSituations, setGeneralSituations] = useState<SituationReferenceItem[]>([]);
  const [specificSituations, setSpecificSituations] = useState<SituationReferenceItem[]>([]);
  const [emotionalGoals, setEmotionalGoals] = useState<ReferenceDataItem[]>([]);
  const [exclusions, setExclusions] = useState<ReferenceDataItem[]>([]);
  const [therapeuticMechanisms, setTherapeuticMechanisms] = useState<TherapeuticMechanismReferenceItem[]>([]);
  const [copingToolOptions, setCopingToolOptions] = useState<CopingToolReferenceItem[]>([]);
  const [copingToolGroups, setCopingToolGroups] = useState<CopingToolGroupReferenceItem[]>([]);
  const [topicSensitivities, setTopicSensitivities] = useState<ReferenceDataItem[]>([]);
  const [emotionalArcOptions, setEmotionalArcOptions] = useState<ReferenceDataItem[]>([]);
  const [peakIntensities, setPeakIntensities] = useState<ReferenceDataItem[]>([]);
  const [emotionalToneOptions, setEmotionalToneOptions] = useState<ReferenceDataItem[]>([]);
  const [endingStyleOptions, setEndingStyleOptions] = useState<ReferenceDataItem[]>([]);
  const [platformConfig, setPlatformConfig] = useState<ReferencePlatformConfig>({
    platformMinAge: DEFAULT_PLATFORM_MIN_AGE,
    platformMaxAge: DEFAULT_PLATFORM_MAX_AGE,
  });
  
  // Loading states
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingGeneralSituations, setLoadingGeneralSituations] = useState(false);
  const [loadingSpecificSituations, setLoadingSpecificSituations] = useState(false);
  const [loadingEmotionalGoals, setLoadingEmotionalGoals] = useState(false);
  const [loadingExclusions, setLoadingExclusions] = useState(false);
  const [loadingMechanisms, setLoadingMechanisms] = useState(false);
  const [loadingCopingTools, setLoadingCopingTools] = useState(false);
  const [loadingStep3, setLoadingStep3] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // UI state
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const messageRef = useRef<HTMLDivElement>(null);

  // Form data state (using enum keys only)
  const [selectedTopicKey, setSelectedTopicKey] = useState<string>('');
  const [selectedGeneralSituationKey, setSelectedGeneralSituationKey] = useState<string>('');
  const [selectedSpecificSituationKey, setSelectedSpecificSituationKey] = useState<string>('');
  const [ageMin, setAgeMin] = useState<number>(3);
  const [ageMax, setAgeMax] = useState<number>(6);
  const [selectedTopicSensitivity, setSelectedTopicSensitivity] = useState<string>("medium");
  const [selectedEmotionalGoals, setSelectedEmotionalGoals] = useState<string[]>([]);
  const [keyMessage, setKeyMessage] = useState<string>('');
  const [selectedMechanisms, setSelectedMechanisms] = useState<string[]>([]);
  const [selectedCopingTools, setSelectedCopingTools] = useState<string[]>([]);
  const [therapeuticBoundaries, setTherapeuticBoundaries] = useState<string[]>(['']);
  const [selectedComplexity, setSelectedComplexity] = useState<"very_simple" | "simple" | "moderate">("simple");
  const [selectedEmotionalTone, setSelectedEmotionalTone] = useState<string>("calm");
  const [selectedEndingStyle, setSelectedEndingStyle] = useState<string>("calm_resolution");
  const [selectedEmotionalArc, setSelectedEmotionalArc] = useState<string>("gentle_progression");
  const [selectedPeakIntensity, setSelectedPeakIntensity] = useState<string>("mild");
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>([]);
  const [selectedProtagonistType, setSelectedProtagonistType] = useState<"child_character" | "animal_character" | "fantasy_character">("child_character");
  const [selectedProtagonistAgeRelation, setSelectedProtagonistAgeRelation] = useState<"same_age" | "slightly_older" | "unspecified">("same_age");
  const [selectedProtagonistGender, setSelectedProtagonistGender] = useState<"male" | "female" | "neutral">("neutral");
  const [selectedCaregiverRole, setSelectedCaregiverRole] = useState<"comfort_presence" | "active_guide" | "mentioned_not_present" | "absent">("comfort_presence");
  const [supportCharacters, setSupportCharacters] = useState<{ type: string; role: string }[]>([]);
  const [characterNotes, setCharacterNotes] = useState<string>('');
  const [clinicalCautions, setClinicalCautions] = useState<string[]>([]);
  const [personalizationAllowed, setPersonalizationAllowed] = useState<boolean>(true);
  const [personalizationReason, setPersonalizationReason] = useState<string>('');
  const [namePersonalization, setNamePersonalization] = useState<boolean>(true);
  const [illustrationPersonalization, setIllustrationPersonalization] = useState<boolean>(false);
  const [personalizationConstraints, setPersonalizationConstraints] = useState<string[]>([]);
  const [genderAdaptation, setGenderAdaptation] = useState<"allowed" | "not_allowed" | "requires_review" | "">('');

  // Load topics on mount
  useEffect(() => {
    const loadTopics = async () => {
      setLoadingTopics(true);
      try {
        const items = await loadReferenceItems("topics");
        setTopics(items);
      } catch (err) {
        console.error('Failed to load topics:', err);
        setError('Failed to load topics. Please refresh the page.');
      } finally {
        setLoadingTopics(false);
      }
    };
    loadTopics();
  }, []);

  // Load platform config on mount (age validation boundaries, etc.)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await loadReferenceConfig();
        const min = typeof config.platformMinAge === "number" && Number.isInteger(config.platformMinAge)
          ? config.platformMinAge
          : DEFAULT_PLATFORM_MIN_AGE;
        const max = typeof config.platformMaxAge === "number" && Number.isInteger(config.platformMaxAge)
          ? config.platformMaxAge
          : DEFAULT_PLATFORM_MAX_AGE;

        if (min < max) {
          setPlatformConfig({ platformMinAge: min, platformMaxAge: max });
        } else {
          // Keep safe defaults if config is malformed
          setPlatformConfig({
            platformMinAge: DEFAULT_PLATFORM_MIN_AGE,
            platformMaxAge: DEFAULT_PLATFORM_MAX_AGE,
          });
        }
      } catch (err) {
        // Non-blocking: fallback to defaults
        console.warn('Failed to load reference config, using default age boundaries');
      }
    };
    loadConfig();
  }, []);

  // Load general situations when topic changes
  useEffect(() => {
    const load = async () => {
      if (selectedTopicKey) {
        setLoadingGeneralSituations(true);
        setSelectedGeneralSituationKey('');
        setSelectedSpecificSituationKey('');
        setSpecificSituations([]);
        try {
          const items = await loadSituationsByTopic(selectedTopicKey, "generalSituations");
          setGeneralSituations(items);
        } catch (err) {
          console.error('Failed to load general situations:', err);
          setError('Failed to load general situations. Please refresh the page.');
        } finally {
          setLoadingGeneralSituations(false);
        }
      } else {
        setGeneralSituations([]);
        setSpecificSituations([]);
      }
    };
    load();
  }, [selectedTopicKey]);

  // Load specific situations when general situation changes
  useEffect(() => {
    const load = async () => {
      if (selectedGeneralSituationKey) {
        setLoadingSpecificSituations(true);
        setSelectedSpecificSituationKey('');
        try {
          const items = await loadSituationsByTopic(selectedGeneralSituationKey, "specificSituations", "generalSituationKey");
          setSpecificSituations(items);
        } catch (err) {
          console.error('Failed to load specific situations:', err);
          setError('Failed to load specific situations. Please refresh the page.');
        } finally {
          setLoadingSpecificSituations(false);
        }
      } else {
        setSpecificSituations([]);
      }
    };
    load();
  }, [selectedGeneralSituationKey]);

  // Load emotional goals on mount
  useEffect(() => {
    const loadEmotionalGoals = async () => {
      setLoadingEmotionalGoals(true);
      try {
        const items = await loadReferenceItems("emotionalGoals");
        setEmotionalGoals(items);
      } catch (err) {
        console.error('Failed to load emotional goals:', err);
        setError('Failed to load emotional goals. Please refresh the page.');
      } finally {
        setLoadingEmotionalGoals(false);
      }
    };
    loadEmotionalGoals();
  }, []);

  // Load exclusions on mount
  useEffect(() => {
    const loadExclusions = async () => {
      setLoadingExclusions(true);
      try {
        const items = await loadReferenceItems("exclusions");
        setExclusions(items);
      } catch (err) {
        console.error('Failed to load exclusions:', err);
        setError('Failed to load exclusions. Please refresh the page.');
      } finally {
        setLoadingExclusions(false);
      }
    };
    loadExclusions();
  }, []);

  // Load therapeutic mechanisms on mount
  useEffect(() => {
    const load = async () => {
      setLoadingMechanisms(true);
      try {
        const items = await loadReferenceItems("therapeuticMechanisms");
        setTherapeuticMechanisms(items);
      } catch (err) {
        console.error('Failed to load therapeutic mechanisms:', err);
        setError('Failed to load therapeutic mechanisms. Please refresh the page.');
      } finally {
        setLoadingMechanisms(false);
      }
    };
    load();
  }, []);

  // Load coping tools + group labels on mount
  useEffect(() => {
    const load = async () => {
      setLoadingCopingTools(true);
      try {
        const [items, groups] = await Promise.all([
          loadReferenceItems("copingTools"),
          loadReferenceItems("copingToolGroups"),
        ]);
        setCopingToolOptions(items);
        setCopingToolGroups(groups);
      } catch (err) {
        console.error('Failed to load coping tools:', err);
        setError('Failed to load coping tools. Please refresh the page.');
      } finally {
        setLoadingCopingTools(false);
      }
    };
    load();
  }, []);

  // Load Step 3 options (emotional design) on mount
  useEffect(() => {
    const load = async () => {
      setLoadingStep3(true);
      try {
        const [ts, ea, pi, et, es] = await Promise.all([
          loadReferenceItems("topicSensitivities"),
          loadReferenceItems("emotionalArcs"),
          loadReferenceItems("peakIntensities"),
          loadReferenceItems("emotionalTones"),
          loadReferenceItems("endingStyles"),
        ]);
        setTopicSensitivities(ts);
        setEmotionalArcOptions(ea);
        setPeakIntensities(pi);
        setEmotionalToneOptions(et);
        setEndingStyleOptions(es);
      } catch (err) {
        console.error('Failed to load emotional design options:', err);
        setError('Failed to load emotional design options. Please refresh the page.');
      } finally {
        setLoadingStep3(false);
      }
    };
    load();
  }, []);

  /** Union of recommendedCopingTools from all selected mechanisms (visual badges only). */
  const recommendedCopingToolKeys = useMemo(() => {
    const keys = new Set<string>();
    if (selectedMechanisms.length === 0) return keys;
    for (const mechKey of selectedMechanisms) {
      const mech = therapeuticMechanisms.find((m) => m.key === mechKey);
      const rec = mech?.recommendedCopingTools;
      if (Array.isArray(rec)) {
        for (const t of rec) {
          if (typeof t === "string" && t.trim()) keys.add(t.trim());
        }
      }
    }
    return keys;
  }, [selectedMechanisms, therapeuticMechanisms]);

  const toolsByGroupId = useMemo(() => {
    const map = new Map<string, CopingToolReferenceItem[]>();
    for (const tool of copingToolOptions) {
      const gid = (tool.group && tool.group.trim()) ? tool.group.trim() : "other";
      const list = map.get(gid);
      if (list) list.push(tool);
      else map.set(gid, [tool]);
    }
    map.forEach((list) => {
      list.sort((a: CopingToolReferenceItem, b: CopingToolReferenceItem) => {
        const oa = typeof a.order === "number" ? a.order : 999;
        const ob = typeof b.order === "number" ? b.order : 999;
        if (oa !== ob) return oa - ob;
        return getLabel(a, "en").localeCompare(getLabel(b, "en"));
      });
    });
    return map;
  }, [copingToolOptions]);

  const sortedCopingGroupIds = useMemo(() => {
    const orderByKey = new Map<string, number>();
    for (const g of copingToolGroups) {
      orderByKey.set(g.key, typeof g.order === "number" ? g.order : 999);
    }
    const allKeys = Array.from(toolsByGroupId.keys());
    const nonOther = allKeys.filter((k) => k !== "other");
    const known = nonOther.filter((k) => orderByKey.has(k));
    const unknown = nonOther.filter((k) => !orderByKey.has(k));
    known.sort((a, b) => (orderByKey.get(a)! - orderByKey.get(b)!));
    unknown.sort();
    const ordered = [...known, ...unknown];
    if (allKeys.includes("other")) ordered.push("other");
    return ordered;
  }, [copingToolGroups, toolsByGroupId]);

  const getCopingGroupSectionLabel = (groupId: string): string => {
    if (groupId === "other") return "Other";
    const def = copingToolGroups.find((g) => g.key === groupId);
    return def ? getLabel(def, "en") : groupId;
  };

  // Scroll to messages when they appear
  useEffect(() => {
    if ((success || error) && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [success, error]);

  // Handle emotional goal selection (max 3)
  const handleEmotionalGoalToggle = (goalKey: string) => {
    setSelectedEmotionalGoals((prev) => {
      if (prev.includes(goalKey)) {
        return prev.filter((key) => key !== goalKey);
      } else if (prev.length < 3) {
        return [...prev, goalKey];
      }
      return prev;
    });
  };

  // Handle therapeutic mechanism toggle (max 2)
  const handleMechanismToggle = (mechanismKey: string) => {
    setSelectedMechanisms((prev) => {
      if (prev.includes(mechanismKey)) {
        return prev.filter((key) => key !== mechanismKey);
      } else if (prev.length < 2) {
        return [...prev, mechanismKey];
      }
      return prev;
    });
  };

  // Handle coping tool toggle (max 3)
  const handleCopingToolToggle = (toolKey: string) => {
    setSelectedCopingTools((prev) => {
      if (prev.includes(toolKey)) {
        return prev.filter((key) => key !== toolKey);
      } else if (prev.length < 3) {
        return [...prev, toolKey];
      }
      return prev;
    });
  };

  // Handle therapeutic boundaries
  const handleBoundaryChange = (index: number, value: string) => {
    setTherapeuticBoundaries((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const addBoundary = () => {
    setTherapeuticBoundaries((prev) => [...prev, '']);
  };

  const removeBoundary = (index: number) => {
    setTherapeuticBoundaries((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle exclusion toggle
  const handleExclusionToggle = (exclusionKey: string) => {
    setSelectedExclusions((prev) => {
      if (prev.includes(exclusionKey)) {
        return prev.filter((key) => key !== exclusionKey);
      }
      return [...prev, exclusionKey];
    });
  };

  const handleNext = () => {
    const platformMinAge = platformConfig.platformMinAge ?? DEFAULT_PLATFORM_MIN_AGE;
    const platformMaxAge = platformConfig.platformMaxAge ?? DEFAULT_PLATFORM_MAX_AGE;
    if (activeStep === 0) {
      if (!selectedTopicKey || !selectedGeneralSituationKey || !selectedSpecificSituationKey) {
        setError('Please fill in all required fields in Step 1');
        return;
      }
      if (!Number.isInteger(ageMin) || !Number.isInteger(ageMax) || ageMin < platformMinAge || ageMax > platformMaxAge || ageMin >= ageMax) {
        setError(`Age range must satisfy: ${platformMinAge} ≤ min < max ≤ ${platformMaxAge}`);
        return;
      }
    } else if (activeStep === 1) {
      if (selectedMechanisms.length === 0) {
        setError('Please select at least one therapeutic mechanism');
        return;
      }
      if (selectedEmotionalGoals.length === 0) {
        setError('Please select at least one emotional goal');
        return;
      }
      if (selectedCopingTools.length === 0) {
        setError('Please select at least one coping tool');
        return;
      }
      const nonEmptyBoundaries = therapeuticBoundaries.filter((b) => b.trim().length > 0);
      if (nonEmptyBoundaries.length === 0) {
        setError('Please add at least one therapeutic boundary');
        return;
      }
    }
    setError(null);
    setActiveStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue > activeStep) {
      if (activeStep === 0) {
        if (!selectedTopicKey || !selectedGeneralSituationKey || !selectedSpecificSituationKey) {
          setError('Please fill in all required fields in Step 1');
          return;
        }
      } else if (activeStep === 1) {
        if (selectedMechanisms.length === 0) {
          setError('Please select at least one therapeutic mechanism');
          return;
        }
        if (selectedEmotionalGoals.length === 0) {
          setError('Please select at least one emotional goal');
          return;
        }
        if (selectedCopingTools.length === 0) {
          setError('Please select at least one coping tool');
          return;
        }
        const nonEmptyBoundaries = therapeuticBoundaries.filter((b) => b.trim().length > 0);
        if (nonEmptyBoundaries.length === 0) {
          setError('Please add at least one therapeutic boundary');
          return;
        }
      }
    }
    setError(null);
    setActiveStep(newValue);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Prevent accidental form submission before the final step.
    // This protects against Enter-key submits from focused inputs.
    if (activeStep < 5) {
      handleNext();
      return;
    }

    if (!selectedTopicKey || !selectedGeneralSituationKey || !selectedSpecificSituationKey) {
      setError('Please fill in all required fields');
      return;
    }

    if (selectedMechanisms.length === 0) {
      setError('Please select at least one therapeutic mechanism');
      return;
    }

    if (selectedEmotionalGoals.length === 0) {
      setError('Please select at least one emotional goal');
      return;
    }

    if (selectedEmotionalGoals.length > 3) {
      setError('Please select a maximum of 3 emotional goals');
      return;
    }

    if (selectedCopingTools.length === 0) {
      setError('Please select at least one coping tool');
      return;
    }

    const nonEmptyBoundaries = therapeuticBoundaries.filter((b) => b.trim().length > 0);
    if (nonEmptyBoundaries.length === 0) {
      setError('Please add at least one therapeutic boundary');
      return;
    }

    setLoading(true);

    try {
      const characterDesignPayload: StoryBriefInput["characterDesign"] = {
        protagonistType: selectedProtagonistType,
        protagonistAgeRelation: selectedProtagonistAgeRelation,
        protagonistGender: selectedProtagonistGender,
        caregiverRole: selectedCaregiverRole,
      };
      const filteredSupportChars = supportCharacters.filter((sc) => sc.type && sc.role);
      if (filteredSupportChars.length > 0) {
        characterDesignPayload.supportCharacters = filteredSupportChars as StoryBriefInput["characterDesign"]["supportCharacters"];
      }
      if (characterNotes.trim()) {
        characterDesignPayload.characterNotes = characterNotes.trim();
      }

      const rawPayload: StoryBriefInput = {
        storyContext: {
          primaryTopic: selectedTopicKey,
          generalSituation: selectedGeneralSituationKey,
          specificSituation: selectedSpecificSituationKey,
          targetAgeRange: { min: ageMin, max: ageMax },
          languageComplexity: selectedComplexity,
        },
        therapeuticDesign: {
          emotionalGoals: selectedEmotionalGoals,
          ...(keyMessage && { keyMessage: keyMessage }),
          therapeuticMechanism: selectedMechanisms,
          copingTools: selectedCopingTools,
          therapeuticBoundaries: nonEmptyBoundaries,
        },
        emotionalDesign: {
          emotionalTone: selectedEmotionalTone,
          topicSensitivity: selectedTopicSensitivity,
          endingStyle: selectedEndingStyle,
          emotionalArc: selectedEmotionalArc,
          peakIntensity: selectedPeakIntensity,
        },
        characterDesign: characterDesignPayload,
        safetyBoundaries: (() => {
          const sb: StoryBriefInput["safetyBoundaries"] = {
            contentExclusions: selectedExclusions,
          };
          const filteredCautions = clinicalCautions.filter((c) => c.trim().length > 0);
          if (filteredCautions.length > 0) {
            sb.clinicalCautions = filteredCautions;
          }
          return sb;
        })(),
        personalizationConfig: (() => {
          const pc: StoryBriefInput["personalizationConfig"] = {
            personalizationAllowed,
            namePersonalization,
            illustrationPersonalization,
          };
          if (personalizationReason.trim()) {
            pc.personalizationReason = personalizationReason.trim();
          }
          const filteredConstraints = personalizationConstraints.filter((c) => c.trim().length > 0);
          if (filteredConstraints.length > 0) {
            pc.personalizationConstraints = filteredConstraints;
          }
          if (genderAdaptation) {
            pc.genderAdaptation = genderAdaptation as StoryBriefInput["personalizationConfig"]["genderAdaptation"];
          }
          return pc;
        })(),
      };

      // Normalize the input (trim + lowercase where appropriate)
      const payload = normalizeStoryBriefInput(rawPayload);
      const response = await createStoryBrief(payload);

      // If we get here, response.success is always true (errors are thrown)
      const briefId = response.data.id;
      
      if (!briefId) {
        // Fallback: navigate to generate draft page if ID is missing
        navigate('/specialist/generate-draft');
        return;
      }
      
      // Navigate to contract review page
      navigate(`/specialist/story-briefs/${briefId}/contract`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SpecialistNav />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Create Story Brief
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Define the therapeutic parameters for a personalized children's story.
          </Typography>

        <Box>
          <Tabs
            value={activeStep}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
          >
            <Tab label="Step 1: Story Context" id="step-tab-0" aria-controls="step-tabpanel-0" />
            <Tab label="Step 2: Therapeutic Design" id="step-tab-1" aria-controls="step-tabpanel-1" />
            <Tab label="Step 3: Emotional Design" id="step-tab-2" aria-controls="step-tabpanel-2" />
            <Tab label="Step 4: Character Design" id="step-tab-3" aria-controls="step-tabpanel-3" />
            <Tab label="Step 5: Safety & Boundaries" id="step-tab-4" aria-controls="step-tabpanel-4" />
            <Tab label="Step 6: Personalization" id="step-tab-5" aria-controls="step-tabpanel-5" />
          </Tabs>

          {/* STEP 1: Story Context */}
          <TabPanel value={activeStep} index={0}>
            <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
              Story Context
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Define the topic, situation hierarchy, target age range, and language complexity.
            </Typography>
          <Stack spacing={3}>
            <FormControl fullWidth required>
                <InputLabel>Primary Topic</InputLabel>
              <Select
                  value={selectedTopicKey}
                  onChange={(e) => setSelectedTopicKey(e.target.value)}
                  label="Primary Topic"
                  disabled={loadingTopics}
                >
                  {topics.map((topic) => (
                    <MenuItem key={topic.key} value={topic.key}>
                      {getLabel(topic, "en")}
                  </MenuItem>
                ))}
              </Select>
                {loadingTopics && (
                  <FormHelperText>Loading topics...</FormHelperText>
                )}
            </FormControl>

            <FormControl fullWidth required>
                <InputLabel>General Situation</InputLabel>
              <Select
                  value={selectedGeneralSituationKey}
                  onChange={(e) => setSelectedGeneralSituationKey(e.target.value)}
                  label="General Situation"
                  disabled={loadingGeneralSituations || !selectedTopicKey || generalSituations.length === 0}
                >
                  {generalSituations.map((gs) => (
                    <MenuItem key={gs.key} value={gs.key}>
                      {getLabel(gs, "en")}
                  </MenuItem>
                ))}
              </Select>
                {loadingGeneralSituations && (
                  <FormHelperText>Loading general situations...</FormHelperText>
                )}
                {!selectedTopicKey && !loadingGeneralSituations && (
                  <FormHelperText>Please select a topic first</FormHelperText>
              )}
            </FormControl>

            <FormControl fullWidth required>
                <InputLabel>Specific Situation</InputLabel>
              <Select
                  value={selectedSpecificSituationKey}
                  onChange={(e) => setSelectedSpecificSituationKey(e.target.value)}
                  label="Specific Situation"
                  disabled={loadingSpecificSituations || !selectedGeneralSituationKey || specificSituations.length === 0}
                >
                  {specificSituations.map((ss) => (
                    <MenuItem key={ss.key} value={ss.key}>
                      {getLabel(ss, "en")}
                  </MenuItem>
                ))}
              </Select>
                {loadingSpecificSituations && (
                  <FormHelperText>Loading specific situations...</FormHelperText>
                )}
                {!selectedGeneralSituationKey && !loadingSpecificSituations && (
                  <FormHelperText>Please select a general situation first</FormHelperText>
              )}
            </FormControl>

              <Box>
                <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Target Age Range *</FormLabel>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    label="Min age"
                    type="number"
                    value={ageMin}
                    onChange={(e) => setAgeMin(Number(e.target.value))}
                    inputProps={{
                      min: platformConfig.platformMinAge ?? DEFAULT_PLATFORM_MIN_AGE,
                      max: (platformConfig.platformMaxAge ?? DEFAULT_PLATFORM_MAX_AGE) - 1,
                      step: 1,
                    }}
                    sx={{ width: 120 }}
                    required
                  />
                  <Typography variant="body1">to</Typography>
                  <TextField
                    label="Max age"
                    type="number"
                    value={ageMax}
                    onChange={(e) => setAgeMax(Number(e.target.value))}
                    inputProps={{
                      min: (platformConfig.platformMinAge ?? DEFAULT_PLATFORM_MIN_AGE) + 1,
                      max: platformConfig.platformMaxAge ?? DEFAULT_PLATFORM_MAX_AGE,
                      step: 1,
                    }}
                    sx={{ width: 120 }}
                    required
                  />
                  <Typography variant="body2" color="text.secondary">years</Typography>
                </Stack>
                <FormHelperText>
                  {(platformConfig.platformMinAge ?? DEFAULT_PLATFORM_MIN_AGE)} ≤ min &lt; max ≤ {(platformConfig.platformMaxAge ?? DEFAULT_PLATFORM_MAX_AGE)}
                </FormHelperText>
              </Box>

              <FormControl fullWidth required>
                <InputLabel>Language Complexity</InputLabel>
                <Select
                  value={selectedComplexity}
                  onChange={(e) => setSelectedComplexity(e.target.value as "very_simple" | "simple" | "moderate")}
                  label="Language Complexity"
                >
                  <MenuItem value="very_simple">Very Simple</MenuItem>
                  <MenuItem value="simple">Simple</MenuItem>
                  <MenuItem value="moderate">Moderate</MenuItem>
                </Select>
              </FormControl>
                </Stack>
          </TabPanel>

          {/* STEP 2: Therapeutic Design */}
          <TabPanel value={activeStep} index={1}>
            <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
              Therapeutic Design
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start with the therapeutic mechanism, then emotional goals, coping tools, the key message, and therapeutic boundaries.
            </Typography>
            <Stack spacing={3}>
                <FormControl component="fieldset" required>
                  <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Therapeutic Mechanism *</FormLabel>
                  <FormHelperText sx={{ mb: 1.5, mt: 0 }}>
                    Primary therapeutic approach(es) the story uses. {selectedMechanisms.length} / 2 selected
                  </FormHelperText>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 1.5,
                  }}>
                    {therapeuticMechanisms.map((mechanism) => (
                      <FormControlLabel
                        key={mechanism.key}
                        control={
                          <Checkbox
                            checked={selectedMechanisms.includes(mechanism.key)}
                            onChange={() => handleMechanismToggle(mechanism.key)}
                            disabled={
                              !selectedMechanisms.includes(mechanism.key) &&
                              selectedMechanisms.length >= 2
                            }
                          />
                        }
                        label={getLabel(mechanism, "en")}
                        sx={{ m: 0 }}
                      />
                    ))}
                  </Box>
                  {loadingMechanisms && (
                    <FormHelperText sx={{ mt: 1 }}>Loading therapeutic mechanisms...</FormHelperText>
                  )}
                </FormControl>

                <FormControl component="fieldset" required>
                  <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Emotional Goals *</FormLabel>
                  <FormHelperText sx={{ mb: 1.5, mt: 0 }}>
                    {selectedEmotionalGoals.length} / 3 selected
                  </FormHelperText>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 1.5,
                  }}>
                    {emotionalGoals.map((goal) => (
                      <FormControlLabel
                        key={goal.key}
                        control={
                          <Checkbox
                            checked={selectedEmotionalGoals.includes(goal.key)}
                            onChange={() => handleEmotionalGoalToggle(goal.key)}
                            disabled={
                              !selectedEmotionalGoals.includes(goal.key) &&
                              selectedEmotionalGoals.length >= 3
                            }
                          />
                        }
                        label={getLabel(goal, "en")}
                        sx={{ m: 0 }}
                      />
                    ))}
                  </Box>
                  {loadingEmotionalGoals && (
                    <FormHelperText sx={{ mt: 1 }}>Loading emotional goals...</FormHelperText>
                  )}
                </FormControl>

                <FormControl component="fieldset" required>
                  <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Coping Tools *</FormLabel>
                  <FormHelperText sx={{ mb: 1.5, mt: 0 }}>
                    {selectedMechanisms.length > 0
                      ? (
                        <>
                          Specific coping strategies the story should model or teach. Tools marked &lsquo;Recommended&rsquo; are commonly paired with your selected therapeutic mechanism.{' '}
                          <Box component="span" sx={{ fontWeight: 600 }}>{selectedCopingTools.length} / 3 selected</Box>
                        </>
                      )
                      : (
                        <>
                          Specific coping strategies the story should model or teach. Select a therapeutic mechanism above to see recommended pairings.{' '}
                          <Box component="span" sx={{ fontWeight: 600 }}>{selectedCopingTools.length} / 3 selected</Box>
                        </>
                      )}
                  </FormHelperText>
                  <Stack spacing={2.5}>
                    {sortedCopingGroupIds.map((groupId) => {
                      const toolsInGroup = toolsByGroupId.get(groupId);
                      if (!toolsInGroup || toolsInGroup.length === 0) return null;
                      return (
                        <Box
                          key={groupId}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            px: 2,
                            py: 1.5,
                            bgcolor: (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.04)'
                                : 'rgba(0,0,0,0.02)',
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{ fontWeight: 600, mb: 1, letterSpacing: 0.02 }}
                          >
                            {getCopingGroupSectionLabel(groupId)}
                          </Typography>
                          <Stack spacing={0.5}>
                            {toolsInGroup.map((tool) => {
                              const showRecommended = recommendedCopingToolKeys.has(tool.key);
                              const isToolSelected = selectedCopingTools.includes(tool.key);
                              const showAgeWarning = shouldShowCopingToolAgeWarning(
                                tool,
                                isToolSelected,
                                ageMin,
                                ageMax,
                              );
                              return (
                                <FormControlLabel
                                  key={tool.key}
                                  control={
                                    <Checkbox
                                      checked={isToolSelected}
                                      onChange={() => handleCopingToolToggle(tool.key)}
                                      disabled={
                                        !isToolSelected &&
                                        selectedCopingTools.length >= 3
                                      }
                                    />
                                  }
                                  label={
                                    <Box
                                      sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: 0.75,
                                        rowGap: 0.5,
                                      }}
                                    >
                                      <span>{getLabel(tool, "en")}</span>
                                      <Fade in={showRecommended} timeout={200} unmountOnExit>
                                        <span>
                                          <Chip
                                            label="Recommended"
                                            size="small"
                                            sx={{
                                              height: 22,
                                              fontSize: '0.6875rem',
                                              fontWeight: 500,
                                              bgcolor: (theme) =>
                                                theme.palette.mode === 'dark'
                                                  ? 'rgba(2, 136, 209, 0.22)'
                                                  : 'rgba(2, 136, 209, 0.12)',
                                              color: 'info.dark',
                                              border: '1px solid',
                                              borderColor: (theme) =>
                                                theme.palette.mode === 'dark'
                                                  ? 'rgba(2, 136, 209, 0.35)'
                                                  : 'rgba(2, 136, 209, 0.25)',
                                              '& .MuiChip-label': { px: 0.75 },
                                              transition: (theme) =>
                                                theme.transitions.create(['background-color', 'border-color'], {
                                                  duration: theme.transitions.duration.shorter,
                                                }),
                                            }}
                                          />
                                        </span>
                                      </Fade>
                                      <Fade in={showAgeWarning} timeout={200} unmountOnExit>
                                        <Box
                                          component="span"
                                          sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.35,
                                            maxWidth: '100%',
                                          }}
                                        >
                                          <WarningAmberOutlined
                                            sx={{
                                              fontSize: 15,
                                              color: 'warning.main',
                                              opacity: 0.75,
                                              flexShrink: 0,
                                            }}
                                            aria-hidden
                                          />
                                          <Typography
                                            component="span"
                                            sx={{
                                              fontSize: '0.8125rem',
                                              lineHeight: 1.3,
                                              color: 'warning.main',
                                              opacity: 0.88,
                                            }}
                                          >
                                            {`Typically suitable from age ${tool.suggestedAgeMin}+`}
                                          </Typography>
                                        </Box>
                                      </Fade>
                                    </Box>
                                  }
                                  sx={{ m: 0, alignItems: 'flex-start' }}
                                />
                              );
                            })}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                  {loadingCopingTools && (
                    <FormHelperText sx={{ mt: 1 }}>Loading coping tools...</FormHelperText>
                  )}
                </FormControl>

              <TextField
                label="Key Message"
                fullWidth
                multiline
                rows={3}
                value={keyMessage}
                onChange={(e) => setKeyMessage(e.target.value)}
                placeholder="e.g. Your parent always comes back for you."
                InputLabelProps={{ shrink: true }}
                inputProps={{ maxLength: 200 }}
                FormHelperTextProps={{ component: "div" }}
                helperText={
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    <Typography variant="body2" color="text.secondary" component="span">
                      {`The core takeaway the child should feel after hearing this story. Write it as a simple, child-facing statement — as if you're whispering it to the child.`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ opacity: 0.9 }}>
                      {keyMessage.length} / 200 characters (optional)
                    </Typography>
                  </Box>
                }
              />

                <FormControl component="fieldset" required>
                  <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Therapeutic Boundaries *</FormLabel>
                  <FormHelperText sx={{ mb: 1.5, mt: 0 }}>
                    Things the story must NEVER say, promise, suggest, or imply. Critical for clinical safety.
                  </FormHelperText>
                  <Stack spacing={1.5}>
                    {therapeuticBoundaries.map((boundary, index) => (
                      <Stack key={index} direction="row" spacing={1} alignItems="center">
                        <TextField
                          fullWidth
                          size="small"
                          value={boundary}
                          onChange={(e) => handleBoundaryChange(index, e.target.value)}
                          placeholder={index === 0 ? 'e.g. Never promise the fear will disappear completely' : 'e.g. Never suggest the child is being silly for feeling scared'}
                        />
                        {therapeuticBoundaries.length > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => removeBoundary(index)}
                            color="error"
                            aria-label="Remove boundary"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    ))}
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={addBoundary}
                      sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                    >
                      Add boundary
                    </Button>
                  </Stack>
                </FormControl>

            </Stack>
          </TabPanel>

          {/* STEP 3: Emotional Design */}
          <TabPanel value={activeStep} index={2}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mb: 3 }}>
              Emotional Design
            </Typography>
            {loadingStep3 ? (
              <Typography variant="body2" color="text.secondary">Loading emotional design options...</Typography>
            ) : (
            <Stack spacing={3}>
              <FormControl component="fieldset" required>
                <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Topic Sensitivity *</FormLabel>
                <FormHelperText sx={{ mb: 1, mt: 0 }}>
                  How sensitive the topic is for the target audience. High sensitivity limits how intense the peak can be and influences tone and arc.
                </FormHelperText>
                <RadioGroup
                  row
                  value={selectedTopicSensitivity}
                  onChange={(e) => setSelectedTopicSensitivity(e.target.value)}
                  sx={{ mt: 0.5 }}
                >
                  {topicSensitivities.map((item) => (
                    <FormControlLabel key={item.key} value={item.key} control={<Radio />} label={getLabel(item, "en")} />
                  ))}
                </RadioGroup>
              </FormControl>

              <FormControl component="fieldset" required fullWidth>
                <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>
                  Emotional Arc *
                </FormLabel>
                <FormHelperText sx={{ mb: 1.5, mt: 0 }}>
                  The macro-structure of the journey — the big-picture design of how the story unfolds.
                </FormHelperText>
                <RadioGroup
                  value={selectedEmotionalArc}
                  onChange={(e) => setSelectedEmotionalArc(e.target.value)}
                  sx={{ gap: 1.5 }}
                >
                  {emotionalArcOptions.map((arc) => {
                    const isSelected = selectedEmotionalArc === arc.key;
                    const desc = getDescription(arc, "en");
                    return (
                      <Paper
                        key={arc.key}
                        elevation={0}
                        variant="outlined"
                        sx={{
                          borderWidth: 2,
                          borderColor: (theme) =>
                            isSelected ? theme.palette.primary.main : theme.palette.divider,
                          bgcolor: (theme) =>
                            isSelected
                              ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.08)
                              : theme.palette.background.paper,
                          transition: (theme) =>
                            theme.transitions.create(["border-color", "background-color"], {
                              duration: theme.transitions.duration.shorter,
                            }),
                        }}
                      >
                        <FormControlLabel
                          value={arc.key}
                          control={
                            <Radio
                              sx={{
                                alignSelf: "flex-start",
                                pt: 1.25,
                              }}
                            />
                          }
                          label={
                            <Box sx={{ py: 1.25, pr: 1 }}>
                              <Typography
                                variant="subtitle1"
                                component="span"
                                sx={{ fontWeight: 600, display: "block" }}
                              >
                                {getLabel(arc, "en")}
                              </Typography>
                              {desc && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mt: 0.5, lineHeight: 1.45 }}
                                >
                                  {desc}
                                </Typography>
                              )}
                            </Box>
                          }
                          sx={{
                            m: 0,
                            mx: 0,
                            ml: 1,
                            alignItems: "flex-start",
                            width: "100%",
                            pr: 2,
                          }}
                        />
                      </Paper>
                    );
                  })}
                </RadioGroup>
              </FormControl>

              <FormControl component="fieldset" required fullWidth>
                <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>
                  Peak Intensity *
                </FormLabel>
                <FormHelperText sx={{ mb: 1.5, mt: 0 }}>
                  How intense the most challenging emotional moment should be.
                </FormHelperText>
                <RadioGroup
                  value={selectedPeakIntensity}
                  onChange={(e) => setSelectedPeakIntensity(e.target.value)}
                  sx={{ gap: 1.5 }}
                >
                  {peakIntensities.map((item) => {
                    const isSelected = selectedPeakIntensity === item.key;
                    const desc = getDescription(item, "en");
                    return (
                      <Paper
                        key={item.key}
                        elevation={0}
                        variant="outlined"
                        sx={{
                          borderWidth: 2,
                          borderColor: (theme) =>
                            isSelected ? theme.palette.primary.main : theme.palette.divider,
                          bgcolor: (theme) =>
                            isSelected
                              ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.08)
                              : theme.palette.background.paper,
                          transition: (theme) =>
                            theme.transitions.create(["border-color", "background-color"], {
                              duration: theme.transitions.duration.shorter,
                            }),
                        }}
                      >
                        <FormControlLabel
                          value={item.key}
                          control={
                            <Radio
                              sx={{
                                alignSelf: "flex-start",
                                pt: 1.25,
                              }}
                            />
                          }
                          label={
                            <Box sx={{ py: 1.25, pr: 1 }}>
                              <Typography
                                variant="subtitle1"
                                component="span"
                                sx={{ fontWeight: 600, display: "block" }}
                              >
                                {getLabel(item, "en")}
                              </Typography>
                              {desc && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mt: 0.5, lineHeight: 1.45 }}
                                >
                                  {desc}
                                </Typography>
                              )}
                            </Box>
                          }
                          sx={{
                            m: 0,
                            mx: 0,
                            ml: 1,
                            alignItems: "flex-start",
                            width: "100%",
                            pr: 2,
                          }}
                        />
                      </Paper>
                    );
                  })}
                </RadioGroup>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Emotional Tone</InputLabel>
                <Select
                  value={selectedEmotionalTone}
                  onChange={(e) => setSelectedEmotionalTone(e.target.value)}
                  label="Emotional Tone"
                >
                  {emotionalToneOptions.map((item) => (
                    <MenuItem key={item.key} value={item.key}>{getLabel(item, "en")}</MenuItem>
                  ))}
                </Select>
                <FormHelperText>The overall voice throughout the story — how it sounds, wrapping around arc and intensity.</FormHelperText>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Ending Style</InputLabel>
                <Select
                  value={selectedEndingStyle}
                  onChange={(e) => setSelectedEndingStyle(e.target.value)}
                  label="Ending Style"
                >
                  {endingStyleOptions.map((item) => (
                    <MenuItem key={item.key} value={item.key}>{getLabel(item, "en")}</MenuItem>
                  ))}
                </Select>
                <FormHelperText>How the story resolves — the final design choice, shaped by sensitivity, arc, intensity, and tone.</FormHelperText>
              </FormControl>
            </Stack>
            )}
          </TabPanel>

          {/* STEP 4: Character Design */}
          <TabPanel value={activeStep} index={3}>
            <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
              Character Design
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Define the protagonist, caregiver role, and optional support characters.
            </Typography>
            <Stack spacing={3}>
              <FormControl fullWidth required>
                <InputLabel>Protagonist Type</InputLabel>
                <Select
                  value={selectedProtagonistType}
                  onChange={(e) => setSelectedProtagonistType(e.target.value as typeof selectedProtagonistType)}
                  label="Protagonist Type"
                >
                  <MenuItem value="child_character">Child Character</MenuItem>
                  <MenuItem value="animal_character">Animal Character</MenuItem>
                  <MenuItem value="fantasy_character">Fantasy Character</MenuItem>
                </Select>
                <FormHelperText>What kind of character the protagonist is</FormHelperText>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Protagonist Age Relation</InputLabel>
                <Select
                  value={selectedProtagonistAgeRelation}
                  onChange={(e) => setSelectedProtagonistAgeRelation(e.target.value as typeof selectedProtagonistAgeRelation)}
                  label="Protagonist Age Relation"
                >
                  <MenuItem value="same_age">Same Age</MenuItem>
                  <MenuItem value="slightly_older">Slightly Older</MenuItem>
                  <MenuItem value="unspecified">Unspecified</MenuItem>
                </Select>
                <FormHelperText>How protagonist's age relates to the target child's age</FormHelperText>
              </FormControl>

              <FormControl component="fieldset" required>
                <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Protagonist Gender</FormLabel>
                <RadioGroup
                  row
                  value={selectedProtagonistGender}
                  onChange={(e) => setSelectedProtagonistGender(e.target.value as typeof selectedProtagonistGender)}
                  sx={{ mt: 0.5 }}
                >
                  <FormControlLabel value="male" control={<Radio />} label="Male" />
                  <FormControlLabel value="female" control={<Radio />} label="Female" />
                  <FormControlLabel value="neutral" control={<Radio />} label="Neutral" />
                </RadioGroup>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Caregiver Role</InputLabel>
                <Select
                  value={selectedCaregiverRole}
                  onChange={(e) => setSelectedCaregiverRole(e.target.value as typeof selectedCaregiverRole)}
                  label="Caregiver Role"
                >
                  <MenuItem value="comfort_presence">Comfort Presence — provides safety and reassurance</MenuItem>
                  <MenuItem value="active_guide">Active Guide — teaches or models coping</MenuItem>
                  <MenuItem value="mentioned_not_present">Mentioned Not Present — referenced but not in scene</MenuItem>
                  <MenuItem value="absent">Absent — story focuses on child's own journey</MenuItem>
                </Select>
                <FormHelperText>Therapeutic role of the caregiver in the story</FormHelperText>
              </FormControl>

              <Box>
                <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>
                  Support Characters (optional, max 3)
                </FormLabel>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  {supportCharacters.map((sc, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <FormControl sx={{ flex: 1 }}>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={sc.type}
                          onChange={(e) => {
                            const updated = [...supportCharacters];
                            updated[idx] = { ...updated[idx], type: e.target.value };
                            setSupportCharacters(updated);
                          }}
                          label="Type"
                        >
                          <MenuItem value="peer">Peer</MenuItem>
                          <MenuItem value="sibling">Sibling</MenuItem>
                          <MenuItem value="teacher">Teacher</MenuItem>
                          <MenuItem value="animal_friend">Animal Friend</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl sx={{ flex: 1 }}>
                        <InputLabel>Role</InputLabel>
                        <Select
                          value={sc.role}
                          onChange={(e) => {
                            const updated = [...supportCharacters];
                            updated[idx] = { ...updated[idx], role: e.target.value };
                            setSupportCharacters(updated);
                          }}
                          label="Role"
                        >
                          <MenuItem value="mirror">Mirror</MenuItem>
                          <MenuItem value="model">Model</MenuItem>
                          <MenuItem value="supporter">Supporter</MenuItem>
                          <MenuItem value="companion">Companion</MenuItem>
                        </Select>
                      </FormControl>
                      <IconButton onClick={() => setSupportCharacters(supportCharacters.filter((_, i) => i !== idx))} color="error" size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  {supportCharacters.length < 3 && (
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setSupportCharacters([...supportCharacters, { type: '', role: '' }])}
                      sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                    >
                      Add Support Character
                    </Button>
                  )}
                </Stack>
              </Box>

              <TextField
                label="Character Notes (optional)"
                multiline
                rows={3}
                value={characterNotes}
                onChange={(e) => setCharacterNotes(e.target.value)}
                inputProps={{ maxLength: 500 }}
                helperText={`${characterNotes.length}/500 — Clinical notes about character design`}
                fullWidth
              />
            </Stack>
          </TabPanel>

          {/* STEP 5: Safety & Boundaries */}
          <TabPanel value={activeStep} index={4}>
            <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
              Safety & Boundaries
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Content exclusions, clinical cautions, and review settings.
            </Typography>
            <Stack spacing={3}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Content Exclusions</FormLabel>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                  {exclusions.map((exclusion) => (
                    <FormControlLabel
                      key={exclusion.key}
                      control={
                        <Checkbox
                          checked={selectedExclusions.includes(exclusion.key)}
                          onChange={() => handleExclusionToggle(exclusion.key)}
                        />
                      }
                      label={getLabel(exclusion, "en")}
                      sx={{ m: 0 }}
                    />
                  ))}
                </Box>
                {loadingExclusions && (
                  <FormHelperText sx={{ mt: 1 }}>Loading exclusions...</FormHelperText>
                )}
              </FormControl>

              <Box>
                <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>
                  Clinical Cautions (optional)
                </FormLabel>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {clinicalCautions.map((caution, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        fullWidth
                        size="small"
                        value={caution}
                        onChange={(e) => {
                          const updated = [...clinicalCautions];
                          updated[idx] = e.target.value;
                          setClinicalCautions(updated);
                        }}
                        placeholder="e.g. This situation can trigger real separation trauma..."
                      />
                      <IconButton onClick={() => setClinicalCautions(clinicalCautions.filter((_, i) => i !== idx))} color="error" size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => setClinicalCautions([...clinicalCautions, ''])}
                    sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                  >
                    Add Clinical Caution
                  </Button>
                </Stack>
                <FormHelperText>Specific clinical cautions that go beyond standard exclusions</FormHelperText>
              </Box>

             
            </Stack>
          </TabPanel>

          {/* STEP 6: Personalization Configuration */}
          <TabPanel value={activeStep} index={5}>
            <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
              Personalization Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Controls whether and how this story can be personalized when a parent purchases it.
            </Typography>
            <Stack spacing={3}>
              <FormControl component="fieldset" required>
                <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Personalization Allowed</FormLabel>
                <RadioGroup
                  row
                  value={personalizationAllowed ? "yes" : "no"}
                  onChange={(e) => setPersonalizationAllowed(e.target.value === "yes")}
                  sx={{ mt: 0.5 }}
                >
                  <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                  <FormControlLabel value="no" control={<Radio />} label="No" />
                </RadioGroup>
                <FormHelperText>Master switch — whether this story can be personalized at all</FormHelperText>
              </FormControl>

              {!personalizationAllowed && (
                <TextField
                  label="Reason Personalization Is Not Allowed"
                  required
                  multiline
                  rows={2}
                  value={personalizationReason}
                  onChange={(e) => setPersonalizationReason(e.target.value)}
                  inputProps={{ maxLength: 300 }}
                  helperText={`${personalizationReason.length}/300 — Explain why personalization cannot be used`}
                  fullWidth
                />
              )}

              {personalizationAllowed && (
                <>
                  <FormControl component="fieldset" required>
                    <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Name Personalization</FormLabel>
                    <RadioGroup
                      row
                      value={namePersonalization ? "yes" : "no"}
                      onChange={(e) => setNamePersonalization(e.target.value === "yes")}
                      sx={{ mt: 0.5 }}
                    >
                      <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                      <FormControlLabel value="no" control={<Radio />} label="No" />
                    </RadioGroup>
                    <FormHelperText>Whether the child's name can be inserted into the story</FormHelperText>
                  </FormControl>

                  <FormControl component="fieldset" required>
                    <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>Illustration Personalization</FormLabel>
                    <RadioGroup
                      row
                      value={illustrationPersonalization ? "yes" : "no"}
                      onChange={(e) => setIllustrationPersonalization(e.target.value === "yes")}
                      sx={{ mt: 0.5 }}
                    >
                      <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                      <FormControlLabel value="no" control={<Radio />} label="No" />
                    </RadioGroup>
                    <FormHelperText>Whether AI illustrations can use the child's likeness</FormHelperText>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Gender Adaptation (optional)</InputLabel>
                    <Select
                      value={genderAdaptation}
                      onChange={(e) => setGenderAdaptation(e.target.value as typeof genderAdaptation)}
                      label="Gender Adaptation (optional)"
                    >
                      <MenuItem value="">Not specified</MenuItem>
                      <MenuItem value="allowed">Allowed</MenuItem>
                      <MenuItem value="not_allowed">Not Allowed</MenuItem>
                      <MenuItem value="requires_review">Requires Review</MenuItem>
                    </Select>
                    <FormHelperText>Whether the protagonist's gender can change to match the child</FormHelperText>
                  </FormControl>

                  <Box>
                    <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1 }}>
                      Personalization Constraints (optional)
                    </FormLabel>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {personalizationConstraints.map((constraint, idx) => (
                        <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <TextField
                            fullWidth
                            size="small"
                            value={constraint}
                            onChange={(e) => {
                              const updated = [...personalizationConstraints];
                              updated[idx] = e.target.value;
                              setPersonalizationConstraints(updated);
                            }}
                            placeholder="e.g. Protagonist must remain female for therapeutic narrative"
                          />
                          <IconButton onClick={() => setPersonalizationConstraints(personalizationConstraints.filter((_, i) => i !== idx))} color="error" size="small">
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      ))}
                      <Button
                        startIcon={<AddIcon />}
                        onClick={() => setPersonalizationConstraints([...personalizationConstraints, ''])}
                        sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                      >
                        Add Constraint
                      </Button>
                    </Stack>
                    <FormHelperText>Rules about what cannot be changed during personalization</FormHelperText>
                  </Box>
                </>
              )}
            </Stack>
          </TabPanel>

          {/* Success/Error Messages - Displayed near action buttons for immediate feedback */}
          {(success || error) && (
            <Box ref={messageRef} sx={{ mt: 4, mb: 2 }}>
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}
              {error && (
                <Alert severity="error">
                  {error}
                </Alert>
              )}
            </Box>
          )}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: success || error ? 0 : 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button
              type="button"
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{ textTransform: 'none' }}
            >
              Back
            </Button>
            {activeStep < 5 ? (
              <Button
                type="button"
                variant="contained"
                onClick={handleNext}
                sx={{ textTransform: 'none' }}
              >
                Next
              </Button>
            ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              variant="contained"
              size="large"
              disabled={loading}
                sx={{ 
                  py: 1.5,
                  px: 4,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                }}
            >
              {loading ? 'Creating...' : 'Create Story Brief'}
            </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
    </>
  );
};

export default AdminStoryBriefForm;
